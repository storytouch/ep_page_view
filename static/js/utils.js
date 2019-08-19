var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var Security = require('ep_etherpad-lite/static/js/security');

var scriptElementUtils = require('ep_script_elements/static/js/utils');

var EMPTY_CHARACTER_NAME = 'empty';

var SCRIPT_ELEMENTS_SELECTOR = 'heading, action, character, parenthetical, dialogue, transition, shot';

var CLONED_ELEMENTS_CLASS = 'cloned';
var CLONED_ELEMENTS_SELECTOR = '.' + CLONED_ELEMENTS_CLASS;

// Letter
// var REGULAR_LINES_PER_PAGE = 54;
// A4
var REGULAR_LINES_PER_PAGE = 58;

// WARNING: if you change any of these values, you need to change on the CSS of page breaks too
var DEFAULT_PAGE_BREAK_HEIGHT = 10;
var DEFAULT_PAGE_BREAK_MARGING_TOP = 48;
var DEFAULT_PAGE_BREAK_MARGING_BOTTOM = 48;
var DEFAULT_PAGE_BREAK_BORDER_TOP = 1;
var DEFAULT_PAGE_BREAK_BORDER_BOTTOM = 1;
// Bug fix: some zoom values mess up with border (they don't have exactly 1px), so we
// need some extra px's to avoid messing up with pagination
var SAFETY = 2;
var DEFAULT_PAGE_BREAK_TOTAL_HEIGHT =
  DEFAULT_PAGE_BREAK_HEIGHT +
  DEFAULT_PAGE_BREAK_MARGING_TOP +
  DEFAULT_PAGE_BREAK_MARGING_BOTTOM +
  DEFAULT_PAGE_BREAK_BORDER_TOP +
  DEFAULT_PAGE_BREAK_BORDER_BOTTOM +
  SAFETY;


// Easier access to outer pad
var padOuter;
exports.getPadOuter = function() {
 padOuter = padOuter || $('iframe[name="ace_outer"]').contents();
 return padOuter;
}
var getPadOuter = exports.getPadOuter;

// Easier access to inner pad
var padInner;
exports.getPadInner = function() {
 padInner = padInner || getPadOuter().find('iframe[name="ace_inner"]').contents();
 return padInner;
}
var getPadInner = exports.getPadInner;

exports.getPluginProps = function() {
  return clientVars.plugins.plugins.ep_script_page_view;
}

exports.typeOf = function($line) {
  var $innerElement = $line.find(SCRIPT_ELEMENTS_SELECTOR);
  var tagName = $innerElement.prop('tagName') || 'general'; // general does not have inner tag

  return tagName.toLowerCase();
}

exports.getLineTypeOf = function(lineNumber, attributeManager) {
  return scriptElementUtils.getLineType(lineNumber, attributeManager);
}

var bottomOf = function($targetLine) {
  return $targetLine.get(0).getBoundingClientRect().bottom;
}
var heightOf = function($targetLine) {
  return $targetLine.get(0).getBoundingClientRect().height;
}
var widthOf = function($targetLine) {
  return $targetLine.get(0).getBoundingClientRect().width;
}

exports.getMarginOf = function($targetLine) {
  var totalHeightOfLine = exports.getLineHeight($targetLine);
  var innerHeightOfLine = exports.getLineHeightWithoutMargins($targetLine);

  return totalHeightOfLine - innerHeightOfLine;
}

var totalHeightOf = function($targetLine, $innerElement) {
  var totalLineHeight;

  // Bug fix: when zoom !== 100%, lines might have a float height, so we cannot use jQuery
  // (it only returns integer values for .height() and .outerHeight(true))
  if (lineIsFirstOfScript($targetLine)) {
    // line is first of script, it doesn't have margins nor paddings. Use line height instead
    totalLineHeight = heightOf($innerElement);
  } else {
    var bottomOfTargetLine       = bottomOf($targetLine);
    var bottomOfLineBeforeTarget = bottomOf($targetLine.prev());

    totalLineHeight = bottomOfTargetLine - bottomOfLineBeforeTarget;
  }

  return totalLineHeight;
}

var lineIsFirstOfScript = function($targetLine) {
  return $targetLine.prev().length === 0;
}

