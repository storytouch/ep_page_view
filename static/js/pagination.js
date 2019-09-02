var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var scriptElementUtils = require('ep_script_elements/static/js/utils');

var utils                      = require('./utils');
var paginationSplit            = require('./paginationSplit');
var paginationNonSplit         = require('./paginationNonSplit');
var paginationPageNumber       = require('./paginationPageNumber');
var paginationLinesChanged     = require('./paginationLinesChanged');
var paginationScrollPosition   = require('./paginationScrollPosition');
var undoElementType            = require('./undoElementType');
var calculatingPageNumberIcons = require('./calculatingPageNumberIcons');
var paginationCalculation      = require('./paginationPageBreaksCalculation');
var paginationLineObserver     = require('./paginationLineObserver');
var cssOptimization            = require('./cssOptimization');

var isInTheMiddleOfASceneMarkVisibilityToggle = require('ep_script_scene_marks/static/js/sceneMarkVisibility').isInTheMiddleOfASceneMarkVisibilityToggle;

var PAGE_BREAK = paginationNonSplit.PAGE_BREAK_TAG + ',' + paginationSplit.PAGE_BREAK_TAG;
var DIV_WITH_PAGE_BREAK = 'div:has(' + PAGE_BREAK + ')';

var REPAGINATION_LINE_SHIFT = 3;
var REACHED_END_OF_PAD = -1;

// initialize listeners and be ready to receive from other plugins
var listenersOfClear = [
  paginationNonSplit.cleanPageBreaks,
  paginationSplit.cleanPageBreaks,
  paginationPageNumber.cleanPageBreaks
];

exports.addListenerOfClearPagination = function(cleanFn) {
  listenersOfClear.push(cleanFn);
}

// Façade for methods on other modules of pagination
exports.addListenerOfHeadingOnTopOfPage = paginationNonSplit.addListenerOfHeadingOnTopOfPage;
exports.setMethodToCleanMarksOnHeadingsOnTopOfPages = paginationCalculation.setMethodToCleanMarksOnHeadingsOnTopOfPages;

var enable = function() {
  var context = this;
  resetTimerToRestartPagination(context);
}

var disable = function() {
  var context = this;
  var editorInfo = context.editorInfo;

  editorInfo.ace_callWithAce(function() {
    cleanAllPageBreaks(context);
  }, 'disablePagination');
}

exports.aceInitialized = function(hook, context) {
  exports.enable = _(enable).bind(context);
  exports.disable = _(disable).bind(context);
}

exports.aceRegisterNonScrollableEditEvents = function(hook, context) {
  return [myPaginationEventType()];
}

exports.aceRegisterBlockElements = function(hook, context) {
  return _.union(paginationSplit.blockElements(),
                 paginationNonSplit.blockElements(),
                 paginationScrollPosition.blockElements());
}

exports.collectContentPre = function(hook, context) {
  return paginationSplit.collectContentPre(context);
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
  var cls = context.cls;

  var scrollTargetHtml = paginationScrollPosition.buildHtmlWithTargetScroll(cls) || '';
  var pageBreak = paginationNonSplit.buildHtmlWithPageBreaks(cls) ||
                  paginationSplit.buildHtmlWithPageBreaks(cls) ||
                  // use a default object for clearer code bellow
                  { preHtml: '', postHtml: '', default: true };

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

  paginationLineObserver.markNodeAsChangedIfIsNotASceneMark($node);

  var nodeHasSplitPageBreak    = paginationSplit.nodeHasPageBreak($node);
  var nodeHasNonSplitPageBreak = paginationNonSplit.nodeHasPageBreak($node);
  var nodeHasMoreAndContd      = utils.nodeHasMoreAndContd($node);

  // adjust layout of parentheticals split between pages
  if (nodeHasSplitPageBreak) {
    $node.addClass('firstHalf');
  }

  // leave room for page break on line at the end of the page
  if (nodeHasSplitPageBreak || nodeHasNonSplitPageBreak) {
    $node.addClass('beforePageBreak');
  }
  if (nodeHasMoreAndContd) {
    $node.addClass('withMoreAndContd');
  }
}

