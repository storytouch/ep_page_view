var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils              = require('./utils');
var paginationBlocks   = require('./paginationBlocks');
var paginationSplit    = require('./paginationSplit');
var paginationNonSplit = require('./paginationNonSplit');

// Letter
// var REGULAR_LINES_PER_PAGE = 54;
// A4
var REGULAR_LINES_PER_PAGE = 58;

exports.aceRegisterBlockElements = function(hook, context) {
  return ["line_with_page_break"];
}

exports.aceAttribsToClasses = function(hook, context) {
  // simple page break, return only the flag as class
  if(paginationSplit.isRegularPageBreakAttrib(context.key) || paginationNonSplit.isRegularPageBreakAttrib(context.key)) {
    return [context.key];
  }
  // page break with MORE/CONT'D, return context.key and characterName:<character name>
  else if (paginationSplit.isPageBreakWithMoreAndContdAttrib(context.key) || paginationNonSplit.isPageBreakWithMoreAndContdAttrib(context.key)) {
    var characterName = utils.buildCharacterNameToClass(context.value);
    return [context.key, characterName];
  }
}

exports.aceDomLineProcessLineAttributes = function(name, context) {
  var extraHTML = paginationNonSplit.buildHtmlWithPageBreaks(context.cls);
  if (extraHTML) {
    // Bug fix: lines with page break need to be wrapped by a registered block element
    // (see aceRegisterBlockElements), otherwise caret will start moving alone when placed
    // on those lines
    var modifier = {
      preHtml: '<line_with_page_break>',
      postHtml: extraHTML + '</line_with_page_break>',
      processedMarker: true
    };
    return [modifier];
  }
  return [];
}

exports.aceCreateDomLine = function(hook, context){
  var extraHTML = paginationSplit.buildHtmlWithPageBreaks(context.cls);
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

exports.aceEditEvent = function(hook, context) {
  // don't do anything if page break is disabled
  if (!clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled) return;

  // don't do anything if text did not change
  if(!context.callstack.docTextChanged) return;

  redrawPageBreaks(context);
}

var redrawPageBreaks = function(context) {
  cleanPageBreaks(context);

  var pageBreaksInfo = calculatePageBreaks(context);
  var $linesWithPageBreaks = pageBreaksInfo.linesWithPageBreaks;
  var splitPositions = pageBreaksInfo.splitPositions;

  // add page break markers to selected lines
  paginationNonSplit.savePageBreaks($linesWithPageBreaks, context);

  // split elements that are in the middle of a page break
  paginationSplit.savePageBreaks(splitPositions, context);
}

var cleanPageBreaks = function(context) {
  var attributeManager = context.documentAttributeManager;
  var cs               = context.callstack;
  var totalLines       = context.rep.lines.length();

  utils.performNonUnduableEvent(cs, function() {
    paginationNonSplit.cleanPageBreaks(context);
    paginationSplit.cleanPageBreaks(context);
  });
}

var calculatePageBreaks = function(context) {
  var maxPageHeight = getMaxPageHeight();
  var $lines = utils.getPadInner().find("div");
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
    var lineHeight = utils.getLineHeight($currentLine);
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
        var splitElementInfo = paginationSplit.getSplitInfo($currentLine, lineHeight, availableHeightOnPage, context);
        // can we split current line?
        if (splitElementInfo) {
          // restart counting page height again
          currentPageHeight = splitElementInfo.heightAfterPageBreak;

          // mark element to be split when pagination is done
          elementsToBeSplit.push(splitElementInfo);
        }
        // is it a block of lines? (A block can have only a single line too)
        else {
          var blockInfo = paginationBlocks.getBlockInfo($currentLine);

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

// cache maxPageHeight
var maxPageHeight;
var getMaxPageHeight = function() {
  maxPageHeight = maxPageHeight || (REGULAR_LINES_PER_PAGE * utils.getRegularLineHeight());
  return maxPageHeight;
}

var reachedEndOfPad = function($currentLine) {
  return $currentLine.length === 0;
}
