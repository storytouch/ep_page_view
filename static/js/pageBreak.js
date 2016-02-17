var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');

var utils                = require('./utils');
var paginationBlocks     = require('./paginationBlocks');
var paginationSplit      = require('./paginationSplit');
var paginationNonSplit   = require('./paginationNonSplit');
var paginationPageNumber = require('./paginationPageNumber');

// Letter
// var REGULAR_LINES_PER_PAGE = 54;
// A4
var REGULAR_LINES_PER_PAGE = 58;

exports.aceRegisterBlockElements = function(hook, context) {
  return _.union(paginationSplit.blockElements(), paginationNonSplit.blockElements());
}

exports.aceAttribsToClasses = function(hook, context) {
  return _.union(
    paginationSplit.atribsToClasses(context),
    paginationNonSplit.atribsToClasses(context),
    paginationPageNumber.atribsToClasses(context)
  );
}

exports.aceDomLineProcessLineAttributes = function(hook, context) {
  var extraHTML = paginationNonSplit.buildHtmlWithPageBreaks(context.cls) ||
                  paginationSplit.buildHtmlWithPageBreaks(context.cls);

  if (extraHTML) {
    var modifier = {
      preHtml: extraHTML.preHtml,
      postHtml: extraHTML.postHtml,
      processedMarker: true
    };
    return [modifier];
  }
  return [];
}

exports.acePostWriteDomLineHTML = function(hook, context) {
  var $node = $(context.node);

  var nodeHasSplitPageBreak    = paginationSplit.nodeHasPageBreak($node);
  var nodeHasNonSplitPageBreak = paginationNonSplit.nodeHasPageBreak($node);
  var nodeHasMoreAndContd      = utils.nodeHasMoreAndContd($node);

  // adjust layout of parentheticals split between pages
  if (nodeHasSplitPageBreak) {
    $node.addClass("firstHalf");
  }

  // leave room for page break on line at the end of the page
  if (nodeHasSplitPageBreak || nodeHasNonSplitPageBreak) {
    $node.addClass("beforePageBreak");
  }
  if (nodeHasMoreAndContd) {
    $node.addClass("withMoreAndContd");
  }
}

exports.aceEditEvent = function(hook, context) {
  // don't do anything if page break is disabled
  if (!clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled) return;

  var callstack = context.callstack;
  var eventType = callstack.type;

  // pagination was previously scheduled
  if (readyFor2ndPhaseOfPagination(callstack)) {
    continuePagination(context);
  }
  // only proceed if pagination was scheduled by me.
  // This avoids getting an error if two users have the same pad opened
  else if (isAPaginationScheduledByMe(eventType)) {
    restartPagination(context);
  }
  // user changed the type of one of the lines
  else if (isAChangeOnElementType(eventType)) {
    restartPagination(context);
  }
  // any other edition on the pad
  else {
    // don't do anything if text did not change or if user was not the one who made the text change
    if (!context.callstack.docTextChanged || !isEditedByMe(eventType)) return;

    resetTimerToRestartPagination(context);
  }
}

// based on similar method from ep_autocomp
var isEditedByMe = function(eventType) {
  var editedByMe = (eventType === "idleWorkTimer" || eventType === "handleKeyEvent");

  return editedByMe;
}

var isAChangeOnElementType = function(eventType) {
  return eventType === 'insertscriptelement';
}

var isAPaginationScheduledByMe = function(eventType) {
  return eventType === "pagination-" + clientVars.userId;
}

var needToPaginate = false;
var readyFor2ndPhaseOfPagination = function(callstack) {
  var domReadyForPagination = callstack.domClean;

  return needToPaginate && domReadyForPagination;
}

var myPaginationEventType = function() {
  return "pagination-" + clientVars.userId;
}

var paginationTimer;
var resetTimerToRestartPagination = function(context) {
  // define delay if not defined yet
  clientVars.plugins.plugins.ep_script_page_view.paginationDelay = clientVars.plugins.plugins.ep_script_page_view.paginationDelay || 500;

  var editorInfo = context.editorInfo;

  // to avoid lagging while user is typing, we set a timeout to postpone pagination until
  // edition had stopped (0.5s)
  clearTimeout(paginationTimer);
  paginationTimer = setTimeout(function() {
    editorInfo.ace_callWithAce(function(ace) {
      // do nothing here, we handle pagination on aceEditEvent
    }, myPaginationEventType());
  }, clientVars.plugins.plugins.ep_script_page_view.paginationDelay);
}

var restartPagination = function(context) {
  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  // HACK: make sure we have the latest changes made by the user, as pagination is a delayed process
  synchronizeEditorWithUserChanges(editorInfo);

  cleanPageBreaks(callstack, attributeManager, rep, editorInfo);

  needToPaginate = true;
}

