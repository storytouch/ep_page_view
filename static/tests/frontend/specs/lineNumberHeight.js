// FIXME Line numbers are not aligned to correspondent text line
// https://trello.com/c/hdZGr9EA/684
describe.skip("ep_script_page_view - height of line numbers", function() {
  // Letter
  // var PAPER_SZE = 'Letter';
  // var GENERALS_PER_PAGE = 54;
  // A4
  var PAPER_SZE = 'A4';
  var GENERALS_PER_PAGE = 58;

  var utils;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
  });

  beforeEach(function(done){
    var simplePageViewUtils = ep_script_simple_page_view_test_helper.utils;
    simplePageViewUtils.newPadWithPaperSize(function() {
      utils.cleanPad(done);
    }, PAPER_SZE);
    this.timeout(60000);
  });

  context("when pad has a non-split page break without MORE-CONTD", function() {
    beforeEach(function(done) {
      this.timeout(4000);

      // build script with one line on second page
      var script = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE+1);
      utils.createScriptWith(script, "general", function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("displays number of first line of next page on the top of its text", function(done) {
      var firstLineOfSecondPage = GENERALS_PER_PAGE+1;
      utils.testLineNumberIsOnTheSamePositionOfItsLineText(firstLineOfSecondPage, this, done);
    });
  });

  context("when pad has a non-split page break with MORE-CONTD", function() {
    beforeEach(function(done) {
      this.timeout(4000);

      // build script with character => dialogue on first page, and parenthetical => dialogue
      // on second page (to have MORE/CONT'D)
      var lastLineText = "last dialogue";
      var fullLine = utils.buildStringWithLength(23, "1") + ". ";
      // 2-line parenthetical
      var parentheticalText = fullLine + fullLine;

      var pageFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE - 4);
      var character = utils.character("character");
      var dialogueOfPreviousPage = utils.dialogue("a very very very very very long dialogue");
      var parentheticalOfNextPage = utils.parenthetical(parentheticalText);
      var dialogueOfNextPage = utils.dialogue(lastLineText);

      var script = pageFullOfGenerals + character + dialogueOfPreviousPage + parentheticalOfNextPage + dialogueOfNextPage;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("displays number of first line of next page on the top of its text", function(done) {
      var firstLineOfSecondPage = GENERALS_PER_PAGE-1;
      utils.testLineNumberIsOnTheSamePositionOfItsLineText(firstLineOfSecondPage, this, done);
    });
  });

  context("when pad has a split page break without MORE-CONTD", function() {
    beforeEach(function(done) {
      this.timeout(4000);

      // build script with last line split between pages
      var lastLineText = "last line";
      var fullLine = utils.buildStringWithLength(59, "1") + ". ";

      var pageFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE-1);
      var splitGeneral = utils.general(fullLine + fullLine);
      var lastLine = utils.general(lastLineText);

      var script = pageFullOfGenerals + splitGeneral + lastLine;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("displays number of first line of next page on the top of its text", function(done) {
      var firstLineOfSecondPage = GENERALS_PER_PAGE+1;
      utils.testLineNumberIsOnTheSamePositionOfItsLineText(firstLineOfSecondPage, this, done);
    });
  });

  context("when pad has a split page break with MORE-CONTD", function() {
    beforeEach(function(done) {
      this.timeout(4000);

      // build script with very long parenthetical at the end of first page
      var lastLineText = "last line";
      var fullLine = utils.buildStringWithLength(23, "1") + ". ";
      // 4-line parenthetical (to be split)
      var parentheticalText = fullLine + fullLine + fullLine + fullLine;

      var pageFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE - 3);
      var longParenthetical = utils.parenthetical(parentheticalText);
      var lastLine = utils.general(lastLineText);

      var script = pageFullOfGenerals + longParenthetical + lastLine;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("displays number of first line of next page on the top of its text", function(done) {
      var firstLineOfSecondPage = GENERALS_PER_PAGE-2;
      utils.testLineNumberIsOnTheSamePositionOfItsLineText(firstLineOfSecondPage, this, done);
    });
  });
});
