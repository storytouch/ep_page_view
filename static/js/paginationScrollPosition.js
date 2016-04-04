var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');
var paginationSplit = require('./paginationSplit');

exports.keepViewportScrollPosition = function(action, paginationInfo, rep) {
  var $editor = utils.getPadOuter().find('#outerdocbody');

  // get line info before performing any action that could change editor total height
  var infoOfFirstLineVisibleOnViewport = getInfoOfFirstLineVisibleOnViewport(rep);

  action();

  // Set the top of viewport to be the same Y as the target line
  var targetScroll = getNewTopPositionOf(infoOfFirstLineVisibleOnViewport, paginationInfo, rep);
  $editor.scrollTop(targetScroll); // Works in Chrome
  $editor.parent().scrollTop(targetScroll); // Works in Firefox
}

var getInfoOfFirstLineVisibleOnViewport = function(rep) {
  var targetScroll = utils.getPadOuter().find('#outerdocbody').scrollTop();
  var $firstLineAfterViewportTop = getFirstLineVisibleOnViewport(targetScroll);

  // build object with info needed after pagination
  var info = buildLineInfo($firstLineAfterViewportTop, targetScroll);
  info.lineNumber = utils.getLineNumberFromDOMLine(info.$line, rep);

  // line might be merged during pagination. Get information about its neighbors
  var lineIsFirstHalfOfSplit = paginationSplit.nodeHasPageBreak(info.$line);
  var lineIsSecondHalfOfSplit = paginationSplit.nodeHasPageBreak(info.$line.prev());
  if (lineIsFirstHalfOfSplit) {
    if (info.$line.prev().length > 0) {
      info.previousLine = buildLineInfo(info.$line.prev(), targetScroll);
    }

    // next line is the 2nd half of split, get the line after that
    if (info.$line.next().next().length > 0) {
      info.nextLine = buildLineInfo(info.$line.next().next(), targetScroll);
      // when line on top has a page break between it and line used as reference, and it is merged
      // on repagination, we need an extra adjustment to the scroll position.
      // Here we get the space left by 1st half of split line for the page break, and move up (that's
      // why it is <0)
      info.nextLine.extraShift = - getPageBreakHeightOf(info.$line);
    }
  } else if (lineIsSecondHalfOfSplit) {
    // previous line is the 1st half of split, get the line before that
    if (info.$line.prev().prev().length > 0) {
      info.previousLine = buildLineInfo(info.$line.prev().prev(), targetScroll);
      // when line on top has a page break between it and line used as reference, and it is merged
      // on repagination, we need an extra adjustment to the scroll position.
      // Here we get the space left by 1st half of split line for the page break, and move down (that's
      // why it is >0)
      info.previousLine.extraShift = getPageBreakHeightOf(info.$line.prev());
    }
    if (info.$line.next().length > 0) {
      info.nextLine = buildLineInfo(info.$line.next(), targetScroll);
    }
  }

  return info;
}

var getFirstLineVisibleOnViewport = function(viewportScrollTop) {
  var $lines = utils.getPadInner().find("div");
  var found = false;
  var $linesAfterViewportTop = $lines.filter(function() {
    if (!found && $(this).offset().top >= viewportScrollTop) {
      // found first line that is visible, do not calculate offset().top anymore
      found = true;
      return true;
    }
  });

  // if last line is very high and viewport is in the middle of it, there's no line on
  // $linesAfterViewportTop. So use last line instead
  if ($linesAfterViewportTop.length === 0) {
    $linesAfterViewportTop = $lines.last();
  }

  return $linesAfterViewportTop.first();
}

var buildLineInfo = function($line, targetScroll) {
  var shift = $line.offset().top - targetScroll;

  return {
    $line: $line,
    shiftBetweenLineAndContainer: shift,
  };
}

var getPageBreakHeightOf = function($lineWithPageBreak) {
  return parseInt($lineWithPageBreak.css("padding-bottom"));
}

var getNewTopPositionOf = function(originalLineInfo, paginationInfo, rep) {
  var currentLine = originalLineInfo.$line[0];
  var topPositionShift = originalLineInfo.shiftBetweenLineAndContainer;

  var lineWasReplacedDuringPagination = !lineIsStillOnPad(originalLineInfo);
  if (lineWasReplacedDuringPagination) {
    // line is not on editor anymore, we need to find where it went during pagination
    var pageBreaksInfo = paginationInfo.pageBreaksInfo;

    // was the line split during pagination?
    var originalLineWasSplit = _.find(pageBreaksInfo, function(pageBreakInfo) {
      return pageBreakInfo.isSplit && pageBreakInfo.lineNumberBeforeClean === originalLineInfo.lineNumber;
    });
    if (originalLineWasSplit) {
      var newLineNumber = originalLineWasSplit.lineNumberAfterClean;
      currentLine = rep.lines.atIndex(newLineNumber).lineNode;
    } else {
      // original line was merged during clean, find a neighbor that is still on the pad
      var neighbor;
      if (originalLineInfo.previousLine && lineIsStillOnPad(originalLineInfo.previousLine)) {
        neighbor = originalLineInfo.previousLine;
      } else if (originalLineInfo.nextLine && lineIsStillOnPad(originalLineInfo.nextLine)) {
        neighbor = originalLineInfo.nextLine;
      }

      if (neighbor) {
        var extraShift = neighbor.extraShift || 0;
        currentLine = neighbor.$line[0];
        topPositionShift = neighbor.shiftBetweenLineAndContainer + extraShift;
      }
    }
  }

  return currentLine.offsetTop - topPositionShift;
}

var lineIsStillOnPad = function(lineInfo) {
  return $.contains(utils.getPadInner().get(0), lineInfo.$line.get(0));
}
