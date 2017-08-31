// This feature is needed because small zooms (<= 67%) do not scale font size the same way it
// scales other elements on the page. This causes a page to fit less than 61 chars/line on generals,
// so we need to adjust page width accordantly

var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var browser = require('ep_etherpad-lite/static/js/browser');
var utils = require('./utils');
var DEFAULT_MARGINS = require('ep_script_elements/static/js/fixSmallZooms').DEFAULT_MARGINS;

exports.STYLES_UPDATED = 'STYLES_UPDATED.ep_script_page_view';

// Letter
// var REGULAR_LINES_PER_PAGE = 54;
// A4
var REGULAR_LINES_PER_PAGE = 58;

var LARGE_SCREEN_MIN_WIDTH = 464; // see pagination.css

var DEFAULT_PADDING_LEFT  = 117;
var DEFAULT_PADDING_RIGHT = 78;
var DEFAULT_PADDING       = DEFAULT_PADDING_LEFT + DEFAULT_PADDING_RIGHT;

var DEFAULT_PAGE_WIDTH = 641;
// this was calculated using 100% zoom on Chrome
// on windows the text is rendered differently from mac
var DEFAULT_CHAR_WIDTH = browser.mac ? 7.2 : 6.6;
var DEFAULT_TEXT_WIDTH = DEFAULT_PAGE_WIDTH - DEFAULT_PADDING;

// values needed for MORE/CONT'D update
var DEFAULT_MORE_RIGHT_MARGIN = 242;
var DEFAULT_CONTD_RIGHT_MARGIN = 222;
var DEFAULT_CONTD_WIDTH = 64;
var DEFAULT_CONTD_WIDTH_PTBR = 58;
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

exports.init = function() {
  waitForResizeToFinishThenCall(function() {
    updateStyles();
  });

  updateStyles();
}

// Copied form ep_comments_page
var waitForResizeToFinishThenCall = function(callback) {
  var resizeTimer;
  var timeout = 200;
  $(window).on("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(callback, timeout);
  });
}

var updateStyles = function() {
  updateWidthsAndMargins();
  updatePageHeight();

  utils.getPadOuter().trigger(exports.STYLES_UPDATED);
}

var updateWidthsAndMargins = function() {
  var newCharProportion = getCharProportion();

  updatePageWidth(newCharProportion);
  updateMoreContdStyles(newCharProportion);
}

var updatePageWidth = function(newCharProportion) {
  var newPageWidth = calculatePageWidth(newCharProportion);

  // this was moved from CSS file to here, so it can have a dynamic value
  var pageStyle      = ".outerPV { width: " + newPageWidth + "px !important; }";
  // add some px for safety (to avoid a vertical line to be displayed on 25% or 33%)
  var pageBreakStyle = "splitPageBreak:before, nonSplitPageBreak:before { width: " + (newPageWidth + 50) + "px !important; }";

  // overwrite current style for page width
  // Note: we cannot change .outerPV width using jQuery.css() because Etherpad already overwrites this
  // CSS property on every window resize. Instead, we need to force style to be applied using a dynamic
  // CSS code on pad outer head
  utils.getPadOuter().find("head").append("<style>" + getStyleOnlyForLargeScreens(pageStyle) + "</style>");
  utils.getPadInner().find("head").append("<style>" + getStyleOnlyForLargeScreens(pageBreakStyle) + "</style>");
}

var getStyleOnlyForLargeScreens = function(style) {
  return '@media (min-width : ' + LARGE_SCREEN_MIN_WIDTH + 'px) { ' + style + ' }';
}

