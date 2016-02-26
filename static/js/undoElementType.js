var paginationLinesChanged = require('./paginationLinesChanged');

var UNDO_FIX_ATTRIB = require('ep_script_elements/static/js/undoPagination').UNDO_FIX_ATTRIB;

exports.fix = function(rep, attributeManager) {
  var totalLines = rep.lines.length();

  for (var lineNumber = totalLines - 1; lineNumber >= 0; lineNumber--) {
    // we only remove attribute if line is not involved on current pagination
    var lineNotAffectedByPagination = !paginationLinesChanged.lineWasChanged(lineNumber);
    var lineHasUndoFixAttribute = attributeManager.getAttributeOnLine(lineNumber, UNDO_FIX_ATTRIB);

    if (lineNotAffectedByPagination && lineHasUndoFixAttribute) {
      attributeManager.removeAttributeOnLine(lineNumber, UNDO_FIX_ATTRIB);
    }
  }
}

