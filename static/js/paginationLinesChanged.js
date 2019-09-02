var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');

var linesChanged = {
  rep: undefined,
  lines: new Set(),
  initialized: false,

  add: function(lineNumber) {
    this.lines.add(lineNumber);
  },

  reset: function(rep) {
    this.rep = rep;
    this.lines.clear();
    this.initialized = true;
  },
};

exports.reset = function(rep) {
  linesChanged.reset(rep);
}

exports.markNodeAsChanged = function($line) {
  // Etherpad changes all lines when loading the pad, but we don't want to record those changes
  if (linesChanged.initialized) {
    var lineNumber = utils.getLineNumberFromDOMLine($line, linesChanged.rep);
    linesChanged.add(lineNumber);
  }
}

exports.markLineAsChanged = function(lineNumber) {
  // Etherpad changes all lines when loading the pad, but we don't want to record those changes
  if (linesChanged.initialized) {
    linesChanged.add(lineNumber);
  }
}

exports.hasLinesChanged = function() {
  return linesChanged.lines.size > 0;
}

exports.minLineChanged = function() {
  return _(Array.from(linesChanged.lines)).min();
}

// same as minLineChanged, but returns the minimum line number ABOVE baseLineNumber
exports.minLineChangedFromLine = function(baseLineNumber) {
  var linesAboveBase = _(Array.from(linesChanged.lines)).filter(function(lineNumber) {
    return lineNumber > baseLineNumber;
  });
  return _(linesAboveBase).min();
}

exports.lineWasChanged = function(lineNumber) {
  return linesChanged.lines.has(lineNumber);
}
