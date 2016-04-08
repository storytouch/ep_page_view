var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils                      = require('./utils');
var paginationBlocks           = require('./paginationBlocks');
var paginationSplit            = require('./paginationSplit');
var paginationNonSplit         = require('./paginationNonSplit');
var getMaxPageHeight           = require('./fixSmallZooms').getMaxPageHeight;

var PAGE_BREAK = paginationNonSplit.PAGE_BREAK_TAG + "," + paginationSplit.PAGE_BREAK_TAG;
var DIV_WITH_PAGE_BREAK = "div:has(" + PAGE_BREAK + ")";

var MAX_PAGE_BREAKS_PER_CYCLE = 5;

exports.calculatePageBreaks = function(startLine, originalCaretPosition, attributeManager, rep, performFullPagination) {
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

    utils.removeClonedLines();

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
  var $clonedLine = paginationSplit.cloneLineIfSplitBetweenPages($targetLine) ||
                    cloneLineIfAfterAPageBreak($targetLine);
  var lineWasCloned = !!$clonedLine;

  if (lineWasCloned) {
    // make sure cloned lines have all information needed by paginationBlocks
    paginationBlocks.adjustClonedBlock($clonedLine, $targetLine);

    $clonedLine.insertAfter($lastLine);
  } else {
    // it wasn't necessary to clone line, so we can use the original one
    $clonedLine = $targetLine;
  }

  return $clonedLine;
}

var cloneLineIfAfterAPageBreak = function($targetLine) {
  var $clonedLine;

  var lineIsAfterAPageBreak = $targetLine.prev().find(PAGE_BREAK).length > 0;
  if (lineIsAfterAPageBreak) {
    $clonedLine = utils.cloneLine($targetLine);
  }

  return $clonedLine;
}