var utils = require('./utils');

exports.getBlockInfo = function($currentLine) {
  // height of first line of the block should not consider margins, as margins are not displayed
  // on first element of the page
  var currentLineHeight = $currentLine.height();
  var blockInfo = {
    blockHeight: currentLineHeight,
    $topOfBlock: $currentLine,
    $bottomOfBlock: $currentLine,
  };

  var $previousLine = $currentLine.prev();
  var $nextLine     = $currentLine.next();

  var typeOfCurrentLine  = utils.typeOf($currentLine);
  var typeOfPreviousLine = utils.typeOf($previousLine);
  var typeOfNextLine     = utils.typeOf($nextLine);

  // block type:
  // (*) => transition (only one line of text)
  //        +--------- $currentLine ----------+
  if (typeOfCurrentLine === "transition" && getNumberOfInnerLinesOf($currentLine) === 1) {
    if (typeOfPreviousLine !== "parenthetical" && typeOfPreviousLine !== "dialogue" ) {
      var blockHeight = currentLineHeight + utils.getLineHeight($previousLine);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $previousLine;
    }
    // block type:
    // (*) => (parenthetical || dialogue) (only one line of text) => transition (only one line of text)
    //                                                               +--------- $currentLine ----------+
    else if (getNumberOfInnerLinesOf($previousLine) === 1) {
      var $lineBeforePrevious = $previousLine.prev();
      var blockHeight = currentLineHeight + utils.getLineHeight($previousLine) + utils.getLineHeight($lineBeforePrevious);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $lineBeforePrevious;
    }
    // block type:
    // (parenthetical || dialogue) (more than one line of text) => transition (only one line of text)
    //                                                             +--------- $currentLine ----------+
    else {
      var blockHeight = currentLineHeight + utils.getLineHeight($previousLine);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $previousLine;
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
        var blockHeight = currentLineHeight + utils.getLineHeight($previousLine) + utils.getLineHeight($lineBeforePrevious);
        blockInfo.blockHeight = blockHeight;
        blockInfo.$topOfBlock = $lineBeforePrevious;
      }
      // block type:
      // !heading => character => (parenthetical || dialogue)
      //                          +------ $currentLine -----+
      else {
        var blockHeight = currentLineHeight + utils.getLineHeight($previousLine);
        blockInfo.blockHeight = blockHeight;
        blockInfo.$topOfBlock = $previousLine;
      }
    }
    else if (typeOfPreviousLine === "parenthetical" || typeOfPreviousLine === "dialogue") {
      // block type:
      // !character => (parenthetical || dialogue) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
      //                                              +------------------ $currentLine -----------------+
      if (getNumberOfInnerLinesOf($currentLine) === 1) {
        var $lineBeforePrevious = $previousLine.prev();
        var typeOfLineBeforePrevious = utils.typeOf($lineBeforePrevious);
        if (typeOfLineBeforePrevious !== "character" && typeOfNextLine !== "dialogue" && typeOfNextLine !== "parenthetical") {
          var blockHeight = currentLineHeight + utils.getLineHeight($previousLine);
          blockInfo.blockHeight = blockHeight;
          blockInfo.$topOfBlock = $previousLine;
        }
      }
      // block type:
      // character => (parenthetical || dialogue) (only one line of text) => (parenthetical || dialogue)
      //                                                                     +------ $currentLine -----+
      else if (getNumberOfInnerLinesOf($previousLine) === 1) {
        var $lineBeforePrevious = $previousLine.prev();
        var typeOfLineBeforePrevious = utils.typeOf($lineBeforePrevious);
        if (typeOfLineBeforePrevious === "character") {
          var blockHeight = currentLineHeight + utils.getLineHeight($previousLine) + utils.getLineHeight($lineBeforePrevious);
          blockInfo.blockHeight = blockHeight;
          blockInfo.$topOfBlock = $lineBeforePrevious;
        }
      }
    }
    // block type:
    // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    //                 +------------------ $currentLine -----------------+
    else if ((typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
      &&
      getNumberOfInnerLinesOf($currentLine) === 1) {
      var blockHeight = currentLineHeight + utils.getLineHeight($previousLine);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $previousLine;
    }
  }
  else if ((typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue")
     &&
     (typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
     &&
     getNumberOfInnerLinesOf($currentLine) === 1) {
    var blockHeight = currentLineHeight + utils.getLineHeight($previousLine);
    blockInfo.blockHeight = blockHeight;
    blockInfo.$topOfBlock = $previousLine;
  }
  // block type:
  // (heading || shot) => (action || character || general)
  //                      +-------- $currentLine --------+
  else if ((typeOfCurrentLine === "action" || typeOfCurrentLine === "character" || typeOfCurrentLine === "general")
     &&
     (typeOfPreviousLine === "heading" || typeOfPreviousLine === "shot")) {
    var blockHeight = currentLineHeight + utils.getLineHeight($previousLine);
    blockInfo.blockHeight = blockHeight;
    blockInfo.$topOfBlock = $previousLine;
  }

  return blockInfo;
}

var getNumberOfInnerLinesOf = function($line) {
  var totalHeight = $line.height();
  var heightOfOneLine = utils.getRegularLineHeight();
  var numberOfInnerLines = parseInt(totalHeight / heightOfOneLine);

  return numberOfInnerLines;
}
