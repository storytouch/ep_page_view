var Security = require('ep_etherpad-lite/static/js/security');

var EMPTY_CHARACTER_NAME = "empty";

var SCRIPT_ELEMENTS_SELECTOR = "heading, action, character, parenthetical, dialogue, transition, shot";

exports.CLONED_ELEMENTS_CLASS = "cloned";
var CLONED_ELEMENTS_CLASS = exports.CLONED_ELEMENTS_CLASS;

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
  return Math.round(lineHeight);
}
exports.getLineHeightWithoutMargins = function($targetLine) {
  // Bug fix: some cloned lines have a non-integer height, need to round it
  return Math.round($targetLine.height());
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
  var pageNumberTag = '<pagenumber data-page-number="'+pageNumber+'"><calculating/></pagenumber>';
  var pageBreakTag = '<'+tagName+'></'+tagName+'>';
  return pageBreakTag + pageNumberTag;
}
var buildSimplePageBreak = exports.buildSimplePageBreak;

var extractCharacterNameFromClass = function(cls) {
  var regex  = "(?:^| )characterName:<([^>]*)>"; // "characterName:<character name>"
  var characterNameFound = cls.match(new RegExp(regex));
  var characterName = characterNameFound ? characterNameFound[1] : "";

  return characterName;
}

exports.pageNumberOfDOMLine = function($line) {
  return $line.find("pagenumber").attr("data-page-number");
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

exports.getDOMLineFromLineNumber = function(lineNumber, rep) {
  return rep.lines.atIndex(lineNumber).lineNode;
}

exports.nodeHasMoreAndContd = function($node) {
  return $node.find("more").length > 0;
}

exports.setTextOfLine = function($targetLine, text) {
  var $innerTarget = $targetLine.find(SCRIPT_ELEMENTS_SELECTOR);

  var isGeneral = $innerTarget.length === 0;
  if (isGeneral) {
    // general has no inner tag, so use the whole div
    $targetLine.text(text);
  } else {
    $innerTarget.text(text);
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
    innerHtml = "<" + tag + ">" + text + "</" + tag + ">";
  }

  return $("<div>" + innerHtml + "</div>");
}

exports.cloneLine = function($targetLine) {
  var $clonedLine = $targetLine.clone();
  $clonedLine.addClass(CLONED_ELEMENTS_CLASS);
  $clonedLine.attr("id", "");

  return $clonedLine;
}