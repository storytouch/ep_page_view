var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils                  = require('./utils');
var paginationBlocks       = require('./paginationBlocks');
var paginationSplit        = require('./paginationSplit');
var paginationNonSplit     = require('./paginationNonSplit');
var paginationPageNumber   = require('./paginationPageNumber');
var paginationLinesChanged = require('./paginationLinesChanged');
var undoElementType        = require('./undoElementType');
var getMaxPageHeight       = require('./fixSmallZooms').getMaxPageHeight;

var PAGE_BREAK = paginationNonSplit.PAGE_BREAK_TAG + "," + paginationSplit.PAGE_BREAK_TAG;
var DIV_WITH_PAGE_BREAK = "div:has(" + PAGE_BREAK + ")";

var CLONED_ELEMENTS_SELECTOR = "." + utils.CLONED_ELEMENTS_CLASS;

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
      continuePagination(context);
    }

    // when pad is loaded, it marks all lines as changed, so we need to reset counter
    paginationLinesChanged.reset(context.rep);
  }
  // only proceed if pagination was scheduled by me.
  // This avoids getting an error if two users have the same pad opened
  else if (isAPaginationScheduledByMe(eventType)) {
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

// based on similar method from ep_autocomp
var isEditedByMe = function(eventType) {
  var editedByMe = (eventType === "idleWorkTimer" || eventType === "handleKeyEvent");

  return editedByMe;
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

var repaginate = function(context) {
  // HACK: make sure we have the latest changes made by the user, as pagination is a delayed process
  synchronizeEditorWithUserChanges(context.editorInfo);

  // need to keep caret original position so we don't mess up with it on pagination
  var originalCaretPosition = context.rep.selStart.slice();

  cleanPagination(context);
  continuePagination(context, originalCaretPosition);

  paginationLinesChanged.reset(context.rep);

}

var synchronizeEditorWithUserChanges = function(editorInfo) {
  editorInfo.ace_fastIncorp();
}

var cleanPagination = function(context) {
  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  cleanPageBreaks(callstack, attributeManager, rep, editorInfo);
}

var cleanPageBreaks = function(callstack, attributeManager, rep, editorInfo) {
  utils.performNonUnduableEvent(callstack, function() {
    // we need to check 3 lines before first line changed since last pagination because
    // last changes might had affected a block of elements
    var firstLineThatMightBeAffected = paginationLinesChanged.minLineChanged() - 3;
    // if changed one of the first 3 lines of pad, start at first line (0)
    var startAtLine = Math.max(0, firstLineThatMightBeAffected);

    paginationNonSplit.cleanPageBreaks(startAtLine, attributeManager, rep);
    paginationSplit.cleanPageBreaks(startAtLine, attributeManager, rep, editorInfo);
    paginationPageNumber.cleanPageBreaks(startAtLine, attributeManager, rep);
  });
}

var continuePagination = function(context, originalCaretPosition) {
  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  var pageBreaksInfo = calculatePageBreaks(originalCaretPosition, attributeManager, rep);

  savePageBreaks(pageBreaksInfo, callstack, attributeManager, rep, editorInfo);
}

var savePageBreaks = function(pageBreaksInfo, callstack, attributeManager, rep, editorInfo) {
  utils.performNonUnduableEvent(callstack, function() {
    var initialPageNumber = nextPageNumber();
    for (var i = pageBreaksInfo.length - 1; i >= 0; i--) {
      var pageNumber = initialPageNumber + i;

      var pageBreakInfo = pageBreaksInfo[i];
      pageBreakInfo.save(pageBreakInfo.data, pageNumber, attributeManager, rep, editorInfo);
    }

    // Bug fix: when user changes element to general and then undoes this change, the UNDO might
    // not work properly if line has a page break. So we need to make an adjustment to avoid that
    undoElementType.fix(rep, attributeManager);
  });
}

var nextPageNumber = function() {
  var maxPageNumber;

  var $linesWithPageBreak = utils.getPadInner().find(PAGE_BREAK);
  if ($linesWithPageBreak.length === 0) {
    // pad does not have any page break yet, so it has only one page
    maxPageNumber = 1;
  } else {
    maxPageNumber = parseInt($linesWithPageBreak.last().attr("data-page-number") || 1);
  }

  return maxPageNumber + 1;
}

var calculatePageBreaks = function(originalCaretPosition, attributeManager, rep) {
  var maxPageHeight = getMaxPageHeight();
  var pageBreaks = [];

  // start paginating only from first line after last page break
  var $firstLineAfterLastPageBreak = firstLineAfterPageBreak();
  var $lastLine = utils.getPadInner().find("div").last();
  var $currentLine = $firstLineAfterLastPageBreak;

  var currentPageHeight = 0;
  var lineNumberShift = 0;
  while(!reachedEndOfPad($currentLine)) {
    var $clonedLine = cloneLine($currentLine, $lastLine);

    // if current line is a split line, it will be merged when cleaned, so we need to shift all lines
    // after it one position up. A merged line has text of both halves, so its text won't be the same
    // of current line
    var lineWillBeMergedOnClean = ($clonedLine.text() !== $currentLine.text());
    if (lineWillBeMergedOnClean) {
      lineNumberShift--;
    }

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
          pageBreaks.push(nonSplitPageBreak($currentLine, rep));
        }

        // starting a new page, we have the full page height to fill by forced split
        var availableHeightOnPage = maxPageHeight;

        // calculate where line needs to be split
        var forcedSplitElementInfo = paginationSplit.getForcedSplitInfo($currentLine, $clonedLine, lineNumberShift, lineHeight, lineInnerHeight, availableHeightOnPage, originalCaretPosition, attributeManager, rep);

        // restart counting page height again
        currentPageHeight = forcedSplitElementInfo.heightAfterPageBreak;

        // mark element to be split when pagination is done
        pageBreaks.push(splitPageBreak(forcedSplitElementInfo));
      } else {
        var splitElementInfo = paginationSplit.getRegularSplitInfo($currentLine, $clonedLine, lineNumberShift, lineHeight, lineInnerHeight, availableHeightOnPage, originalCaretPosition, attributeManager, rep);
        // can we split current line?
        if (splitElementInfo) {
          // restart counting page height again
          currentPageHeight = splitElementInfo.heightAfterPageBreak;

          // mark element to be split when pagination is done
          pageBreaks.push(splitPageBreak(splitElementInfo));
        }
        // is it a block of lines? (A block can have only a single line too)
        else {
          var blockInfo = paginationBlocks.getBlockInfo($currentLine, lineHeight, lineInnerHeight);

          currentPageHeight = blockInfo.blockHeight;

          // mark element to be on top of page when pagination is done
          pageBreaks.push(nonSplitPageBreak(blockInfo.$topOfBlock, rep));

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

    // move to next line before next iteration of while-loop
    $currentLine = $currentLine.next();
  }

  return pageBreaks;
}

var nonSplitPageBreak = function($line, rep) {
  var nonSplitInfo = paginationNonSplit.getNonSplitInfo($line, rep);
  return {
    data: nonSplitInfo,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationNonSplit.savePageBreak(data, pageNumber, attributeManager);
    }
  };
}
var splitPageBreak = function(splitInfo) {
  return {
    data: splitInfo,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationSplit.savePageBreak(data, pageNumber, attributeManager, editorInfo, rep);
    }
  };
}

var reachedEndOfPad = function($currentLine) {
  return $currentLine.length === 0;
}

var firstLineAfterPageBreak = function() {
  var $lineAfterPageBreak;

  var $linesWithPageBreak = utils.getPadInner().find(DIV_WITH_PAGE_BREAK);
  if ($linesWithPageBreak.length === 0) {
    // pad does not have any page break yet, get all lines
    $lineAfterPageBreak = utils.getPadInner().find("div").first();
  } else {
    $lineAfterPageBreak = $linesWithPageBreak.last().next();
  }

  return $lineAfterPageBreak;
}

var cloneLine = function($targetLine, $lastLine) {
  var $clonedLine = paginationSplit.clonePaginatedLine($targetLine);

  // make sure cloned lines have all information needed by paginationBlocks
  paginationBlocks.adjustClonedBlock($clonedLine, $targetLine);

  $clonedLine.insertAfter($lastLine);

  return $clonedLine;
}

var removeClonedLines = function() {
  var $clones = utils.getPadInner().find(CLONED_ELEMENTS_SELECTOR).remove();
  $clones.remove();
}