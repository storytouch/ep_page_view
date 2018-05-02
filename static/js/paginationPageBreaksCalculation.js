var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils                      = require('./utils');
var paginationBlocks           = require('./paginationBlocks');
var paginationSplit            = require('./paginationSplit');
var paginationNonSplit         = require('./paginationNonSplit');

var PAGE_BREAK = paginationNonSplit.PAGE_BREAK_TAG + "," + paginationSplit.PAGE_BREAK_TAG;
var DIV_WITH_PAGE_BREAK = "div:has(" + PAGE_BREAK + ")";

var MAX_PAGE_BREAKS_PER_CYCLE = 5;
var PAGE_BREAK_HEIGHT = 16;

// initialize with a function that does nothing
var cleanMarksOnHeadingsOnTopOfPage = function() {};
exports.setMethodToCleanMarksOnHeadingsOnTopOfPages = function(filterFn) {
  cleanMarksOnHeadingsOnTopOfPage = filterFn;
}

exports.calculatePageBreaks = function(startLine, originalCaretPosition, attributeManager, rep, performFullPagination) {
  var pageBreaks = [];

  // start paginating only from startLine
  var $linesOfScript = utils.getPadInner().find("div");
  var $firstLineAfterLastUnchangedPageBreak = lineAfterUnchangedPageBreak(startLine, $linesOfScript, rep);

  var $helperLines = createHelperLines($firstLineAfterLastUnchangedPageBreak, $linesOfScript);

  // Bug fix: to be able to get element using its offset, we need to make sure padOuter is
  // as high as padInner
  var originalPadInnerHeight = adjustPadInnerHeight();

  var pageBreakInfo = initializePageBreakInfo($helperLines);

  var lineNumberShift = 0;
  while(!reachedEndOfPad(pageBreakInfo) &&
        !foundEnoughPageBreaksForThisCycle(pageBreaks, performFullPagination)) {

    lineNumberShift -= getNumberOfMergedLinesOnPage(pageBreakInfo);

    var availableHeightOnPageWithoutMargins = pageBreakInfo.offsetAtBeginningOfNextPage.top -
                                              pageBreakInfo.$firstLineOfNextPage.offset().top;
    var $originalLine = getOriginalLineFromHelperLine(pageBreakInfo.$firstLineOfNextPage, $linesOfScript);

    var splitLineInfo = paginationSplit.getSplitInfo(pageBreakInfo.$firstLineOfNextPage, $originalLine, lineNumberShift, availableHeightOnPageWithoutMargins, originalCaretPosition, attributeManager, rep);
    var lineCanBeSplit = !! splitLineInfo;

    if (lineCanBeSplit) {
      // move offset of next page to first inner line of the 2nd half of the split
      var heightOfFirstHalf = splitLineInfo.innerLinesOnFirstHalf * utils.getRegularLineHeight();
      var offsetOfSecondHalf = increaseOffsetTop(pageBreakInfo.$firstLineOfNextPage.offset(), heightOfFirstHalf);
      pageBreakInfo.offsetAtBeginningOfNextPage = offsetOfSecondHalf;

      // mark line to be split
      pageBreaks.push(splitPageBreak(splitLineInfo, pageBreakInfo.$firstLineOfNextPage, $linesOfScript, rep));

      // there will be an extra line from now on
      lineNumberShift++;
    } else {
      // it is a block of lines (a block can have only a single line too)
      var blockInfo = paginationBlocks.getBlockInfo(pageBreakInfo.$firstLineOfNextPage);

      // move offset of next page to first script element of it (ignore scene marks)
      pageBreakInfo.offsetAtBeginningOfNextPage = blockInfo.$topOfBlock.offset();

      // we cannot have a page break between a heading and its act/seq.
      // Move $topOfBlock up if this happens, otherwise just use original $topOfBlock
      pageBreakInfo.$firstLineOfNextPage = utils.getTopSceneMarkOrTargetLine(blockInfo.$topOfBlock);

      // mark line to be on top of page
      pageBreaks.push(nonSplitPageBreak(pageBreakInfo.$firstLineOfNextPage, $linesOfScript, lineNumberShift, rep));
    }

    pageBreakInfo = getNextPageBreakInfo(pageBreakInfo, $helperLines);
  }

  removeHelperLines($helperLines);

  return {
    done: !foundEnoughPageBreaksForThisCycle(pageBreaks, performFullPagination),
    pageBreaksInfo: pageBreaks,
  };
}

