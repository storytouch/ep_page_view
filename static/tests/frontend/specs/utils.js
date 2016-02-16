var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.utils = {
  heading: function(text) {
    return "<heading>" + text + "</heading><br/>";
  },
  action: function(text) {
    return "<action>" + text + "</action><br/>";
  },
  parenthetical: function(text) {
    return "<parenthetical>" + text + "</parenthetical><br/>";
  },
  character: function(text) {
    return "<character>" + text + "</character><br/>";
  },
  dialogue: function(text) {
    return "<dialogue>" + text + "</dialogue><br/>";
  },
  shot: function(text) {
    return "<shot>" + text + "</shot><br/>";
  },
  transition: function(text) {
    return "<transition>" + text + "</transition><br/>";
  },
  general: function(text) {
    return text + "<br/>";
  },
  createScriptWith: function(scriptContent, lastLineText, cb) {
    var inner$ = helper.padInner$;

    // set script content
    var $firstLine = inner$("div").first();
    $firstLine.html(scriptContent);

    // wait for Etherpad to finish processing the lines
    helper.waitFor(function(){
      var $lastLine = inner$("div").last();
      return $lastLine.text().trim() === lastLineText.trim();
    }, 3000).done(cb);
  },

  /**** vars and functions to change element type of a line: ****/
  GENERAL: 'general',
  HEADING: 'heading',
  ACTION: 'action',
  CHARACTER: 'character',
  PARENTHETICAL: 'parenthetical',
  DIALOGUE: 'dialogue',
  TRANSITION: 'transition',
  SHOT: 'shot',
  TARGET_ELEMENT: {
    'general'       : { val : '-1' },
    'heading'       : { val : '0' },
    'action'        : { val : '1' },
    'character'     : { val : '2' },
    'parenthetical' : { val : '3' },
    'dialogue'      : { val : '4' },
    'transition'    : { val : '5' },
    'shot'          : { val : '6' }
  },
  changeToElement: function(tag, callback, lineNum){
    lineNum = lineNum || 0;
    var chrome$ = helper.padChrome$;
    var inner$ = helper.padInner$;
    var targetElement = ep_script_page_view_test_helper.utils.TARGET_ELEMENT[tag];

    chrome$('#script_element-selection').val(targetElement.val);
    chrome$('#script_element-selection').change();

    helper.waitFor(function() {
      var $textElement = ep_script_page_view_test_helper.utils.getLine(lineNum);
      return tag === 'general' || $textElement.find(tag).length > 0;
    }
    // this helper.waitFor needs a little more time to finish, so we give it 2s
    , 2000).done(callback);
  },

  cleanPad: function(callback) {
    // make tests run faster, as the delay is only defined to improve usability
    helper.padChrome$.window.clientVars.plugins.plugins.ep_script_page_view.paginationDelay = 0;

    var inner$ = helper.padInner$;
    var $padContent = inner$("#innerdocbody");
    $padContent.html("");

    // wait for Etherpad to re-create first line
    helper.waitFor(function(){
      var lineNumber = inner$("div").length;
      return lineNumber === 1;
    }, 2000).done(callback);
  },

  // first line === getLine(0)
  // second line === getLine(1)
  // ...
  getLine: function(lineNum) {
    var inner$ = helper.padInner$;
    var line = inner$("div").first();
    for (var i = lineNum - 1; i >= 0; i--) {
      line = line.next();
    }
    return line;
  },

  getLineWhereCaretIs: function() {
    var inner$ = helper.padInner$;
    var nodeWhereCaretIs = inner$.document.getSelection().anchorNode;
    var $lineWhereCaretIs = $(nodeWhereCaretIs).closest("div");

    return $lineWhereCaretIs;
  },
  getColumnWhereCaretIs: function() {
    var inner$ = helper.padInner$;
    var columnWhereCaretIsOnElement = inner$.document.getSelection().anchorOffset;

    return columnWhereCaretIsOnElement;
  },

  buildStringWithLength: function(length, text) {
    return text.repeat(length);
  },

  buildScriptWithGenerals: function(text, howMany) {
    var utils = ep_script_page_view_test_helper.utils;

    var script = "";
    for (var i = 0; i < howMany; i++) {
      script += utils.general(text);
    }

    return script;
  },

  undo: function() {
    var chrome$ = helper.padChrome$;
    var $undoButton = chrome$(".buttonicon-undo");
    $undoButton.click();
  },

  regularLineHeight: function() {
    var $editor = helper.padInner$("#innerdocbody");
    return parseFloat($editor.css("line-height"));
  },
  heightOf: function($element, pseudoElementName) {
    var pageBreak      = $element.get(0);
    var pageBreakStyle = helper.padInner$.window.getComputedStyle(pageBreak, ":before");

    var marginTop      = parseFloat(pageBreakStyle.marginTop);
    var paddingBottom  = parseFloat(pageBreakStyle.paddingBottom);
    var paddingTop     = parseFloat(pageBreakStyle.paddingTop);
    var marginBottom   = parseFloat(pageBreakStyle.marginBottom);
    var borderTop      = parseFloat(pageBreakStyle.borderTop);
    var borderBottom   = parseFloat(pageBreakStyle.borderBottom);
    var height         = parseFloat(pageBreakStyle.height);

    return marginTop + marginBottom + paddingTop + paddingBottom + borderTop + borderBottom + height;
  },
  heightOfSplitPageBreak: function() {
    var inner$ = helper.padInner$;
    var $splitPageBreak = inner$("div splitPageBreak").first();
    return ep_script_page_view_test_helper.utils.heightOf($splitPageBreak, ":before");
  },
  heightOfMore: function() {
    var inner$ = helper.padInner$;
    var $more = inner$("div more").first();
    return ep_script_page_view_test_helper.utils.heightOf($more, ":before");
  },

  placeCaretInTheBeginningOfLine: function(lineNum, cb) {
    var utils =  ep_script_page_view_test_helper.utils;
    var $targetLine = utils.getLine(lineNum);
    $targetLine.sendkeys("{selectall}{leftarrow}");
    helper.waitFor(function() {
      var $targetLine = utils.getLine(lineNum);
      var $lineWhereCaretIs = utils.getLineWhereCaretIs();

      return $targetLine.get(0) === $lineWhereCaretIs.get(0);
    }).done(cb);
  },

  placeCaretAtTheEndOfLine: function(lineNum, cb) {
    var utils =  ep_script_page_view_test_helper.utils;
    var $targetLine = utils.getLine(lineNum);
    $targetLine.sendkeys("{selectall}{rightarrow}");
    helper.waitFor(function() {
      var $targetLine = utils.getLine(lineNum);
      var $lineWhereCaretIs = utils.getLineWhereCaretIs();

      return $targetLine.get(0) === $lineWhereCaretIs.get(0);
    }).done(cb);
  },

  FORMATTER: new Intl.NumberFormat('en-US', { minimumIntegerDigits: 4 , useGrouping: false}),
  formatNumber: function(number) {
    var utils = ep_script_page_view_test_helper.utils;
    return utils.FORMATTER.format(number);
  },

  BACKSPACE: 8,
  DELETE: 46,
  pressKey: function(CODE) {
    var inner$ = helper.padInner$;
    if(inner$(window)[0].bowser.firefox || inner$(window)[0].bowser.modernIE){ // if it's a mozilla or IE
      var evtType = "keypress";
    }else{
      var evtType = "keydown";
    }
    var e = inner$.Event(evtType);
    e.keyCode = CODE;
    inner$("#innerdocbody").trigger(e);
  },
  pressBackspace: function() {
    var utils = ep_script_page_view_test_helper.utils;
    utils.pressKey(utils.BACKSPACE);
  },
  pressDelete: function() {
    var utils = ep_script_page_view_test_helper.utils;
    utils.pressKey(utils.DELETE);
  },

  linesAfterNonSplitPageBreaks: function() {
    var inner$ = helper.padInner$;

    var $elementsWithPageBreaksOnBottom = inner$("div nonSplitPageBreak").closest("div");
    var $linesAfterPageBreaks = $elementsWithPageBreaksOnBottom.next();

    return $linesAfterPageBreaks;
  },

  linesAfterSplitPageBreaks: function() {
    var inner$ = helper.padInner$;

    var $elementsWithPageBreaksOnBottom = inner$("div splitPageBreak").closest("div");
    var $linesAfterPageBreaks = $elementsWithPageBreaksOnBottom.next();

    return $linesAfterPageBreaks;
  },

  pageBreakOfLine: function($line) {
    var $lineWithPageBreak = $line.prev();
    return $lineWithPageBreak.find("nonSplitPageBreak, splitPageBreak").first();
  },

  testSplitPageBreakIsOn: function(textAfterPageBreak, done, expectedPageNumber) {
    expectedPageNumber = expectedPageNumber || 2;

    var utils = ep_script_page_view_test_helper.utils;

    // wait for pagination to be finished
    helper.waitFor(function() {
      var $elementsWithPageBreaksOnTop = utils.linesAfterSplitPageBreaks();
      return $elementsWithPageBreaksOnTop.length > 0;
    }, 2000).done(function() {
      // verify page break is on targetElement
      var $elementsWithPageBreaksOnTop = utils.linesAfterSplitPageBreaks();
      var $firstPageBreak = $elementsWithPageBreaksOnTop.first();
      var startWithTextAfterPageBreak = new RegExp("^" + textAfterPageBreak);
      expect($firstPageBreak.text()).to.match(startWithTextAfterPageBreak);

      // verify page number is correct
      var actualPageNumber = utils.pageBreakOfLine($firstPageBreak).attr("data-page-number");
      expect(actualPageNumber.toString()).to.be(expectedPageNumber.toString());

      done();
    });
  },

  testNonSplitPageBreakIsOn: function(textAfterPageBreak, done, expectedPageNumber) {
    expectedPageNumber = expectedPageNumber || 2;

    var utils = ep_script_page_view_test_helper.utils;

    // wait for pagination to be finished
    helper.waitFor(function() {
      var $elementsWithPageBreaksOnTop = utils.linesAfterNonSplitPageBreaks();
      return $elementsWithPageBreaksOnTop.length > 0;
    }, 2000).done(function() {
      // verify page break is above targetElement
      var $elementsWithPageBreaksOnTop = utils.linesAfterNonSplitPageBreaks();
      var $firstPageBreak = $elementsWithPageBreaksOnTop.first();
      expect($firstPageBreak.text().trim()).to.be(textAfterPageBreak.trim());

      // verify page number is correct
      var actualPageNumber = utils.pageBreakOfLine($firstPageBreak).attr("data-page-number");
      expect(actualPageNumber.toString()).to.be(expectedPageNumber.toString());

      done();
    });
  },

  testPageBreakDoNotHaveMoreNorContd: function(done) {
    var inner$ = helper.padInner$;
    var utils = ep_script_page_view_test_helper.utils;

    // wait for pagination to be finished
    helper.waitFor(function() {
      var $splitPageBreaks = inner$("div splitPageBreak");
      var $nonSplitPageBreaks = utils.linesAfterNonSplitPageBreaks();
      return ($splitPageBreaks.length + $nonSplitPageBreaks.length) > 0;
    }, 2000).done(function() {
      // verify there is no MORE tag
      var $moreTags = inner$("div more");
      expect($moreTags.length).to.be(0);

      // verify there is no CONT'D tag
      var $contdTags = inner$("div contd");
      expect($contdTags.length).to.be(0);

      done();
    });
  },

  testPageBreakHasMoreAndContd: function(expectedCharacterName, done) {
    var inner$ = helper.padInner$;
    var utils = ep_script_page_view_test_helper.utils;

    // wait for pagination to be finished
    helper.waitFor(function() {
      var $splitPageBreaks = inner$("div splitPageBreak");
      var $nonSplitPageBreaks = utils.linesAfterNonSplitPageBreaks();
      return ($splitPageBreaks.length + $nonSplitPageBreaks.length) > 0;
    }, 2000).done(function() {
      // verify there is a MORE tag
      var $moreTags = inner$("div more");
      expect($moreTags.length).to.be(1);

      // verify there is a CONT'D tag
      var $contdTags = inner$("div contd");
      expect($contdTags.length).to.be(1);

      // verify character name is correct
      var actualCharacterName = $contdTags.first().attr("data-character");
      expect(actualCharacterName).to.be(expectedCharacterName);

      done();
    });
  },
}