var updateMoreContdStyles = function(newCharProportion) {
  var styles = [];

  var characterLeftMargin  = newCharProportion * DEFAULT_MARGINS.character.horizontal.left;
  var characterRightMargin = newCharProportion * DEFAULT_MARGINS.character.horizontal.right;
  var moreRightMargin      = newCharProportion * DEFAULT_MORE_RIGHT_MARGIN;
  var contdRightMargin     = newCharProportion * DEFAULT_CONTD_RIGHT_MARGIN;
  var contdWidth           = newCharProportion * DEFAULT_CONTD_WIDTH;
  var contdWidthPortuguese = newCharProportion * DEFAULT_CONTD_WIDTH_PTBR;

  // align with character left margin
  styles.push("div more:before, div contdLine { margin-left: " + characterLeftMargin + "px; }");

  // need this to move pad text down (and not be on the right of MORE/CONT'D)
  styles.push("div more:before { margin-right: " + moreRightMargin + "px; }");
  styles.push("div contd:after { margin-right: " + contdRightMargin + "px; }");

  // make CONT'D and character name work together
  var contdLineMaxWidthStyle =
    "max-width: calc(100% - " +
                     characterLeftMargin  + "px - " +
                     characterRightMargin + "px + " +
                     contdRightMargin     + "px); "
  var contdLineMinWidthStyle =
    "min-width: calc(100% - " +
                     characterLeftMargin  + "px - " +
                     characterRightMargin + "px); "
  var contdRightMarginStyle = "margin-right: -" + contdRightMargin + "px; "
  styles.push("div contdLine { " + contdLineMaxWidthStyle + contdLineMinWidthStyle + contdRightMarginStyle + " }");

  // display ellipsis when character name is too long
  var characterOnContdMaxWidth =
    "max-width: calc(100% - " +
                     contdWidth       + "px - " +
                     contdRightMargin + "px); "
  var characterOnContdMaxWidthPortuguese =
    "max-width: calc(100% - " +
                     contdWidthPortuguese + "px - " +
                     contdRightMargin     + "px); "
  styles.push("div contd:before { " + characterOnContdMaxWidth + " }");
  styles.push("div contd:after { " + contdWidth + " }");
  // override width because label in pt-br is shorter
  styles.push("#innerdocbody[lang=pt-br] div contd:before { " + characterOnContdMaxWidthPortuguese + " }");
  styles.push("#innerdocbody[lang=pt-br] div contd:after { " + contdWidthPortuguese + " }");

  // leave room for page break on line at the end of the page
  var pageBreakHeight = "padding-bottom: " + calcutePageBreakHeight(newCharProportion) + "px !important;";
  styles.push("div.beforePageBreak.withMoreAndContd { " + pageBreakHeight + " }");

  // add all styles to editor
  utils.getPadInner().find("head").append("<style>" + styles.join("\n") + "</style>");
}

var getCharProportion = function() {
  var oneCharWidth = utils.getWidthOfOneChar();
  var charProportion = oneCharWidth / DEFAULT_CHAR_WIDTH;

  return charProportion;
}

// Use char proportion to find width needed so we always have 61 chars/line for generals
var calculatePageWidth = function(charProportion) {
  var widthNeededToFit61CharsWithCurrentZoom = charProportion * DEFAULT_TEXT_WIDTH;

  return DEFAULT_PADDING + widthNeededToFit61CharsWithCurrentZoom;
}

// Use line proportion to find height needed so we always have REGULAR_LINES_PER_PAGE generals/page
var calculatePageHeight = function() {
  var oneLineHeight = utils.getHeightOfOneLine();
  var pageHeightNeeded = oneLineHeight * REGULAR_LINES_PER_PAGE;

  return pageHeightNeeded;
}

// cache maxPageHeight
var maxPageHeight;
exports.getMaxPageHeight = function() {
  maxPageHeight = maxPageHeight || calculatePageHeight();
  return maxPageHeight;
}

var updatePageHeight = function() {
  maxPageHeight = calculatePageHeight();

  // update cached value for line height
  utils.updateRegularLineHeight();
}

// cache pageBreakHeight
var pageBreakHeight;
var getPageBreakHeight = function() {
  return pageBreakHeight;
}
exports.getPageBreakHeight = getPageBreakHeight;

var calcutePageBreakHeight = function(newCharProportion) {
  var moreContdLinesHeight = newCharProportion * utils.getHeightOfOneLine() * 2; // one line for MORE, another for CONT'D
  pageBreakHeight = DEFAULT_PAGE_BREAK_TOTAL_HEIGHT + moreContdLinesHeight;
  return pageBreakHeight;
}
