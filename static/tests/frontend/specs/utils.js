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
      return $lastLine.text() === lastLineText;
    }, 2000).done(cb);
  },

  cleanPad: function(callback) {
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

  testSplitPageBreakIsOn: function(textAfterPageBreak, done) {
    var inner$ = helper.padInner$;

    // verify there is one page break
    var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
    expect($splitElementsWithPageBreaks.length).to.be(1);

    // verify page break is on targetElement
    var $firstPageBreak = $splitElementsWithPageBreaks.first().parent();
    expect($firstPageBreak.text()).to.be(textAfterPageBreak);

    done();
  },

  testNonSplitPageBreakIsOn: function(textAfterPageBreak, done) {
    var inner$ = helper.padInner$;

    // verify there is one page break
    var $elementsWithPageBreaksOnTop = inner$("div nonSplitPageBreak").parent();
    expect($elementsWithPageBreaksOnTop.length).to.be(1);

    // verify page break is above targetElement
    var $firstPageBreak = $elementsWithPageBreaksOnTop.first();
    expect($firstPageBreak.text()).to.be(textAfterPageBreak);

    done();
  },

  testPageBreakDoNotHaveMoreNorContd: function(done) {
    var inner$ = helper.padInner$;

    // verify there is no MORE tag
    var $moreTags = inner$("div more");
    expect($moreTags.length).to.be(0);

    // verify there is no CONT'D tag
    var $contdTags = inner$("div contd");
    expect($contdTags.length).to.be(0);

    done();
  },

  testPageBreakHasMoreAndContd: function(expectedCharacterName, done) {
    var inner$ = helper.padInner$;

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
  },
}