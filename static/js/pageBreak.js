var $ = require('ep_etherpad-lite/static/js/rjquery').$;

// Letter
// var REGULAR_LINES_PER_PAGE = 54;
// A4
var REGULAR_LINES_PER_PAGE = 58;

var SCRIPT_ELEMENTS_SELECTOR = "heading, action, character, parenthetical, dialogue, transition, shot";

// HACK: page breaks are not *permanently* drawn until everything is setup on the editor.
// To be able to have page breaks drawn when opening the script (before user starts changing
// the script), we need to force redrawPageBreaks() to run on the first Etherpad "tic"
// ("idleWorkTimer" event). This flag controls when to execute this first run of
// redrawPageBreaks()
var firstPageBreakRedrawNotRunYet = true;

exports.aceAttribsToClasses = function(hook, context) {
  if(context.key === 'splitPageBreak'){
    return [context.key];
  }
}

exports.aceCreateDomLine = function(hook, context){
  var cls = context.cls;

  if (cls.match('splitPageBreak')){
    var modifier = {
      extraOpenTags: '<elementPageBreak/>',
      extraCloseTags: '',
      cls: ''
    };
    return [modifier];
  }
  return [];
};

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

  var $linesWithPageBreaks = filterLinesToHavePageBreak($lines, context);

  // add page break markers to selected lines
  $linesWithPageBreaks.addClass("pageBreak");
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
  var removePageBreak = [["splitPageBreak", false]];

  performNonUnduableEvent(cs, function() {
    attributeManager.setAttributesOnRange(docStart, docEnd, removePageBreak);
  });
}

var filterLinesToHavePageBreak = function($lines, context) {
  var maxPageHeight = getMaxPageHeight();
  var $linesWithPageBreaks = $();

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

        var splitElementInfo = splitElement($currentLine, context);
        if (splitElementInfo) {
          // restart counting page height again
          currentPageHeight = splitElementInfo.heightAfterPageBreak;
        } else {
          var blockInfo = getBlockInfo($currentLine);

          currentPageHeight = blockInfo.blockHeight;

          // mark element to be on top of page
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

  return $linesWithPageBreaks;
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
    // (*) => (parenthetical || dialogue) => transition (only one line of text)
    //                                       +--------- $currentLine ----------+
    else {
      var $lineBeforePrevious = $previousLine.prev();
      var blockHeight = currentLineHeight + getLineHeight($previousLine) + getLineHeight($lineBeforePrevious);
      blockInfo.blockHeight = blockHeight;
      blockInfo.$topOfBlock = $lineBeforePrevious;
    }
  }
  // block type:
  // (*) => (parenthetical || dialogue) => !(parenthetical || dialogue)
  //        +------ $currentLine -----+
  else if ((typeOfCurrentLine === "parenthetical" || typeOfCurrentLine === "dialogue")
     &&
     (typeOfNextLine !== "parenthetical" && typeOfNextLine !== "dialogue")) {
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
  var numberOfInnerLines = totalHeight / heightOfOneLine;

  return numberOfInnerLines;
}

var splitElement = function($line, context) {
  var singleInnerLineHeight = getRegularLineHeight();
  var numberOfInnerLines = getNumberOfInnerLines($line, singleInnerLineHeight);

  if (numberOfInnerLines > 1) {
    var innerLineToSplitElement = 1;
    var innerLinesAfterPageBreak = numberOfInnerLines-innerLineToSplitElement;

    splitElementOnInnerLine(innerLineToSplitElement, $line, context);

    return {
      // TODO change this
      // need to improve calculation of height of lines after page break
      heightAfterPageBreak: singleInnerLineHeight * innerLinesAfterPageBreak
    };
  }
}

var getNumberOfInnerLines = function($line, singleInnerLineHeight) {
  var totalInnerHeight   = $line.height();
  var numberOfInnerLines = parseInt(totalInnerHeight/singleInnerLineHeight);

  return numberOfInnerLines;
}

var splitElementOnInnerLine = function(innerLineNumber, $line, context) {
    var attributeManager = context.documentAttributeManager;
    var cs               = context.callstack;

    var lineId                  = $line.attr("id");
    var lineNumber              = context.rep.lines.indexOfKey(lineId);
    // TODO position of page break is not necessarily the end of line. It is the last sentence mark
    // before the beginning of innerLineNumber
    var elementLength                   = 61;
    var columnOfBeginningOf2ndInnerLine = innerLineNumber       * elementLength;
    var columnOfEndOf2ndInnerLine       = (innerLineNumber + 1) * elementLength;
    var beginningOf2ndInnerLine         = [lineNumber, columnOfBeginningOf2ndInnerLine];
    var endOf2ndInnerLine               = [lineNumber, columnOfEndOf2ndInnerLine];
    var addPageBreak                    = [["splitPageBreak", true]];

    performNonUnduableEvent(cs, function() {
      attributeManager.setAttributesOnRange(beginningOf2ndInnerLine, endOf2ndInnerLine, addPageBreak);
    });

}

var performNonUnduableEvent = function(callstack, action) {
  var eventType = callstack.editEvent.eventType;

  callstack.startNewEvent("nonundoable");
  action();
  callstack.startNewEvent(eventType);
}