var synchronizeEditorWithUserChanges = function(editorInfo) {
  editorInfo.ace_fastIncorp();
}

var cleanPageBreaks = function(callstack, attributeManager, rep, editorInfo) {
  utils.performNonUnduableEvent(callstack, function() {
    paginationNonSplit.cleanPageBreaks(attributeManager, rep);
    paginationSplit.cleanPageBreaks(attributeManager, rep, editorInfo);
    paginationPageNumber.cleanPageBreaks(attributeManager, rep);
  });
}

var continuePagination = function(context) {
  needToPaginate = false;

  var callstack        = context.callstack;
  var attributeManager = context.documentAttributeManager;
  var rep              = context.rep;
  var editorInfo       = context.editorInfo;

  var pageBreaksInfo = calculatePageBreaks(attributeManager, rep);

  savePageBreaks(pageBreaksInfo, callstack, attributeManager, rep, editorInfo);
}

var savePageBreaks = function(pageBreaksInfo, callstack, attributeManager, rep, editorInfo) {
  utils.performNonUnduableEvent(callstack, function() {
    for (var pageNumber = pageBreaksInfo.length - 1; pageNumber >= 0; pageNumber--) {
      // page numbers start at 2, so we need to increase all page numbers by 2
      var actualPageNumber = pageNumber+2;

      var pageBreakInfo = pageBreaksInfo[pageNumber];
      pageBreakInfo.save(pageBreakInfo.data, actualPageNumber, attributeManager, rep, editorInfo);
    }
  });
}

var calculatePageBreaks = function(attributeManager, rep) {
  var maxPageHeight = getMaxPageHeight();
  var $lines = utils.getPadInner().find("div");
  var pageBreaks = [];

  // select lines to have page breaks
  var $currentLine = $lines.first();
  var currentPageHeight = 0;
  while(!reachedEndOfPad($currentLine)) {
    // get height including margins and paddings
    var lineHeight = utils.getLineHeight($currentLine);
    // get height excluding margins and paddings
    var lineInnerHeight = $currentLine.height();

    // Q: if this line is placed on current page, will the page height be over the
    // allowed max height?
    if (currentPageHeight + lineHeight > maxPageHeight) {
      // A: yes, so check if line can be split or belongs to a block

      var availableHeightOnPage = maxPageHeight - currentPageHeight;
      var splitElementInfo = paginationSplit.getRegularSplitInfo($currentLine, lineHeight, lineInnerHeight, availableHeightOnPage, attributeManager, rep);
      // can we split current line?
      if (splitElementInfo) {
        // restart counting page height again
        currentPageHeight = splitElementInfo.heightAfterPageBreak;

        // mark element to be split when pagination is done
        pageBreaks.push(splitPageBreak(splitElementInfo));
      }
      // is current line longer than a page? (so we need to force its split)
      else if (lineInnerHeight > maxPageHeight) {
        // mark current line to be on top of page when pagination is done
        // (but only if current line is not the first line of script)
        if ($currentLine.prev().length > 0) {
          pageBreaks.push(nonSplitPageBreak($currentLine, rep));
        }

        // starting a new page, we have the full page height to fill by forced split
        var availableHeightOnPage = maxPageHeight;

        // calculate where line needs to be split
        var forcedSplitElementInfo = paginationSplit.getForcedSplitInfo($currentLine, lineHeight, lineInnerHeight, availableHeightOnPage, attributeManager, rep);

        // restart counting page height again
        currentPageHeight = forcedSplitElementInfo.heightAfterPageBreak;

        // mark element to be split when pagination is done
        pageBreaks.push(splitPageBreak(forcedSplitElementInfo));
      }
      // is it a block of lines? (A block can have only a single line too)
      else {
        var blockInfo = paginationBlocks.getBlockInfo($currentLine, lineHeight, lineInnerHeight);

        currentPageHeight = blockInfo.blockHeight;

        // mark element to be on top of page when pagination is done
        pageBreaks.push(nonSplitPageBreak(blockInfo.$topOfBlock, rep));

        // move $currentLine to end of the block
        $currentLine = blockInfo.$bottomOfBlock;
      }
    } else {
      // A: no, so simply increase current page height
      currentPageHeight += lineHeight;
    }

    // move to next line before next iteration of while-loop
    $currentLine = $currentLine.next();
  }

  return pageBreaks;
}

var nonSplitPageBreak = function($line, rep) {
  var nonSplitInfo = paginationNonSplit.getNonSplitInfo($line, rep);
  return {
    data: nonSplitInfo,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationNonSplit.savePageBreak(data, pageNumber, attributeManager);
    }
  };
}
var splitPageBreak = function(splitInfo) {
  return {
    data: splitInfo,
    save: function(data, pageNumber, attributeManager, rep, editorInfo) {
      paginationSplit.savePageBreak(data, pageNumber, attributeManager, editorInfo);
    }
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
