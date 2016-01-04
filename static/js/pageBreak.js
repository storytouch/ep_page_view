var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var Security = require('ep_etherpad-lite/static/js/security');

// Letter
// var REGULAR_LINES_PER_PAGE = 54;
// A4
var REGULAR_LINES_PER_PAGE = 58;

var SCRIPT_ELEMENTS_SELECTOR = "heading, action, character, parenthetical, dialogue, transition, shot";

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

var EMPTY_CHARACTER_NAME = "empty";

// HACK: page breaks are not *permanently* drawn until everything is setup on the editor.
// To be able to have page breaks drawn when opening the script (before user starts changing
// the script), we need to force redrawPageBreaks() to run on the first Etherpad "tic"
// ("idleWorkTimer" event). This flag controls when to execute this first run of
// redrawPageBreaks()
var firstPageBreakRedrawNotRunYet = true;

exports.aceAttribsToClasses = function(hook, context) {
  // simple split page break, return only the flag as class
  if(context.key === 'splitPageBreak') {
    return [context.key];
  }
  // split page break with MORE/CONT'D, return splitPageBreakWithMoreAndContd:<character name>
  else if (context.key === 'splitPageBreakWithMoreAndContd') {
    var characterName = context.value;
    if (characterName === EMPTY_CHARACTER_NAME) {
      characterName = "";
    }
    return ['splitPageBreakWithMoreAndContd:<' + Security.escapeHTMLAttribute(characterName) + '>'];
  }
}

exports.aceCreateDomLine = function(hook, context){
  var cls = context.cls;
  var extraHTML;

  if (cls.match('splitPageBreakWithMoreAndContd')){
    var characterName = extractCharacterNameFrom(cls);
    extraHTML  = '<more></more>';
    extraHTML += '<elementPageBreak></elementPageBreak>';
    extraHTML += '<contd data-character="' + characterName + '"></contd>';
  } else if (cls.match('splitPageBreak')){
    extraHTML = '<elementPageBreak></elementPageBreak>';
  }

  if (extraHTML){
    var modifier = {
      extraOpenTags: extraHTML,
      extraCloseTags: '',
      cls: ''
    };
    return [modifier];
  }
  return [];
};

var extractCharacterNameFrom = function(cls) {
  var regex  = "(?:^| )splitPageBreakWithMoreAndContd:<([^>]*)>"; // "splitPageBreakWithMoreAndContd:<character name>"
  var characterNameFound = cls.match(new RegExp(regex));
  var characterName = characterNameFound ? characterNameFound[1] : "";

  return characterName;
}

exports.aceEditEvent = function(hook, context) {
  // don't do anything if page break is disabled
  if (!clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled) return;

  var cs = context.callstack;

  // force redrawPageBreaks() to run. See notes on firstPageBreakRedrawNotRunYet for more details
  if (needInitialPageBreakRedraw(cs)) {
    redrawPageBreaks(context);
    firstPageBreakRedrawNotRunYet = false;
  }

  // don't do anything if text did not change
  if(!cs.docTextChanged) return;

  redrawPageBreaks(context);
}

var redrawPageBreaks = function(context) {
  var $lines = cleanPageBreaks(context);

  var pageBreaksInfo = calculatePageBreaks($lines, context);
  var $linesWithPageBreaks = pageBreaksInfo.linesWithPageBreaks;
  var splitPositions = pageBreaksInfo.splitPositions;

  // add page break markers to selected lines
  $linesWithPageBreaks.addClass("pageBreak");

  // split elements that are in the middle of a page break
  splitElementsOnPositions(splitPositions, context);
}

// Easier access to outer pad
var padOuter;
var getPadOuter = function() {
 padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
 return padOuter;
}

// Easier access to inner pad
var padInner;
var getPadInner = function() {
 padInner = padInner || getPadOuter().find('iframe[name="ace_inner"]').contents();
 return padInner;
}

