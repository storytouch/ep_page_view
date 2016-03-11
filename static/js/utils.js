var Security = require('ep_etherpad-lite/static/js/security');

var EMPTY_CHARACTER_NAME = "empty";

exports.SCRIPT_ELEMENTS_SELECTOR = "heading, action, character, parenthetical, dialogue, transition, shot";
var SCRIPT_ELEMENTS_SELECTOR = exports.SCRIPT_ELEMENTS_SELECTOR;

exports.CLONED_ELEMENTS_CLASS = "cloned";

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

exports.typeOf = function($line) {
  var $innerElement = $line.find(SCRIPT_ELEMENTS_SELECTOR);
  var tagName = $innerElement.prop("tagName") || "general"; // general does not have inner tag

  return tagName.toLowerCase();
}

exports.getLineTypeOf = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, "script_element");
}

exports.getLineHeight = function($targetLine) {
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
exports.getLineHeightWithoutMargins = function($targetLine) {
  return $targetLine.height();
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
  return getPadOuter().find("#linemetricsdiv").get(0).getBoundingClientRect().width;
}

exports.getHeightOfOneLine = function() {
  return getPadOuter().find("#linemetricsdiv").get(0).getBoundingClientRect().height;
}
var getHeightOfOneLine = exports.getHeightOfOneLine;

exports.findCharacterNameOf = function($line) {
  // navigate up until find an element that is not a dialogue or parenthetical
  // (include $line because there might be no dialogue or parenthetical before it, so the result would
  // be empty)
  var $firstElementOfDialogueOfBlock = $line.prevUntil("div:not(:has(dialogue,parenthetical))").andSelf().first();

  // element before dialogue block should be a character -- if it is not, the text will be ""
  var $characterBeforeDialogueBlock = $firstElementOfDialogueOfBlock.prev().find("character");

  // we cannot store "" as character name, Etherpad considers this an inexistent attribute. So we
  // store a fake value and replace it by "" when showing on editor
  var characterName = $characterBeforeDialogueBlock.text().toUpperCase() || EMPTY_CHARACTER_NAME;

  return characterName;
}

exports.performNonUnduableEvent = function(callstack, action) {
  var eventType = callstack.editEvent.eventType;

  callstack.startNewEvent("nonundoable");
  action();
  callstack.startNewEvent(eventType);
}

exports.buildCharacterNameToClass = function(value) {
  var characterName = (value === EMPTY_CHARACTER_NAME ? "" : value);

  // "characterName:<character name>"
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
  return '<'+tagName+' data-page-number="'+pageNumber+'"></'+tagName+'>';
}
var buildSimplePageBreak = exports.buildSimplePageBreak;

var extractCharacterNameFromClass = function(cls) {
  var regex  = "(?:^| )characterName:<([^>]*)>"; // "characterName:<character name>"
  var characterNameFound = cls.match(new RegExp(regex));
  var characterName = characterNameFound ? characterNameFound[1] : "";

  return characterName;
}

exports.buildPageNumberToClass = function(value) {
  return 'pageNumber:' + value;
}

var extractPageNumberFromClass = function(cls) {
  var regex = "(?:^| )pageNumber:([0-9]*)";
  var pageNumberFound = cls.match(new RegExp(regex));
  var pageNumber = pageNumberFound ? pageNumberFound[1] : "";

  return pageNumber;
}

exports.getLineNumberFromDOMLine = function($line, rep) {
  var lineId     = $line.attr("id");
  var lineNumber = rep.lines.indexOfKey(lineId);

  return lineNumber;
}

exports.nodeHasMoreAndContd = function($node) {
  return $node.find("more").length > 0;
}
