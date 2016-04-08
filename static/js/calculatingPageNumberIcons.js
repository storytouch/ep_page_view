var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils = require('./utils');

exports.hideAll = function() {
  var $lastPageBreakOfPreviousCycle = utils.getPadInner().find("div.lastPaginated");
  $lastPageBreakOfPreviousCycle.removeClass("lastPaginated");
}

exports.displayAllAfterLine = function(lineNumber, rep) {
  exports.hideAll();

  var $lastPageBreakOfThisCycle = $(utils.getDOMLineFromLineNumber(lineNumber, rep));
  $lastPageBreakOfThisCycle.addClass("lastPaginated");
}
