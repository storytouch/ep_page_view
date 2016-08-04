var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;

var utils = require('./utils');
var paginationCalculation = require('./pagination');
var fixSmallZooms = require('./fixSmallZooms');

var COOKIE_PREF_NAME = 'automaticPagination';
var LINE_NUMBERS_ENABLED_OUTER_CLASS = 'lineNumbersAndPageView';
var LINE_NUMBERS_ENABLED_INNER_CLASS = 'innerPVlineNumbers';

exports.postAceInit = function(hook, context){
  var $outerIframeContents = utils.getPadOuter();
  var $innerIframe = $outerIframeContents.find('iframe');
  var $innerdocbody = utils.getPadInner().find("#innerdocbody");

  var automaticPagination = {
    enable: function() {
      clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled = true;
      $innerdocbody.addClass('breakPages');
    },

    disable: function() {
      clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled = false;
      $innerdocbody.removeClass('breakPages');
    }
  }

  var pageView = {
    enable: function() {
      clientVars.plugins.plugins.ep_script_page_view.enabled = true;

      $('#editorcontainer, iframe').addClass('page_view');
      $innerIframe.addClass('outerPV');
      $outerIframeContents.find('#outerdocbody').addClass("outerBackground");
      $innerdocbody.addClass('innerPV').css("margin-left","0px");

      $('#ep_page_ruler').show();

      adjustToLineNumberSetting();
    },

    disable: function() {
      clientVars.plugins.plugins.ep_script_page_view.enabled = false;

      $('#editorcontainer, iframe').removeClass('page_view');
      $innerIframe.removeClass('outerPV');
      $outerIframeContents.find('#outerdocbody').removeClass("outerBackground");
      $innerdocbody.removeClass('innerPV').css("margin-left","-100px");

      $('#ep_page_ruler').hide();

      adjustToLineNumberSetting();
    }
  }

  /* init */
  setupPageViewInitialSetting(pageView);
  setupPageBreakInitialSetting(automaticPagination);

  /* on click */
  $('#options-pagination').on('click', function() {
    // we only set pagination cookie if user intentionally changed the setting
    if($('#options-pagination').is(':checked')) {
      automaticPagination.enable();
      paginationCalculation.enable();
      padcookie.setPref(COOKIE_PREF_NAME, true);
    } else {
      automaticPagination.disable();
      paginationCalculation.disable();
      padcookie.setPref(COOKIE_PREF_NAME, false);
    }
  });

  $('#options-linenoscheck').on('click', function() {
    adjustToLineNumberSetting();
  });

  fixSmallZooms.init();
};

function adjustToLineNumberSetting() {
  var $lineNumbers = utils.getPadOuter().find('#sidediv');
  var $innerdocbody = utils.getPadInner().find('#innerdocbody');

  if(lineNumbersAreEnabled()) {
    $lineNumbers.addClass(LINE_NUMBERS_ENABLED_OUTER_CLASS);
    $innerdocbody.addClass(LINE_NUMBERS_ENABLED_INNER_CLASS);
  } else {
    $lineNumbers.removeClass(LINE_NUMBERS_ENABLED_OUTER_CLASS);
    $innerdocbody.removeClass(LINE_NUMBERS_ENABLED_INNER_CLASS);
  }
}
function lineNumbersAreEnabled() {
  return $('#options-linenoscheck').is(':checked');
}

function setupPageViewInitialSetting(pageView) {
  // page view is always enabled
  pageView.enable();
}

function setupPageBreakInitialSetting(automaticPagination) {
  var $paginationSetting = $('#options-pagination');

  /* from URL param */
  var enablePageBreaks = (getParam("pagebreak") !== "false"); // enable pagination by default
  if (enablePageBreaks) {
    $paginationSetting.prop('checked', 'checked');
  } else {
    $paginationSetting.prop('checked', false);
  }

  /* from cookie */
  if (padcookie.getPref(COOKIE_PREF_NAME)) {
    $paginationSetting.prop('checked', 'checked');
  } else if (padcookie.getPref(COOKIE_PREF_NAME) == false) {
    // only disable pagination if cookie is set to disabled it. If cookie is not set, we do nothing
    $paginationSetting.prop("checked", false);
  }

  // enable/disable pagination according to values read
  if($paginationSetting.is(':checked')) {
    automaticPagination.enable();
  } else {
    automaticPagination.disable();
  }
}

function getParam(sname) {
  var params = location.search.substr(location.search.indexOf("?")+1);
  var sval = "";
  params = params.split("&");
  // split param and value into individual pieces
  for (var i=0; i<params.length; i++)
  {
    temp = params[i].split("=");
    if ( [temp[0]] == sname ) { sval = temp[1]; }
  }
  return sval;
}

exports.aceEditorCSS = function(hook_name, cb) {
  return ["/ep_script_page_view/static/css/iframe.css"];
}
