var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils                      = require('./utils');
var paginationBlocks           = require('./paginationBlocks');
var paginationSplit            = require('./paginationSplit');
var paginationNonSplit         = require('./paginationNonSplit');
var paginationPageNumber       = require('./paginationPageNumber');
var paginationLinesChanged     = require('./paginationLinesChanged');
var paginationScrollPosition   = require('./paginationScrollPosition');
var undoElementType            = require('./undoElementType');
var calculatingPageNumberIcons = require('./calculatingPageNumberIcons');
var getMaxPageHeight           = require('./fixSmallZooms').getMaxPageHeight;

var PAGE_BREAK = paginationNonSplit.PAGE_BREAK_TAG + "," + paginationSplit.PAGE_BREAK_TAG;
var DIV_WITH_PAGE_BREAK = "div:has(" + PAGE_BREAK + ")";

var CLONED_ELEMENTS_SELECTOR = "." + utils.CLONED_ELEMENTS_CLASS;

var REPAGINATION_LINE_SHIFT = 3;
var MAX_PAGE_BREAKS_PER_CYCLE = 5;

exports.aceRegisterNonScrollableEditEvents = function(hook, context) {
  return [myPaginationEventType()];
}

exports.aceRegisterBlockElements = function(hook, context) {
  return _.union(paginationSplit.blockElements(), paginationNonSplit.blockElements());
}

exports.aceAttribsToClasses = function(hook, context) {
  return _.union(
    paginationSplit.atribsToClasses(context),
    paginationNonSplit.atribsToClasses(context),
    paginationPageNumber.atribsToClasses(context)
  );
}

exports.aceDomLineProcessLineAttributes = function(hook, context) {
  var extraHTML = paginationNonSplit.buildHtmlWithPageBreaks(context.cls) ||
                  paginationSplit.buildHtmlWithPageBreaks(context.cls);

  if (extraHTML) {
    var modifier = {
      preHtml: extraHTML.preHtml,
      postHtml: extraHTML.postHtml,
      processedMarker: true
    };
    return [modifier];
  }
  return [];
}

exports.acePostWriteDomLineHTML = function(hook, context) {
  var $node = $(context.node);

  paginationLinesChanged.markNodeAsChanged($node);

  var nodeHasSplitPageBreak    = paginationSplit.nodeHasPageBreak($node);
  var nodeHasNonSplitPageBreak = paginationNonSplit.nodeHasPageBreak($node);
  var nodeHasMoreAndContd      = utils.nodeHasMoreAndContd($node);

  // adjust layout of parentheticals split between pages
  if (nodeHasSplitPageBreak) {
    $node.addClass("firstHalf");
  }

  // leave room for page break on line at the end of the page
  if (nodeHasSplitPageBreak || nodeHasNonSplitPageBreak) {
    $node.addClass("beforePageBreak");
  }
  if (nodeHasMoreAndContd) {
    $node.addClass("withMoreAndContd");
  }
}

exports.aceEditEvent = function(hook, context) {
  // don't do anything if page break is disabled
  if (!clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled) return;

  var callstack = context.callstack;
  var eventType = callstack.type;

  if (finishedLoadingPad(eventType)) {
    // when script is imported to Etherpad, it does not have any pagination, so we need to
    // trigger it when user opens it for the first time on the editor
    if (scriptHasNoPaginationYet()) {
      paginateWholePad(context);
    }

    // when pad is loaded, it marks all lines as changed, so we need to reset counter
    paginationLinesChanged.reset(context.rep);
  }
  // repagination didn't finish, need to continue (but only if I was the one who started it,
  // otherwise we'll get errors when 2 users have the same pad opened)
  else if (paginationDidNotFinish() && isAPaginationScheduledByMe(eventType)) {
    repaginate(context);
  }
  // user changed the type of one of the lines
  else if (isAChangeOnElementType(eventType)) {
    repaginate(context);
  }
  // any other edition on the pad
  else {
    // don't do anything if text did not change or if user was not the one who made the text change
    if (!context.callstack.docTextChanged || !isEditedByMe(eventType)) return;

    markCurrentLineAsChanged(context);

    resetTimerToRestartPagination(context);
  }
}

