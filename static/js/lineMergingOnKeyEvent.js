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
  // check key pressed before anything else to be more efficient
  var isMergeKey = (evt.keyCode === BACKSPACE || evt.keyCode === DELETE) && evt.type === 'keydown';

  // if text is selected, we simply ignore, as it is not a merge event
  if (isMergeKey && !textSelected(editorInfo)) {
    // HACK: we need to get current position after calling synchronizeEditorWithUserSelection(), otherwise
    // some tests might fail
    var currentLine   = rep.selStart[0];
    var caretPosition = getCaretPosition(currentLine, rep, editorInfo, attributeManager);

    var atSecondHalfOfSplit = paginationSplit.lineIsSecondHalfOfSplit(currentLine, attributeManager);
    var atFirstHalfOfSplit  = paginationSplit.lineIsFirstHalfOfSplit(currentLine, attributeManager);

    if (evt.keyCode === BACKSPACE && caretPosition.beginningOfLine && atSecondHalfOfSplit) {
      return {
        line: currentLine-1,
        charsOnFirstHalf: 1,
        charsOnSecondHalf: 1, // remove also the '*'
      };
    } else if (evt.keyCode === DELETE && caretPosition.endOfLine && atFirstHalfOfSplit) {
      return {
        line: currentLine,
        charsOnFirstHalf: 0,
        charsOnSecondHalf: 2, // remove also the '*'
      };
    }
  }
}

var textSelected = function(editorInfo) {
  // HACK: we need to force editor to sync with user selection before testing if there
  // is some text selected
  synchronizeEditorWithUserSelection(editorInfo);

  return !editorInfo.ace_isCaret();
}

var synchronizeEditorWithUserSelection = function(editorInfo) {
  editorInfo.ace_fastIncorp();
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