// alias to get page height
var fullPage = utils.getMaxPageHeight;

var initializePageBreakInfo = function($helperLines) {
  var $firstLineOfThisPage        = $helperLines.first();
  var offsetAtBeginningOfNextPage = getOffsetOfNextPage($firstLineOfThisPage.offset());
  var $firstLineOfNextPage        = $helperLines.filter(getLineAt(offsetAtBeginningOfNextPage));

  return {
    offsetAtBeginningOfNextPage: offsetAtBeginningOfNextPage,
    $firstLineOfThisPage: $firstLineOfThisPage,
    $firstLineOfNextPage: $firstLineOfNextPage,
  };
}

var getNextPageBreakInfo = function(pageBreakInfo, $helperLines) {
  var $firstLineOfThisPage        = pageBreakInfo.$firstLineOfNextPage;
  var offsetAtBeginningOfNextPage = getOffsetOfNextPage(pageBreakInfo.offsetAtBeginningOfNextPage);
  var $firstLineOfNextPage        = $helperLines.filter(getLineAt(offsetAtBeginningOfNextPage));

  return {
    offsetAtBeginningOfNextPage: offsetAtBeginningOfNextPage,
    $firstLineOfThisPage: $firstLineOfThisPage,
    $firstLineOfNextPage: $firstLineOfNextPage,
  };
}

var getOffsetOfNextPage = function(currentOffset) {
  var topShift = fullPage();
  return increaseOffsetTop(currentOffset, topShift);
}

var increaseOffsetTop = function(offset, topShift) {
  var newTop = offset.top + topShift;
  return { top: newTop, left: offset.left }
}

var getNumberOfMergedLinesOnPage = function(pageBreakInfo) {
  var $linesOfThisPage = pageBreakInfo.$firstLineOfThisPage.nextUntil(pageBreakInfo.$firstLineOfNextPage).andSelf();
  var $mergedLinesOfThisPage = $linesOfThisPage.filter("." + paginationSplit.MERGED_LINE);
  return $mergedLinesOfThisPage.length;
}

var adjustPadInnerHeight = function() {
  var padInnerFrame = utils.getPadOuter().find("iframe[name='ace_inner']");
  var originalHeight = parseInt(padInnerFrame.css("height"));

  // change pad inner css to force pad outer to adjust
  var heightWithHelperLines = utils.getPadInner().height();
  padInnerFrame.css("height", heightWithHelperLines.toString() + "px");

  return originalHeight;
}

var createHelperLines = function($firstLine, $linesOfScript) {
  var $lastLineOfScript      = $linesOfScript.last();
  var startAtOffset          = $firstLine.offset();
  var firstLineToNotBeCloned = getFirstLineNotReachedByThisPaginationCycle(startAtOffset);
  var $linesToClone          = $firstLine.nextUntil(firstLineToNotBeCloned).andSelf();
  var $helperLines           = createCleanClonesOf($linesToClone);

  $helperLines.insertAfter($lastLineOfScript);

  // Bug fix: mark first visible helper line to have no margin top.
  // This is necessary because first line is originally on top of a page
  // (so without any margin), but when it is cloned it is added after a
  // regular line (so it would have a margin)
  adjustFirstVisibleHelperLine($helperLines);

  return $helperLines;
}

var getFirstLineNotReachedByThisPaginationCycle = function(startAtOffset) {
  var endAtOffsetTop   = startAtOffset.top + getTotalHeightOfPaginationCycle();
  var endAtOffset      = { top: Math.ceil(endAtOffsetTop), left: Math.ceil(startAtOffset.left) };
  var $lineAtEndOffset = getLineAt(endAtOffset);

  return $lineAtEndOffset.get(0);
}

