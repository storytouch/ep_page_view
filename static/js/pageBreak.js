var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils                      = require('./utils');
var paginationSplit            = require('./paginationSplit');
var paginationNonSplit         = require('./paginationNonSplit');
var paginationPageNumber       = require('./paginationPageNumber');
var paginationLinesChanged     = require('./paginationLinesChanged');
var paginationScrollPosition   = require('./paginationScrollPosition');
var undoElementType            = require('./undoElementType');
var calculatingPageNumberIcons = require('./calculatingPageNumberIcons');
var paginationCalculation      = require('./paginationPageBreaksCalculation');

var PAGE_BREAK = paginationNonSplit.PAGE_BREAK_TAG + "," + paginationSplit.PAGE_BREAK_TAG;
var DIV_WITH_PAGE_BREAK = "div:has(" + PAGE_BREAK + ")";

var REPAGINATION_LINE_SHIFT = 3;

// initialize listeners and be ready to receive from other plugins
var listenersOfClear = [
  paginationNonSplit.cleanPageBreaks,
  paginationSplit.cleanPageBreaks,
  paginationPageNumber.cleanPageBreaks
];

exports.addListenerOfClearPagination = function(cleanFn) {
  listenersOfClear.push(cleanFn);
}

exports.aceRegisterNonScrollableEditEvents = function(hook, context) {
  return [myPaginationEventType()];
}

exports.aceRegisterBlockElements = function(hook, context) {
  return _.union(paginationSplit.blockElements(),
                 paginationNonSplit.blockElements(),
                 paginationScrollPosition.blockElements());
}

exports.aceAttribsToClasses = function(hook, context) {
  return _.union(
    paginationSplit.atribsToClasses(context),
    paginationNonSplit.atribsToClasses(context),
    paginationScrollPosition.atribsToClasses(context),
    paginationPageNumber.atribsToClasses(context)
  );
}

exports.aceDomLineProcessLineAttributes = function(hook, context) {
  var scrollTargetHtml = paginationScrollPosition.buildHtmlWithTargetScroll(context.cls) || "";
  var pageBreak = paginationNonSplit.buildHtmlWithPageBreaks(context.cls) ||
                  paginationSplit.buildHtmlWithPageBreaks(context.cls) ||
                  // use a default object for clearer code bellow
                  { preHtml: "", postHtml: "", default: true };

  if (scrollTargetHtml || !pageBreak.default) {
    var modifier = {
      preHtml: scrollTargetHtml + pageBreak.preHtml,
      postHtml: pageBreak.postHtml,
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

  var paginationInfo = paginationCalculation.calculatePageBreaks(startAtLine, originalCaretPosition, attributeManager, rep, performFullPagination);

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
    var paginationInfo;
    utils.performNonUnduableEvent(callstack, function() {
      // avoid editor to go up & down while pagination is not finished
      paginationScrollPosition.keepViewportScrollPosition(function() {
        paginationInfo = paginationCalculation.calculatePageBreaks(startAtLine, originalCaretPosition, attributeManager, rep);
        var endAtLine = getLineNumberBeforePaginationOfLastPageBreak(paginationInfo, rep);

        cleanPageBreaks(startAtLine, endAtLine, attributeManager, rep, editorInfo);
        savePageBreaks(paginationInfo.pageBreaksInfo, attributeManager, rep, editorInfo);
      }, attributeManager, rep);
    });

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
  for (var i = 0; i < listenersOfClear.length; i++) {
    var cleanFn = listenersOfClear[i];
    cleanFn(startAtLine, endAtLine, attributeManager, rep, editorInfo);
  }
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