var finishedLoadingPad = function(eventType) {
  // this is the last event when loading a pad before user can start typing
  return eventType === "setWraps";
}

var scriptHasNoPaginationYet = function() {
  var $linesWithPageBreak = utils.getPadInner().find(DIV_WITH_PAGE_BREAK);
  return ($linesWithPageBreak.length === 0);
}

var isEditedByMe = function(eventType) {
  return eventType !== "applyChangesToBase";
}

var paginationDidNotFinish = function() {
  return paginationLinesChanged.hasLinesChanged();
}
var isAChangeOnElementType = function(eventType) {
  return eventType === 'insertscriptelement';
}
var isAPaginationScheduledByMe = function(eventType) {
  return eventType === "pagination-" + clientVars.userId;
}

var myPaginationEventType = function() {
  return "pagination-" + clientVars.userId;
}

var markCurrentLineAsChanged = function(context) {
  var currentLine = context.rep.selStart[0];
  paginationLinesChanged.markLineAsChanged(currentLine);
}

var paginationTimer;
var resetTimerToRestartPagination = function(context) {
  // define delay if not defined yet
  clientVars.plugins.plugins.ep_script_page_view.paginationDelay = clientVars.plugins.plugins.ep_script_page_view.paginationDelay || 500;

  var editorInfo = context.editorInfo;

  // to avoid lagging while user is typing, we set a timeout to postpone pagination until
  // edition had stopped (0.5s)
  clearTimeout(paginationTimer);
  paginationTimer = setTimeout(function() {
    editorInfo.ace_callWithAce(function(ace) {
      // do nothing here, we handle pagination on aceEditEvent
    }, myPaginationEventType());
  }, clientVars.plugins.plugins.ep_script_page_view.paginationDelay);
}

// simpler version of repaginate(), should be run only on clean pads (with no pagination)
var paginateWholePad = function(context) {
  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  var originalCaretPosition = rep.selStart.slice();
  var startAtLine = 0;
  var performFullPagination = true;

  var paginationInfo = calculatePageBreaks(startAtLine, originalCaretPosition, attributeManager, rep, performFullPagination);

  utils.performNonUnduableEvent(callstack, function() {
    savePageBreaks(paginationInfo.pageBreaksInfo, attributeManager, rep, editorInfo);
  });
}

var repaginate = function(context) {
  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  // HACK: make sure we have the latest changes made by the user, as pagination is a delayed process
  synchronizeEditorWithUserChanges(editorInfo);

  // need to keep caret original position so we don't mess up with it on pagination
  var originalCaretPosition = rep.selStart.slice();

  // we need to check some lines before first line changed since last pagination because
  // last changes might had affected a block of elements or split lines
  var firstLineToPaginate = paginationLinesChanged.minLineChanged() - REPAGINATION_LINE_SHIFT;
  // if changed one of the first REPAGINATION_LINE_SHIFT lines of pad, start at first line (0)
  var startAtLine = Math.max(0, firstLineToPaginate);

  // if repagination should start at a line after end of the pad, we simply clean lines marked as
  // changed and do nothing else
  var padLines = rep.lines.length();
  if (startAtLine >= padLines) {
    paginationLinesChanged.reset(rep);
  } else {
    var paginationInfo = calculatePageBreaks(startAtLine, originalCaretPosition, attributeManager, rep);
    var endAtLine = getLineNumberBeforePaginationOfLastPageBreak(paginationInfo, rep);

    // avoid editor to go up & down while pagination is not finished
    paginationScrollPosition.keepViewportScrollPosition(function() {
      utils.performNonUnduableEvent(callstack, function() {
        cleanPageBreaks(startAtLine, endAtLine, attributeManager, rep, editorInfo);
        savePageBreaks(paginationInfo.pageBreaksInfo, attributeManager, rep, editorInfo);
      });
    }, paginationInfo, rep);

    // clean pending lines to paginate and mark next line as changed so pagination will start from
    // it on next cycle
    paginationLinesChanged.reset(rep);
    if (paginationInfo.done) {
      calculatingPageNumberIcons.hideAll();
    } else {
      var endAtLineAfterClean = getLineNumberAfterPaginationOfLastPageBreak(paginationInfo, rep);

      makeNextCyclePaginateLinesAfter(endAtLineAfterClean);

      calculatingPageNumberIcons.displayAllAfterLine(endAtLineAfterClean, rep);

      // schedule pagination to continue
      resetTimerToRestartPagination(context);
    }
  }
}