exports.getLineHeight = function($targetLine) {
  var lineHeight;

  // margin top/bottom are defined on script elements, not on div, so we need to get the
  // inner element
  var $innerElement = $targetLine.find(SCRIPT_ELEMENTS_SELECTOR);

  // general have no inner tag, so get height from targetLine
  var isGeneral = $innerElement.length === 0;
  if (isGeneral) {
    lineHeight = heightOf($targetLine);
  } else {
    lineHeight = totalHeightOf($targetLine, $innerElement);
  }

  return lineHeight;
}
exports.getLineHeightWithoutMargins = function($targetLine) {
  return heightOf($targetLine);
}

// cache regularLineHeight
var regularLineHeight;
exports.getRegularLineHeight = function() {
  regularLineHeight = regularLineHeight || getHeightOfOneLine();
  return regularLineHeight;
}

exports.updateRegularLineHeight = function() {
  regularLineHeight = getHeightOfOneLine();
}

exports.getWidthOfOneChar = function() {
  return widthOf(getPadOuter().find('#linemetricsdiv'));
}

exports.getHeightOfOneLine = function() {
  return heightOf(getPadOuter().find('#linemetricsdiv'));
}
var getHeightOfOneLine = exports.getHeightOfOneLine;

exports.findCharacterNameOf = function($line) {
  // navigate up until find an element that is not a dialogue or parenthetical
  // (include $line because there might be no dialogue or parenthetical before it, so the result would
  // be empty)
  var $firstElementOfDialogueOfBlock = $line.prevUntil('div:not(:has(dialogue,parenthetical))').andSelf().first();

  // element before dialogue block should be a character -- if it is not, the text will be ''
  var $characterBeforeDialogueBlock = $firstElementOfDialogueOfBlock.prev().find('character');

  // we cannot store '' as character name, Etherpad considers this an inexistent attribute. So we
  // store a fake value and replace it by '' when showing on editor
  var characterName = $characterBeforeDialogueBlock.text().toUpperCase() || EMPTY_CHARACTER_NAME;

  return characterName;
}

exports.performNonUnduableEvent = function(callstack, action) {
  var eventType = callstack.editEvent.eventType;

  callstack.startNewEvent('nonundoable');
  action();
  callstack.startNewEvent(eventType);
}

exports.buildCharacterNameToClass = function(value) {
  var characterName = (value === EMPTY_CHARACTER_NAME ? '' : value);

  // 'characterName:<character name>'
  return 'characterName:<' + Security.escapeHTMLAttribute(characterName) + '>';
}

exports.buildPageBreakWithMoreAndContd = function(cls, tagName) {
  var extraHTML;
  var characterName = extractCharacterNameFromClass(cls);

  extraHTML = '<more></more>';
  extraHTML += buildSimplePageBreak(cls, tagName);
  // Bug fix: contenteditable=false avoids caret being placed on CONT'D line
  extraHTML += '<contdLine contenteditable="false"><contd data-character="' + characterName + '"></contd></contdLine>';

  return extraHTML;
}

exports.buildSimplePageBreak = function(cls, tagName) {
  var pageNumber = extractPageNumberFromClass(cls);
  var pageNumberTag = '<pagenumber contenteditable="false" data-page-number="'+pageNumber+'"><calculating/></pagenumber>';
  var pageBreakTag = '<'+tagName+'></'+tagName+'>';
  return pageBreakTag + pageNumberTag;
}
var buildSimplePageBreak = exports.buildSimplePageBreak;

var extractCharacterNameFromClass = function(cls) {
  var regex  = "(?:^| )characterName:<([^>]*)>"; // "characterName:<character name>"
  var characterNameFound = cls.match(new RegExp(regex));
  var characterName = characterNameFound ? characterNameFound[1] : '';

  return characterName;
}

exports.pageNumberOfDOMLine = function($line) {
  return $line.find('pagenumber').attr('data-page-number');
}

exports.buildPageNumberToClass = function(value) {
  return 'pageNumber:' + value;
}

var extractPageNumberFromClass = function(cls) {
  var regex = "(?:^| )pageNumber:([0-9]*)";
  var pageNumberFound = cls.match(new RegExp(regex));
  var pageNumber = pageNumberFound ? pageNumberFound[1] : '';

  return pageNumber;
}