exports.aceEditEvent = function(hook, context) {
  var callstack = context.callstack;
  var eventType = callstack.type;

  // if page break is disabled, only remove possible existing page breaks, don't do anything else
  var pageBreakIsDisabled = !utils.getPluginProps().pageBreakEnabled;
  if (pageBreakIsDisabled) {
    if (finishedLoadingPad(eventType)) {
      cleanAllPageBreaks(context);
    }

    return;
  }

  if (finishedLoadingPad(eventType)) {
    // when script is imported to Etherpad, it does not have any pagination, so we need to
    // trigger it when user opens it for the first time on the editor
    if (scriptHasNoPaginationYet()) {
      paginateWholePad(context);
    }

    paginationLineObserver.init();

    // when pad is loaded, it marks all lines as changed, so we need to reset counter
    paginationLinesChanged.reset(context.rep);

    // need to be after pad is loaded, otherwise some classes may be overwritten
    cssOptimization.init();
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
    // only consider an edition if user is not changing the visibility of scene marks and
    // pad text was changed by this user
    if (context.callstack.docTextChanged &&
        isEditedByMe(eventType) &&
        !isInTheMiddleOfASceneMarkVisibilityToggle(eventType)) {
      resetTimerToRestartPagination(context);
    }
  }
}

// store value for caching (don't need to check event types again when we already know pad was loaded)
var padAlreadyLoaded = false;
var finishedLoadingPad = function(eventType) {
  var isLastEventOfLoadingPad = false;

  if (!padAlreadyLoaded) {
    // this is the last event when loading a pad before user can start typing
    isLastEventOfLoadingPad = eventType === 'setWraps';
    padAlreadyLoaded = isLastEventOfLoadingPad;
  }

  return isLastEventOfLoadingPad;
}

var scriptHasNoPaginationYet = function() {
  var $linesWithPageBreak = utils.getPadInner().find(DIV_WITH_PAGE_BREAK);
  return ($linesWithPageBreak.length === 0);
}

var isEditedByMe = function(eventType) {
  return eventType !== 'applyChangesToBase';
}

var paginationDidNotFinish = function() {
  return paginationLinesChanged.hasLinesChanged();
}
var isAChangeOnElementType = function(eventType) {
  return eventType === scriptElementUtils.CHANGE_ELEMENT_EVENT;
}
var isAPaginationScheduledByMe = function(eventType) {
  return eventType === myPaginationEventType();
}

var myPaginationEventType = function() {
  return 'pagination-' + clientVars.userId;
}

var paginationTimer;
var resetTimerToRestartPagination = function(context) {
  // define delay if not defined yet
  utils.getPluginProps().paginationDelay = utils.getPluginProps().paginationDelay || 500;

  var editorInfo = context.editorInfo;

  // to avoid lagging while user is typing, we set a timeout to postpone pagination until
  // edition had stopped (0.5s)
  clearTimeout(paginationTimer);
  paginationTimer = setTimeout(function() {
    editorInfo.ace_callWithAce(function(ace) {
      // do nothing here, we handle pagination on aceEditEvent
    }, myPaginationEventType());
  }, utils.getPluginProps().paginationDelay);
}

// simpler version of repaginate(), should be run only on clean pads (with no pagination)
var paginateWholePad = function(context) {
  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  var originalCaretPosition = rep.selStart.slice();
  var startAtLine = 0;
  var $lastLineWithPageBreak = getLastLineWithPageBreakBeforeLineNumber(startAtLine, rep);
  var performFullPagination = true;
  var firstPageNumberOfThisCycle = nextPageNumber($lastLineWithPageBreak);

  var paginationInfo = paginationCalculation.calculatePageBreaks($lastLineWithPageBreak, firstPageNumberOfThisCycle, originalCaretPosition, attributeManager, rep, performFullPagination);

  utils.performNonUnduableEvent(callstack, function() {
    savePageBreaks(paginationInfo.pageBreaksInfo, attributeManager, rep, editorInfo);
  });
}

