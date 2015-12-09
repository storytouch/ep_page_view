describe("ep_script_page_view - page break on element blocks", function() {
  // shortcuts for helper functions
  var utils, elementBlocks;
  // context-dependent values/functions
  var linesBeforeBlock, buildBlock, lastLineText;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
    elementBlocks = ep_script_page_view_test_helper.elementBlocks;
  });

  beforeEach(function(cb){
    helper.newPad(function() {
      utils.cleanPad(function() {
        var generals = elementBlocks.buildScriptWithGenerals("general", linesBeforeBlock);
        var block    = buildBlock();
        var script   = generals + block;

        utils.createScriptWith(script, lastLineText, cb);
      });
    });
    this.timeout(60000);
  });

  context("when block is heading + something other than heading or shot", function() {
    before(function() {
      linesBeforeBlock = 52;
      lastLineText = "action";
      buildBlock = function() {
        var heading = utils.heading("heading");
        var action  = utils.action("action");

        return heading + action;
      };
    });

    it("moves the entire block to next page", function(done) {
      var inner$ = helper.padInner$;

      // verify there is one page break
      var $linesWithPageBreaks = inner$("div.pageBreak");
      expect($linesWithPageBreaks.length).to.be(1);

      // verify page break is on top of block
      var $firstPageBreak = $linesWithPageBreaks.first();
      expect($firstPageBreak.text()).to.be("heading");

      done();
    });
  });

  context("when block is shot + something other than heading or shot", function() {
    before(function() {
      linesBeforeBlock = 52;
      lastLineText = "action";
      buildBlock = function() {
        var shot = utils.shot("shot");
        var action  = utils.action("action");

        return shot + action;
      };
    });

    it("moves the entire block to next page", function(done) {
      var inner$ = helper.padInner$;

      // verify there is one page break
      var $linesWithPageBreaks = inner$("div.pageBreak");
      expect($linesWithPageBreaks.length).to.be(1);

      // verify page break is on top of block
      var $firstPageBreak = $linesWithPageBreaks.first();
      expect($firstPageBreak.text()).to.be("shot");

      done();
    });
  });
});

var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.elementBlocks = {
  buildScriptWithGenerals: function(text, howMany) {
    var utils = ep_script_page_view_test_helper.utils;

    var script = "";
    for (var i = 0; i < howMany; i++) {
      script += utils.general(text);
    }

    return script;
  },
}
