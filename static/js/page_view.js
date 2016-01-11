var _, $, jQuery;
var $ = require('ep_etherpad-lite/static/js/rjquery').$;
var _ = require('ep_etherpad-lite/static/js/underscore');
var padcookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;

exports.postAceInit = function(hook, context){
  var $outerIframeContents = $('iframe[name="ace_outer"]').contents();
  var $innerIframe = $outerIframeContents.find('iframe');
  var $innerdocbody = $innerIframe.contents().find("#innerdocbody");

  var pv = {

    enable: function() {
      if(clientVars.plugins.plugins && clientVars.plugins.plugins.ep_slideshow && clientVars.plugins.plugins.ep_slideshow.isEnabled) return false;
      $('#editorcontainer, iframe').addClass('page_view');
      $innerIframe.addClass('outerPV');
      $outerIframeContents.find('#outerdocbody').addClass("outerBackground");
      $innerdocbody.addClass('innerPV').css("margin-left","0px");

      // $('#editorcontainer').css("top", "15px");
      // var containerTop = $('.toolbar').position().top + $('.toolbar').height() +5;
      // $('#editorcontainerbox').css("top", containerTop);
      $('#ep_page_ruler').show();
      // if line numbers are enabled..
      if($('#options-linenoscheck').is(':checked')) {
        $outerIframeContents.find('#sidediv').addClass("lineNumbersAndPageView");
        $innerdocbody.addClass('innerPVlineNumbers');
      }
    },

    disable: function() {
      $('#options-pageview').prop("checked", false);
      // console.log("disabling");
      $('#editorcontainer, iframe').removeClass('page_view');
      $innerdocbody.removeClass('innerPV');
      $innerIframe.removeClass('outerPV');
      $innerdocbody.css("margin-left","-100px");
      $outerIframeContents.find('#outerdocbody').removeClass("outerBackground");
      $('#ep_page_ruler').hide();

      if($('#options-linenoscheck').is(':checked')) {
        $outerIframeContents.find('#sidediv').removeClass("lineNumbersAndPageView");
        $innerdocbody.removeClass('innerPVlineNumbers');
      }
    }
  }

  clientVars.plugins.plugins.ep_script_page_view.enable = pv.enable;
  clientVars.plugins.plugins.ep_script_page_view.disable = pv.disable;

  /* init */
  /* from URL param */
  var enablePageBreaks = (getParam("pagebreak") !== "false"); // enable pagination by default
  if(enablePageBreaks){
    $innerdocbody.addClass('breakPages');
    clientVars.plugins.plugins.ep_script_page_view.pageBreakEnabled = true;
  }

  var urlContainspageviewTrue = (getParam("pageview") == "true"); // if the url param is set
  if(urlContainspageviewTrue){
    $('#options-pageview').prop('checked', 'checked');
  }else if (getParam("pageview") == "false"){
    $('#options-pageview').prop('checked',false);
  }

  /* from cookie */
  // page view
  if (padcookie.getPref("page_view")) {
    $('#options-pageview').prop('checked', 'checked');
    // set a value we will refer to later and other plugins will refer to
    clientVars.plugins.plugins.ep_script_page_view.enabled = true;
  }else if (padcookie.getPref("page_view") == false){
    // only disable PV if cookie is set to disabled it. If cookie is not set, we do nothing
    $('#options-pageview').prop("checked", false);
  }

  if($('#options-pageview').is(':checked')) {
    pv.enable();
    // set a value we will refer to later and other plugins will refer to
    clientVars.plugins.plugins.ep_script_page_view.enabled = true;
  } else {
    pv.disable();
    // set a value we will refer to later and other plugins will refer to
    clientVars.plugins.plugins.ep_script_page_view.enabled = false;
  }

  /* on click */
  $('#options-pageview').on('click', function() {
    if($('#options-pageview').is(':checked')) {
      pv.enable();
      padcookie.setPref("page_view", true);
    } else {
      pv.disable();
      padcookie.setPref("page_view", false);
    }
  });

  if(!clientVars.plugins.plugins) clientVars.plugins.plugins = {};
};


function getParam(sname){
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

exports.aceEditorCSS = function(hook_name, cb){
  return ["/ep_script_page_view/static/css/iframe.css"];
} // inner pad CSS
