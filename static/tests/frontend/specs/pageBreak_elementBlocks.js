// Letter
// var GENERALS_PER_PAGE = 54;
// A4
var GENERALS_PER_PAGE = 58;

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
        var generals = utils.buildScriptWithGenerals("general", linesBeforeBlock);
        var block    = buildBlock();
        var script   = generals + block;

        utils.createScriptWith(script, lastLineText, cb);
      });
    });
    this.timeout(60000);
  });

  // contexts for block type:
  // (heading || shot) => (action || character || general)
  context("when first line of page is an action", function() {
    var buildLastLineOfPreviousPage;

    before(function() {
      linesBeforeBlock = GENERALS_PER_PAGE - 4;
      lastLineText = "action";
      buildBlock = function() {
        var lastLineOfPreviousPage = buildLastLineOfPreviousPage();
        var firstLineOfNextPage = utils.action("action");

        return lastLineOfPreviousPage + firstLineOfNextPage;
      };
    });

    context("and last line of previous page is a heading", function() {
      before(function() {
        buildLastLineOfPreviousPage = function() {
          return utils.heading("heading");
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "heading";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("and last line of previous page is a shot", function() {
      before(function() {
        buildLastLineOfPreviousPage = function() {
          return utils.shot("shot");
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "shot";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("and last line of previous page is something else", function() {
      before(function() {
        // need to increase line number, as transitions have lower margin
        linesBeforeBlock = GENERALS_PER_PAGE - 3;
        buildLastLineOfPreviousPage = function() {
          return utils.transition("transition");
        };
      });

      it("does not pull last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "action";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });

  context("when first line of page is a character", function() {
    var buildLastLineOfPreviousPage;

    before(function() {
      linesBeforeBlock = GENERALS_PER_PAGE - 4;
      lastLineText = "character";
      buildBlock = function() {
        var lastLineOfPreviousPage = buildLastLineOfPreviousPage();
        var firstLineOfNextPage = utils.character("character");

        return lastLineOfPreviousPage + firstLineOfNextPage;
      };
    });

    context("and last line of previous page is a heading", function() {
      before(function() {
        buildLastLineOfPreviousPage = function() {
          return utils.heading("heading");
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "heading";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("and last line of previous page is a shot", function() {
      before(function() {
        buildLastLineOfPreviousPage = function() {
          return utils.shot("shot");
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "shot";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("and last line of previous page is something else", function() {
      before(function() {
        // need to increase line number, as transitions have lower margin
        linesBeforeBlock = GENERALS_PER_PAGE - 3;
        buildLastLineOfPreviousPage = function() {
          return utils.transition("transition");
        };
      });

      it("does not pull last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "character";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });

  context("when first line of page is a general", function() {
    var buildLastLineOfPreviousPage;

    before(function() {
      linesBeforeBlock = GENERALS_PER_PAGE - 3;
      lastLineText = "another general";
      buildBlock = function() {
        var lastLineOfPreviousPage = buildLastLineOfPreviousPage();
        var firstLineOfNextPage = utils.general("another general");

        return lastLineOfPreviousPage + firstLineOfNextPage;
      };
    });

    context("and last line of previous page is a heading", function() {
      before(function() {
        buildLastLineOfPreviousPage = function() {
          return utils.heading("heading");
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "heading";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("and last line of previous page is a shot", function() {
      before(function() {
        buildLastLineOfPreviousPage = function() {
          return utils.shot("shot");
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "shot";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("and last line of previous page is something else", function() {
      before(function() {
        // need to increase line number, as transitions have lower margin
        linesBeforeBlock = GENERALS_PER_PAGE - 2;
        buildLastLineOfPreviousPage = function() {
          return utils.transition("transition");
        };
      });

      it("does not pull last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "another general";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });

  // contexts for block type:
  // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
  context("when first line of page is a parenthetical", function() {
    context("and previous line is not a character", function() {
      var buildNextLine, parentheticalText;

      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 1;
        lastLineText = "last element";
        buildBlock = function() {
          var lastLineOfPreviousPage = utils.dialogue("dialogue");
          var firstLineOfNextPage = utils.parenthetical(parentheticalText);
          var secondLineOfNextPage = buildNextLine();

          return lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      context("and next line is not parenthetical nor dialogue", function() {
        before(function() {
          buildNextLine = function() {
            return utils.general(lastLineText);
          };
        });

        context("and parenthetical has a long text (displayed in 2 lines)", function() {
          before(function() {
            parentheticalText = "a very very very very very long parenthetical";
          });

          it("does not pull last line of previous page to next page", function(done) {
            var firstLineOfNextPage = parentheticalText;
            elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
          });
        });

        context("and parenthetical has a short text (displayed in a single line)", function() {
          before(function() {
            parentheticalText = "parenthetical";
          });

          it("pulls last line of previous page to next page", function(done) {
            var firstLineOfNextPage = "dialogue";
            elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });

      context("and next line is a parenthetical", function() {
        before(function() {
          buildNextLine = function() {
            return utils.parenthetical(lastLineText);
          };
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "parenthetical";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and next line is a dialogue", function() {
        before(function() {
          buildNextLine = function() {
            return utils.dialogue(lastLineText);
          };
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "parenthetical";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    // contexts for block type:
    // character => (parenthetical || dialogue)
    context("and previous line is a character", function() {
      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 2;
        lastLineText = "last element";
        buildBlock = function() {
          var lastLineOfPreviousPage = utils.character("character");
          var firstLineOfNextPage = utils.parenthetical("parenthetical");
          var secondLineOfNextPage = utils.dialogue(lastLineText);

          return lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "character";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });

  context("when first line of page is a dialogue", function() {
    context("and previous line is not a character", function() {
      var buildNextLine, dialogueText;

      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 1;
        lastLineText = "last element";
        buildBlock = function() {
          var lastLineOfPreviousPage = utils.parenthetical("parenthetical");
          var firstLineOfNextPage = utils.dialogue(dialogueText);
          var secondLineOfNextPage = buildNextLine();

          return lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      context("and next line is not dialogue nor parenthetical", function() {
        before(function() {
          buildNextLine = function() {
            return utils.general(lastLineText);
          };
        });

        context("and dialogue has a long text (displayed in 2 lines)", function() {
          before(function() {
            dialogueText = "a very very very very very long dialogue";
          });

          it("does not pull last line of previous page to next page", function(done) {
            var firstLineOfNextPage = dialogueText;
            elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
          });
        });

        context("and dialogue has a short text (displayed in a single line)", function() {
          before(function() {
            dialogueText = "dialogue";
          });

          it("pulls last line of previous page to next page", function(done) {
            var firstLineOfNextPage = "parenthetical";
            elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });

      context("and next line is a dialogue", function() {
        before(function() {
          buildNextLine = function() {
            return utils.dialogue(lastLineText);
          };
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "dialogue";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and next line is a parenthetical", function() {
        before(function() {
          buildNextLine = function() {
            return utils.parenthetical(lastLineText);
          };
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "dialogue";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    // contexts for block type:
    // character => (parenthetical || dialogue)
    context("and previous line is a character", function() {
      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 2;
        lastLineText = "last element";
        buildBlock = function() {
          var lastLineOfPreviousPage = utils.character("character");
          var firstLineOfNextPage = utils.dialogue("dialogue");
          var secondLineOfNextPage = utils.dialogue(lastLineText);

          return lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "character";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });

  // context for block type:
  // (*) => transition (only one line of text)
  context("when first line of page is a transition", function() {
    var transitionText;

    before(function() {
      lastLineText = "last element";
      buildBlock = function() {
        var lastLineOfPreviousPage = utils.action("action");
        var firstLineOfNextPage = utils.transition(transitionText);
        var secondLineOfNextPage = utils.general(lastLineText);

        return lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
      };
    });

    context("and transition has a short text (displayed in a single line)", function() {
      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 3;
        transitionText = "transition";
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "action";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });

      // contexts for block type:
      // (*) => (parenthetical || dialogue) (only one line of text) => transition (only one line of text)
      context("and last line of previous page is a parenthetical with a short text (displayed in a single line)", function() {
        before(function() {
          // we need to create the last 2 elements of previous page, so there will be
          // less generals before block
          linesBeforeBlock = GENERALS_PER_PAGE - 4;
          buildBlock = function() {
            var lineBeforeLastLineOfPreviousPage = utils.action("action");
            var lastLineOfPreviousPage           = utils.parenthetical("parenthetical");
            var firstLineOfNextPage              = utils.transition(transitionText);
            var secondLineOfNextPage             = utils.general(lastLineText);

            return lineBeforeLastLineOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
          };
        });

        it("pulls last two lines of previous page to next page", function(done) {
          var firstLineOfNextPage = "action";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is a dialogue with a short text (displayed in a single line)", function() {
        before(function() {
          // we need to create the last 2 elements of previous page, so there will be
          // less generals before block
          linesBeforeBlock = GENERALS_PER_PAGE - 4;
          buildBlock = function() {
            var lineBeforeLastLineOfPreviousPage = utils.action("action");
            var lastLineOfPreviousPage           = utils.dialogue("dialogue");
            var firstLineOfNextPage              = utils.transition(transitionText);
            var secondLineOfNextPage             = utils.general(lastLineText);

            return lineBeforeLastLineOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
          };
        });

        it("pulls last two lines of previous page to next page", function(done) {
          var firstLineOfNextPage = "action";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      // contexts for block type:
      // (parenthetical || dialogue) (more than one line of text) => transition (only one line of text)
      context("and last line of previous page is a parenthetical with a long text (displayed in 2 lines)", function() {
        before(function() {
          // we need to create the last 2 elements of previous page, so there will be
          // less generals before block
          linesBeforeBlock = GENERALS_PER_PAGE - 4;
          buildBlock = function() {
            var lineBeforeLastLineOfPreviousPage = utils.action("action");
            var lastLineOfPreviousPage           = utils.parenthetical("a very very very very very long parenthetical");
            var firstLineOfNextPage              = utils.transition(transitionText);
            var secondLineOfNextPage             = utils.general(lastLineText);

            return lineBeforeLastLineOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
          };
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "a very very very very very long parenthetical";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is a dialogue with a long text (displayed in 2 lines)", function() {
        before(function() {
          // we need to create the last 2 elements of previous page, so there will be
          // less generals before block
          linesBeforeBlock = GENERALS_PER_PAGE - 4;
          buildBlock = function() {
            var lineBeforeLastLineOfPreviousPage = utils.action("action");
            var lastLineOfPreviousPage           = utils.dialogue("a very very very very very long dialogue");
            var firstLineOfNextPage              = utils.transition(transitionText);
            var secondLineOfNextPage             = utils.general(lastLineText);

            return lineBeforeLastLineOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
          };
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "a very very very very very long dialogue";
          elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    context("and transition has a long text (displayed in 2 lines)", function() {
      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 4;
        transitionText = "very long transition";
      });

      it("does not pull last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "very long transition";
        elementBlocks.testPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });
});

var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.elementBlocks = {
  testPageBreakIsOn: function(textOfFirstLineOfPage, done) {
    var inner$ = helper.padInner$;

    // verify there is one page break
    var $linesWithPageBreaks = inner$("div.pageBreak");
    expect($linesWithPageBreaks.length).to.be(1);

    // verify page break is on top of block
    var $firstPageBreak = $linesWithPageBreaks.first();
    expect($firstPageBreak.text()).to.be(textOfFirstLineOfPage);

    done();
  },
}
