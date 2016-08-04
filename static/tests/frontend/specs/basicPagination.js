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

describe("ep_script_page_view - pagination basic tests", function() {
  var utils, pageBreak;

  var getPageBuilder = function(elementsPerPage, builder) {
    return pageBreak.pageFullOfElementsBuilder(elementsPerPage, builder);
  }

  // create a single pad for all tests
  before(function(done) {
    utils = ep_script_page_view_test_helper.utils;
    pageBreak = ep_script_page_view_test_helper.pageBreak;
    helper.newPad(done);
    this.timeout(60000);
  });

  context("when lines do not have any top or bottom margin", function() {
    before(function(done) {
      var scriptBuilder = pageBreak.scriptWithPageFullOfGenerals;
      pageBreak.createScript(scriptBuilder, done);
    });

    it("fits " + GENERALS_PER_PAGE + " lines in a page", function(done) {
      var elementBuilder = utils.general;
      var pageBuilder    = getPageBuilder(GENERALS_PER_PAGE, elementBuilder);
      pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
    });

    context("and one of the lines has its type changed", function() {
      it("updates pagination", function(done) {
        var inner$ = helper.padInner$;

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

  context("when lines have top or bottom margin", function() {
    context("and all lines are headings", function() {
      before(function(done) {
        var test = this;
        var scriptBuilder = getPageBuilder(HEADINGS_PER_PAGE, utils.heading);
        pageBreak.createScript(scriptBuilder, function() {
          var elementBuilder = utils.heading;
          var pageBuilder    = getPageBuilder(HEADINGS_PER_PAGE, elementBuilder);
          pageBreak.prepareScriptToTestIfItFitsXLinesPerPage(elementBuilder, pageBuilder, test, done);
        });
      });

      it("fits " + HEADINGS_PER_PAGE + " lines in a page", function(done) {
        pageBreak.checkIfItFitsXLinesPerPage(done);
      });

      context('and act and sequence are visible', function() {
        before(function() {
          // click on SM icon to open them
          helper.padInner$('sm_icon').first().click();
        });
        after(function() {
          // click on SM icon to close them
          helper.padInner$('sm_icon').first().click();
        });

        it("fits " + HEADINGS_PER_PAGE + " lines in a page", function(done) {
          // wait until all SMs are visible before start testing
          helper.waitFor(function() {
            var allSMsAreVisible = helper.padInner$('div.hidden').length === 0;
            return allSMsAreVisible;
          }).done(function() {
            var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
            var $firstPageBreak = $linesWithPageBreaks.first();
            var $secondPageBreak = $linesWithPageBreaks.last();

            expect($firstPageBreak.text()).to.be("2nd page");
            expect($secondPageBreak.text()).to.be("1st of 3rd page");

            done();
          });
        });
      });

      // this is valid for some other elements too (but not for generals)
      context("and last line is of page too long to fit entirely on it", function() {
        var veryLongLineText;

        before(function() {
          var inner$ = helper.padInner$;

          // "PAGE2.........(...). "
          veryLongLineText = "PAGE2" + utils.buildStringWithLength(61 - "PAGE2".length, ".") + " ";

          // removes all lines on last page, so we can easily access last line of last page
          var $lastLineOfSecondPage = utils.linesAfterNonSplitPageBreaks().last().prev();
          var $linesOnLastPage = $lastLineOfSecondPage.nextAll();
          $linesOnLastPage.remove();

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
            return $linesWithPageBreaks.length === 2;
          }).done(function() {
            var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
            var $firstLineOfThirdPage = $linesWithPageBreaks.last();
            expect(utils.cleanText($firstLineOfThirdPage.text())).to.be(veryLongLineText);

            done();
          });
        });
      });
    });

    context("and all lines are actions", function() {
      before(function(done) {
        var scriptBuilder = getPageBuilder(ACTIONS_PER_PAGE, utils.action);
        pageBreak.createScript(scriptBuilder, done);
      });

      it("fits " + ACTIONS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.action;
        var pageBuilder    = getPageBuilder(ACTIONS_PER_PAGE, elementBuilder);
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are characters", function() {
      before(function(done) {
        var scriptBuilder = getPageBuilder(CHARACTERS_PER_PAGE, utils.character);
        pageBreak.createScript(scriptBuilder, done);
      });

      it("fits " + CHARACTERS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.character;
        var pageBuilder    = getPageBuilder(CHARACTERS_PER_PAGE, elementBuilder);
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are parentheticals", function() {
      before(function(done) {
        var scriptBuilder = getPageBuilder(PARENTHETICALS_PER_PAGE, utils.parenthetical);
        pageBreak.createScript(scriptBuilder, done);
      });

      it("fits " + PARENTHETICALS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.parenthetical;
        var pageBuilder    = getPageBuilder(PARENTHETICALS_PER_PAGE, elementBuilder);
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are dialogues", function() {
      before(function(done) {
        var scriptBuilder = getPageBuilder(DIALOGUES_PER_PAGE, utils.dialogue);
        pageBreak.createScript(scriptBuilder, done);
      });

      it("fits " + DIALOGUES_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.dialogue;
        var pageBuilder    = getPageBuilder(DIALOGUES_PER_PAGE, elementBuilder);
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are transitions", function() {
      before(function(done) {
        var scriptBuilder = getPageBuilder(TRANSITIONS_PER_PAGE, utils.transition);
        pageBreak.createScript(scriptBuilder, done);
      });

      it("fits " + TRANSITIONS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.transition;
        var pageBuilder    = getPageBuilder(TRANSITIONS_PER_PAGE, elementBuilder);
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });

    context("and all lines are shots", function() {
      before(function(done) {
        var scriptBuilder = getPageBuilder(SHOTS_PER_PAGE, utils.shot);
        pageBreak.createScript(scriptBuilder, done);
      });

      it("fits " + SHOTS_PER_PAGE + " lines in a page", function(done) {
        var elementBuilder = utils.shot;
        var pageBuilder    = getPageBuilder(SHOTS_PER_PAGE, elementBuilder);
        pageBreak.testItFitsXLinesPerPage(elementBuilder, pageBuilder, this, done);
      });
    });
  });
});

var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.pageBreak = {
  createScript: function(builder, done) {
    var utils = ep_script_page_view_test_helper.utils;
    utils.cleanPad(function() {
      utils.createScriptWith(builder('1st page'), '1st page', done);
    });
  },

  scriptWithPageFullOfGenerals: function(text) {
    var utils = ep_script_page_view_test_helper.utils;

    var script = '';
    for (var i = 0; i < GENERALS_PER_PAGE; i++) {
      script += utils.general(text);
    }

    return script;
  },

  // returns a function that will build the HTML content of a page full of element
  pageFullOfElementsBuilder: function(elementsPerPage, elementBuilder) {
    return function(text) {
      var script = '';
      for (var i = 0; i < elementsPerPage; i++) {
        script += elementBuilder(text);
      }

      return script;
    }
  },

  prepareScriptToTestIfItFitsXLinesPerPage: function(elementBuilder, pageBuilder, test, done) {
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
    }, 3000).done(done);
  },
  checkIfItFitsXLinesPerPage: function(done) {
    var utils = ep_script_page_view_test_helper.utils;

    var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
    var $firstPageBreak = $linesWithPageBreaks.first();
    var $secondPageBreak = $linesWithPageBreaks.last();

    expect($firstPageBreak.prev().text()).to.be("1st page");
    expect($firstPageBreak.text()).to.be("2nd page");

    expect($secondPageBreak.prev().text()).to.be("2nd page");
    expect($secondPageBreak.text()).to.be("1st of 3rd page");

    done();
  },
  testItFitsXLinesPerPage: function(elementBuilder, pageBuilder, test, done) {
    var self = this;
    self.prepareScriptToTestIfItFitsXLinesPerPage(elementBuilder, pageBuilder, test, function() {
      self.checkIfItFitsXLinesPerPage(done);
    });
  }
}
