var utils = require('./utils');
var caretPositioning = require('./caretPositioning');
var randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;

var PAGE_BREAKS_ATTRIB                     = "splitPageBreak";
var PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB = "splitPageBreakWithMoreAndContd";

var FIRST_HALF_ATTRIB = "splitFirstHalf";
var SECOND_HALF_ATTRIB = "splitSecondHalf";

var PAGE_BREAK_TAG = "splitPageBreak";

var FIRST_HALF_TAG                     = "split_first_half";
var FIRST_HALF_WITH_MORE_AND_CONTD_TAG = "split_with_more_and_contd_first_half";
var SECOND_HALF_TAG                    = "split_second_half";

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
    var afterLastSentenceThatFits = [lineNumber, position.column];
    var moreAndContdInfo          = getMoreAndContdInfo($line);

    return {
      heightAfterPageBreak: position.heightAfterPageBreak,
      addMoreAndContd: moreAndContdInfo,
      start: afterLastSentenceThatFits,
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

  var columnAfterLastSentenceMarker = getFirstCharAfterLastSentenceMarkerAndWhitespacesOfInnerLine(targetInnerLine, lineText, lineNumber, attributeManager, $line);
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
      columnAfterLastSentenceMarker = getFirstCharAfterLastSentenceMarkerAndWhitespacesOfInnerLine(targetInnerLine, lineText, lineNumber, attributeManager, $line);
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

var getFirstCharAfterLastSentenceMarkerAndWhitespacesOfInnerLine = function(innerLineNumber, fullText, lineNumber, attributeManager, $line) {
  var lineHasMarker = checkLineHasMarker(lineNumber, attributeManager);

  // get text until the end of target inner line
  var innerLineLength = getInnerLineLengthOf($line);
  var endOfTargetLine = lineHasMarker ? 1 : 0; // include the "*" on the beginning, if line has marker
  endOfTargetLine    += innerLineNumber * innerLineLength;
  var innerLineText   = fullText.substring(0, endOfTargetLine);

  // look backwards for the last sentence marker of the text
  var sentenceMarkerPosition = /^(.*[.?!;]\s*)[^.?!;]*$/.exec(innerLineText);
  if (sentenceMarkerPosition && sentenceMarkerPosition[1]) {
    var firstCharAfterMarkerAndWhitespaces = sentenceMarkerPosition[1].length;
    return firstCharAfterMarkerAndWhitespaces;
  }
  return 0;
}

var checkLineHasMarker = function(lineNumber, attributeManager) {
  return attributeManager.lineHasMarker(lineNumber);
}

var getInnerLineLengthOf = function($line) {
  var typeOfLine = utils.typeOf($line);
  var lineLength = CHARS_PER_LINE[typeOfLine] || 61;
  return lineLength;
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

exports.atribsToClasses = function(context) {
  // simple page break, return only the flag as class
  if(isRegularPageBreakAttrib(context.key)) {
    return [context.key];
  }
  // page break with MORE/CONT'D, return also characterName:<character name>
  else if (isPageBreakWithMoreAndContdAttrib(context.key)) {
    var characterName = utils.buildCharacterNameToClass(context.value);
    return [context.key, characterName];
  }
  // any of the halves of a split line, return also the splitId (context.value)
  else if(isFirstHalfOfSplit(context.key) || isSecondHalfOfSplit(context.key)) {
    return [context.key, context.value];
  }
}

var isRegularPageBreakAttrib = function(contextKey) {
  return contextKey === PAGE_BREAKS_ATTRIB;
}

var isPageBreakWithMoreAndContdAttrib = function(contextKey) {
  return contextKey === PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB;
}

var isFirstHalfOfSplit = function(cls) {
  return cls.match(FIRST_HALF_ATTRIB);
}

var isSecondHalfOfSplit = function(cls) {
  return cls.match(SECOND_HALF_ATTRIB);
}

// Bug fix: if user edits first half of split line, for some reason Etherpad is loosing the page break
// line attribute. So we need to collect it:
exports.collectContentPre = function(hook, context) {
  var tname = context.tname;
  var state = context.state;
  var lineAttributes = state.lineAttributes;

  // new line
  if (tname === "div") {
    delete lineAttributes[PAGE_BREAKS_ATTRIB];
    delete lineAttributes[PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB];
    delete lineAttributes[FIRST_HALF_ATTRIB];
    delete lineAttributes[SECOND_HALF_ATTRIB];
  }
  // first half of split line
  else if (tname === FIRST_HALF_TAG) {
    var splitId = getSplitIdFromClass(context.cls);
    lineAttributes[FIRST_HALF_ATTRIB] = splitId;
    lineAttributes[PAGE_BREAKS_ATTRIB] = true;
  } else if (tname === FIRST_HALF_WITH_MORE_AND_CONTD_TAG) {
    var splitId = getSplitIdFromClass(context.cls);
    lineAttributes[FIRST_HALF_ATTRIB] = splitId;
    lineAttributes[PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB] = true;
  }
  // second half of split line
  else if (tname === SECOND_HALF_TAG) {
    var splitId = getSplitIdFromClass(context.cls);
    lineAttributes[SECOND_HALF_ATTRIB] = splitId;
  }
}

exports.buildHtmlWithPageBreaks = function(cls) {
  var extraHTML;
  var splitId = getSplitIdFromClass(cls);

  if (cls.match(PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB)) {
    extraHTML = utils.buildPageBreakWithMoreAndContd(cls, PAGE_BREAK_TAG);

    return {
      preHtml: '<'+FIRST_HALF_WITH_MORE_AND_CONTD_TAG+' class="'+splitId+'">',
      postHtml: extraHTML + '</'+FIRST_HALF_WITH_MORE_AND_CONTD_TAG+'>'
    };
  } else if (cls.match(PAGE_BREAKS_ATTRIB)) {
    extraHTML = '<'+PAGE_BREAK_TAG+'></'+PAGE_BREAK_TAG+'>';

    return {
      preHtml: '<'+FIRST_HALF_TAG+' class="'+splitId+'">',
      postHtml: extraHTML + '</'+FIRST_HALF_TAG+'>'
    };
  }
  // Bug fix: lines after page break need to be wrapped by a registered block element
  // (see blockElements), otherwise caret will start moving alone when placed
  // on those lines
  else if (isSecondHalfOfSplit(cls)) {
    return {
      preHtml: '<'+SECOND_HALF_TAG+' class="'+splitId+'">',
      postHtml: '</'+SECOND_HALF_TAG+'>'
    };
  }
}

var getSplitIdFromClass = function(cls) {
  var splitId = /(?:^| )(split-[A-Za-z0-9]*)/.exec(cls);
  if(splitId && splitId[1]){
    return splitId[1];
  }
}

var newSplitId = function() {
  return "split-" + randomString(16);
}

exports.blockElements = function() {
  return [FIRST_HALF_TAG, FIRST_HALF_WITH_MORE_AND_CONTD_TAG, SECOND_HALF_TAG];
}

exports.cleanPageBreaks = function(attributeManager, rep, editorInfo) {
  var positionAdjustment;
  // store original caret position so it can be moved there after we finish cleaning page breaks
  var originalPosition = caretPositioning.getCurrentCaretPosition(rep);

  var totalLines = rep.lines.length();
  for (var lineNumber = totalLines - 1; lineNumber >= 0; lineNumber--) {
    // remove marker(s) of a split line
    if (exports.lineIsFirstHalfOfSplit(lineNumber, attributeManager)) {
      mergeLines(lineNumber, rep, attributeManager, editorInfo);
      removeMarkersOfLineSplit(lineNumber, attributeManager);
    }
    // remove marker of a page break
    if (lineHasPageBreak(lineNumber, attributeManager)) {
      removePageBreakBetweenLines(lineNumber, attributeManager);

      // line merge removes some chars from the text, so we need to adjust where caret will be
      // after cleaning page breaks. This needs to be done after we remove markers of line split and
      // page break (we make adjustments according to the absence of line attributes, and both
      // removeMarkersOfLineSplit and removePageBreakBetweenLines remove some of them, so we need
      // to finish removing those attributes before calculating the adjustment)
      positionAdjustment = caretPositioning.includeMergeForLine(lineNumber, originalPosition, positionAdjustment, attributeManager);
    }
  }

  // move caret to original position
  caretPositioning.moveCaretToPosition(originalPosition, positionAdjustment, rep, editorInfo);
}

exports.lineIsFirstHalfOfSplit = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, FIRST_HALF_ATTRIB);
}