// cache maxPageHeight
var maxPageHeight;
var getMaxPageHeight = function() {
  maxPageHeight = maxPageHeight || (REGULAR_LINES_PER_PAGE * getRegularLineHeight());
  return maxPageHeight;
}

var getLineHeight = function($targetLine) {
  var lineHeight;

  // margin top/bottom are defined on script elements, not on div, so we need to get the
  // inner element
  var $innerElement = $targetLine.find(SCRIPT_ELEMENTS_SELECTOR);

  // general have no inner tag, so get height from targetLine
  var isGeneral = $innerElement.length === 0;
  if (isGeneral) {
    lineHeight = $targetLine.height();
  } else {
    lineHeight = $innerElement.outerHeight(true);
  }
  return lineHeight;
}

// cache regularLineHeight
var regularLineHeight;
var getRegularLineHeight = function() {
  regularLineHeight = regularLineHeight || calculateRegularLineHeight();
  return regularLineHeight;
}

var calculateRegularLineHeight = function() {
  var $editor = getPadInner().find("#innerdocbody");
  return getFloatValueOfCSSProperty($editor, "line-height");
}

var getFloatValueOfCSSProperty = function($element, property){
  var valueString = $element.css(property);
  return parseFloat(valueString);
}

var needInitialPageBreakRedraw = function(callstack) {
  return firstPageBreakRedrawNotRunYet && callstack.editEvent.eventType === "idleWorkTimer";
}

var cleanPageBreaks = function(context) {
  cleanPageBreaksOverSplitElements(context);

  // need to get lines after cleaning page breaks over split elements, otherwise pad content
  // would change and we would work over "old" references to pad elements
  var $lines = getPadInner().find("div");

  cleanPageBreaksOverWholeElements($lines);

  return $lines;
}

var cleanPageBreaksOverWholeElements = function($lines) {
  $lines.removeClass("pageBreak");
}

var cleanPageBreaksOverSplitElements = function(context) {
  var attributeManager = context.documentAttributeManager;
  var cs               = context.callstack;

  var totalLines      = context.rep.lines.length();
  var docStart        = [0,0];
  var docEnd          = [totalLines+1,0];

  var removePageBreak                 = [["splitPageBreak", false]];
  var removePageBreakWithMoreAndContd = [["splitPageBreakWithMoreAndContd", '']];

  performNonUnduableEvent(cs, function() {
    attributeManager.setAttributesOnRange(docStart, docEnd, removePageBreak);
    attributeManager.setAttributesOnRange(docStart, docEnd, removePageBreakWithMoreAndContd);
  });
}

