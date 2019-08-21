// This file was STRONGLY based on ep_script_elements/static/js/mergeLines.js
var paginationSplit = require('./paginationSplit');

var BACKSPACE = 8;
var DELETE = 46;

exports.aceKeyEvent = function(hook, context) {
  var editorInfo       = context.editorInfo;
  var attributeManager = context.documentAttributeManager;
  var evt              = context.evt;
  var rep              = context.rep;

  var mergeInfo = getMergeInfo(editorInfo, attributeManager, evt, rep);
  if (mergeInfo !== undefined) {
    paginationSplit.mergeLinesWithExtraChars(mergeInfo.line, rep, attributeManager, editorInfo, mergeInfo.charsOnFirstHalf, mergeInfo.charsOnSecondHalf);

    evt.preventDefault();
    return true;
  }

  return false;
}

var getMergeInfo = function(editorInfo, attributeManager, evt, rep) {
  // if text is selected, we simply ignore, as it is not a merge event
  if (evt.isRemoveKey && !textSelected(editorInfo)) {
    var currentLine   = rep.selStart[0];

    if (evt.isBackspace && evt.caretPosition.beginningOfLine && isAtSecondHalfOfSplit(currentLine, attributeManager)) {
      return {
        line: currentLine - 1,
        charsOnFirstHalf: 1,
        charsOnSecondHalf: 1, // remove also the '*'
      };
    } else if (evt.isDelete && evt.caretPosition.endOfLine && isAtFirstHalfOfSplit(currentLine, attributeManager)) {
      return {
        line: currentLine,
        charsOnFirstHalf: 0,
        charsOnSecondHalf: 2, // remove also the '*'
      };
    }
  }
}

var textSelected = function(editorInfo) {
  return !editorInfo.ace_isCaret();
}

var isAtSecondHalfOfSplit = function(currentLine, attributeManager) {
  return paginationSplit.lineIsSecondHalfOfSplit(currentLine, attributeManager);
}

var isAtFirstHalfOfSplit  = function(currentLine, attributeManager) {
  return paginationSplit.lineIsFirstHalfOfSplit(currentLine, attributeManager);
}

var getCaretPosition = function(line, rep, editorInfo, attributeManager) {
  var lineLength = getLength(line, rep);
  var caretPosition = editorInfo.ace_caretColumn();
  var lineHasMarker = attributeManager.lineHasMarker(line);
  var firstPostionOfLine = lineHasMarker ? 1 : 0;

  var atBeginningOfLine = (caretPosition === firstPostionOfLine);
  var atEndOfLine = (caretPosition === lineLength);

  return {
    beginningOfLine: atBeginningOfLine,
    middleOfLine: (!atBeginningOfLine && !atEndOfLine),
    endOfLine: atEndOfLine,
  }
}

var getLength = function(line, rep) {
  var nextLine = line + 1;
  var startLineOffset = rep.lines.offsetOfIndex(line);
  var endLineOffset   = rep.lines.offsetOfIndex(nextLine);

  //lineLength without \n
  var lineLength = endLineOffset - startLineOffset - 1;

  return lineLength;
}
