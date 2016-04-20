var utils = require('./utils');
var paginationPageNumber = require('./paginationPageNumber');

var PAGE_BREAKS_ATTRIB                     = "nonSplitPageBreak";
var PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB = "nonSplitPageBreakWithMoreAndContd";
exports.PAGE_BREAK_ATTRIBS = [PAGE_BREAKS_ATTRIB, PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB];

var PAGE_BREAK_TAG = "nonSplitPageBreak";
exports.PAGE_BREAK_TAG = PAGE_BREAK_TAG;
utils.registerPageBreakTag(PAGE_BREAK_TAG);

exports.atribsToClasses = function(context) {
  // simple page break, return only the flag as class
  if(isRegularPageBreakAttrib(context.key)) {
    return [context.key];
  }
  // page break with MORE/CONT'D, return context.key and characterName:<character name>
  else if (isPageBreakWithMoreAndContdAttrib(context.key)) {
    var characterName = utils.buildCharacterNameToClass(context.value);
    return [context.key, characterName];
  }
}

var isRegularPageBreakAttrib = function(contextKey) {
  return contextKey === PAGE_BREAKS_ATTRIB;
}

var isPageBreakWithMoreAndContdAttrib = function(contextKey) {
  return contextKey === PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB;
}

exports.buildHtmlWithPageBreaks = function(cls) {
  var extraHTML;

  if (cls.match(PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB)) {
    extraHTML = utils.buildPageBreakWithMoreAndContd(cls, PAGE_BREAK_TAG);
  } else if (cls.match(PAGE_BREAKS_ATTRIB)) {
    extraHTML = utils.buildSimplePageBreak(cls, PAGE_BREAK_TAG);
  }

  // Bug fix: lines with page break need to be wrapped by a registered block element
  // (see blockElements), otherwise caret will start moving alone when placed
  // on those lines
  if (extraHTML) {
    return {
      preHtml: '<line_with_page_break>',
      postHtml: extraHTML + '</line_with_page_break>'
    };
  }
}

exports.blockElements = function() {
  return ['line_with_page_break'];
}

exports.cleanPageBreaks = function(startAtLine, endAtLine, attributeManager) {
  for (var lineNumber = endAtLine; lineNumber >= startAtLine; lineNumber--) {
    if (exports.lineHasPageBreak(lineNumber, attributeManager)) {
      removePageBreak(lineNumber, attributeManager);
    }
  }
}

exports.lineHasPageBreak = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, PAGE_BREAKS_ATTRIB) ||
         attributeManager.getAttributeOnLine(lineNumber, PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB);
}

var removePageBreak = function(lineNumber, attributeManager) {
  attributeManager.removeAttributeOnLine(lineNumber, PAGE_BREAKS_ATTRIB);
  attributeManager.removeAttributeOnLine(lineNumber, PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB);
}

exports.getNonSplitInfo = function($line, lineNumberShift, rep) {
  // Bug fix: if we place page breaks before the element, caret will start moving alone
  // when placed on an element immediately after page break; to avoid that, we place page
  // break after the last element of previous page, instead of first element of next page
  var $targetLine = $line.prev();
  // some lines before $targetLine might be split lines that would be merged on pagination,
  // so we need to shift line number to address that
  var lineNumberAfterClean = utils.getLineNumberFromDOMLine($targetLine, rep) + lineNumberShift;
  var moreAndContdInfo = getMoreAndContdInfo($targetLine);

  return {
    lineNumberBeforeClean: utils.getLineNumberFromDOMLine($targetLine, rep),
    lineNumberAfterClean: lineNumberAfterClean,
    addMoreAndContd: moreAndContdInfo,
  };
}

var getMoreAndContdInfo = function($line) {
  var lineIsParentheticalOrDialogue = $line.has("parenthetical, dialogue").length > 0;
  var nextLineIsParentheticalOrDialogue = $line.next().has("parenthetical, dialogue").length > 0;

  if (lineIsParentheticalOrDialogue && nextLineIsParentheticalOrDialogue) {
    return {
      characterName: utils.findCharacterNameOf($line),
    };
  }
  return false;
}

exports.savePageBreak = function(nonSplitInfo, pageNumber, attributeManager) {
  var lineWithPageBreak = nonSplitInfo.lineNumberAfterClean;

  var attributeName = PAGE_BREAKS_ATTRIB;
  var attributeValue = true;

  if (nonSplitInfo.addMoreAndContd) {
    attributeName = PAGE_BREAKS_WITH_MORE_AND_CONTD_ATTRIB;
    attributeValue = nonSplitInfo.addMoreAndContd.characterName;
  }

  attributeManager.setAttributeOnLine(lineWithPageBreak, attributeName, attributeValue);

  // save page number
  paginationPageNumber.savePageBreak(lineWithPageBreak, pageNumber, attributeManager);
}

exports.nodeHasPageBreak = function($node) {
  return $node.find(PAGE_BREAK_TAG).length > 0;
}