var calculatePageBreaks = function($lines, context) {
  var maxPageHeight = getMaxPageHeight();
  var $linesWithPageBreaks = $();
  var elementsToBeSplit = [];

  // select lines to have page breaks
  var $currentLine = $lines.first();
  var currentPageHeight = 0;
  var skippingEmptyLines = false;
  while(!reachedEndOfPad($currentLine)) {
    // HACK: ignore empty lines on top of pages.
    // We need this because :before/:after pseudo elements (as page breaks are implemented)
    // are not displayed correctly over some elements (including <br>, which is the
    // representation of empty lines on Etherpad): every empty line after a page break is
    // displayed on the previous page (before the page break), although they are placed
    // *after* the page break. So to work around this limitation, we ignore all empty lines
    // on top the pages
    // Source: http://stackoverflow.com/questions/3538506/which-elements-support-the-before-and-after-pseudo-elements?rq=1#3538529
    var lineIsEmpty = $currentLine.text().length === 0;
    if (skippingEmptyLines && lineIsEmpty) {
      // don't process anything, just move to next line
      $currentLine = $currentLine.next();
      continue;
    }

    // ok, line is not empty, so we stop skipping empty lines
    skippingEmptyLines = false;

    // get height including margins and paddings
    var lineHeight = getLineHeight($currentLine);
    // Q: if this line is placed on current page, will the page height be over the
    // allowed max height?
    if (currentPageHeight + lineHeight > maxPageHeight) {
      // A: yes, so check if line belongs to a block and "pull" elements if necessary

      // ignore empty lines on top of pages (see details about this HACK above)
      if (lineIsEmpty) {
        // start skipping lines again
        skippingEmptyLines = true;

        currentPageHeight = 0;

        // mark line to be on top of page
        $linesWithPageBreaks = $linesWithPageBreaks.add($currentLine);
      } else {
        skippingEmptyLines = false;

        var availableHeightOnPage = maxPageHeight - currentPageHeight;
        var splitElementInfo = getSplitInfo($currentLine, lineHeight, availableHeightOnPage, context);
        // can we split current line?
        if (splitElementInfo) {
          // restart counting page height again
          currentPageHeight = splitElementInfo.heightAfterPageBreak;

          // mark element to be split when pagination is done
          elementsToBeSplit.push(splitElementInfo);
        }
        // is it a block of lines? (A block can have only a single line too)
        else {
          var blockInfo = getBlockInfo($currentLine);

          currentPageHeight = blockInfo.blockHeight;

          // mark element to be on top of page when pagination is done
          $linesWithPageBreaks = $linesWithPageBreaks.add(blockInfo.$topOfBlock);

          // move $currentLine to end of the block
          $currentLine = blockInfo.$bottomOfBlock;
        }
      }
    } else {
      // A: no, so simply increase current page height
      currentPageHeight += lineHeight;
    }

    // move to next line before next iteration of while-loop
    $currentLine = $currentLine.next();
  }

  return {
    linesWithPageBreaks: $linesWithPageBreaks,
    splitPositions: elementsToBeSplit
  };
}

var reachedEndOfPad = function($currentLine) {
  return $currentLine.length === 0;
}

