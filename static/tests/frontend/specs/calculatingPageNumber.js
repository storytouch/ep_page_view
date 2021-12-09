describe.skip("ep_script_page_view - calculating page number", function() {
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

  context("when repagination is running and page number was not recalculated yet", function() {
    var MAX_PAGE_BREAKS_PER_CYCLE = 5;

    // build script with lots of pages, so repagination takes a while to finish
    var NUMBER_OF_PAGES = 22;

    beforeEach(function(done) {
      this.timeout(14000);

      var inner$ = helper.padInner$;

      var lastLineText = "general";

      // each page has several single-line generals, and last line is a two-lines general
      // (so it is split later)
      var line1 = utils.buildStringWithLength(50, "1") + ". ";
      var line2 = utils.buildStringWithLength(50, "2") + ". ";
      var fullPage = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE - 2) +
                     utils.general(line1 + line2);
      var lastLine = utils.general(lastLineText);
      var script = utils.buildStringWithLength(NUMBER_OF_PAGES, fullPage) + lastLine;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for initial pagination to finish
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length === NUMBER_OF_PAGES;
        }, 10000).done(function() {
          // inserts a long text to first line, so all lines will be shift one line down
          // and pagination will change scroll position of elements
          var longText = utils.buildStringWithLength(62, "1");
          var $firstLine = inner$("div").first();
          $firstLine.sendkeys(longText);

          // wait for first cycle of repagination to be completed before start testing
          helper.waitFor(function() {
            var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
            return $linesWithPageBreaks.length > 1;
          }, 2000).done(done);
        });
      });
    });

    it("displays a loading icon beside page number value", function(done) {
      var inner$ = helper.padInner$;

      var $pageNumbers = inner$("pagenumber");
      // <calculating> is 0x0 by default. When it has height and width, it means it's icon is being
      // displayed
      var pageNumbersLoading = $pageNumbers.find("calculating:visible").length;
      var expectedPageNumbersLoadingAfterFirstCycle = NUMBER_OF_PAGES - MAX_PAGE_BREAKS_PER_CYCLE;

      expect(pageNumbersLoading).to.be(expectedPageNumbersLoadingAfterFirstCycle);

      done();
    });

    context("and repagination is complete", function() {

      beforeEach(function(done) {
        this.timeout(10000);

        // wait for repagination to finish
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithPageBreaks.length === NUMBER_OF_PAGES;
        }, 10000).done(done);
      });

      it("does not display a loading icon beside page number value", function(done) {
        var inner$ = helper.padInner$;

        var $pageNumbers = inner$("pagenumber");
        var pageNumbersLoading = $pageNumbers.find("calculating:visible").length;

        expect(pageNumbersLoading).to.be(0);

        done();
      });
    });
  });
});