var repaginate = function(context) {
  var isInTheMiddleOfACharComposition = context.editorInfo.ace_getInInternationalComposition();
  if (isInTheMiddleOfACharComposition) {
    // cannot paginate now, user is in the middle of an edition. Wait some more to repaginate
    resetTimerToRestartPagination(context);
  } else {
    paginationLineObserver.performIgnoringLineChanges(function() {
      nextPaginationCycle(context);
    });
  }
}
var nextPaginationCycle = function(context) {
  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  // HACK: make sure we have the latest changes made by the user, as pagination is a delayed process
  synchronizeEditorWithUserChanges(editorInfo);

  // need to keep caret original position so we don't mess up with it on pagination
  var originalCaretPosition = rep.selStart.slice();

  var startAtLine = getLineWherePaginationShouldStart(rep);
  var $lastLineWithPageBreak = getLastLineWithPageBreakBeforeLineNumber(startAtLine, rep);

  // if repagination should start at a line after end of the pad, we simply clean lines marked as
  // changed and do nothing else
  if (startAtLine === REACHED_END_OF_PAD) {
    paginationLinesChanged.reset(rep);
  }
  // we can only calculate page breaks if all lines of this cycle have its size calculated already
  else if (!paginationCalculation.allLinesOfPaginationCycleAreReady($lastLineWithPageBreak)) {
    resetTimerToRestartPagination(context);
  }
  else {
    var firstPageNumberOfThisCycle = nextPageNumber($lastLineWithPageBreak);
    var canStopPaginating = false;
    var paginationInfo;
    utils.performNonUnduableEvent(callstack, function() {
      // avoid editor to go up & down while pagination is not finished
      paginationScrollPosition.keepViewportScrollPosition(function() {
        paginationInfo = paginationCalculation.calculatePageBreaks($lastLineWithPageBreak, firstPageNumberOfThisCycle, originalCaretPosition, attributeManager, rep);
        var endAtLine = getLineNumberBeforePaginationOfLastPageBreak(paginationInfo, rep);

        cleanPageBreaks(paginationInfo.pageBreaksInfo, startAtLine, endAtLine, attributeManager, rep, editorInfo);
        savePageBreaks(paginationInfo.pageBreaksInfo, attributeManager, rep, editorInfo);

        // optimization: if we've reached a point where existing page breaks are
        // already on the page breaks of this cycle, we don't need to continue
        // paginating, as there will be no changes further.
        // The only exception is if there's a line changed AFTER the set of lines
        // affected by this pagination cycle (ex: when user moves a scene -- we need
        // to recalculate page breaks both on the original place of the scene and on
        // the place where the scene was moved to)
        canStopPaginating =
          paginationInfo.reachedPointWherePaginationAlreadyExist &&
          !hasLineChangedAfter(endAtLine, rep);

        // BUGFIX: although all page breaks might exist already, the page numbers
        // might had changed.
        // Ex: user removes a full page => page breaks will be at the same places,
        // but all page numbers will be different
        if (canStopPaginating) {
          var $linesWithPageBreaks = getAllLinesWithPageBreakAfterLineNumber(endAtLine, rep);
          var lastPageNumberOfThisCycle = getLastPageNumberOfCycle(paginationInfo);
          paginationPageNumber.ensurePageNumbersAreCorrectAfterLine($linesWithPageBreaks, lastPageNumberOfThisCycle, attributeManager, rep);
        }
      }, attributeManager, rep);
    });

    // clean pending lines to paginate and mark next line as changed so pagination will start from
    // it on next cycle
    paginationLinesChanged.reset(rep);
    if (paginationInfo.done || canStopPaginating) {
      calculatingPageNumberIcons.hideAll();
    } else {
      var endAtLineAfterClean = getLineNumberAfterPaginationOfLastPageBreak(paginationInfo, rep);

      makeNextCyclePaginateLinesAfter(endAtLineAfterClean, rep);

      calculatingPageNumberIcons.displayAllAfterLine(endAtLineAfterClean, rep);

      // schedule pagination to continue
      resetTimerToRestartPagination(context);
    }
  }
}

