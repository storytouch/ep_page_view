var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');
var detailedLinesChangedListener = require('ep_script_scene_marks/static/js/detailedLinesChangedListener');

var BEFORE_PAGE_BREAK_CLASS = 'beforePageBreak';
var AFTER_PAGE_BREAK_CLASS = 'afterPageBreak';

// warning: these classes are used on other places too
// TODO use a single constant on utils, instead of the same string across
// different modules
var FIRST_HALF_CLASS = 'firstHalf';
var SECOND_HALF_CLASS = 'secondHalf';

exports.init = function() {
  markExistingPageBreakLinesWithPaginationClasses(BEFORE_PAGE_BREAK_CLASS, AFTER_PAGE_BREAK_CLASS);
  markExistingPageBreakLinesWithPaginationClasses(FIRST_HALF_CLASS, SECOND_HALF_CLASS);

  ensurePaginationClassesAreAddedWhenPageBreaksAreChanged(BEFORE_PAGE_BREAK_CLASS, AFTER_PAGE_BREAK_CLASS);
  ensurePaginationClassesAreAddedWhenPageBreaksAreChanged(FIRST_HALF_CLASS, SECOND_HALF_CLASS);
}

var markExistingPageBreakLinesWithPaginationClasses = function(sourceClass, targetClass) {
  var $allLinesWithPageBreaks = utils.getPadInner().find('.' + sourceClass);
  markLineAfterPageBreakWithClass($allLinesWithPageBreaks.toArray(), targetClass);
}

var ensurePaginationClassesAreAddedWhenPageBreaksAreChanged = function(sourceClass, targetClass) {
  detailedLinesChangedListener.onLinesAddedOrRemoved(function(linesChanged) {
    var linesWithPageBreaks = getLinesWithPageBreaks(linesChanged.linesAdded, sourceClass);
    markLineAfterPageBreakWithClass(linesWithPageBreaks, targetClass);
  });
}

var getLinesWithPageBreaks = function(linesChanged, sourceClass) {
  return _(linesChanged).filter(function(line) {
    return _(line.classList).contains(sourceClass);
  });
}

var markLineAfterPageBreakWithClass = function(linesWithPageBreaks, targetClass) {
  _(linesWithPageBreaks).each(function(lineWithPageBreak) {
    $(lineWithPageBreak).next().addClass(targetClass);
  });
}
