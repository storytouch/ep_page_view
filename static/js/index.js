var $ = require('ep_etherpad-lite/static/js/rjquery').$;

var utils = require('./utils');
var paginationCalculation = require('./pagination');

var LINE_NUMBERS_ENABLED_OUTER_CLASS = 'lineNumbersAndPageView';
var LINE_NUMBERS_ENABLED_INNER_CLASS = 'innerPVlineNumbers';

var API_MESSAGE = 'pagination_enabled';

exports.postAceInit = function(hook, context) {
  listenToAPICallsToTogglePagination();
  setupPageViewInitialSetting();
  loadPageBreakInitialSettingFromURL();

  /* on click */
  $('#options-linenoscheck').on('click', function() {
    adjustToLineNumberSetting();
  });
};

var listenToAPICallsToTogglePagination = function() {
  // listen to outbound calls of this API
  window.addEventListener('message', function(e) {
    if (e.data.type === API_MESSAGE) {
      togglePagination(e.data.paginationEnabled);
    }
  });
}

var enablePagination = function() {
  togglePagination(true);
}

var disablePagination = function() {
  togglePagination(false);
}

var togglePagination = function(paginationEnabled) {
  utils.getPluginProps().pageBreakEnabled = paginationEnabled;
  utils.getPadInner().find('#innerdocbody').toggleClass('breakPages', paginationEnabled);

  var togglePaginationCalculation = paginationEnabled ? paginationCalculation.enable : paginationCalculation.disable;
  togglePaginationCalculation();
}

var adjustToLineNumberSetting = function() {
  var $lineNumbers = utils.getPadOuter().find('#sidediv');
  var $innerdocbody = utils.getPadInner().find('#innerdocbody');

  if (lineNumbersAreEnabled()) {
    $lineNumbers.addClass(LINE_NUMBERS_ENABLED_OUTER_CLASS);
    $innerdocbody.addClass(LINE_NUMBERS_ENABLED_INNER_CLASS);
  } else {
    $lineNumbers.removeClass(LINE_NUMBERS_ENABLED_OUTER_CLASS);
    $innerdocbody.removeClass(LINE_NUMBERS_ENABLED_INNER_CLASS);
  }
}
var lineNumbersAreEnabled = function() {
  return $('#options-linenoscheck').is(':checked');
}

var setupPageViewInitialSetting = function() {
  $('#editorcontainer, iframe').addClass('page_view');
  utils.getPadOuter().find('iframe').addClass('outerPV');
  utils.getPadOuter().find('#outerdocbody').addClass('outerBackground');
  utils.getPadInner().find('#innerdocbody').addClass('innerPV').css('margin-left', '0px');

  $('#ep_page_ruler').show();

  adjustToLineNumberSetting();
}

var loadPageBreakInitialSettingFromURL = function() {
  // Pagination is enabled by default, must receive `pagebreak=false` on URL to be disabled
  var urlParams = new URLSearchParams(window.location.search);
  var paginationParam = urlParams.get('pagebreak');
  var paginationEnabled = paginationParam !== 'false';

  if (paginationEnabled) {
    enablePagination();
  } else {
    disablePagination();
  }
}