var synchronizeEditorWithUserChanges = function(editorInfo) {
  editorInfo.ace_fastIncorp();
}

var getLineWherePaginationShouldStart = function(rep) {
  var originalLineNumberOfFirstLineChanged = paginationLinesChanged.minLineChanged();

  // check the edges first -- to be faster and avoid issues with rep.lines
  if (paginationReachedEndOfPad(originalLineNumberOfFirstLineChanged, rep)) {
    return REACHED_END_OF_PAD;
  } else if (paginationShouldStartFromTopOfPad(originalLineNumberOfFirstLineChanged, rep)) {
    return 0;
  } else {
    var $lineToStartPagination = $(utils.getDOMLineFromLineNumber(originalLineNumberOfFirstLineChanged, rep));

    // we need to check some lines before first line changed since last pagination because
    // last changes might had affected a block of elements or split lines. So besides moving
    // REPAGINATION_LINE_SHIFT up, we also need to ignore lines with scene marks on this
    // interval
    for (var i = 0; i < REPAGINATION_LINE_SHIFT; i++) {
      $lineToStartPagination = getPreviousLineIgnoringSceneMarks($lineToStartPagination);
    }

    // if changed one of the first REPAGINATION_LINE_SHIFT lines of pad, start at first line (0)
    var shouldStartFromTopOfPad = $lineToStartPagination.length === 0;
    var startAtLine = shouldStartFromTopOfPad ? 0 : utils.getLineNumberFromDOMLine($lineToStartPagination, rep);

    return startAtLine;
  }
}

var paginationReachedEndOfPad = function(lineNumber, rep) {
  return lineNumber >= rep.lines.length();
}
var paginationShouldStartFromTopOfPad = function(lineNumber, rep) {
  return lineNumber < REPAGINATION_LINE_SHIFT;
}

