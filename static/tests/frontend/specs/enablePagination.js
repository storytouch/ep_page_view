describe('ep_script_page_view - Enable / Disable automatic pagination', function() {
  var NUMBER_OF_PAGES = 3;
  var SHOULD_HAVE_PAGE_BREAK = true;
  var SHOULD_NOT_HAVE_PAGE_BREAK = false;

  var utils, padId;

  var waitForPageBreaksChange = function(shouldHavePageBreak, done) {
    helper.waitFor(function() {
      var scriptHasPageBreaks = utils.linesAfterNonSplitPageBreaks().length > 0;
      return scriptHasPageBreaks === shouldHavePageBreak;
    }).done(done);
  }
  var makeSurePageBreaksWereAdded = function(done) {
    waitForPageBreaksChange(SHOULD_HAVE_PAGE_BREAK, done);
  }
  var makeSurePageBreaksWereRemoved = function(done) {
    waitForPageBreaksChange(SHOULD_NOT_HAVE_PAGE_BREAK, done);
  }

  before(function(done) {
    utils = ep_script_page_view_test_helper.utils;

    padId = helper.newPad(function() {
      utils.cleanPad(function() {
        // build a script with 3 full pages an an extra line on 4th page
        var script = utils.buildScriptWithGenerals('general', NUMBER_OF_PAGES * GENERALS_PER_PAGE + 1);
        utils.createScriptWith(script, 'general', done);
      });
    });

    this.timeout(60000);
  });
  after(function() {
    // make sure we always leave this test with paginations enabled, to avoid failing tests on
    // other suites
    utils.enablePagination();
  });

  context('when script has page breaks and user disables pagination', function() {
    before(function(done) {
      utils.enablePagination();

      makeSurePageBreaksWereAdded(function() {
        utils.disablePagination();
        done();
      });
    });

    it('removes all page breaks', function(done) {
      makeSurePageBreaksWereRemoved(done);
    });
  });

  context('when script has no page breaks and user enables pagination', function() {
    before(function(done) {
      utils.disablePagination();

      makeSurePageBreaksWereRemoved(function() {
        utils.enablePagination();
        done();
      });
    });

    it('creates page breaks', function(done) {
      makeSurePageBreaksWereAdded(done);
    });
  });

  context('when pagination is disabled and script with page breaks is loaded', function() {
    before(function(done) {
      utils.enablePagination();

      makeSurePageBreaksWereAdded(function() {
        // wait for page breaks to be saved
        setTimeout(function() {
          // load another pad, so can disable pagination without affecting page breaks of
          // original pad
          helper.newPad(function() {
            utils.disablePagination();

            // load original pad, the one with page breaks
            helper.newPad(done, padId);
          });
        }, 1000);
      });

      this.timeout(60000);
    });

    it('removes all page breaks', function(done) {
      makeSurePageBreaksWereRemoved(done);
    });
  });
});
