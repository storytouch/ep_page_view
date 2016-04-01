var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');

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
  var $lines = utils.getPadInner().find("div");
  // TODO improve this to start from caret position and look around its line
  var $linesAfterViewportTop = $lines.filter(function() {
    return $(this).offset().top >= targetScroll;
  });

  // if last line is very high and viewport is in the middle of it, there's no line on
  // $linesAfterViewportTop. So use last line instead
  if ($linesAfterViewportTop.length === 0) {
    $linesAfterViewportTop = $lines.last();
  }

  var $firstLineAfterViewportTop = $linesAfterViewportTop.first();
  var shiftBetweenLineAndContainer = $firstLineAfterViewportTop.offset().top - targetScroll;

  return {
    $line: $firstLineAfterViewportTop,
    lineNumber: utils.getLineNumberFromDOMLine($firstLineAfterViewportTop, rep),
    shiftBetweenLineAndContainer: shiftBetweenLineAndContainer,
  };
}

var getNewTopPositionOf = function(originalLineInfo, paginationInfo, rep) {
  var currentLine = originalLineInfo.$line[0];

  var lineWasReplacedDuringPagination = !originalLineInfo.$line.is(":visible");
  if (lineWasReplacedDuringPagination) {
    // line is not on editor anymore, we need to find where it went during pagination
    var pageBreaksInfo = paginationInfo.pageBreaksInfo;

    // was the line split during pagination?
    var originalLineWasSplit = _.find(pageBreaksInfo, function(pageBreakInfo) {
      return pageBreakInfo.lineNumberBeforeClean === originalLineInfo.lineNumber;
    });
    if (originalLineWasSplit) {
      var newLineNumber = originalLineWasSplit.lineNumberAfterClean;
      currentLine = rep.lines.atIndex(newLineNumber).lineNode;
    } else {
      // original line was merged during clean
      // TODO
    }
  }

  return currentLine.offsetTop - originalLineInfo.shiftBetweenLineAndContainer;
}
