var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');

var linesChanged = {
  rep: undefined,
  lines: {},
  initialized: false,

  add: function(lineNumber) {
    this.lines[lineNumber] = true;
  },

  reset: function(rep) {
    this.rep = rep;
    this.lines = {};
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
  return _(linesChanged.lines).keys().size > 0;
}

exports.minLineChanged = function() {
  return _(_(linesChanged.lines).keys()).min();
}

exports.lineWasChanged = function(lineNumber) {
  return linesChanged.lines[lineNumber];
}
