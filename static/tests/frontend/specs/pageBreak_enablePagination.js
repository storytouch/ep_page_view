describe('ep_script_page_view - Enable / Disable automatic pagination', function() {
  var NUMBER_OF_PAGES = 3;
  var SHOULD_HAVE_PAGE_BREAK = true;
  var SHOULD_NOT_HAVE_PAGE_BREAK = false;

  var utils;

  var clickOnSettingIfNeeded = function(shouldEnable) {
    var $paginationSetting = helper.padChrome$('#options-pagination');
    if($paginationSetting.prop("checked") !== shouldEnable) {
      $paginationSetting.click();
    }
  }
  var enablePagination = function() {
    clickOnSettingIfNeeded(SHOULD_HAVE_PAGE_BREAK);
  }
  var disablePagination = function() {
    clickOnSettingIfNeeded(SHOULD_NOT_HAVE_PAGE_BREAK);
  }

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

    helper.newPad(function() {
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
    enablePagination();
  });

  context('when pagination is already enabled and script has page breaks', function() {
    before(function(done) {
      enablePagination();
      makeSurePageBreaksWereAdded(done);
    });

    it('removes all page breaks when user disables pagination', function(done) {
      disablePagination();
      makeSurePageBreaksWereRemoved(done);
    });
  });

  context('when pagination is already disabled and script has no page breaks', function() {
    before(function(done) {
      disablePagination();
      makeSurePageBreaksWereRemoved(done);
    });

    it('creates page breaks when user enables pagination', function(done) {
      enablePagination();
      makeSurePageBreaksWereAdded(done);
    });
  });
});