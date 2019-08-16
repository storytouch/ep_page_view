var utils = require('./utils');
var paginationLinesChanged = require('./paginationLinesChanged');

var sceneMarkUtils = require('ep_script_scene_marks/static/js/utils');

exports.init = function() {
  startObserving();
}

exports.performIgnoringLineChanges = function(action) {
  pauseObserving();
  action();
  startObserving();
}

var pauseObserving = function() {
  getObserver().disconnect();
}
var startObserving = function() {
  var $editor = utils.getPadInner().find('#innerdocbody');
  getObserver().observe($editor.get(0), { childList: true });
}

exports.markNodeAsChangedIfIsNotASceneMark = function($line) {
  var lineIsASceneMark = sceneMarkUtils.checkIfHasSceneMark($line);
  if (!lineIsASceneMark) {
    paginationLinesChanged.markNodeAsChanged($line);
  }
}
var markNodeAsChangedIfIsNotASceneMark = exports.markNodeAsChangedIfIsNotASceneMark;

var observer;
var getObserver = function() {
  observer = observer || createObserver();
  return observer;
}

var createObserver = function() {
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
  var newObserver = new MutationObserver(function(mutations) {
    var siblingStillOnPad = findFirstSiblingStillOnPad(mutations);
    if (siblingStillOnPad) {
      var $lineOfSibling = $(siblingStillOnPad).closest('div').addBack().first();
      markNodeAsChangedIfIsNotASceneMark($lineOfSibling);
    }
  });

  return newObserver;
}

var findFirstSiblingStillOnPad = function(mutations) {
  var siblingStillOnPad = null;

  for (var i = 0; i < mutations.length && !siblingStillOnPad; i++) {
    var mutation = mutations[i];
    // observe only line removal, not new line adding
    if (mutation.removedNodes.length > 0) {
      siblingStillOnPad = getSiblingStillOnPad(mutation.previousSibling) || getSiblingStillOnPad(mutation.nextSibling);
    }
  }

  return siblingStillOnPad;
}

var getSiblingStillOnPad = function(candidate) {
  if (candidate && candidate.isConnected) {
    return candidate;
  }
  return null;
}
