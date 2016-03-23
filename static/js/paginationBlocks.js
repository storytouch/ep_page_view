var utils = require('./utils');
var paginationSplit = require('./paginationSplit');

exports.getBlockInfo = function($currentLine, currentLineHeight, currentLineInnerHeight) {
  var blockInfo = {
    // height of first line of the block should not consider margins, as margins are not displayed
    // on first element of the page
    blockHeight: currentLineInnerHeight,
    $topOfBlock: $currentLine,
    $bottomOfBlock: $currentLine,
  };

  var $previousLine = $currentLine.prev();
  var $nextLine     = $currentLine.next();

  var typeOfCurrentLine  = utils.typeOf($currentLine);
  var typeOfPreviousLine = utils.typeOf($previousLine);
  var typeOfNextLine     = utils.typeOf($nextLine);

  var innerLinesOfCurrentLine = getNumberOfInnerLinesOf($currentLine);

  // block type:
  // (*) => transition (only one line of text)
  //        +--------- $currentLine ----------+
  if (typeOfCurrentLine === "transition" && innerLinesOfCurrentLine === 1) {
    if (typeOfPreviousLine !== "parenthetical" && typeOfPreviousLine !== "dialogue" ) {
      buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousLine);
    }
    // block type:
    // (*) => (parenthetical || dialogue) (only one line of text) => transition (only one line of text)
    //                                                               +--------- $currentLine ----------+
    else if (getNumberOfInnerLinesOf($previousLine) === 1) {
      var $lineBeforePrevious = $previousLine.prev();
      buildBlockWithTwoPreviousLines(blockInfo, currentLineHeight, $previousLine, $lineBeforePrevious);
    }
    // block type:
    // (parenthetical || dialogue) (more than one line of text) => transition (only one line of text)
    //                                                             +--------- $currentLine ----------+
    else {
      buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousLine);
    }
  }
  else if (typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue") {
    if (typeOfPreviousLine === "character") {
      var $lineBeforePrevious = $previousLine.prev();
      var typeOfLineBeforePrevious = utils.typeOf($lineBeforePrevious);
      // block type:
      // heading => character => (parenthetical || dialogue)
      //                         +------ $currentLine -----+
      if (typeOfLineBeforePrevious === "heading") {
        buildBlockWithTwoPreviousLines(blockInfo, currentLineHeight, $previousLine, $lineBeforePrevious);
      }
      // block type:
      // !heading => character => (parenthetical || dialogue)
      //                          +------ $currentLine -----+
      else {
        buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousLine);
      }
    }
    else if (typeOfPreviousLine === "parenthetical" || typeOfPreviousLine === "dialogue") {
      // block type:
      // !character => (parenthetical || dialogue) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
      //                                              +------------------ $currentLine -----------------+
      if (innerLinesOfCurrentLine === 1) {
        var $lineBeforePrevious = $previousLine.prev();
        var typeOfLineBeforePrevious = utils.typeOf($lineBeforePrevious);
        if (typeOfLineBeforePrevious !== "character" && typeOfNextLine !== "dialogue" && typeOfNextLine !== "parenthetical") {
          buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousLine);
        }
      }
      // block type:
      // character => (parenthetical || dialogue) (only one line of text) => (parenthetical || dialogue)
      //                                                                     +------ $currentLine -----+
      else if (getNumberOfInnerLinesOf($previousLine) === 1) {
        var $lineBeforePrevious = $previousLine.prev();
        var typeOfLineBeforePrevious = utils.typeOf($lineBeforePrevious);
        if (typeOfLineBeforePrevious === "character") {
          buildBlockWithTwoPreviousLines(blockInfo, currentLineHeight, $previousLine, $lineBeforePrevious);
        }
      }
    }
    // block type:
    // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    //                 +------------------ $currentLine -----------------+
    else if ((typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
      &&
      innerLinesOfCurrentLine === 1) {
      buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousLine);
    }
  }
  else if ((typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue")
    &&
    (typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
    &&
    innerLinesOfCurrentLine === 1) {
    buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousLine);
  }
  // block type:
  // (heading || shot) => (action || character || general)
  //                      +-------- $currentLine --------+
  else if ((typeOfCurrentLine === "action" || typeOfCurrentLine === "character" || typeOfCurrentLine === "general")
    &&
    (typeOfPreviousLine === "heading" || typeOfPreviousLine === "shot")) {
    buildBlockWithPreviousLine(blockInfo, currentLineHeight, $previousLine);
  }

  return blockInfo;
}

var getNumberOfInnerLinesOf = function($line) {
  var totalHeight = $line.height();
  var heightOfOneLine = utils.getRegularLineHeight();
  var numberOfInnerLines = parseInt(totalHeight / heightOfOneLine);

  return numberOfInnerLines;
}

var buildBlockWithPreviousLine = function(blockInfo, currentLineHeight, $previousLine) {
  // ignore margins of element on top of the block
  var blockHeight = currentLineHeight + utils.getLineHeightWithoutMargins($previousLine);
  blockInfo.blockHeight = blockHeight;
  blockInfo.$topOfBlock = $previousLine;
}

var buildBlockWithTwoPreviousLines = function(blockInfo, currentLineHeight, $previousLine, $lineBeforePrevious) {
  // ignore margins of element on top of the block
  var blockHeight = currentLineHeight + utils.getLineHeight($previousLine) + utils.getLineHeightWithoutMargins($lineBeforePrevious);
  blockInfo.blockHeight = blockHeight;
  blockInfo.$topOfBlock = $lineBeforePrevious;
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