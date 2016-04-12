var utils = require('./utils');
var paginationSplit = require('./paginationSplit');

exports.getBlockInfo = function($dirtyLine, $cleanLine, currentLineHeight, currentLineInnerHeight) {
  var blockInfo = {
    // height of first line of the block should not consider margins, as margins are not displayed
    // on first element of the page
    blockHeight: currentLineInnerHeight,
    $topOfBlock: $dirtyLine,
    $bottomOfBlock: $dirtyLine,
  };

  var $previousDirtyLine = $dirtyLine.prev();
  var $previousCleanLine = $cleanLine.prev();
  var $nextCleanLine     = $cleanLine.next();

  var typeOfCurrentLine  = utils.typeOf($cleanLine);
  var typeOfPreviousLine = utils.typeOf($previousCleanLine);
  var typeOfNextLine     = utils.typeOf($nextCleanLine);

  var innerLinesOfCurrentLine = getNumberOfInnerLinesOf($cleanLine);

  // block type:
  // (*) => transition (only one line of text)
  //        +--------- $currentLine ----------+
  if (typeOfCurrentLine === "transition" && innerLinesOfCurrentLine === 1) {
    if (typeOfPreviousLine !== "parenthetical" && typeOfPreviousLine !== "dialogue" ) {
      buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine);
    }
    // block type:
    // (*) => (parenthetical || dialogue) (only one line of text) => transition (only one line of text)
    //                                                               +--------- $currentLine ----------+
    else if (getNumberOfInnerLinesOf($previousDirtyLine) === 1) {
      var $lineBeforePreviousDirtyLine = $previousDirtyLine.prev();
      var $lineBeforePreviousCleanLine = $previousCleanLine.prev();
      buildBlockWithTwoPreviousLines(blockInfo, currentLineHeight, $previousCleanLine, $lineBeforePreviousDirtyLine, $lineBeforePreviousCleanLine);
    }
    // block type:
    // (parenthetical || dialogue) (more than one line of text) => transition (only one line of text)
    //                                                             +--------- $currentLine ----------+
    else {
      buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine);
    }
  }
  else if (typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue") {
    if (typeOfPreviousLine === "character") {
      var $lineBeforePreviousDirtyLine = $previousDirtyLine.prev();
      var $lineBeforePreviousCleanLine = $previousCleanLine.prev();
      var typeOfLineBeforePrevious = utils.typeOf($lineBeforePreviousCleanLine);
      // block type:
      // heading => character => (parenthetical || dialogue)
      //                         +------ $currentLine -----+
      if (typeOfLineBeforePrevious === "heading") {
        buildBlockWithTwoPreviousLines(blockInfo, currentLineHeight, $previousCleanLine, $lineBeforePreviousDirtyLine, $lineBeforePreviousCleanLine);
      }
      // block type:
      // !heading => character => (parenthetical || dialogue)
      //                          +------ $currentLine -----+
      else {
        buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine);
      }
    }
    else if (typeOfPreviousLine === "parenthetical" || typeOfPreviousLine === "dialogue") {
      // block type:
      // !character => (parenthetical || dialogue) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
      //                                              +------------------ $currentLine -----------------+
      if (innerLinesOfCurrentLine === 1) {
        var $lineBeforePreviousCleanLine = $previousCleanLine.prev();
        var typeOfLineBeforePrevious = utils.typeOf($lineBeforePreviousCleanLine);
        if (typeOfLineBeforePrevious !== "character" && typeOfNextLine !== "dialogue" && typeOfNextLine !== "parenthetical") {
          buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine);
        }
      }
      // block type:
      // character => (parenthetical || dialogue) (only one line of text) => (parenthetical || dialogue)
      //                                                                     +------ $currentLine -----+
      else if (getNumberOfInnerLinesOf($previousDirtyLine) === 1) {
        var $lineBeforePreviousDirtyLine = $previousDirtyLine.prev();
        var $lineBeforePreviousCleanLine = $previousCleanLine.prev();
        var typeOfLineBeforePrevious = utils.typeOf($lineBeforePreviousCleanLine);
        if (typeOfLineBeforePrevious === "character") {
          buildBlockWithTwoPreviousLines(blockInfo, currentLineHeight, $previousCleanLine, $lineBeforePreviousDirtyLine, $lineBeforePreviousCleanLine);
        }
      }
    }
    // block type:
    // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    //                 +------------------ $currentLine -----------------+
    else if ((typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
      &&
      innerLinesOfCurrentLine === 1) {
      buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine);
    }
  }
  else if ((typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue")
    &&
    (typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
    &&
    innerLinesOfCurrentLine === 1) {
    buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine);
  }
  // block type:
  // (heading || shot) => (action || character || general)
  //                      +-------- $currentLine --------+
  else if ((typeOfCurrentLine === "action" || typeOfCurrentLine === "character" || typeOfCurrentLine === "general")
    &&
    (typeOfPreviousLine === "heading" || typeOfPreviousLine === "shot")) {
    buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine);
  }

  return blockInfo;
}

var getNumberOfInnerLinesOf = function($line) {
  var totalHeight = utils.getLineHeightWithoutMargins($line);
  var heightOfOneLine = utils.getRegularLineHeight();
  var numberOfInnerLines = parseInt(totalHeight / heightOfOneLine);

  return numberOfInnerLines;
}

var buildBlockWithPreviousLine = function(blockInfo, currentLineHeight, $previousDirtyLine, $previousCleanLine) {
  var blockHeight = currentLineHeight +
                    // ignore margins of element on top of the block
                    utils.getLineHeightWithoutMargins($previousCleanLine);
  blockInfo.blockHeight = blockHeight;
  blockInfo.$topOfBlock = $previousDirtyLine;
}

var buildBlockWithTwoPreviousLines = function(blockInfo, currentLineHeight, $previousCleanLine, $lineBeforePreviousDirtyLine, $lineBeforePreviousCleanLine) {
  var blockHeight = currentLineHeight +
                    utils.getLineHeight($previousCleanLine) +
                    // ignore margins of element on top of the block
                    utils.getLineHeightWithoutMargins($lineBeforePreviousCleanLine);
  blockInfo.blockHeight = blockHeight;
  blockInfo.$topOfBlock = $lineBeforePreviousDirtyLine;
}

// copy 2 previous lines + next line to have all lines needed for getBlockInfo()
exports.adjustClonedBlock = function($clonedLine, $targetLine) {
  var $cloneOfNextLine           = utils.cloneLine($targetLine.next());
  var $cloneOfPreviousLine       = utils.cloneLine($targetLine.prev());
  var $cloneOfLineBeforePrevious = utils.cloneLine($targetLine.prev().prev());

  $cloneOfNextLine.insertAfter($clonedLine);
  $cloneOfPreviousLine.insertBefore($clonedLine);
  $cloneOfLineBeforePrevious.insertBefore($cloneOfPreviousLine);
}