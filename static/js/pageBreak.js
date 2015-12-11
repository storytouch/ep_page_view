var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var REGULAR_LINES_PER_PAGE = 54;
var SCRIPT_ELEMENTS_SELECTOR = "heading, action, character, parenthetical, dialogue, transition, shot";

// HACK: page breaks are not *permanently* drawn until everything is setup on the editor.
// To be able to have page breaks drawn when opening the script (before user starts changing
// the script), we need to force redrawPageBreaks() to run on the first Etherpad "tic"
// ("idleWorkTimer" event). This flag controls when to execute this first run of
// redrawPageBreaks()
var firstPageBreakRedrawNotRunYet = true;

exports.aceEditEvent = function(hook, context) {
  // don't do anything if page break is disabled
  if (!clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled) return;

  var cs = context.callstack;

  // force redrawPageBreaks() to run. See notes on firstPageBreakRedrawNotRunYet for more details
  if (needInitialPageBreakRedraw(cs)) {
    redrawPageBreaks();
    firstPageBreakRedrawNotRunYet = false;
  }

  // don't do anything if text did not change
  if(!cs.docTextChanged) return;

  redrawPageBreaks();
}

var redrawPageBreaks = function() {
  // clean page breaks
  var $lines = getPadInner().find("div");
  $lines.removeClass("pageBreak");

  var $linesWithPageBreaks = filterLinesToHavePageBreak($lines);

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

var filterLinesToHavePageBreak = function($lines) {
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

      var $elementOnTopOfPage;
      // ignore empty lines on top of pages (see details about this HACK above)
      if (lineIsEmpty) {
        $elementOnTopOfPage = $currentLine;
        currentPageHeight = 0;
        // start skipping lines again
        skippingEmptyLines = true;
      } else {
        var blockInfo = getBlockInfo($currentLine, lineHeight);

        $elementOnTopOfPage = blockInfo.$topOfBlock;
        currentPageHeight = blockInfo.blockHeight;
        skippingEmptyLines = false;

        // move $currentLine to end of the block
        $currentLine = blockInfo.$bottomOfBlock;
      }

      // mark element to be on top of page
      $linesWithPageBreaks = $linesWithPageBreaks.add($elementOnTopOfPage);
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

var getBlockInfo = function($currentLine, currentLineHeight) {
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
    var blockHeight = currentLineHeight + getLineHeight($previousLine);
    blockInfo.blockHeight = blockHeight;
    blockInfo.$topOfBlock = $previousLine;
    // blockInfo.$bottomOfBlock = $currentLine;
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
    // blockInfo.$bottomOfBlock = $currentLine;
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
    // blockInfo.$bottomOfBlock = $currentLine;
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