exports.lineIsSecondHalfOfSplit = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, SECOND_HALF_ATTRIB);
}

var lineHasPageBreak = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, PAGE_BREAKS_ATTRIB) ||
         attributeManager.getAttributeOnLine(lineNumber, PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB);
}

var removePageBreakBetweenLines = function(lineNumber, attributeManager) {
  attributeManager.removeAttributeOnLine(lineNumber, PAGE_BREAKS_ATTRIB);
  attributeManager.removeAttributeOnLine(lineNumber, PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB);
}

var removeMarkersOfLineSplit = function(lineNumber, attributeManager) {
  attributeManager.removeAttributeOnLine(lineNumber, FIRST_HALF_ATTRIB);
  attributeManager.removeAttributeOnLine(lineNumber+1, SECOND_HALF_ATTRIB);
}

var mergeLines = function(lineNumber, rep, attributeManager, editorInfo) {
  exports.mergeLinesWithExtraChars(lineNumber, rep, attributeManager, editorInfo, 0, 0);
}

exports.mergeLinesWithExtraChars = function(lineNumber, rep, attributeManager, editorInfo, charsToRemoveOnFirstHalf, charsToRemoveOnSecondHalf) {
  var splitIdOfFirstHalf = attributeManager.getAttributeOnLine(lineNumber, FIRST_HALF_ATTRIB);
  var splitIdOfSecondHalf = attributeManager.getAttributeOnLine(lineNumber+1, SECOND_HALF_ATTRIB);

  // we only merge if both lines have the same split id
  if (splitIdOfFirstHalf === splitIdOfSecondHalf) {
    var lineText = rep.lines.atIndex(lineNumber).text;
    var lineLength = lineText.length;

    var start = [lineNumber, lineLength - charsToRemoveOnFirstHalf];
    var end = [lineNumber+1, charsToRemoveOnSecondHalf];

    // remove "\n" at the end of the line
    editorInfo.ace_replaceRange(start, end, "");
  }
}

