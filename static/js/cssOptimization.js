var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');
var detailedLinesChangedListener = require('ep_script_scene_marks/static/js/detailedLinesChangedListener');

var BEFORE_PAGE_BREAK_CLASS = 'beforePageBreak';
var AFTER_PAGE_BREAK_CLASS = 'afterPageBreak';

var FIRST_HALF_CLASS = 'firstHalf';
var SECOND_HALF_CLASS = 'secondHalf';

exports.init = function() {
  initializePaginationClass(BEFORE_PAGE_BREAK_CLASS, AFTER_PAGE_BREAK_CLASS);
  initializePaginationClass(FIRST_HALF_CLASS, SECOND_HALF_CLASS);

  updatePaginationClassWhenLinesWithPageBreaksAreChanged(BEFORE_PAGE_BREAK_CLASS, AFTER_PAGE_BREAK_CLASS);
  updatePaginationClassWhenLinesWithPageBreaksAreChanged(FIRST_HALF_CLASS, SECOND_HALF_CLASS);
}

var initializePaginationClass = function(sourceClass, targetClass) {
  var $allLinesWithPageBreaks = utils.getPadInner().find('.' + sourceClass);
  updatePageBreakClass($allLinesWithPageBreaks.toArray(), targetClass);
}

var updatePaginationClassWhenLinesWithPageBreaksAreChanged = function(sourceClass, targetClass) {
  detailedLinesChangedListener.onLinesAddedOrRemoved(function(linesChanged) {
    var linesWithPageBreaks = getLinesWithPageBreaks(linesChanged.linesAdded, sourceClass);
    updatePageBreakClass(linesWithPageBreaks, targetClass);
  });
}

var getLinesWithPageBreaks = function(linesChanged, sourceClass) {
  return _(linesChanged).filter(function(line) {
    return _(line.classList).contains(sourceClass);
  });
}

var updatePageBreakClass = function(linesWithPageBreaks, targetClass) {
  _(linesWithPageBreaks).each(function(lineWithPageBreak) {
    $(lineWithPageBreak).next().addClass(targetClass);
  });
}
