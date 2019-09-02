var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils = require('./utils');
var paginationBlocks = require('./paginationBlocks');
var paginationSplit = require('./paginationSplit');
var paginationNonSplit = require('./paginationNonSplit');
var paginationPageNumber = require('./paginationPageNumber');

var lineSizeUtils = require('ep_script_line_size/static/js/utils');
var lineSizeCalculation = require('ep_script_line_size/static/js/calculation');

var MAX_PAGE_BREAKS_PER_CYCLE = 5;
var FULL_PAGE = utils.LINES_PER_PAGE;
var LINES_PER_CYCLE = MAX_PAGE_BREAKS_PER_CYCLE * FULL_PAGE;

// initialize with a function that does nothing
var cleanMarksOnHeadingsOnTopOfPage = function() {};
exports.setMethodToCleanMarksOnHeadingsOnTopOfPages = function(filterFn) {
  cleanMarksOnHeadingsOnTopOfPage = filterFn;
}

exports.allLinesOfPaginationCycleAreReady = function($lastLineWithPageBreak) {
  var $linesOfThisCycle = getLinesOfThisPaginationCycle($lastLineWithPageBreak);
  var $linesWithoutSizeSet = lineSizeUtils.getLinesWithoutSizeSet($linesOfThisCycle);
  var allLinesReady = $linesWithoutSizeSet.length === 0;

  // make sure lines will have their sizes calculated on the next cycle of pagination
  if (!allLinesReady) {
    lineSizeCalculation.calculateInnerLinesOfBlock($linesWithoutSizeSet);
  }

  return allLinesReady;
}

var getLinesOfThisPaginationCycle = function($lastLineWithPageBreak) {
  // filter by non-SMs because LINES_PER_CYCLE does not take into account SMs that might exist
  // on the pages of this cycle (SMs are ignored by pagination)
  var $nonSMsOfScript = utils.getPadInner().find('div:not(.sceneMark)');

  var $firstLineAfterLastUnchangedPageBreak = lineAfterUnchangedPageBreak($lastLineWithPageBreak, $nonSMsOfScript);
  var $firstNonSMAfterLastUnchangedPageBreak = utils.getFirstNonSceneMark($firstLineAfterLastUnchangedPageBreak);

  var indexOfFirstLineOfThisCycle = $nonSMsOfScript.index($firstNonSMAfterLastUnchangedPageBreak);
  var indexOfLastLineOfThisCycle = indexOfFirstLineOfThisCycle + LINES_PER_CYCLE;

  return $nonSMsOfScript.slice(indexOfFirstLineOfThisCycle, indexOfLastLineOfThisCycle);
}

exports.calculatePageBreaks = function($lastLineWithPageBreak, firstPageNumberOfThisCycle, originalCaretPosition, attributeManager, rep, performFullPagination) {
  var pageBreaks = [];
  var nextPageNumber = firstPageNumberOfThisCycle;

  // start paginating only from $lastLineWithPageBreak
  var $linesOfScript = utils.getPadInner().find('div');
  var $firstLineAfterLastUnchangedPageBreak = lineAfterUnchangedPageBreak($lastLineWithPageBreak, $linesOfScript);

  var pageBreakInfo = initializePageBreakInfo($firstLineAfterLastUnchangedPageBreak);
  var lineNumberShift = 0;

  while(!reachedEndOfPad(pageBreakInfo) &&
        !foundEnoughPageBreaksForThisCycle(pageBreaks, performFullPagination)) {

    lineNumberShift -= getNumberOfMergedLinesOnPage(pageBreakInfo);

    // line might have a marginTop, so we cannot consider it on the available space
    var pageHasOnlyOneLine = pageBreakInfo.linesOnNextPage === 1;
    var marginTop = pageHasOnlyOneLine ? 0 : lineSizeUtils.getMarginOf(pageBreakInfo.$firstLineOfNextPage);
    var linesAvailableBeforePageBreak = pageBreakInfo.linesAvailableBeforePageBreak - marginTop;

    var splitLineInfo = paginationSplit.getSplitInfo(pageBreakInfo.$firstLineOfNextPage, lineNumberShift, linesAvailableBeforePageBreak, originalCaretPosition, attributeManager, rep);
    var lineCanBeSplit = !! splitLineInfo;

    if (lineCanBeSplit) {
      // mark line to be split
      pageBreaks.push(splitPageBreak(splitLineInfo, nextPageNumber, pageBreakInfo.$firstLineOfNextPage, $linesOfScript, rep));

      if (!splitLineInfo.skipPagination) {
        // there will be an extra line from now on -- if pagination is not skipped
        lineNumberShift++;
      }
    } else {
      // it is a block of lines (a block can have only a single line too)
      var blockInfo = paginationBlocks.getBlockInfo(pageBreakInfo.$firstLineOfNextPage);

      // we cannot have a page break between a heading and its act/seq.
      // Move $topOfBlock up if this happens, otherwise just use original $topOfBlock
      pageBreakInfo.$firstLineOfNextPage = utils.getTopSceneMarkOrTargetLine(blockInfo.$topOfBlock);

      // mark line to be on top of page
      pageBreaks.push(nonSplitPageBreak(nextPageNumber, pageBreakInfo.$firstLineOfNextPage, $linesOfScript, lineNumberShift, rep));
    }

    pageBreakInfo = getNextPageBreakInfo(pageBreakInfo, splitLineInfo);
    nextPageNumber++;
  }

  return {
    done: !foundEnoughPageBreaksForThisCycle(pageBreaks, performFullPagination),
    reachedPointWherePaginationAlreadyExist: reachedPointWherePaginationAlreadyExist(pageBreaks),
    pageBreaksInfo: pageBreaks,
  };
}