exports.savePageBreaks = function(splitPositions, attributeManager, rep, editorInfo) {
  var positionAdjustment;
  // store original caret position so it can be moved there after we finish cleaning page breaks
  var originalPosition = caretPositioning.getCurrentCaretPosition(rep);

  for (var i = splitPositions.length - 1; i >= 0; i--) {
    var splitPosition = splitPositions[i];

    // line split adds some chars to the text, so we need to adjust where caret will be
    // after saving page breaks. This needs to be done before we add page breaks between lines
    // (we make adjustments according to the absence of line attributes, and addPageBreakBetweenLines
    // adds line attributes, so it breaks the logic of includeSplitForLine)
    positionAdjustment = caretPositioning.includeSplitForLine(splitPosition.start, originalPosition, positionAdjustment, attributeManager);

    splitLine(splitPosition, attributeManager, editorInfo);
    addPageBreakBetweenLines(splitPosition, attributeManager);
  };

  // move caret to original position
  caretPositioning.moveCaretToPosition(originalPosition, positionAdjustment, rep, editorInfo);
}

var splitLine = function(splitPosition, attributeManager, editorInfo) {
  var lineNumber = splitPosition.start[0];
  var typeOfLineToBeSplit = getLineTypeOf(lineNumber, attributeManager);

  editorInfo.ace_replaceRange(splitPosition.start, splitPosition.start, "\n");

  // we need to make sure both halves of the split line have the same type
  setTypeOfSecondHalfOfLine(lineNumber, typeOfLineToBeSplit, attributeManager);
}

var getLineTypeOf = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, "script_element");
}

var setTypeOfSecondHalfOfLine = function(lineNumber, lineType, attributeManager) {
  if (lineType) {
    attributeManager.setAttributeOnLine(lineNumber+1, 'script_element', lineType);
  }
}

var addPageBreakBetweenLines = function(splitPosition, attributeManager) {
  var lineNumber = splitPosition.start[0];
  var attributeName = PAGE_BREAKS_ATTRIB;
  var attributeValue = true;
  if (splitPosition.addMoreAndContd) {
    attributeName = PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB;
    attributeValue = splitPosition.addMoreAndContd.characterName;
  }

  attributeManager.setAttributeOnLine(lineNumber, attributeName, attributeValue);

  // mark both halves with same id
  var splitId = newSplitId();
  attributeManager.setAttributeOnLine(lineNumber, FIRST_HALF_ATTRIB, splitId);
  attributeManager.setAttributeOnLine(lineNumber+1, SECOND_HALF_ATTRIB, splitId);
}

exports.lineHasSplitPageBreak = function($node) {
  return $node.find(PAGE_BREAK_TAG).length > 0;
}
