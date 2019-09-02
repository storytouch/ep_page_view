var utils = require('./utils');

var PAGE_NUMBER_ATTRIB = 'pageNumber';
exports.PAGE_NUMBER_ATTRIB = PAGE_NUMBER_ATTRIB;

exports.cleanPageBreaks = function(linesToBeCleared, attributeManager) {
  for (var i = linesToBeCleared.length - 1; i >= 0; i--) {
    var lineNumber = linesToBeCleared[i];
    // remove marker of page number
    if (lineHasPageNumberMarker(lineNumber, attributeManager)) {
      removePageNumberFrom(lineNumber, attributeManager);
    }
  }
}

exports.savePageBreak = function(pageBreakInfo, pageNumber, attributeManager) {
  // although the pagination might be at the same spot on text, the page number
  // might have changed, so we need to check for that too (ex: user removes a full
  // page => page breaks will be at the same places, but all page numbers will
  // be decremented by 1)
  if (!pageBreakInfo.skipPagination || pageNumberChanged(pageBreakInfo, pageNumber, attributeManager)) {
    var lineNumber = pageBreakInfo.lineNumberAfterClean;
    setPageNumberOnLine(lineNumber, pageNumber, attributeManager);
  }
}

var pageNumberChanged = function(pageBreakInfo, nextPageNumber, attributeManager) {
  var lineNumber = pageBreakInfo.lineNumberAfterClean;
  var currentPageNumber = getPageNumberOfLine(lineNumber, attributeManager);
  return currentPageNumber.toString() !== nextPageNumber.toString();
}

var lineHasPageNumberMarker = function(lineNumber, attributeManager) {
  return !!getPageNumberOfLine(lineNumber, attributeManager);
}

var getPageNumberOfLine = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, PAGE_NUMBER_ATTRIB);
}

var setPageNumberOnLine = function(lineNumber, pageNumber, attributeManager) {
  attributeManager.setAttributeOnLine(lineNumber, PAGE_NUMBER_ATTRIB, pageNumber);
}

var removePageNumberFrom = function(lineNumber, attributeManager) {
  attributeManager.removeAttributeOnLine(lineNumber, PAGE_NUMBER_ATTRIB);
}

// for each line on $linesWithPageBreaks, make sure its page number is correct.
// $linesWithPageBreaks[0] should have pageNumber === lastPageNumber;
// $linesWithPageBreaks[1] should have pageNumber === lastPageNumber + 1;
// etc.
exports.ensurePageNumbersAreCorrectAfterLine = function($linesWithPageBreaks, lastPageNumber, attributeManager, rep) {
  for (var i = 0; i < $linesWithPageBreaks.length; i++) {
    var thisPageNumber = lastPageNumber + i;
    var $thisLine = $linesWithPageBreaks.eq(i);
    var thisLineNumber = utils.getLineNumberFromDOMLine($thisLine, rep);
    if (pageNumberChanged(thisLineNumber, thisPageNumber, attributeManager)) {
      setPageNumberOnLine(thisLineNumber, thisPageNumber, attributeManager);
    }
  }
}

exports.atribsToClasses = function(context) {
  if (isPageNumber(context.key)) {
    var pageNumber = utils.buildPageNumberToClass(context.value);
    return [context.key, pageNumber];
  }
}

var isPageNumber = function(contextKey) {
  return contextKey === PAGE_NUMBER_ATTRIB;
}
