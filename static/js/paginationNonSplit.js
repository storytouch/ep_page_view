var utils = require('./utils');

var PAGE_BREAKS_ATTRIB                     = "nonSplitPageBreak";
var PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB = "nonSplitPageBreakWithMoreAndContd";

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
    extraHTML  = '<more class="nonSplit"></more>';
    extraHTML += '<nonSplitPageBreak></nonSplitPageBreak>';
    // Bug fix: contenteditable=false avoids caret being placed on CONT'D line
    extraHTML += '<contdLine contenteditable="false"><contd class="nonSplit" data-character="' + characterName + '"></contd></contdLine>';
  } else if (cls.match(PAGE_BREAKS_ATTRIB)) {
    extraHTML = '<nonSplitPageBreak></nonSplitPageBreak>';
  }

  return extraHTML;
}

exports.cleanPageBreaks = function(attributeManager, rep) {
  var $linesWithPageBreaks = utils.getPadInner().find("nonSplitPageBreak").closest("div");

  $linesWithPageBreaks.each(function() {
    var lineId     = $(this).attr("id");
    var lineNumber = rep.lines.indexOfKey(lineId);

    attributeManager.removeAttributeOnLine(lineNumber, PAGE_BREAKS_ATTRIB);
    attributeManager.removeAttributeOnLine(lineNumber, PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB);
  });
}

exports.savePageBreaks = function($linesAfterPageBreaks, attributeManager, rep) {
  // Bug fix: if we place page breaks before the element, caret will start moving alone
  // when placed on an element immediately after page break; to avoid that, we place page
  // break after the last element of previous page, instead of first element of next page
  var $linesBeforePageBreaks = $linesAfterPageBreaks.prev();

  $linesBeforePageBreaks.each(function() {
    var attributeName = PAGE_BREAKS_ATTRIB;
    var attributeValue = true;

    if (hasMoreAndContd($(this))) {
      attributeName = PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB;
      attributeValue = utils.findCharacterNameOf($(this));
    }

    var lineId     = $(this).attr("id");
    var lineNumber = rep.lines.indexOfKey(lineId);
    attributeManager.setAttributeOnLine(lineNumber, attributeName, attributeValue);
  });
}

var hasMoreAndContd = function($line) {
  var lineIsParentheticalOrDialogue = $line.has("parenthetical, dialogue").length > 0;
  var nextLineIsParentheticalOrDialogue = $line.next().has("parenthetical, dialogue").length > 0;
  var hasMoreAndContd = lineIsParentheticalOrDialogue && nextLineIsParentheticalOrDialogue;

  return hasMoreAndContd;
}
