var utils = require('./utils');

// Letter
// var REGULAR_LINES_PER_PAGE = 54;
// A4
var REGULAR_LINES_PER_PAGE = 58;

// WARNING: if you change any of these values, you need to change on the CSS of page breaks too
var DEFAULT_PAGE_BREAK_HEIGHT = 10;
var DEFAULT_PAGE_BREAK_MARGING_TOP = 48;
var DEFAULT_PAGE_BREAK_MARGING_BOTTOM = 48;
var DEFAULT_PAGE_BREAK_BORDER_TOP = 1;
var DEFAULT_PAGE_BREAK_BORDER_BOTTOM = 1;
// Bug fix: some zoom values mess up with border (they don't have exactly 1px), so we
// need some extra px's to avoid messing up with pagination
var SAFETY = 2;
var DEFAULT_PAGE_BREAK_TOTAL_HEIGHT =
  DEFAULT_PAGE_BREAK_HEIGHT +
  DEFAULT_PAGE_BREAK_MARGING_TOP +
  DEFAULT_PAGE_BREAK_MARGING_BOTTOM +
  DEFAULT_PAGE_BREAK_BORDER_TOP +
  DEFAULT_PAGE_BREAK_BORDER_BOTTOM +
  SAFETY;

// Use line proportion to find height needed so we always have REGULAR_LINES_PER_PAGE generals/page
var calculatePageHeight = function(oneLineHeight) {
  oneLineHeight = oneLineHeight || utils.getHeightOfOneLine();
  var pageHeightNeeded = oneLineHeight * REGULAR_LINES_PER_PAGE;

  return pageHeightNeeded;
}

// cache maxPageHeight
var maxPageHeight;
exports.getMaxPageHeight = function() {
  maxPageHeight = maxPageHeight || calculatePageHeight();
  return maxPageHeight;
}

var updatePageHeight = function(oneLineHeight) {
  maxPageHeight = calculatePageHeight(oneLineHeight);

  // update cached value for line height
  utils.updateRegularLineHeight();
}

// cache pageBreakHeight
var pageBreakHeight;
var getPageBreakHeight = function() {
  var moreContdLinesHeight = utils.getHeightOfOneLine() * 2; // one line for MORE, another for CONT'D
  pageBreakHeight = DEFAULT_PAGE_BREAK_TOTAL_HEIGHT + moreContdLinesHeight;
  return pageBreakHeight;
}
exports.getPageBreakHeight = getPageBreakHeight;
