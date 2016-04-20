var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils = require('./utils');

var SCROLL_SHIFT_ATTRIB = "scroll_shift";
var SORT_ORDER_ATTRIB   = "sort_order";

var SCROLL_SHIFT_REGEXP = new RegExp("(?:^|)" + SCROLL_SHIFT_ATTRIB + ":(\\S+)");
var SORT_ORDER_REGEXP   = new RegExp("(?:^|)" + SORT_ORDER_ATTRIB + ":([0-9]+)");

var SCROLL_TARGET_TAG = "scroll_target";

var MAIN_TARGET = "1";
var NEXT_TARGET = "2";
var PREV_TARGET = "3";

exports.buildHtmlWithTargetScroll = function(cls) {
  var scrollTarget = getShiftValueFromClass(cls) || "";

  if(scrollTarget) {
    var sortOrder = getSortOrderValueFromClass(cls) || "";

    var shiftAttrib     = " " + SCROLL_SHIFT_ATTRIB + "='" + scrollTarget + "'";
    var sortOrderAttrib = " " + SORT_ORDER_ATTRIB   + "='" + sortOrder    + "'";
    return "<" + SCROLL_TARGET_TAG + shiftAttrib + sortOrderAttrib + "></" + SCROLL_TARGET_TAG + ">";
  }
}
var getShiftValueFromClass = function(cls) {
  var lineHasShift = SCROLL_SHIFT_REGEXP.exec(cls);
  if(lineHasShift && lineHasShift[1]) {
    return lineHasShift[1];
  }
}
var getSortOrderValueFromClass = function(cls) {
  var lineHasSortOrder = SORT_ORDER_REGEXP.exec(cls);
  if(lineHasSortOrder && lineHasSortOrder[1]) {
    return lineHasSortOrder[1];
  }
}

exports.blockElements = function() {
  return [SCROLL_TARGET_TAG];
}

exports.atribsToClasses = function(context) {
  if (isScrollTarget(context.key) || isSortOrder(context.key)) {
    return [context.key + ":" + context.value];
  }
}
var isScrollTarget = function(contextKey) {
  return contextKey === SCROLL_SHIFT_ATTRIB;
}
var isSortOrder = function(contextKey) {
  return contextKey === SORT_ORDER_ATTRIB;
}

exports.keepViewportScrollPosition = function(action, attributeManager, rep) {
  markScrollAnchorLine(attributeManager, rep);

  action();

  adjustScrollToMatchAnchorLine(attributeManager, rep);
}

var markScrollAnchorLine = function(attributeManager, rep) {
  var $editor = utils.getPadOuter().find('#outerdocbody');
  var targetScroll = $editor.scrollTop();
  var $mainAnchorLine = getMainAnchorLine(targetScroll, rep);

  // set attribute on next and previous lines to have fallbacks in case main anchor line is
  // replaced (ex: split, merged, etc)
  markLineAsAnchor($mainAnchorLine.next(), NEXT_TARGET, targetScroll, attributeManager, rep);
  markLineAsAnchor($mainAnchorLine.prev(), PREV_TARGET, targetScroll, attributeManager, rep);

  // need to mark main target line after marking its neighbors, otherwise reference to
  // $mainAnchorLine will be lost when it gets the line attributes
  markLineAsAnchor($mainAnchorLine, MAIN_TARGET, targetScroll, attributeManager, rep);
}

var markLineAsAnchor = function($line, sortOrder, targetScroll, attributeManager, rep) {
  var lineExistis = $line.length > 0;
  if (lineExistis) {
    var lineNumber = utils.getLineNumberFromDOMLine($line, rep);

    // need to store shift as a string, otherwise a shift 0 will be considered an empty attribute
    // by Etherpad
    var shift = $line.get(0).getBoundingClientRect().top - targetScroll;
    var strShift = shift.toString();

    attributeManager.setAttributeOnLine(lineNumber, SORT_ORDER_ATTRIB, sortOrder);
    attributeManager.setAttributeOnLine(lineNumber, SCROLL_SHIFT_ATTRIB, strShift);
  }
}

