var utils = require('./utils');

var PAGE_NUMBER_ATTRIB = "pageNumber";
exports.PAGE_NUMBER_ATTRIB = PAGE_NUMBER_ATTRIB;

exports.cleanPageBreaks = function(attributeManager, rep) {
  var totalLines = rep.lines.length();
  for (var lineNumber = totalLines - 1; lineNumber >= 0; lineNumber--) {
    // remove marker of page number
    if (lineHasPageNumberMarker(lineNumber, attributeManager)) {
      removePageNumberFrom(lineNumber, attributeManager);
    }
  }
}

exports.savePageBreak = function(lineNumber, pageNumber, attributeManager) {
  attributeManager.setAttributeOnLine(lineNumber, PAGE_NUMBER_ATTRIB, pageNumber);
}

var lineHasPageNumberMarker = function(lineNumber, attributeManager) {
  return attributeManager.getAttributeOnLine(lineNumber, PAGE_NUMBER_ATTRIB);
}

var removePageNumberFrom = function(lineNumber, attributeManager) {
  attributeManager.removeAttributeOnLine(lineNumber, PAGE_NUMBER_ATTRIB);
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
