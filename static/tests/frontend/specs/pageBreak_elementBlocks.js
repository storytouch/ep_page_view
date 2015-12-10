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
      linesBeforeBlock = 51;
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
      linesBeforeBlock = 51;
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

  context("when block is action + (parenthetical or dialogue or transition)", function() {
    before(function() {
      linesBeforeBlock = 52;
      lastLineText = "parenthetical";
      buildBlock = function() {
        var action = utils.action("action");
        var parenthetical = utils.parenthetical("parenthetical");

        return action + parenthetical;
      };
    });

    it("moves the entire block to next page", function(done) {
      var inner$ = helper.padInner$;

      // verify there is one page break
      var $linesWithPageBreaks = inner$("div.pageBreak");
      expect($linesWithPageBreaks.length).to.be(1);

      // verify page break is on top of block
      var $firstPageBreak = $linesWithPageBreaks.first();
      expect($firstPageBreak.text()).to.be("action");

      done();
    });
  });

  context("when block is character + (parenthetical or dialogue or transition)", function() {
    before(function() {
      linesBeforeBlock = 52;
      lastLineText = "dialogue";
      buildBlock = function() {
        var character = utils.character("character");
        var dialogue  = utils.dialogue("dialogue");

        return character + dialogue;
      };
    });

    it("moves the entire block to next page", function(done) {
      var inner$ = helper.padInner$;

      // verify there is one page break
      var $linesWithPageBreaks = inner$("div.pageBreak");
      expect($linesWithPageBreaks.length).to.be(1);

      // verify page break is on top of block
      var $firstPageBreak = $linesWithPageBreaks.first();
      expect($firstPageBreak.text()).to.be("character");

      done();
    });
  });

  context("when block is general + (parenthetical or dialogue or transition)", function() {
    before(function() {
      linesBeforeBlock = 53;
      lastLineText = "parenthetical";
      buildBlock = function() {
        var general = utils.general("general");
        var parenthetical  = utils.parenthetical("parenthetical");

        return general + parenthetical;
      };
    });

    it("moves the entire block to next page", function(done) {
      var inner$ = helper.padInner$;

      // verify there is one page break
      var $linesWithPageBreaks = inner$("div.pageBreak");
      expect($linesWithPageBreaks.length).to.be(1);

      // verify page break is on top of block
      var $firstPageBreak = $linesWithPageBreaks.first();
      expect($firstPageBreak.text()).to.be("general");

      done();
    });
  });

  // context("when block is parenthetical + (parenthetical or dialogue or transition)", function() {
  //   before(function() {
  //     linesBeforeBlock = 53;
  //     lastLineText = "another parenthetical";
  //     buildBlock = function() {
  //       var parenthetical = utils.parenthetical("parenthetical");
  //       var anotherParenthetical = utils.parenthetical("another parenthetical");

  //       return parenthetical + anotherParenthetical;
  //     };
  //   });

  //   // TODO un-pend this test when rule to group (parentheticals || dialogues) is implemented
  //   xit("moves the entire block to next page", function(done) {
  //     var inner$ = helper.padInner$;

  //     // verify there is one page break
  //     var $linesWithPageBreaks = inner$("div.pageBreak");
  //     expect($linesWithPageBreaks.length).to.be(1);

  //     // verify page break is on top of block
  //     var $firstPageBreak = $linesWithPageBreaks.first();
  //     expect($firstPageBreak.text()).to.be("parenthetical");

  //     done();
  //   });
  // });

  // context("when block is dialogue + (parenthetical or dialogue or transition)", function() {
  //   before(function() {
  //     linesBeforeBlock = 53;
  //     lastLineText = "parenthetical";
  //     buildBlock = function() {
  //       var dialogue = utils.dialogue("dialogue");
  //       var parenthetical  = utils.parenthetical("parenthetical");

  //       return dialogue + parenthetical;
  //     };
  //   });

  //   // TODO un-pend this test when rule to group (parentheticals || dialogues) is implemented
  //   xit("moves the entire block to next page", function(done) {
  //     var inner$ = helper.padInner$;

  //     // verify there is one page break
  //     var $linesWithPageBreaks = inner$("div.pageBreak");
  //     expect($linesWithPageBreaks.length).to.be(1);

  //     // verify page break is on top of block
  //     var $firstPageBreak = $linesWithPageBreaks.first();
  //     expect($firstPageBreak.text()).to.be("dialogue");

  //     done();
  //   });
  // });

  // context("when block is transition + (parenthetical or dialogue or transition)", function() {
  //   before(function() {
  //     linesBeforeBlock = 52;
  //     lastLineText = "another transition";
  //     buildBlock = function() {
  //       var transition = utils.transition("transition");
  //       var anotherTransition = utils.transition("another transition");

  //       return transition + anotherTransition;
  //     };
  //   });

  //   it("moves the entire block to next page", function(done) {
  //     var inner$ = helper.padInner$;

  //     // verify there is one page break
  //     var $linesWithPageBreaks = inner$("div.pageBreak");
  //     expect($linesWithPageBreaks.length).to.be(1);

  //     // verify page break is on top of block
  //     var $firstPageBreak = $linesWithPageBreaks.first();
  //     expect($firstPageBreak.text()).to.be("transition");

  //     done();
  //   });
  // });
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