var getMainAnchorLine = function(viewportScrollTop, rep) {
  var $caretLine = getCaretLineOnViewport(viewportScrollTop, rep);
  if ($caretLine) {
    return $caretLine;
  }

  return getFirstLineVisibleOnViewport(viewportScrollTop);
}

var getCaretLineOnViewport = function(viewportScrollTop, rep) {
  var caretLine = rep.selStart[0];
  var caretLineNode = utils.getDOMLineFromLineNumber(caretLine, rep);

  if (lineIsOnViewport(caretLineNode, viewportScrollTop)) {
    return utils.getPadInner().find("#" + caretLineNode.id).first();
  }
}

var lineIsOnViewport = function(lineNode, viewportScrollTop) {
  var viewportHeight = $('#editorcontainer').height();
  var viewportScrollBottom = viewportScrollTop + viewportHeight;
  var lineScrollTop = lineNode.getBoundingClientRect().top;

  var lineIsAfterViewportTop = (lineScrollTop >= viewportScrollTop);
  var lineIsBeforeViewportBottom = (lineScrollTop < viewportScrollBottom);

  return lineIsAfterViewportTop && lineIsBeforeViewportBottom;
}

var getFirstLineVisibleOnViewport = function(viewportScrollTop) {
  var $lines = utils.getPadInner().find("div");
  var found = false;
  var $linesAfterViewportTop = $lines.filter(function() {
    if (!found && this.getBoundingClientRect().top >= viewportScrollTop) {
      // found first line that is visible, do not check if line is on viewport anymore
      found = true;
      return true;
    }
  });

  // if last line is very high and viewport is in the middle of it, there's no line on
  // $linesAfterViewportTop. So use last line instead
  if ($linesAfterViewportTop.length === 0) {
    $linesAfterViewportTop = $lines.last();
  }

  return $linesAfterViewportTop.first();
}

var adjustScrollToMatchAnchorLine = function(attributeManager, rep) {
  var $allAnchorLines = getAnchorLines();

  var $anchorLine = $allAnchorLines.first();
  var topPositionShift = parseFloat($anchorLine.find(SCROLL_TARGET_TAG).attr(SCROLL_SHIFT_ATTRIB));
  var extraShift = 0;
  if (sortOrderOf($anchorLine) === NEXT_TARGET) {
    // extra shift here is the page break between anchor line found and original main anchor line
    // We need this for the scenario where target line is merged and receives a non-split page
    // break on repagination
    var $originalMainAnchorLine = $anchorLine.prev();
    extraShift = pageBreakHeightOf($originalMainAnchorLine);
  }

  var targetScroll = $anchorLine.get(0).getBoundingClientRect().top - topPositionShift - extraShift;
  var $editor = utils.getPadOuter().find('#outerdocbody');
  $editor.scrollTop(targetScroll);

  removeMarksFromAnchorLines($allAnchorLines, attributeManager, rep);
}

var getAnchorLines = function() {
  var $anchorLines = utils.getPadInner().find("div:has(" + SCROLL_TARGET_TAG + ")");
  // return line sorted, so we use the one with highest priority (lowest SORT_ORDER_ATTRIB value)
  var $sortedAnchorLines = $anchorLines.sort(function(prev, next) {
    var prevSortOrder = parseInt(sortOrderOf($(prev)));
    var nextSortOrder = parseInt(sortOrderOf($(next)));
    return prevSortOrder - nextSortOrder;
  });

  return $sortedAnchorLines;
}

var sortOrderOf = function($line) {
  return $line.find(SCROLL_TARGET_TAG).attr(SORT_ORDER_ATTRIB);
}

var pageBreakHeightOf = function($line) {
  return parseInt($line.css("padding-bottom"));
}

var removeMarksFromAnchorLines = function($lines, attributeManager, rep) {
  $lines.each(function(index, line) {
    var lineNumber = utils.getLineNumberFromDOMLine($(line), rep);
    attributeManager.removeAttributeOnLine(lineNumber, SCROLL_SHIFT_ATTRIB);
    attributeManager.removeAttributeOnLine(lineNumber, SORT_ORDER_ATTRIB);
  });
}