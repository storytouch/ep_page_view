var $ = require('ep_etherpad-lite/static/js/rjquery').$;

// HACK: page breaks are not *permanently* drawn until everything is setup on the editor.
// To be able to have page breaks drawn when opening the script (before user starts changing
// the script), we need to force redrawPageBreaks() to run on the first Etherpad "tic"
// ("idleWorkTimer" event). This flag controls when to execute this first run of
// redrawPageBreaks()
var firstPageBreakRedrawNotRunYet = true;

exports.aceEditEvent = function(hook, context) {
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
  var $lines = getPadInner().find("div").removeClass("pageBreak");

  // add page break every 5 lines
  var $linesOnEndOfPage = $lines.filter(function(index) {
    return index > 0 && index % 5 === 0;
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

function needInitialPageBreakRedraw(callstack) {
  return firstPageBreakRedrawNotRunYet && callstack.editEvent.eventType === "idleWorkTimer";
}