var initializePageBreakInfo = function($firstLineOfThisPage) {
  var sizeOfLineOnTopOfPage = lineSizeUtils.getInnerLinesOf($firstLineOfThisPage);
  var infoOfNextPage = getInfoOfNextPage($firstLineOfThisPage, sizeOfLineOnTopOfPage);

  return {
    $firstLineOfThisPage: $firstLineOfThisPage,
    $firstLineOfNextPage: infoOfNextPage.$firstLineOfNextPage,
    linesAvailableBeforePageBreak: infoOfNextPage.linesAvailableBeforePageBreak,
    linesOnNextPage: infoOfNextPage.linesOnNextPage,
  };
}

var getNextPageBreakInfo = function(pageBreakInfo, splitLineInfo) {
  var $firstLineOfThisPage = pageBreakInfo.$firstLineOfNextPage;
  // linesUsedByPreviousPagination: if previous pageBreak is a split line, the space
  // used by 2nd half of split line is not available for next page
  var linesUsedByPreviousPagination = splitLineInfo ? splitLineInfo.innerLinesOnSecondHalf : 0;

  // when we're re-splitting a split line, $firstLineOfThisPage points to the
  // 1st half of the split -- this is a convenience to make it easier to calculate
  // the point of a split line. But in this case the actual line on top of page is
  // the 2nd half, so we need to make some adjustments to $firstLineOfThisPage
  var splitLineWillBeReSplit = splitLineInfo && $firstLineOfThisPage.is('.firstHalf');
  if (splitLineWillBeReSplit) {
    // move to the 2nd half
    $firstLineOfThisPage = $firstLineOfThisPage.next();
  }

  // if there's no size calculated on previous pagination, use the default method (getInnerLinesOf)
  var sizeOfLineOnTopOfPage = linesUsedByPreviousPagination || lineSizeUtils.getInnerLinesOf($firstLineOfThisPage);
  var infoOfNextPage = getInfoOfNextPage($firstLineOfThisPage, sizeOfLineOnTopOfPage);

  return {
    $firstLineOfThisPage: $firstLineOfThisPage,
    $firstLineOfNextPage: infoOfNextPage.$firstLineOfNextPage,
    linesAvailableBeforePageBreak: infoOfNextPage.linesAvailableBeforePageBreak,
    linesOnNextPage: infoOfNextPage.linesOnNextPage,
  };
}

