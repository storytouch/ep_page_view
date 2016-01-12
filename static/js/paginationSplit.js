var utils = require('./utils');

var PAGE_BREAKS_ATTRIB                     = "splitPageBreak";
var PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB = "splitPageBreakWithMoreAndContd";

var CLEAN_PAGE_BREAKS_OPERATION                     = [[PAGE_BREAKS_ATTRIB, false]];
var CLEAN_PAGE_BREAKS_WITH_MORE_AND_CONTD_OPERATION = [[PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB, '']];

// number of minimum lines each element needs before a page break so it can be split in two parts
// (default is 1)
var MINIMUM_LINES_BEFORE_PAGE_BREAK = {
  action: 2,
};

// number of minimum lines each element needs after a page break so it can be split in two parts
// (default is 1)
var MINIMUM_LINES_AFTER_PAGE_BREAK = {
  action: 2,
  transition: 2,
  dialogue: 2,
  parenthetical: 2,
};

// number of chars each element can hold in a single line
// (default is 61)
var CHARS_PER_LINE = {
  character: 38,
  dialogue: 35,
  transition: 15,
  parenthetical: 25,
};

// indicates if element can be split between two pages
var CAN_BE_SPLIT = {
  general: true,
  action: true,
  transition: true,
  dialogue: true,
  parenthetical: true,
  heading: false,
  character: false,
  shot: false,
};

// indicates if element should have MORE/CONT'D when split between pages
// (default is false)
var HAVE_MORE_AND_CONTD = {
  dialogue: true,
  parenthetical: true,
}

exports.getSplitInfo = function($line, totalOutterHeight, availableHeightOnPage, attributeManager, rep) {
  if (canSplit($line)) {
    var linesAvailableBeforePageBreak = getNumberOfInnerLinesThatFitOnPage($line, totalOutterHeight, availableHeightOnPage);
    var minimumLinesBeforePageBreak = getMinimumLinesBeforePageBreakFor($line);

    // only calculate the position where element should be split if there is enough space to do that
    if (linesAvailableBeforePageBreak >= minimumLinesBeforePageBreak) {
      var splitPosition = calculateElementSplitPosition(linesAvailableBeforePageBreak, $line, attributeManager, rep);
      if (splitPosition) {
        // ok, can split element
        return splitPosition;
      }
    }
  }
}

var canSplit = function($line) {
  var typeOfLine = utils.typeOf($line);
  var canBeSplit = CAN_BE_SPLIT[typeOfLine];
  return canBeSplit;
}

var getNumberOfInnerLinesThatFitOnPage = function($line, totalOutterHeight, availableHeight) {
  var singleInnerLineHeight        = utils.getRegularLineHeight();
  var totalInnerHeight             = $line.height();
  var margin                       = totalOutterHeight - totalInnerHeight;
  var availableHeightForInnerLines = availableHeight - margin;
  var numberOfLinesThatFit         = parseInt(availableHeightForInnerLines/singleInnerLineHeight);

  return numberOfLinesThatFit;
}

var getMinimumLinesBeforePageBreakFor = function($line) {
  var typeOfLine = utils.typeOf($line);
  var minimumLines = MINIMUM_LINES_BEFORE_PAGE_BREAK[typeOfLine] || 1;
  return minimumLines;
}

var getMinimumLinesAfterPageBreakFor = function($line) {
  var typeOfLine = utils.typeOf($line);
  var minimumLines = MINIMUM_LINES_AFTER_PAGE_BREAK[typeOfLine] || 1;
  return minimumLines;
}

var calculateElementSplitPosition = function(innerLineNumber, $line, attributeManager, rep) {
  var lineId     = $line.attr("id");
  var lineNumber = rep.lines.indexOfKey(lineId);
  var lineText   = rep.lines.atKey(lineId).text;

  var position = findPositionWhereLineCanBeSplit(innerLineNumber, $line, attributeManager, lineText, lineNumber);
  // if found position to split, return its split attributes
  if (position) {
    var columnOfEndOfLineAfterSentenceMarker = getColumnOfEndOfInnerLineOrEndOfText(position.column, lineText, $line);
    var afterLastSentenceThatFits            = [lineNumber, position.column];
    var endOfLineAfterLastSentenceThatFits   = [lineNumber, columnOfEndOfLineAfterSentenceMarker];
    var moreAndContdInfo                     = getMoreAndContdInfo($line);

    return {
      heightAfterPageBreak: position.heightAfterPageBreak,
      addMoreAndContd: moreAndContdInfo,
      start: afterLastSentenceThatFits,
      end: endOfLineAfterLastSentenceThatFits
    };
  }
}

