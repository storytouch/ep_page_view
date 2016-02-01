exports.getCurrentCaretPosition = function(rep) {
  var startOffset = getOffsetOfPosition(rep.selStart, rep);
  var endOffset   = getOffsetOfPosition(rep.selEnd, rep);

  return {
    startLine: rep.selStart[0],
    startColumn: rep.selStart[1],
    endLine: rep.selEnd[0],
    endColumn: rep.selEnd[1],
    startOffset: startOffset,
    endOffset: endOffset,
  };
}

exports.moveCaretToPosition = function(position, positionAdjustment, rep, editorInfo) {
  positionAdjustment = positionAdjustment || {
    charsOnStart: 0,
    charsOnEnd: 0,
  };

  var newStartOffset = positionAdjustment.charsOnStart + position.startOffset;
  var newEndOffset   = positionAdjustment.charsOnEnd + position.endOffset;
  var newSelStart    = getPositionFromOffsetAndAdjustment(newStartOffset, rep);
  var newSelEnd      = getPositionFromOffsetAndAdjustment(newEndOffset, rep);

  editorInfo.ace_performSelectionChange(newSelStart, newSelEnd, true);
  editorInfo.ace_updateBrowserSelectionFromRep();
}

var getOffsetOfPosition = function(position, rep) {
  var line   = position[0];
  var column = position[1];

  return rep.lines.offsetOfIndex(line) + column;
}

var getPositionFromOffsetAndAdjustment = function(offset, rep) {
  var line = rep.lines.indexOfOffset(offset);
  var lineStartOffset = rep.lines.offsetOfIndex(line);
  var column = offset - lineStartOffset;

  return [line, column];
}

// Make some adjustments to original position, according to the current positionAdjustment received.
// Returns adjusted positionAdjustment.
exports.includeSplitForLine = function(splitPosition, originalPosition, positionAdjustment, attributeManager) {
  var adjustedPosition = positionAdjustment || {
    charsOnStart: 0,
    charsOnEnd: 0,
  };

  // adjust selection (caret) start
  var caretLine = originalPosition.startLine;
  var caretColumn = originalPosition.startColumn;
  adjustedPosition.charsOnStart += calculateCharsToAdd(caretLine, caretColumn, splitPosition, attributeManager);

  // adjust selection (caret) end
  var caretLine = originalPosition.endLine;
  var caretColumn = originalPosition.endColumn;
  adjustedPosition.charsOnEnd += calculateCharsToAdd(caretLine, caretColumn, splitPosition, attributeManager);

  return adjustedPosition;
}

// Possible adjustments are:
//   A. caret will be after first half of line being split:
//     1. +1 char for each line split (the "\n")
//     2. +2 chars (+1 for each line without line attribute): line split adds a line attribute, which adds
//        an extra "*" to the beginning of the line.
//   B: caret will be on first half:
//     1. not applicable: the extra "\n" will be created after caret, so it does not affect current caret
//        position.
//     2. +1 char (instead of +2): the second extra "*" will be added after caret, so it does not affect
//        current caret position. Only the first "*" needs to be considered on the adjustment.
var calculateCharsToAdd = function(caretLine, caretColumn, splitPosition, attributeManager) {
  var lineBeingSplit = splitPosition[0];
  var columnBeingSplit = splitPosition[1];

  var charsToAdd = 0;
  // A. caret will be after both halves of line being split
  if (caretLine >= lineBeingSplit && caretColumn >= columnBeingSplit) {
    // 1. +1 char for each line split
    charsToAdd++;

    // 2. +2 chars for each line without line attribute
    if (!lineHasLineAttribute(lineBeingSplit, attributeManager)) {
      charsToAdd += 2;
    }
  }
  // B: caret will be on first half
  else if (caretLine === lineBeingSplit && caretColumn < columnBeingSplit) {
    // +1 char (instead of +2)
    if (!lineHasLineAttribute(lineBeingSplit, attributeManager)) {
      charsToAdd++;
    }
  }

  return charsToAdd;
}

// Make some adjustments to original position, according to the current positionAdjustment received.
// Returns adjusted positionAdjustment.
exports.includeMergeForLine = function(lineBeingMerged, originalPosition, positionAdjustment, attributeManager) {
  var adjustedPosition = positionAdjustment || {
    charsOnStart: 0,
    charsOnEnd: 0,
  };

  // adjust selection (caret) start
  var caretLine = originalPosition.startLine;
  adjustedPosition.charsOnStart += calculateCharsToRemove(caretLine, lineBeingMerged, attributeManager);

  // adjust selection (caret) end
  var caretLine = originalPosition.endLine;
  adjustedPosition.charsOnEnd += calculateCharsToRemove(caretLine, lineBeingMerged, attributeManager);

  return adjustedPosition;
}

// Possible adjustments are:
//   A. caret was after both halves of line being merged:
//     1. -1 char for each line merge (the "\n")
//     2. -2 chars (-1 for each line without line attribute): line split adds a line attribute, which adds
//         an extra "*" to the beginning of the line, so when we merge that line this char will be gone.
//   B: caret was on first half:
//     1. not applicable: the extra "\n" was created after caret, so it does not affect current caret
//        position
//     2. -1 char (instead of -2): the second extra "*" was added after caret, so it does not affect
//        current caret position. Only the first "*" needs to be considered on the adjustment.
//   C: caret was on second half:
//     1. same as original adjustments (-1 char): the extra "\n" was created before caret, so it *does*
//        affect current caret position
//     2. -1 char (instead of -2): the second extra "*" was added after caret, so it does not affect
//        current caret position. Only the first "*" needs to be considered on the adjustment.
var calculateCharsToRemove = function(caretLine, lineBeingMerged, attributeManager) {
  var charsToAdd = 0;

  // A. caret was after both halves of line being merged
  if (caretLine > lineBeingMerged+1) {
    // 1. -1 char for each line merge
    charsToAdd--;

    // 2. -2 chars (-1 for each line without line attribute)
    if (!lineHasLineAttribute(lineBeingMerged, attributeManager)) {
      charsToAdd -= 2;
    }
  }
  // B: caret was on first half:
  else if (caretLine === lineBeingMerged) {
    // 2. -1 char (instead of -2)
    if (!lineHasLineAttribute(lineBeingMerged, attributeManager)) {
      charsToAdd--;
    }
  }
  // C: caret was on second half:
  else if (caretLine === lineBeingMerged+1) {
    // 1. -1 char for each line merge
    charsToAdd--;

    // 2. -1 char (instead of -2)
    if (!lineHasLineAttribute(lineBeingMerged, attributeManager)) {
      charsToAdd--;
    }
  }
  return charsToAdd;
}

var lineHasLineAttribute = function(lineNumber, attributeManager) {
  return attributeManager.lineHasMarker(lineNumber);
}
