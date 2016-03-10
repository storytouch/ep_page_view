// This feature is needed because small zooms (<= 67%) do not scale font size the same way it
// scales other elements on the page. This causes a page to fit less than 61 chars/line on generals,
// so we need to adjust page width accordantly

var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var utils = require('./utils');

var DEFAULT_MARGIN_LEFT  = 117; // WARNING: if you change this here, you need to change on the CSS too
var DEFAULT_MARGIN_RIGHT = 78;  // WARNING: if you change this here, you need to change on the CSS too
var DEFAULT_MARGIN       = DEFAULT_MARGIN_LEFT + DEFAULT_MARGIN_RIGHT;

var DEFAULT_PAGE_WIDTH = 641; // WARNING: if you change this here, you need to change on the CSS too
var DEFAULT_CHAR_WIDTH = 7.2; // this was calculated using 100% zoom on Chrome
var DEFAULT_TEXT_WIDTH = DEFAULT_PAGE_WIDTH - DEFAULT_MARGIN;

exports.init = function() {
  waitForResizeToFinishThenCall(function() {
    updatePageWidth();
  });

  updatePageWidth();
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

var updatePageWidth = function() {
  var newPageWidth = calculatePageWidth();

  // this was moved from CSS file to here, so it can have a dynamic value
  var pageStyle      = ".outerPV { width: " + newPageWidth + "px !important; }";
  // add some px for safety (to avoid a vertical line to be displayed on 25% or 33%)
  var pageBreakStyle = "splitPageBreak:before, nonSplitPageBreak:before { width: " + (newPageWidth + 11) + "px !important; }";

  // overwrite current style for page width
  // Note: we cannot change .outerPV width using jQuery.css() because Etherpad already overwrites this
  // CSS property on every window resize. Instead, we need to force style to be applied using a dynamic
  // CSS code on pad outer head
  utils.getPadOuter().find("head").append("<style>" + pageStyle + "</style>");
  utils.getPadInner().find("head").append("<style>" + pageBreakStyle + "</style>");
}

// Use char proportion to find width needed so we always have 61 chars/line for generals
var calculatePageWidth = function() {
  var oneCharWidth = getWidthOfOneChar();
  var charProportion = oneCharWidth / DEFAULT_CHAR_WIDTH;
  var widthNeededToFit61CharsWithCurrentZoom = charProportion * DEFAULT_TEXT_WIDTH;

  return DEFAULT_MARGIN + widthNeededToFit61CharsWithCurrentZoom;
}

var getWidthOfOneChar = function() {
  return utils.getPadOuter().find("#linemetricsdiv").get(0).getBoundingClientRect().width;
}