var getLineAt = function(offset) {
  var editorDocument  = utils.getPadOuter().find("iframe[name='ace_inner']").get(0).contentDocument;
  var elementAtOffset = editorDocument.elementFromPoint(offset.left, offset.top);
  var $lineAtOffset = $(elementAtOffset).closest("div");

  // offset might be at a margin, so try next line
  if ($lineAtOffset.length === 0) {
    var oneLine = utils.getHeightOfOneLine();
    elementAtOffset = editorDocument.elementFromPoint(offset.left, offset.top + oneLine);
    $lineAtOffset = $(elementAtOffset).closest("div");

    // headings have 2-lines margin, so it's possible that we still didn't reach its content
    if ($lineAtOffset.length === 0) {
      elementAtOffset = editorDocument.elementFromPoint(offset.left, offset.top + 2*oneLine);
      $lineAtOffset = $(elementAtOffset).closest("div");
    }
  }

  return $lineAtOffset;
}

var createCleanClonesOf = function($lines) {
  var $cleanCopies = $lines.clone();
  $cleanCopies = doNotConsiderSceneMarksOf($cleanCopies);
  $cleanCopies = paginationSplit.mergeHelperLines($cleanCopies);
  utils.cleanHelperLines($cleanCopies);

  return $cleanCopies;
}

var adjustFirstVisibleHelperLine = function($helperLines) {
  var $visibleHelperLines = $helperLines.filter(':not(.sceneMark)');
  var $firstVisibleLine = $visibleHelperLines.first();
  $firstVisibleLine.addClass('cloned__first');
}

var doNotConsiderSceneMarksOf = function($lines) {
  // we cannot remove scene marks because they are used later to calculate page break,
  // but we can hide them, as they should not be counted on page height calculation
  $lines.filter('.sceneMark').height(0);

  // headings with scene marks on top of page are manually marked with a class to
  // not have top margins, but when we're paginating this mark should be ignored, as those
  // headings might be in the middle of a page after re-pagination finishes
  cleanMarksOnHeadingsOnTopOfPage($lines);

  return $lines;
}

var removeHelperLines = function($helperLines) {
  $helperLines.remove();
}

var getTotalHeightOfPaginationCycle = function() {
  return MAX_PAGE_BREAKS_PER_CYCLE * (
    // height of one page
    fullPage() +
    // height of page break
    PAGE_BREAK_HEIGHT +
    // assuming worst case: all page breaks have MORE/CONT'D and all of them have a split line
    // which resulted in 2 halves that are 1 line higher than the unsplit line
    3 * utils.getHeightOfOneLine() // (1 for MORE, 1 for CONT'D and 1 for extra line due to split)
  );
}

var getOriginalLineFromHelperLine = function($helperLine, $linesOfScript) {
  var lineId = $helperLine.attr("data-original-id");
  var $originalLine = $linesOfScript.filter("#"+lineId);

  return $originalLine;
}

var nonSplitPageBreak = function($helperLine, $linesOfScript, lineNumberShift, rep) {
  var $originalLine = getOriginalLineFromHelperLine($helperLine, $linesOfScript);

  var nonSplitInfo = paginationNonSplit.getNonSplitInfo($originalLine, lineNumberShift, rep);
  return {
    data: nonSplitInfo,
    lineNumberBeforeClean: nonSplitInfo.lineNumberBeforeClean,
    lineNumberAfterClean: nonSplitInfo.lineNumberAfterClean,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationNonSplit.savePageBreak(data, pageNumber, attributeManager);
      nonSplitInfo.callbackAfterSave(attributeManager);
    }
  };
}
var splitPageBreak = function(splitInfo, $helperLine, $linesOfScript, rep) {
  var $originalLine = getOriginalLineFromHelperLine($helperLine, $linesOfScript);

  return {
    data: splitInfo,
    lineNumberBeforeClean: utils.getLineNumberFromDOMLine($originalLine, rep),
    lineNumberAfterClean: splitInfo.lineNumberAfterClean,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationSplit.savePageBreak(data, pageNumber, attributeManager, editorInfo, rep);
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

var lineAfterUnchangedPageBreak = function(startLine, $linesOfScript, rep) {
  var $lineAfterPageBreak;

  var $startLine = $(utils.getDOMLineFromLineNumber(startLine, rep));
  var $linesWithPageBreaks = $startLine.prevAll(DIV_WITH_PAGE_BREAK);
  if ($linesWithPageBreaks.length === 0) {
    // pad does not have any page break before startLine, get all lines
    $lineAfterPageBreak = $linesOfScript.first();
  } else {
    $lineAfterPageBreak = $linesWithPageBreaks.first().next();
  }

  return $lineAfterPageBreak;
}