var getBlockInfo = function($currentLine) {
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

  var typeOfCurrentLine  = typeOf($currentLine);
  var typeOfPreviousLine = typeOf($previousLine);
  var typeOfNextLine     = typeOf($nextLine);

  // block type:
  // (*) => transition (only one line of text)
  //        +--------- $currentLine ----------+
  if (typeOfCurrentLine === "transition" && getNumberOfInnerLinesOf($currentLine) === 1) {
    if (typeOfPreviousLine !== "parenthetical" && typeOfPreviousLine !== "dialogue" ) {
      var blockHeight = currentLineHeight + getLineHeight($previousLine);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $previousLine;
    }
    // block type:
    // (*) => (parenthetical || dialogue) (only one line of text) => transition (only one line of text)
    //                                                               +--------- $currentLine ----------+
    else if (getNumberOfInnerLinesOf($previousLine) === 1) {
      var $lineBeforePrevious = $previousLine.prev();
      var blockHeight = currentLineHeight + getLineHeight($previousLine) + getLineHeight($lineBeforePrevious);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $lineBeforePrevious;
    }
    // block type:
    // (parenthetical || dialogue) (more than one line of text) => transition (only one line of text)
    //                                                             +--------- $currentLine ----------+
    else {
      var blockHeight = currentLineHeight + getLineHeight($previousLine);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $previousLine;
    }
  }
  // block type:
  // character => (parenthetical || dialogue)
  //              +------ $currentLine -----+
  else if (typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue") {
    if (typeOfPreviousLine === "character") {
      var blockHeight = currentLineHeight + getLineHeight($previousLine);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $previousLine;
    }
    // block type:
    // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    //                 +------------------ $currentLine -----------------+
    else if ((typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
      &&
      getNumberOfInnerLinesOf($currentLine) === 1) {
      var blockHeight = currentLineHeight + getLineHeight($previousLine);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $previousLine;
    }
  }
  else if ((typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue")
     &&
     (typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")
     &&
     getNumberOfInnerLinesOf($currentLine) === 1) {
    var blockHeight = currentLineHeight + getLineHeight($previousLine);
    blockInfo.blockHeight = blockHeight;
    blockInfo.$topOfBlock = $previousLine;
  }
  // block type:
  // (heading || shot) => (action || character || general)
  //                      +-------- $currentLine --------+
  else if ((typeOfCurrentLine === "action" || typeOfCurrentLine === "character" || typeOfCurrentLine === "general")
     &&
     (typeOfPreviousLine === "heading" || typeOfPreviousLine === "shot")) {
    var blockHeight = currentLineHeight + getLineHeight($previousLine);
    blockInfo.blockHeight = blockHeight;
    blockInfo.$topOfBlock = $previousLine;
  }

  return blockInfo;
}

var typeOf = function($line) {
 var $innerElement = $line.find(SCRIPT_ELEMENTS_SELECTOR);
 var tagName = $innerElement.prop("tagName") || "general"; // general does not have inner tag

 return tagName.toLowerCase();
}

var getNumberOfInnerLinesOf = function($line) {
  var totalHeight = $line.height();
  var heightOfOneLine = getRegularLineHeight();
  var numberOfInnerLines = parseInt(totalHeight / heightOfOneLine);

  return numberOfInnerLines;
}

var getSplitInfo = function($line, totalOutterHeight, availableHeightOnPage, context) {
  if (canSplit($line)) {
    var linesAvailableBeforePageBreak = getNumberOfInnerLinesThatFitOnPage($line, totalOutterHeight, availableHeightOnPage);
    var minimumLinesBeforePageBreak = getMinimumLinesBeforePageBreakFor($line);

    // only calculate the position where element should be split if there is enough space to do that
    if (linesAvailableBeforePageBreak >= minimumLinesBeforePageBreak) {
      var splitPosition = calculateElementSplitPosition(linesAvailableBeforePageBreak, $line, context);
      if (splitPosition) {
        // ok, can split element
        return splitPosition;
      }
    }
  }
}

var canSplit = function($line) {
  var typeOfLine = typeOf($line);
  var canBeSplit = CAN_BE_SPLIT[typeOfLine];
  return canBeSplit;
}

var getNumberOfInnerLinesThatFitOnPage = function($line, totalOutterHeight, availableHeight) {
  var singleInnerLineHeight        = getRegularLineHeight();
  var totalInnerHeight             = $line.height();
  var margin                       = totalOutterHeight - totalInnerHeight;
  var availableHeightForInnerLines = availableHeight - margin;
  var numberOfLinesThatFit         = parseInt(availableHeightForInnerLines/singleInnerLineHeight);

  return numberOfLinesThatFit;
}

var getMinimumLinesBeforePageBreakFor = function($line) {
  var typeOfLine = typeOf($line);
  var minimumLines = MINIMUM_LINES_BEFORE_PAGE_BREAK[typeOfLine] || 1;
  return minimumLines;
}

var getMinimumLinesAfterPageBreakFor = function($line) {
  var typeOfLine = typeOf($line);
  var minimumLines = MINIMUM_LINES_AFTER_PAGE_BREAK[typeOfLine] || 1;
  return minimumLines;
}

var calculateElementSplitPosition = function(innerLineNumber, $line, context) {
  var lineId     = $line.attr("id");
  var lineNumber = context.rep.lines.indexOfKey(lineId);
  var lineText   = context.rep.lines.atKey(lineId).text;

  var position = findPositionWhereLineCanBeSplit(innerLineNumber, $line, context, lineText, lineNumber);
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
var findPositionWhereLineCanBeSplit = function(innerLineNumber, $line, context, lineText, lineNumber) {
  var targetInnerLine             = innerLineNumber;
  var minimumLinesBeforePageBreak = getMinimumLinesBeforePageBreakFor($line);
  var minimumLinesAfterPageBreak  = getMinimumLinesAfterPageBreakFor($line);

  var columnAfterLastSentenceMarker = 1 + getColumnOfLastSentenceMarkerOfInnerLine(targetInnerLine, lineText, lineNumber, context, $line);
  // only can split element if it has a sentence that fits the available height. If no sentence
  // marker is found, columnAfterLastSentenceMarker is 0
  while (columnAfterLastSentenceMarker && targetInnerLine >= minimumLinesBeforePageBreak) {
    var textAfterPageBreak   = lineText.substring(columnAfterLastSentenceMarker);
    var heightAfterPageBreak = calculateHeightToFitText(textAfterPageBreak, $line);
    var linesAfterPageBreak  = parseInt(heightAfterPageBreak / getRegularLineHeight());

    if (linesAfterPageBreak >= minimumLinesAfterPageBreak) {
      // found an inner line that satisfies all conditions
      return {
        column: columnAfterLastSentenceMarker,
        heightAfterPageBreak: heightAfterPageBreak
      };
    } else {
      // this line did not satisfy conditions; try previous one
      targetInnerLine--;
      columnAfterLastSentenceMarker = 1 + getColumnOfLastSentenceMarkerOfInnerLine(targetInnerLine, lineText, lineNumber, context, $line);
    }
  }
}

var getMoreAndContdInfo = function($line) {
  var typeOfLine = typeOf($line);
  if (HAVE_MORE_AND_CONTD[typeOfLine]) {
    return {
      characterName: findCharacterNameOf($line),
    };
  }
  return false;
}

var findCharacterNameOf = function($line) {
  // navigate up until find an element that is not a dialogue or parenthetical
  // (include $line because there might be no dialogue or parenthetical before it, so the result would
  // be empty)
  var $firstElementOfDialogueOfBlock = $line.prevUntil("div:not(:has(dialogue,parenthetical))").andSelf().last();

  // element before dialogue block should be a character -- if it is not, the text will be ""
  var $characterBeforeDialogueBlock = $firstElementOfDialogueOfBlock.prev().find("character");

  // we cannot store "" as character name, Etherpad considers this an inexistent attribute. So we
  // store a fake value and replace it by "" when showing on editor
  var characterName = $characterBeforeDialogueBlock.text().toUpperCase() || EMPTY_CHARACTER_NAME;

  return characterName;
}

var splitElementsOnPositions = function(splitPositions, context) {
  var attributeManager = context.documentAttributeManager;
  var cs               = context.callstack;

  var addPageBreak = [["splitPageBreak", true]];

  performNonUnduableEvent(cs, function() {
    for (var i = splitPositions.length - 1; i >= 0; i--) {
      var splitPosition = splitPositions[i];

      var pageBreakType = addPageBreak;
      if (splitPosition.addMoreAndContd) {
        var addPageBreakWithMoreAndContd = [["splitPageBreakWithMoreAndContd", splitPosition.addMoreAndContd.characterName]];
        pageBreakType = addPageBreakWithMoreAndContd;
      }

      attributeManager.setAttributesOnRange(splitPosition.start, splitPosition.end, pageBreakType);
    };
  });
}

var getColumnOfLastSentenceMarkerOfInnerLine = function(innerLineNumber, fullText, lineNumber, context, $line) {
  var lineHasMarker = checkLineHasMarker(lineNumber, context);

  // get text until the end of target inner line
  var innerLineLength = getInnerLineLengthOf($line);
  var endOfTargetLine = lineHasMarker ? 1 : 0; // include the "*" on the beginning, if line has marker
  endOfTargetLine    += innerLineNumber * innerLineLength;
  var innerLineText   = fullText.substring(0, endOfTargetLine);

  // look backwards for the last sentence marker of the text
  return innerLineText.search(/[.?!;][^.?!;]*$/);
}

var checkLineHasMarker = function(lineNumber, context) {
  return context.documentAttributeManager.lineHasMarker(lineNumber);
}

var getInnerLineLengthOf = function($line) {
  var typeOfLine = typeOf($line);
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
  var $innerClone = $theClone.find(SCRIPT_ELEMENTS_SELECTOR);

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

var performNonUnduableEvent = function(callstack, action) {
  var eventType = callstack.editEvent.eventType;

  callstack.startNewEvent("nonundoable");
  action();
  callstack.startNewEvent(eventType);
}