var synchronizeEditorWithUserChanges = function(editorInfo) {
  editorInfo.ace_fastIncorp();
}

// returns line number of last line that will receive a page break, or last number of pad
// if pagination is done. Line number refers to pad BEFORE pagination cleanup
var getLineNumberBeforePaginationOfLastPageBreak = function(paginationInfo, rep) {
  var lastLineWithPageBreak;

  if (paginationInfo.done) {
    var totalLines = rep.lines.length() - 1;
    lastLineWithPageBreak = totalLines;
  } else {
    var pageBreaksInfo = paginationInfo.pageBreaksInfo;
    var lastPageBreakInfo = pageBreaksInfo[pageBreaksInfo.length - 1];
    lastLineWithPageBreak = lastPageBreakInfo.lineNumberBeforeClean;
  }

  return lastLineWithPageBreak;
}
// returns line number of last line that received a page break, or last number of pad
// if pagination is done. Line number refers to pad AFTER pagination cleanup
var getLineNumberAfterPaginationOfLastPageBreak = function(paginationInfo, rep) {
  var lastLineWithPageBreak;

  if (paginationInfo.done) {
    var totalLines = rep.lines.length() - 1;
    lastLineWithPageBreak = totalLines;
  } else {
    var pageBreaksInfo = paginationInfo.pageBreaksInfo;
    var lastPageBreakInfo = pageBreaksInfo[pageBreaksInfo.length - 1];
    lastLineWithPageBreak = lastPageBreakInfo.lineNumberAfterClean;
  }

  return lastLineWithPageBreak;
}

var makeNextCyclePaginateLinesAfter = function(lineNumber) {
  var continuePaginationFromLine = lineNumber + 1;
  // this avoids an infinite loop when next pagination cycle starts (we always look
  // REPAGINATION_LINE_SHIFT lines back to start paginating)
  continuePaginationFromLine += REPAGINATION_LINE_SHIFT;

  paginationLinesChanged.markLineAsChanged(continuePaginationFromLine);
}

var cleanPageBreaks = function(startAtLine, endAtLine, attributeManager, rep, editorInfo) {
  paginationNonSplit.cleanPageBreaks(startAtLine, endAtLine, attributeManager);
  paginationSplit.cleanPageBreaks(startAtLine, endAtLine, attributeManager, rep, editorInfo);
  paginationPageNumber.cleanPageBreaks(startAtLine, endAtLine, attributeManager);
}

var savePageBreaks = function(pageBreaksInfo, attributeManager, rep, editorInfo) {
  var initialPageNumber = nextPageNumber(pageBreaksInfo, rep);
  for (var i = 0; i < pageBreaksInfo.length; i++) {
    var pageNumber = initialPageNumber + i;

    var pageBreakInfo = pageBreaksInfo[i];
    pageBreakInfo.save(pageBreakInfo.data, pageNumber, attributeManager, rep, editorInfo);
  }

  // Bug fix: when user changes element to general and then undoes this change, the UNDO might
  // not work properly if line has a page break. So we need to make an adjustment to avoid that
  undoElementType.fix(rep, attributeManager);
}