var getInfoOfNextPage = function($firstLineOfThisPage, sizeOfLineOnTopOfPage) {
  var linesAvailable = FULL_PAGE;

  // BUGFIX when a SM is on top of a page, its heading won't be shown with a margin,
  // but it is stored as if it does because there are some lines between it and the
  // top of the page -- its own SMs. To workaround this scenario, we adjust
  // linesAvailable
  if (utils.isSceneMark($firstLineOfThisPage)) linesAvailable += 2;

  var $nextLine = $firstLineOfThisPage;
  var sizeOfNextLine = sizeOfLineOnTopOfPage;
  var linesOnNextPage = 0;

  // move down on pad until we find a line that does not fit on this page
  while (linesAvailable >= sizeOfNextLine) {
    // $nextLine fits on this page, so move to the next one
    linesAvailable -= sizeOfNextLine;
    $nextLine = $nextLine.next();
    sizeOfNextLine = lineSizeUtils.getFullSizeOf($nextLine);
    linesOnNextPage++;

    // reached the end of pad and all lines fit on this page.
    // Don't need to look further
    if ($nextLine.length === 0) break;
  }

  return {
    $firstLineOfNextPage: $nextLine,
    linesAvailableBeforePageBreak: linesAvailable,
    linesOnNextPage: linesOnNextPage || 1,
  }
}

var getNumberOfMergedLinesOnPage = function(pageBreakInfo) {
  var $linesOfThisPage = pageBreakInfo.$firstLineOfThisPage.nextUntil(pageBreakInfo.$firstLineOfNextPage).andSelf();
  // TODO we need to be more cautious here: maybe the 2nd half was removed.
  // use paginationSplit.linesAreHalvesOfSameSplit() to check which lines are valid
  // 1st halves of a split line
  var $mergedLinesOfThisPage = $linesOfThisPage.filter('.firstHalf');
  return $mergedLinesOfThisPage.length;
}

var nonSplitPageBreak = function(pageNumber, $originalLine, $linesOfScript, lineNumberShift, rep) {
  var nonSplitInfo = paginationNonSplit.getNonSplitInfo($originalLine, lineNumberShift, rep);
  return {
    data: nonSplitInfo,
    pageNumber: pageNumber,
    lineNumberBeforeClean: nonSplitInfo.lineNumberBeforeClean,
    lineNumberAfterClean: nonSplitInfo.lineNumberAfterClean,
    save: function(data, attributeManager, rep, editorInfo) {
      paginationNonSplit.savePageBreak(data, attributeManager);
      paginationPageNumber.savePageBreak(data, pageNumber, attributeManager);
      nonSplitInfo.callbackAfterSave(attributeManager);
    }
  };
}
var splitPageBreak = function(splitInfo, pageNumber, $originalLine, $linesOfScript, rep) {
  return {
    data: splitInfo,
    pageNumber: pageNumber,
    lineNumberBeforeClean: utils.getLineNumberFromDOMLine($originalLine, rep),
    lineNumberAfterClean: splitInfo.lineNumberAfterClean,
    save: function(data, attributeManager, rep, editorInfo) {
      paginationSplit.savePageBreak(data, attributeManager, editorInfo, rep);
      paginationPageNumber.savePageBreak(data, pageNumber, attributeManager);
    }
  };
}

var reachedEndOfPad = function(pageBreakInfo) {
  return pageBreakInfo.$firstLineOfNextPage.length === 0;
}

var foundEnoughPageBreaksForThisCycle = function(pageBreaks, performFullPagination) {
  if (performFullPagination) {
    return false; // force pagination to keep going
  }
  return pageBreaks.length === MAX_PAGE_BREAKS_PER_CYCLE;
}

var lineAfterUnchangedPageBreak = function($lastLineWithPageBreak, $linesOfScript) {
  var $lineAfterPageBreak;

  if ($lastLineWithPageBreak.length === 0) {
    // pad does not have any page break, get all lines
    $lineAfterPageBreak = $linesOfScript.first();
  } else {
    $lineAfterPageBreak = $lastLineWithPageBreak.next();
  }

  return $lineAfterPageBreak;
}

// if the last page break is already at a point where the pagination exist,
// the changes of this cycle won't affect pagination of lines after the
// lines affected by this cycle
var reachedPointWherePaginationAlreadyExist = function(pageBreaks) {
  var lastPageBreak = pageBreaks[pageBreaks.length - 1];
  return lastPageBreak && lastPageBreak.data.skipPagination;
}
