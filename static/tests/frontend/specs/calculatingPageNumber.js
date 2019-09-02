describe('ep_script_page_view - calculating page number', function() {
  var utils = ep_script_page_view_test_helper.utils;

  var MAX_PAGE_BREAKS_PER_CYCLE = 5;

  // build script with lots of pages, so repagination takes a while to finish
  var NUMBER_OF_PAGES = 12;

  // create pad and wait for its lines to have the size calculated
  before(function(done) {
    helper.newPad(function() {
      utils.cleanPad(function() {
        var lastLineText = 'general';

        // each page has several single-line generals, and last line is a two-lines general
        // (so it is split later)
        var line1 = utils.buildStringWithLength(50, '1') + '. ';
        var line2 = utils.buildStringWithLength(50, '2') + '. ';
        var fullPage = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE - 2) +
                       utils.general(line1 + line2);
        var lastLine = utils.general(lastLineText);
        var script = utils.buildStringWithLength(NUMBER_OF_PAGES, fullPage) + lastLine;
        utils.createScriptWith(script, lastLineText, function() {
          // wait for all lines to have size calculated (this takes a long time for large pads)
          helper.waitFor(function() {
            return ep_script_line_size_test_helper.utils.allLinesHaveSize();
          }, 40000).done(function() {
            // wait for initial pagination to finish
            utils.waitToHaveNNonSplitPageBreaks(NUMBER_OF_PAGES, done);
          });
        });
      });
    });
    this.timeout(60000);
  });

  context('when repagination is running and page number was not recalculated yet', function() {
    before(function(done) {
      this.timeout(20000);

      // slow down pagination, so we can have more reliable tests
      utils.setPaginationDelay(1000);

      var inner$ = helper.padInner$;

      // inserts a long text to first line, so all lines will be shift one line down
      // and pagination will change scroll position of elements
      var longText = utils.buildStringWithLength(62, '1');
      var $firstLine = inner$('div span').first();
      $firstLine.sendkeys(longText);

      // wait for first cycle of repagination to be completed before start testing
      helper.waitFor(function() {
        var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
        return $linesWithPageBreaks.length > 1;
      }, 5000).done(done);
    });

    it('displays a loading icon beside page number value', function(done) {
      var inner$ = helper.padInner$;

      var $pageNumbers = inner$('pagenumber');
      // <calculating> is 0x0 by default. When it has height and width, it means it's icon is being
      // displayed
      var pageNumbersLoading = $pageNumbers.find('calculating:visible').length;
      var expectedPageNumbersLoadingAfterFirstCycle = NUMBER_OF_PAGES - MAX_PAGE_BREAKS_PER_CYCLE;

      expect(pageNumbersLoading).to.be(expectedPageNumbersLoadingAfterFirstCycle);

      done();
    });

    context('and repagination is complete', function() {
      before(function(done) {
        this.timeout(10000);
        // speed up pagination, as now we only need to wait for it to finish
        utils.speedUpPagination();
        utils.waitToHaveNSplitPageBreaks(NUMBER_OF_PAGES, done);
      });

      it('does not display a loading icon beside page number value', function(done) {
        var inner$ = helper.padInner$;

        var $pageNumbers = inner$('pagenumber');
        var pageNumbersLoading = $pageNumbers.find('calculating:visible').length;

        expect(pageNumbersLoading).to.be(0);

        done();
      });
    });
  });
});