var getPreviousLineIgnoringSceneMarks = function($targetLine) {
  // ignore scene marks (if any) right above $targetLine
  return utils.getTopSceneMarkOrTargetLine($targetLine.prev());
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

var makeNextCyclePaginateLinesAfter = function(lineNumber, rep) {
  var $lineToStartNextPagination = $(utils.getDOMLineFromLineNumber(lineNumber, rep));

  // we need to check some lines after last paginated line on this cycle because
  // when we start next cycle we look back REPAGINATION_LINE_SHIFT lines (see
  // getLineWherePaginationShouldStart()). So besides moving REPAGINATION_LINE_SHIFT down,
  // we also need to ignore lines with scene marks on this interval. This avoids infinite loop
  // if we choose to paginate one page/cycle
  for (var i = 0; i < REPAGINATION_LINE_SHIFT; i++) {
    $lineToStartNextPagination = utils.getNextLineIgnoringSceneMarks($lineToStartNextPagination);
  }

  var reachedEndOfPad = $lineToStartNextPagination.length === 0;
  var continuePaginationFromLine = reachedEndOfPad ? rep.lines.length() + 1 : utils.getLineNumberFromDOMLine($lineToStartNextPagination, rep);

  paginationLinesChanged.markLineAsChanged(continuePaginationFromLine);
}

var cleanAllPageBreaks = function(context) {
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  var pageBreaksInfo = [];
  var firstLineOfPad = 0;
  var lastLineOfPad = rep.lines.length();

  cleanPageBreaks(pageBreaksInfo, firstLineOfPad, lastLineOfPad, attributeManager, rep, editorInfo);
}

var cleanPageBreaks = function(pageBreaksInfo, startAtLine, endAtLine, attributeManager, rep, editorInfo) {
  var linesToBeCleared = getListOfLinesToBeCleared(pageBreaksInfo, startAtLine, endAtLine);
  for (var i = 0; i < listenersOfClear.length; i++) {
    var cleanFn = listenersOfClear[i];
    cleanFn(linesToBeCleared, attributeManager, rep, editorInfo);
  }
}

// return an array with all line numbers between startAtLine and endAtLine that
// should be cleared.
// Optimization: skip all lines on pageBreaksInfo with pagination that
// already exist (pageBreakInfo.data.skipPagination).
// Ex of returned value: [0, 1, 2, 4, 5, 6, 7, 8, 10] (skips lines 3 and 9)
var getListOfLinesToBeCleared = function(pageBreaksInfo, startAtLine, endAtLine) {
  var pageBreaksToBeSkipped = _(pageBreaksInfo).filter(function(pageBreakInfo) {
    return pageBreakInfo.data.skipPagination;
  });
  var lineNumbersToBeSkipped = _(pageBreaksToBeSkipped).map(function(pageBreakInfo) {
    return pageBreakInfo.data.lineNumberAfterClean;
  });

  // ex: endAtLine = 10, startAtLine = 0, range = [0, 1, ..., 9, 10]
  var allLinesOnInterval = _.range(startAtLine, endAtLine + 1);

  // remove lines to be skipped from the entire range
  var linesToBeCleared = _(allLinesOnInterval).difference(lineNumbersToBeSkipped);

  return linesToBeCleared;
}

var savePageBreaks = function(pageBreaksInfo, attributeManager, rep, editorInfo) {
  for (var i = 0; i < pageBreaksInfo.length; i++) {
    var pageBreakInfo = pageBreaksInfo[i];
    pageBreakInfo.save(pageBreakInfo.data, attributeManager, rep, editorInfo);
  }

  // Bug fix: when user changes element to general and then undoes this change, the UNDO might
  // not work properly if line has a page break. So we need to make an adjustment to avoid that
  // TODO do we still need this, as now all lines have lineMarker (even general), due to ep_line_size?
  undoElementType.fix(rep, attributeManager);
}

var nextPageNumber = function($lastLineWithPageBreak) {
  // if pad does not have any page break before content being paginated, start from 1
  var maxPageNumber = 1;

  if ($lastLineWithPageBreak.length > 0) {
    // get max page number that will not be modified by this pagination
    var maxPageNumberAboveBaseLine = utils.pageNumberOfDOMLine($lastLineWithPageBreak);
    maxPageNumber = parseInt(maxPageNumberAboveBaseLine || 1);
  }

  return maxPageNumber + 1;
}

var getLastLineWithPageBreakBeforeLineNumber = function(lineNumber, rep) {
  var $baseLine = $(utils.getDOMLineFromLineNumber(lineNumber, rep));
  var $linesWithPageBreaksAboveBaseLine = $baseLine.prevAll(DIV_WITH_PAGE_BREAK);
  return $linesWithPageBreaksAboveBaseLine.first();
}

var getAllLinesWithPageBreakAfterLineNumber = function(lineNumber, rep) {
  var $baseLine = $(utils.getDOMLineFromLineNumber(lineNumber, rep));
  var $linesWithPageBreaksAfterBaseLine = $baseLine.nextAll(DIV_WITH_PAGE_BREAK);
  return $linesWithPageBreaksAfterBaseLine.addBack();
}

var getLastPageNumberOfCycle = function(paginationInfo) {
  var pageBreaksInfo = paginationInfo.pageBreaksInfo;
  var lastPageBreakInfo = pageBreaksInfo[pageBreaksInfo.length - 1];
  return lastPageBreakInfo.pageNumber;
}

var hasLineChangedAfter = function(lineNumber, rep) {
  var minLineChangedAfterTargetLine = paginationLinesChanged.minLineChangedFromLine(lineNumber);
  return !paginationReachedEndOfPad(minLineChangedAfterTargetLine, rep);
}
