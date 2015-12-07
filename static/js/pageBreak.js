var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var REGULAR_LINES_PER_PAGE = 5;

// HACK: page breaks are not *permanently* drawn until everything is setup on the editor.
// To be able to have page breaks drawn when opening the script (before user starts changing
// the script), we need to force redrawPageBreaks() to run on the first Etherpad "tic"
// ("idleWorkTimer" event). This flag controls when to execute this first run of
// redrawPageBreaks()
var firstPageBreakRedrawNotRunYet = true;

exports.aceEditEvent = function(hook, context) {
  // don't do anything if page break is disabled
  if (!clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled) return;

  var cs = context.callstack;

  // force redrawPageBreaks() to run. See notes on firstPageBreakRedrawNotRunYet for more details
  if (needInitialPageBreakRedraw(cs)) {
    redrawPageBreaks();
    firstPageBreakRedrawNotRunYet = false;
  }

  // don't do anything if text did not change
  if(!cs.docTextChanged) return;

  redrawPageBreaks();
}

var redrawPageBreaks = function() {
  // clean page breaks
  var $lines = getPadInner().find("div").removeClass("pageBreak");

  var maxPageHeight = getMaxPageHeight();

  // select lines to have page breaks
  var currentPageHeight = 0;
  var skippingEmptyLines = false;
  var $linesOnEndOfPage = $lines.filter(function(index) {
    // HACK: ignore empty lines on top of pages.
    // We need this because :before/:after pseudo elements (as page breaks are implemented)
    // are not displayed correctly over some elements (including <br>, which is the
    // representation of empty lines on Etherpad): every empty line after a page break is
    // displayed on the previous page (before the page break), although they are placed
    // *after* the page break. So to work around this limitation, we ignore all empty lines
    // on top the pages
    // Source: http://stackoverflow.com/questions/3538506/which-elements-support-the-before-and-after-pseudo-elements?rq=1#3538529
    var lineIsEmpty = $(this).text().length === 0;
    if (skippingEmptyLines && lineIsEmpty) return false;

    // ok, line is not empty, so we stop skipping empty lines
    skippingEmptyLines = false;

    var shouldBreakPage = false;
    var lineHeight = $(this).height();
    // Q: if this line is placed on current page, will the page height be over the
    // allowed max height?
    if (currentPageHeight + lineHeight > maxPageHeight) {
      // A: yes, so place the line on next page

      // ignore empty lines on top of pages (see details about this HACK above)
      if (lineIsEmpty) {
        currentPageHeight = 0;
        // start skipping lines again
        skippingEmptyLines = true;
      } else {
        currentPageHeight = lineHeight;
        skippingEmptyLines = false;
      }

      shouldBreakPage = true;
    } else {
      // A: no, so simply increase current page height
      currentPageHeight += lineHeight;
    }

    return shouldBreakPage;
  }).addClass("pageBreak");
}

// Easier access to outer pad
var padOuter;
var getPadOuter = function() {
 padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
 return padOuter;
}

// Easier access to inner pad
var padInner;
var getPadInner = function() {
 padInner = padInner || getPadOuter().find('iframe[name="ace_inner"]').contents();
 return padInner;
}

var maxPageHeight;
var getMaxPageHeight = function() {
  maxPageHeight = maxPageHeight || (REGULAR_LINES_PER_PAGE * getRegularLineHeight());
  return maxPageHeight;
}

var getRegularLineHeight = function() {
  var $editor = getPadInner().find("#innerdocbody");
  return getFloatValueOfCSSProperty($editor, "line-height");
}

var getFloatValueOfCSSProperty = function($element, property){
  var valueString = $element.css(property);
  return parseFloat(valueString);
}

var needInitialPageBreakRedraw = function(callstack) {
  return firstPageBreakRedrawNotRunYet && callstack.editEvent.eventType === "idleWorkTimer";
}
