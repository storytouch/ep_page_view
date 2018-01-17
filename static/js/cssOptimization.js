var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');
var detailedLinesChangedListener = require('ep_script_scene_marks/static/js/detailedLinesChangedListener');

var BEFORE_PAGE_BREAK_CLASS = 'beforePageBreak';
var AFTER_PAGE_BREAK_CLASS = 'afterPageBreak';

exports.init = function() {
  initializePaginationClass();
  updatePaginationClassWhenLinesWithPageBreaksAreChanged();
}

var initializePaginationClass = function() {
  var $allLinesWithPageBreaks = utils.getPadInner().find('.' + BEFORE_PAGE_BREAK_CLASS);
  updatePageBreakClass($allLinesWithPageBreaks.toArray());
}

var updatePaginationClassWhenLinesWithPageBreaksAreChanged = function() {
  detailedLinesChangedListener.onLinesAddedOrRemoved(function(linesChanged) {
    var linesWithPageBreaks = getLinesWithPageBreaks(linesChanged.linesAdded);
    updatePageBreakClass(linesWithPageBreaks);
  });
}

var getLinesWithPageBreaks = function(linesChanged) {
  return _(linesChanged).filter(function(line) {
    return _(line.classList).contains(BEFORE_PAGE_BREAK_CLASS);
  });
}

var updatePageBreakClass = function(linesWithPageBreaks) {
  _(linesWithPageBreaks).each(function(lineWithPageBreak) {
    $(lineWithPageBreak).next().addClass(AFTER_PAGE_BREAK_CLASS);
  });
}
