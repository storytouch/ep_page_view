// Letter
// var GENERALS_PER_PAGE       = 54;
// var HEADINGS_PER_PAGE       = 18;
// var ACTIONS_PER_PAGE        = 27;
// var CHARACTERS_PER_PAGE     = 27;
// var PARENTHETICALS_PER_PAGE = 54;
// var DIALOGUES_PER_PAGE      = 54;
// var TRANSITIONS_PER_PAGE    = 26;
// var SHOTS_PER_PAGE          = 18;

// A4
var GENERALS_PER_PAGE       = 58;
var HEADINGS_PER_PAGE       = 20;
var ACTIONS_PER_PAGE        = 29;
var CHARACTERS_PER_PAGE     = 29;
var PARENTHETICALS_PER_PAGE = 58;
var DIALOGUES_PER_PAGE      = 58;
var TRANSITIONS_PER_PAGE    = 28;
var SHOTS_PER_PAGE          = 20;

describe("ep_script_page_view - page break main tests", function() {
  var utils, pageBreak, scriptBuilder;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
    pageBreak = ep_script_page_view_test_helper.pageBreak;
  });

  beforeEach(function(cb){
    helper.newPad(function() {
      utils.cleanPad(function() {
        var text = "1st page";
        utils.createScriptWith(scriptBuilder(text), text, cb);
      });
    });
    this.timeout(60000);
  });

  context("when lines do not have any top or bottom margin", function() {
    before(function() {
      scriptBuilder = pageBreak.scriptWithPageFullOfGenerals;
    });

    it("fits " + GENERALS_PER_PAGE + " lines in a page", function(done) {
      var inner$ = helper.padInner$;

      // verify there is no page break yet
      var $linesWithPageBreaks = inner$("div.pageBreak");
      expect($linesWithPageBreaks.length).to.be(0);

      // create another full page
      var secondPage = pageBreak.scriptWithPageFullOfGenerals("2nd page");
      var $lastLine = inner$("div").last();
      $lastLine.append("<br/>" + secondPage);

      // add new line (should be placed on next page)
      var $lastLine = inner$("div").last();
      $lastLine.append("1st of 3rd page");

      // wait for new page to be created
      helper.waitFor(function() {
        var $linesWithPageBreaks = inner$("div.pageBreak");
        return $linesWithPageBreaks.length === 2;
      }).done(function() {
        var $linesWithPageBreaks = inner$("div.pageBreak");
        var $firstPageBreak = $linesWithPageBreaks.first();
        var $secondPageBreak = $linesWithPageBreaks.last();

        expect($firstPageBreak.text()).to.be("2nd page");
        expect($secondPageBreak.text()).to.be("1st of 3rd page");

        done();
      });
    });

    context("when line is too long to fit entirely on the page", function() {
      var veryLongLineText;

      beforeEach(function() {
        var inner$ = helper.padInner$;

        // "PAGE2................(...)"
        veryLongLineText = "PAGE2" + utils.buildStringWithLength(62 - "PAGE2".length, ".");

        // replaces last line with a very long text (> 61 chars, so it is
        // displayed in 2 lines on the editor)
        var $lastLine = inner$("div").last();
        $lastLine.sendkeys("{selectall}");
        $lastLine.sendkeys(veryLongLineText);
      });

      it("moves line to next page", function(done) {
        var inner$ = helper.padInner$;

        // wait for new page to be created
        helper.waitFor(function() {
          var $linesWithPageBreaks = inner$("div.pageBreak");
          return $linesWithPageBreaks.length === 1;
        }).done(function() {
          var $linesWithPageBreaks = inner$("div.pageBreak");
          expect($linesWithPageBreaks.text()).to.be(veryLongLineText);

          done();
        });
      });
    });

    // this scenario is a workaround to the limitation of CSS :after/:before, which is not
    // displayed correctly on some elements (including <br>)
    context("when pages > 1 have empty lines on the top of the page", function() {
      var FIRST_LINE_OF_PAGE_2 = GENERALS_PER_PAGE;
      var FIRST_LINE_OF_PAGE_3 = 2*GENERALS_PER_PAGE + 2; // there are 2 empty lines on top of page 2

      beforeEach(function(cb) {
        var inner$ = helper.padInner$;

        // create 2 other full pages + some empty lines on top of each of them
        var secondPage = pageBreak.scriptWithPageFullOfGenerals("2nd page", 2);
        var thirdPage = pageBreak.scriptWithPageFullOfGenerals("3rd page", 3);
        var $lastLine = inner$("div").last();
        $lastLine.append("<br/>" + secondPage + thirdPage);

        // wait for Etherpad to process lines
        helper.waitFor(function() {
          var lineNumber = inner$("div").length;
          return lineNumber === 3*GENERALS_PER_PAGE + 5; // 3 full pages + 5 (empty) lines
        }).done(cb);
      });

      it("ignores empty lines on top of pages", function(done) {
        var inner$ = helper.padInner$;

        // at this point script has 3 full pages + 5 (empty) lines on top of then (2 on page 2, 3 on page 3)
        var $linesWithPageBreaks = inner$("div.pageBreak");
        expect($linesWithPageBreaks.length).to.be(2);

        // add new line (should be placed on next page)
        var $lastLine = inner$("div").last();
        $lastLine.append("<br/>1st of 4th page");

        // wait for new page to be created
        helper.waitFor(function() {
          var $linesWithPageBreaks = inner$("div.pageBreak");
          return $linesWithPageBreaks.length === 3;
        }).done(function() {
          var $linesWithPageBreaks = inner$("div.pageBreak");
          var $firstPageBreak = $linesWithPageBreaks.first();
          var $secondPageBreak = $linesWithPageBreaks.slice(1,1);
          var $thirdPageBreak = $linesWithPageBreaks.last();

          expect($firstPageBreak.text()).to.be(""); // empty line on top of page 2
          expect($secondPageBreak.text()).to.be(""); // empty line on top of page 3
          expect($thirdPageBreak.text()).to.be("1st of 4th page");

          done();
        });
      });

      context("and first line of page 2 is not empty anymore", function() {
        beforeEach(function() {
          utils.getLine(FIRST_LINE_OF_PAGE_3).sendkeys("Not empty anymore");
        });

        /*
          At this point the script is:
          +-------------------------
          | 1st page
          | (...)
          | 1st page
          +-------------------------
          | 2nd page
          | (...)
          | 2nd page
          +-------------------------
          | Not empty anymore
          |                        (empty line)
          | 3rd page
          | (...)
          | 3rd page
          +-------------------------
          | 3rd page
          | 3rd page
          | 3rd page
          +-------------------------
        */
        it("does not ignore empty line in the middle of the page", function(done) {
          var inner$ = helper.padInner$;

          // wait for all page breaks to be created (there should be 3)
          helper.waitFor(function() {
            var $linesWithPageBreaks = inner$("div.pageBreak");
            return $linesWithPageBreaks.length === 3;
          }).done(function() {
            // verify 4th page has 3 lines
            var $firstLineOf3rdPage = inner$("div.pageBreak").last();
            // 1st line of page has .pageBreak, so it won't be returned by nextAll()
            var linesAfterFirstLineOf3rdPage = $firstLineOf3rdPage.nextAll("div").length;
            var linesOn3rdPage = linesAfterFirstLineOf3rdPage + 1;
            expect(linesOn3rdPage).to.be(3);

            done();
          });
        });
      });
    });
  });

  context("when lines have top and/or bottom margin", function() {
    context("and all lines are headings", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(HEADINGS_PER_PAGE, utils.heading);
      });

      it("fits " + HEADINGS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.heading;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, done);
      });
    });

    context("and all lines are actions", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(ACTIONS_PER_PAGE, utils.action);
      });

      it("fits " + ACTIONS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.action;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, done);
      });
    });

    context("and all lines are characters", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(CHARACTERS_PER_PAGE, utils.character);
      });

      it("fits " + CHARACTERS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.character;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, done);
      });
    });

    context("and all lines are parentheticals", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(PARENTHETICALS_PER_PAGE, utils.parenthetical);
      });

      it("fits " + PARENTHETICALS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.parenthetical;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, done);
      });
    });

    context("and all lines are dialogues", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(DIALOGUES_PER_PAGE, utils.dialogue);
      });

      it("fits " + DIALOGUES_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.dialogue;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, done);
      });
    });

    context("and all lines are transitions", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(TRANSITIONS_PER_PAGE, utils.transition);
      });

      it("fits " + TRANSITIONS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.transition;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, done);
      });
    });

    context("and all lines are shots", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(SHOTS_PER_PAGE, utils.shot);
      });

      it("fits " + SHOTS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.shot;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, done);
      });
    });
  });
});

