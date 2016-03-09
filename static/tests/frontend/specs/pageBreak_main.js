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
      var elementBuilder = utils.general;
      var pageBuilder    = pageBreak.pageFullOfElementsBuilder(GENERALS_PER_PAGE, utils.general);
      pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
    });

    context("and one of the lines has its type changed", function() {
      it("updates pagination", function(done) {
        var inner$ = helper.padInner$;

        // create a script with 2 pages full of generals and a 3rd page with a single general
        var elementBuilder = utils.general;
        var pageBuilder    = pageBreak.pageFullOfElementsBuilder(GENERALS_PER_PAGE, utils.general);
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, function() {
          // change second line to action, so all lines will be shifted down one position
          var $secondLine = inner$("div").first().next();
          $secondLine.sendkeys("{selectall}");
          utils.changeToElement(utils.ACTION, function() {
            // wait for pagination to be completed
            helper.waitFor(function() {
              var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
              var $firstPageBreak = $linesWithPageBreaks.first();
              var $secondPageBreak = $linesWithPageBreaks.last();
              var $lineAfterSecondPageBreak = $secondPageBreak.next();

              return ($firstPageBreak.text() === "1st page") &&
                     ($secondPageBreak.text() === "2nd page") &&
                     ($lineAfterSecondPageBreak.text() === "1st of 3rd page");
            }, 3000).done(done);
          }, 1);
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
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });

      // this is valid for some other elements too (but not for generals)
      context("and last line is too long to fit entirely on the page", function() {
        var veryLongLineText;

        beforeEach(function() {
          var inner$ = helper.padInner$;

          // "PAGE2.........(...). "
          veryLongLineText = "PAGE2" + utils.buildStringWithLength(61 - "PAGE2".length, ".") + " ";

          // replaces last line with a very long text (> 61 chars, so it is
          // displayed in 2 lines on the editor)
          var $lastLine = inner$("div").last().find("heading");
          $lastLine.sendkeys("{selectall}");
          $lastLine.sendkeys(veryLongLineText);
        });

        it("moves line to next page", function(done) {
          var inner$ = helper.padInner$;

          // wait for new page to be created
          helper.waitFor(function() {
            var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
            return $linesWithPageBreaks.length === 1;
          }).done(function() {
            var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
            expect(utils.cleanText($linesWithPageBreaks.text())).to.be(veryLongLineText);

            done();
          });
        });
      });
    });

    context("and all lines are actions", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(ACTIONS_PER_PAGE, utils.action);
      });

      it("fits " + ACTIONS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.action;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are characters", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(CHARACTERS_PER_PAGE, utils.character);
      });

      it("fits " + CHARACTERS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.character;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are parentheticals", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(PARENTHETICALS_PER_PAGE, utils.parenthetical);
      });

      it("fits " + PARENTHETICALS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.parenthetical;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are dialogues", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(DIALOGUES_PER_PAGE, utils.dialogue);
      });

      it("fits " + DIALOGUES_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.dialogue;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are transitions", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(TRANSITIONS_PER_PAGE, utils.transition);
      });

      it("fits " + TRANSITIONS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.transition;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are shots", function() {
      before(function() {
        scriptBuilder = pageBreak.pageFullOfElementsBuilder(SHOTS_PER_PAGE, utils.shot);
      });

      it("fits " + SHOTS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.shot;
        var pageBuilder    = scriptBuilder;
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });
  });
});

var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.pageBreak = {
  scriptWithPageFullOfGenerals: function(text) {
    var utils = ep_script_page_view_test_helper.utils;

    var script = "";
    for (var i = 0; i < GENERALS_PER_PAGE; i++) {
      script += utils.general(text);
    }

    return script;
  },

  // returns a function that will build the HTML content of a page full of element
  pageFullOfElementsBuilder: function(elementsPerPage, elementBuilder) {
    return function(text) {
      var script = "";
      for (var i = 0; i < elementsPerPage; i++) {
        script += elementBuilder(text);
      }

      return script;
    }
  },

  testItFitsXLinesPerPage: function(elementBuilder, pageBuilder, test, done) {
    test.timeout(5000);

    var inner$ = helper.padInner$;
    var utils = ep_script_page_view_test_helper.utils;

    // verify there is no page break yet
    var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
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
      var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
      return $linesWithPageBreaks.length === 2;
    }, 3000).done(function() {
      var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
      var $firstPageBreak = $linesWithPageBreaks.first();
      var $secondPageBreak = $linesWithPageBreaks.last();

      expect($firstPageBreak.text()).to.be("2nd page");
      expect($secondPageBreak.text()).to.be("1st of 3rd page");

      done();
    });
  }
}