// Find position on line that satisfies all conditions:
// - leave minimum lines before page break
// - leave minimum lines after page break
// - can be split on an end-of-sentence mark and fit the available space
//
// Return column where line should be split (char that should be 1st on next page)
var findPositionWhereLineCanBeSplit = function(innerLineNumber, $line, attributeManager, lineText, lineNumber) {
  var targetInnerLine             = innerLineNumber;
  var minimumLinesBeforePageBreak = getMinimumLinesBeforePageBreakFor($line);
  var minimumLinesAfterPageBreak  = getMinimumLinesAfterPageBreakFor($line);

  var columnAfterLastSentenceMarker = 1 + getColumnOfLastSentenceMarkerOfInnerLine(targetInnerLine, lineText, lineNumber, attributeManager, $line);
  // only can split element if it has a sentence that fits the available height. If no sentence
  // marker is found, columnAfterLastSentenceMarker is 0
  while (columnAfterLastSentenceMarker && targetInnerLine >= minimumLinesBeforePageBreak) {
    var textAfterPageBreak   = lineText.substring(columnAfterLastSentenceMarker);
    var heightAfterPageBreak = calculateHeightToFitText(textAfterPageBreak, $line);
    var linesAfterPageBreak  = parseInt(heightAfterPageBreak / utils.getRegularLineHeight());

    if (linesAfterPageBreak >= minimumLinesAfterPageBreak) {
      // found an inner line that satisfies all conditions
      return {
        column: columnAfterLastSentenceMarker,
        heightAfterPageBreak: heightAfterPageBreak
      };
    } else {
      // this line did not satisfy conditions; try previous one
      targetInnerLine--;
      columnAfterLastSentenceMarker = 1 + getColumnOfLastSentenceMarkerOfInnerLine(targetInnerLine, lineText, lineNumber, attributeManager, $line);
    }
  }
}

var getMoreAndContdInfo = function($line) {
  var typeOfLine = utils.typeOf($line);
  if (HAVE_MORE_AND_CONTD[typeOfLine]) {
    return {
      characterName: utils.findCharacterNameOf($line),
    };
  }
  return false;
}

var getColumnOfLastSentenceMarkerOfInnerLine = function(innerLineNumber, fullText, lineNumber, attributeManager, $line) {
  var lineHasMarker = checkLineHasMarker(lineNumber, attributeManager);

  // get text until the end of target inner line
  var innerLineLength = getInnerLineLengthOf($line);
  var endOfTargetLine = lineHasMarker ? 1 : 0; // include the "*" on the beginning, if line has marker
  endOfTargetLine    += innerLineNumber * innerLineLength;
  var innerLineText   = fullText.substring(0, endOfTargetLine);

  // look backwards for the last sentence marker of the text
  return innerLineText.search(/[.?!;][^.?!;]*$/);
}

var checkLineHasMarker = function(lineNumber, attributeManager) {
  return attributeManager.lineHasMarker(lineNumber);
}

var getInnerLineLengthOf = function($line) {
  var typeOfLine = utils.typeOf($line);
  var lineLength = CHARS_PER_LINE[typeOfLine] || 61;
  return lineLength;
}

var getColumnOfEndOfInnerLineOrEndOfText = function(startIndex, fullText, $line) {
  var columnOfEndOfInnerLine = startIndex + getInnerLineLengthOf($line);
  var lastColumnOfText = fullText.length;

  // avoid errors if we reach end of text
  return Math.min(lastColumnOfText, columnOfEndOfInnerLine);
}

var calculateHeightToFitText = function(text, $originalLine) {
  // create a clone to know the height needed
  var $theClone = $originalLine.clone();
  var $innerClone = $theClone.find(utils.SCRIPT_ELEMENTS_SELECTOR);

  // set the text, so we can measure the height it needs
  var isGeneral = $innerClone.length === 0;
  if (isGeneral) {
    // general have no inner tag, so use the whole div
    $theClone.text(text);
  } else {
    $innerClone.text(text);
  }

  var height = $theClone.appendTo($originalLine).height();
  $theClone.remove();

  return height;
}

exports.isRegularPageBreakAttrib = function(contextKey) {
  return contextKey === PAGE_BREAKS_ATTRIB;
}

exports.isPageBreakWithMoreAndContdAttrib = function(contextKey) {
  return contextKey === PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB;
}

exports.buildHtmlWithPageBreaks = function(cls) {
  var extraHTML;

  if (cls.match(PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB)) {
    var characterName = utils.extractCharacterNameFromClass(cls);
    extraHTML  = '<more></more>';
    extraHTML += '<splitPageBreak></splitPageBreak>';
    extraHTML += '<contdLine contenteditable="false"><contd data-character="' + characterName + '"></contd></contdLine>';
  } else if (cls.match(PAGE_BREAKS_ATTRIB)) {
    extraHTML = '<splitPageBreak></splitPageBreak>';
  }

  return extraHTML;
}

exports.cleanPageBreaks = function(attributeManager, rep) {
  var $linesWithPageBreaks = utils.getPadInner().find("splitPageBreak").closest("div");

  $linesWithPageBreaks.each(function() {
    var lineId     = $(this).attr("id");
    var lineNumber = rep.lines.indexOfKey(lineId);

    // clear attribute on the whole line (easier to implement + has no undesired side effects)
    var docStart = [lineNumber,0];
    var docEnd   = [lineNumber+1,0];

    attributeManager.setAttributesOnRange(docStart, docEnd, CLEAN_PAGE_BREAKS_OPERATION);
    attributeManager.setAttributesOnRange(docStart, docEnd, CLEAN_PAGE_BREAKS_WITH_MORE_AND_CONTD_OPERATION);
  });
}

exports.savePageBreaks = function(splitPositions, attributeManager) {
  var addPageBreak = [["splitPageBreak", true]];

  for (var i = splitPositions.length - 1; i >= 0; i--) {
    var splitPosition = splitPositions[i];

    var pageBreakType = addPageBreak;
    if (splitPosition.addMoreAndContd) {
      var addPageBreakWithMoreAndContd = [["splitPageBreakWithMoreAndContd", splitPosition.addMoreAndContd.characterName]];
      pageBreakType = addPageBreakWithMoreAndContd;
    }

    attributeManager.setAttributesOnRange(splitPosition.start, splitPosition.end, pageBreakType);
  };
}