var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.pageBreak = {
  scriptWithPageFullOfGenerals: function(text, emptyLinesOnTop) {
    var utils = ep_script_page_view_test_helper.utils;

    var script = "";

    // create empty lines
    emptyLinesOnTop = emptyLinesOnTop || 0;
    for (var i = 0; i < emptyLinesOnTop; i++) {
      script += utils.general("");
    }

    // create non-empty lines
    for (var i = 0; i < GENERALS_PER_PAGE; i++) {
      script += utils.general(text);
    }

    return script;
  },

  // returns a function that will build the HTML content of a page full of element
  pageFullOfElementsBuilder: function(elementsPerPage, elementBuilder) {
    return function(text) {
      var utils = ep_script_page_view_test_helper.utils;

      var script = "";
      for (var i = 0; i < elementsPerPage; i++) {
        script += elementBuilder(text);
      }

      return script;
    }
  },

  testItFitsXLinesPerPage: function(elementBuilder, pageBuilder, done) {
    var inner$ = helper.padInner$;

    // verify there is no page break yet
    var $linesWithPageBreaks = inner$("div.pageBreak");
    expect($linesWithPageBreaks.length).to.be(0);

    // create another full page
    var secondPage = pageBuilder("2nd page");
    var $lastLine = inner$("div").last();
    $lastLine.append("<br/>" + secondPage);

    // add new line (should be placed on next page)
    var $lastLine = inner$("div").last();
    $lastLine.append(elementBuilder("1st of 3rd page") + elementBuilder("2nd of 3rd page"));

    // wait for new page to be created
    helper.waitFor(function() {
      var $linesWithPageBreaks = inner$("div.pageBreak");
      return $linesWithPageBreaks.length === 2;
    }).done(function() {
      var $linesWithPageBreaks = inner$("div.pageBreak");
      var $firstPageBreak = $linesWithPageBreaks.first();
      var $secondPageBreak = $linesWithPageBreaks.last();

      expect($firstPageBreak.text()).to.be("2nd page");
      expect($secondPageBreak.text()).to.be("1st of 3rd page");

      done();
    });
  }
}