var nextPageNumber = function(pageBreaksInfo, rep) {
  // if pad does not have any page break before content being paginated, start from 1
  var maxPageNumber = 1;

  var firstPageBreakInfo = pageBreaksInfo[0];
  if (firstPageBreakInfo) {
    // find page breaks that will not be modified by this pagination
    var firstLineWithPageBreak = firstPageBreakInfo.lineNumberAfterClean;
    var $lineOfFirstPageBreakInfo = $(utils.getDOMLineFromLineNumber(firstLineWithPageBreak, rep));
    var $linesWithUnchangedPageBreaks = $lineOfFirstPageBreakInfo.prevAll(DIV_WITH_PAGE_BREAK);

    if ($linesWithUnchangedPageBreaks.length > 0) {
      // get max page number that will not be modified by this pagination
      var $lastLineWithUnchangedPageBreak = $linesWithUnchangedPageBreaks.first();
      var lastUnchangedPageNumber = utils.pageNumberOfDOMLine($lastLineWithUnchangedPageBreak);

      maxPageNumber = parseInt(lastUnchangedPageNumber || 1);
    }
  }

  return maxPageNumber + 1;
}

var calculatePageBreaks = function(startLine, originalCaretPosition, attributeManager, rep, performFullPagination) {
  var maxPageHeight = getMaxPageHeight();
  var pageBreaks = [];

  // start paginating only from startLine
  var $firstLineAfterLastUnchangedPageBreak = lineAfterUnchangedPageBreak(startLine, rep);
  var $lastLine = utils.getPadInner().find("div").last();
  var $currentLine = $firstLineAfterLastUnchangedPageBreak;

  var currentPageHeight = 0;
  var lineNumberShift = 0;
  while(!reachedEndOfPad($currentLine) && !foundEnoughPageBreaksForThisCycle(pageBreaks, performFullPagination)) {
    var $clonedLine = cloneLine($currentLine, $lastLine);

    // get height including margins and paddings
    var lineHeight = utils.getLineHeight($clonedLine);
    // get height excluding margins and paddings
    var lineInnerHeight = utils.getLineHeightWithoutMargins($clonedLine);

    // Q: if this line is placed on current page, will the page height be over the
    // allowed max height?
    if (currentPageHeight + lineHeight > maxPageHeight) {
      // A: yes, so check if line can be split or belongs to a block

      var availableHeightOnPage = maxPageHeight - currentPageHeight;
      // is current line longer than a page? (so we need to force its split)
      if (lineInnerHeight > maxPageHeight) {
        // mark current line to be on top of page when pagination is done
        // (but only if current line is not the first line of script)
        if ($currentLine.prev().length > 0) {
          pageBreaks.push(nonSplitPageBreak($currentLine, lineNumberShift, rep));
        }

        // starting a new page, we have the full page height to fill by forced split
        var availableHeightOnPage = maxPageHeight;

        // calculate where line needs to be split
        var forcedSplitElementInfo = paginationSplit.getForcedSplitInfo($currentLine, $clonedLine, lineNumberShift, lineHeight, lineInnerHeight, availableHeightOnPage, originalCaretPosition, attributeManager, rep);

        // restart counting page height again
        currentPageHeight = forcedSplitElementInfo.heightAfterPageBreak;

        // mark element to be split when pagination is done
        pageBreaks.push(splitPageBreak(forcedSplitElementInfo, $currentLine, rep));

        // there will be an extra line from now on
        lineNumberShift++;
      } else {
        var splitElementInfo = paginationSplit.getRegularSplitInfo($currentLine, $clonedLine, lineNumberShift, lineHeight, lineInnerHeight, availableHeightOnPage, originalCaretPosition, attributeManager, rep);
        // can we split current line?
        if (splitElementInfo) {
          // restart counting page height again
          currentPageHeight = splitElementInfo.heightAfterPageBreak;

          // mark element to be split when pagination is done
          pageBreaks.push(splitPageBreak(splitElementInfo, $currentLine, rep));

          // there will be an extra line from now on
          lineNumberShift++;
        }
        // is it a block of lines? (A block can have only a single line too)
        else {
          var blockInfo = paginationBlocks.getBlockInfo($currentLine, lineHeight, lineInnerHeight);

          currentPageHeight = blockInfo.blockHeight;

          // mark element to be on top of page when pagination is done
          pageBreaks.push(nonSplitPageBreak(blockInfo.$topOfBlock, lineNumberShift, rep));

          // move $currentLine to end of the block
          $currentLine = blockInfo.$bottomOfBlock;
        }
      }
    } else {
      // A: no, so simply increase current page height

      // disregard margins if on top of page
      var adjustedHeight = (currentPageHeight === 0 ? lineInnerHeight : lineHeight);

      currentPageHeight += adjustedHeight;
    }

    removeClonedLines();

    // if current line is a split line, it will be merged when cleaned, so we need to shift all lines
    // after it one position up. A merged line has text of both halves, so its text won't be the same
    // of current line
    var lineWillBeMergedOnClean = ($clonedLine.text() !== $currentLine.text());
    if (lineWillBeMergedOnClean) {
      lineNumberShift--;
    }

    // move to next line before next iteration of while-loop
    $currentLine = $currentLine.next();
    if (lineWillBeMergedOnClean) {
      $currentLine = $currentLine.next(); // move one extra line down to skip 2nd half of split
    }
  }

  return {
    done: reachedEndOfPad($currentLine),
    pageBreaksInfo: pageBreaks,
  };
}