exports.getLineNumberFromDOMLine = function($line, rep) {
  var lineId     = $line.attr('id');
  var lineNumber = rep.lines.indexOfKey(lineId);

  return lineNumber;
}

exports.getDOMLineFromLineNumber = function(lineNumber, rep) {
  return rep.lines.atIndex(lineNumber).lineNode;
}

exports.getTopSceneMarkOrTargetLine = function($targetLine) {
  return $targetLine.prevUntil(':not(.sceneMark)').andSelf().first();
}

exports.getNextLineIgnoringSceneMarks = function($targetLine) {
  return $targetLine.nextUntil(':not(.sceneMark)').andSelf().last().next();
}

exports.nodeHasMoreAndContd = function($node) {
  return $node.find('more').length > 0;
}

exports.setTextOfLine = function($targetLine, text) {
  var $innerTarget = $targetLine.find(SCRIPT_ELEMENTS_SELECTOR);
  // Bug fix: sometimes there's a whitespace on text represented with &nbsp; (char code 160).
  // We need to transform it to " " otherwise the line height will be higher than the correct value
  // Solution based on http://stackoverflow.com/a/1496863
  var cleanText = text.replace(/\u00a0/g, " ");

  var isGeneral = $innerTarget.length === 0;
  if (isGeneral) {
    // general has no inner tag, so use the whole div
    $targetLine.text(cleanText);
  } else {
    $innerTarget.text(cleanText);
  }
}

exports.createCleanCopyOf = function($targetLine, text) {
  var $innerTarget = $targetLine.find(SCRIPT_ELEMENTS_SELECTOR);
  var innerHtml;

  var isGeneral = $innerTarget.length === 0;
  if (isGeneral) {
    // general has no inner tag, so use only the text
    innerHtml = text;
  } else {
    var tag = $innerTarget.get(0).tagName.toLowerCase();
    innerHtml = '<' + tag + '>' + text + '</' + tag + '>';
  }

  return $('<div>' + innerHtml + '</div>');
}

exports.cleanHelperLines = function($helperLines) {
  $helperLines.addClass(CLONED_ELEMENTS_CLASS);

  // remove possible page-break-related tags.
  $helperLines.find(getPageBreakTagsSelector()).remove();

  // remove classes that impact element dimensions
  $helperLines.removeClass('firstHalf beforePageBreak withMoreAndContd');

  // store original id on another attribute so it can be retrieved later
  $helperLines.each(function(index, element) {
    var $helperLine = $(element);
    var originalId = $helperLine.attr('id');
    $helperLine.attr('data-original-id', originalId);

    // remove id to not mess up with existing lines
    $helperLine.attr('id', '');
  });
}

var pageBreakTags = ['more', 'contdLine', 'pagenumber'];
var pageBreakTagsSelector;
exports.registerPageBreakTag = function(tagName) {
  pageBreakTags.push(tagName);

  // cache selector for faster processing
  pageBreakTagsSelector = _(pageBreakTags).unique().join(',');
}

var getPageBreakTagsSelector = function() {
  return pageBreakTagsSelector;
}
exports.getPageBreakTagsSelector = getPageBreakTagsSelector;

// Use line proportion to find height needed so we always have REGULAR_LINES_PER_PAGE generals/page
var calculatePageHeight = function(oneLineHeight) {
  oneLineHeight = oneLineHeight || getHeightOfOneLine();
  var pageHeightNeeded = oneLineHeight * REGULAR_LINES_PER_PAGE;

  return pageHeightNeeded;
}

// cache maxPageHeight
var maxPageHeight;
exports.getMaxPageHeight = function() {
  maxPageHeight = maxPageHeight || calculatePageHeight();
  return maxPageHeight;
}

var updatePageHeight = function(oneLineHeight) {
  maxPageHeight = calculatePageHeight(oneLineHeight);

  // update cached value for line height
  updateRegularLineHeight();
}

// cache pageBreakHeight
var pageBreakHeight;
var getPageBreakHeight = function() {
  var moreContdLinesHeight = getHeightOfOneLine() * 2; // one line for MORE, another for CONT'D
  pageBreakHeight = DEFAULT_PAGE_BREAK_TOTAL_HEIGHT + moreContdLinesHeight;
  return pageBreakHeight;
}
exports.getPageBreakHeight = getPageBreakHeight;
