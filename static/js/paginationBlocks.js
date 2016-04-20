var utils = require('./utils');
var paginationSplit = require('./paginationSplit');

exports.getBlockInfo = function($helperLine) {
  var $topOfBlock = $helperLine;

  var $previousLine = $helperLine.prev();
  var $nextLine     = $helperLine.next();

  var typeOfCurrentLine  = utils.typeOf($helperLine);
  var typeOfPreviousLine = utils.typeOf($previousLine);
  var typeOfNextLine     = utils.typeOf($nextLine);

  var innerLinesOfCurrentLine = getNumberOfInnerLinesOf($helperLine);

  // block type:
  // (*) => transition (only one line of text)
  //        +--------- $currentLine ----------+
  if (typeOfCurrentLine === "transition" && innerLinesOfCurrentLine === 1) {
    if (typeOfPreviousLine !== "parenthetical" && typeOfPreviousLine !== "dialogue" ) {
      $topOfBlock = $previousLine;
    }
    // block type:
    // (*) => (parenthetical || dialogue) (only one line of text) => transition (only one line of text)
    //                                                               +--------- $currentLine ----------+
    else if (getNumberOfInnerLinesOf($previousLine) === 1) {
      var $lineBeforePrevious = $previousLine.prev();
      $topOfBlock = $lineBeforePrevious;
    }
    // block type:
    // (parenthetical || dialogue) (more than one line of text) => transition (only one line of text)
    //                                                             +--------- $currentLine ----------+
    else {
      $topOfBlock = $previousLine;
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
        $topOfBlock = $lineBeforePrevious;
      }
      // block type:
      // !heading => character => (parenthetical || dialogue)
      //                          +------ $currentLine -----+
      else {
        $topOfBlock = $previousLine;
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
          $topOfBlock = $previousLine;
        }
      }
      // block type:
      // character => (parenthetical || dialogue) (only one line of text) => (parenthetical || dialogue)
      //                                                                     +------ $currentLine -----+
      else if (getNumberOfInnerLinesOf($previousLine) === 1) {
        var $lineBeforePrevious = $previousLine.prev();
        var typeOfLineBeforePrevious = utils.typeOf($lineBeforePrevious);
        if (typeOfLineBeforePrevious === "character") {
          $topOfBlock = $lineBeforePrevious;
        }
      }
    }
    // block type:
    // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    //                 +------------------ $currentLine -----------------+
    else if ((typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
      &&
      innerLinesOfCurrentLine === 1) {
      $topOfBlock = $previousLine;
    }
  }
  else if ((typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue")
    &&
    (typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
    &&
    innerLinesOfCurrentLine === 1) {
    $topOfBlock = $previousLine;
  }
  // block type:
  // (heading || shot) => (action || character || general)
  //                      +-------- $currentLine --------+
  else if ((typeOfCurrentLine === "action" || typeOfCurrentLine === "character" || typeOfCurrentLine === "general")
    &&
    (typeOfPreviousLine === "heading" || typeOfPreviousLine === "shot")) {
    $topOfBlock = $previousLine;
  }

  return {
    $topOfBlock: $topOfBlock,
  };
}

var getNumberOfInnerLinesOf = function($line) {
  var totalHeight = utils.getLineHeightWithoutMargins($line);
  var heightOfOneLine = utils.getRegularLineHeight();
  var numberOfInnerLines = parseInt(totalHeight / heightOfOneLine);

  return numberOfInnerLines;
}