var nonSplitPageBreak = function($line, lineNumberShift, rep) {
  var nonSplitInfo = paginationNonSplit.getNonSplitInfo($line, lineNumberShift, rep);
  return {
    data: nonSplitInfo,
    lineNumberBeforeClean: utils.getLineNumberFromDOMLine($line, rep),
    lineNumberAfterClean: nonSplitInfo.lineNumberAfterClean,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationNonSplit.savePageBreak(data, pageNumber, attributeManager);
    }
  };
}
var splitPageBreak = function(splitInfo, $line, rep) {
  return {
    isSplit: true,
    data: splitInfo,
    lineNumberBeforeClean: utils.getLineNumberFromDOMLine($line, rep),
    lineNumberAfterClean: splitInfo.lineNumberAfterClean,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationSplit.savePageBreak(data, pageNumber, attributeManager, editorInfo, rep);
    }
  };
}

var reachedEndOfPad = function($currentLine) {
  return $currentLine.length === 0;
}

var foundEnoughPageBreaksForThisCycle = function(pageBreaks, performFullPagination) {
  if (performFullPagination) {
    return false; // force pagination to keep going
  }
  return pageBreaks.length === MAX_PAGE_BREAKS_PER_CYCLE;
}

var lineAfterUnchangedPageBreak = function(startLine, rep) {
  var $lineAfterPageBreak;

  var $startLine = $(utils.getDOMLineFromLineNumber(startLine, rep));
  var $linesWithPageBreaks = $startLine.prevAll(DIV_WITH_PAGE_BREAK);
  if ($linesWithPageBreaks.length === 0) {
    // pad does not have any page break before startLine, get all lines
    $lineAfterPageBreak = utils.getPadInner().find("div").first();
  } else {
    $lineAfterPageBreak = $linesWithPageBreaks.first().next();
  }

  return $lineAfterPageBreak;
}

var cloneLine = function($targetLine, $lastLine) {
  var $clonedLine = paginationSplit.clonePaginatedLine($targetLine);
  var lineWasCloned = $clonedLine.hasClass(utils.CLONED_ELEMENTS_CLASS);

  if (lineWasCloned) {
    // make sure cloned lines have all information needed by paginationBlocks
    paginationBlocks.adjustClonedBlock($clonedLine, $targetLine);

    $clonedLine.insertAfter($lastLine);
  }

  return $clonedLine;
}

var removeClonedLines = function() {
  var $clones = utils.getPadInner().find(CLONED_ELEMENTS_SELECTOR);
  $clones.remove();
}
