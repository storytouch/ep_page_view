// Letter
// var GENERALS_PER_PAGE = 54;
// A4
var GENERALS_PER_PAGE = 58;

describe("ep_script_page_view - page break on element blocks", function() {
  // shortcuts for helper functions
  var utils;
  // context-dependent values/functions
  var linesBeforeBlock, buildBlock, lastLineText;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
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

  context("when script has multiple pages and one of them has a block", function() {
    var sentences;

    before(function() {
      linesBeforeBlock = GENERALS_PER_PAGE - 4;
      var line1 = utils.buildStringWithLength(60, "1") + ".";
      var line2 = utils.buildStringWithLength(60, "2") + ".";
      var line3 = utils.buildStringWithLength(60, "3") + ".";
      var line4 = utils.buildStringWithLength(60, "4") + ".";
      sentences = [line1, line2, line3, line4];
      lastLineText = line1 + line2 + line3 + line4;

      buildBlock = function() {
        // block of 1st page to be moved to 2nd page (5 lines high, including 2 lines are top margin)
        var lastLineOfPreviousPage = utils.heading("heading");
        var firstLineOfNextPage = utils.transition("transition");

        var pageAlmostFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE - 5);

        // element of 2nd page to be split between pages
        var lastLine = utils.general(lastLineText);

        return lastLineOfPreviousPage + firstLineOfNextPage + pageAlmostFullOfGenerals + lastLine;
      };
    });

    it("considers the height of the resulting block without top margin", function(done) {
      // test page break 1st => 2nd page
      var firstLineOfSecondPage = "heading";
      utils.testNonSplitPageBreakIsOn(firstLineOfSecondPage, function() {
        // test page break 2nd => 3rd page
        var firstLineOfThirdPage = sentences[2];
        var pageNumber = 3;
        utils.testSplitPageBreakIsOn(firstLineOfThirdPage, done, pageNumber);
      });
    })
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("and last line of previous page is something else", function() {
      before(function() {
        // need to increase line number, as dialogues have lower margin
        linesBeforeBlock = GENERALS_PER_PAGE - 1;
        buildLastLineOfPreviousPage = function() {
          return utils.dialogue("dialogue");
        };
      });

      it("does not pull last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "another general";
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });

      it("does not add the MORE/CONT'D tags", function(done) {
        utils.testPageBreakDoNotHaveMoreNorContd(done);
      });
    });
  });

  context("when first line of page is a parenthetical", function() {
    // contexts for block type:
    // !heading => character => (parenthetical || dialogue)
    context("and previous line is a character and line before is not a heading", function() {
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    // contexts for block type:
    // heading => character => (parenthetical || dialogue)
    context("and previous line is a character and line before is a heading", function() {
      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 5;
        lastLineText = "last element";
        buildBlock = function() {
          // 4-line parenthetical, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(24, "1") + ".";
          var parentheticalText = fullLine + fullLine + fullLine + fullLine;

          var lineBeforeLastOfPreviousPage = utils.heading("heading");
          var lastLineOfPreviousPage = utils.character("character");
          var firstLineOfNextPage = utils.parenthetical(parentheticalText);
          var secondLineOfNextPage = utils.dialogue(lastLineText);

          return lineBeforeLastOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      it("pulls character and heading of previous page to next page", function(done) {
        var firstLineOfNextPage = "heading";
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    // contexts for block type:
    // character => (parenthetical || dialogue) (only one line of text) => (parenthetical || dialogue)
    context("and previous line is a dialogue and line before is a character", function() {
      var parentheticalText, dialogueText;

      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 3;
        lastLineText = "last element";
        buildBlock = function() {
          // 4-line parenthetical, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(24, "1") + ".";
          parentheticalText = fullLine + fullLine + fullLine + fullLine;

          var lineBeforeLastOfPreviousPage = utils.character("character");
          var lastLineOfPreviousPage = utils.dialogue(dialogueText);
          var firstLineOfNextPage = utils.parenthetical(parentheticalText);
          var secondLineOfNextPage = utils.dialogue(lastLineText);

          return lineBeforeLastOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      context("and dialogue has only one line", function() {
        before(function() {
          dialogueText = "a short dialogue";
        });

        it("pulls character and dialogue of previous page to next page", function(done) {
          var firstLineOfNextPage = "character";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and dialogue has more than one line", function() {
        before(function() {
          linesBeforeBlock = GENERALS_PER_PAGE - 4;
          dialogueText = "a very very very very very long dialogue";
        });

        it("does not pull any line of previous page to next page", function(done) {
          var firstLineOfNextPage = parentheticalText;
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          var characterName = "CHARACTER";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });
      });
    });

    // contexts for block type:
    // !(character) => (parenthetical || dialogue) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    context("and previous line is a dialogue and line before is not a character", function() {
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
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });

        context("and parenthetical has a short text (displayed in a single line)", function() {
          before(function() {
            parentheticalText = "parenthetical";
          });

          it("pulls last line of previous page to next page", function(done) {
            var firstLineOfNextPage = "dialogue";
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    // contexts for block type:
    // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    context("and previous line is not a character nor a parenthetical nor a dialogue", function() {
      var buildNextLine, parentheticalText;

      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 1;
        lastLineText = "last element";
        buildBlock = function() {
          var lastLineOfPreviousPage = utils.general("general");
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
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });

          it("does not add the MORE/CONT'D tags", function(done) {
            utils.testPageBreakDoNotHaveMoreNorContd(done);
          });
        });

        context("and parenthetical has a short text (displayed in a single line)", function() {
          before(function() {
            parentheticalText = "parenthetical";
          });

          it("pulls last line of previous page to next page", function(done) {
            var firstLineOfNextPage = "general";
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });
  });

  context("when first line of page is a dialogue", function() {
    // contexts for block type:
    // !heading => character => (parenthetical || dialogue)
    context("and previous line is a character and line before is not a heading", function() {
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    // contexts for block type:
    // heading => character => (parenthetical || dialogue)
    context("and previous line is a character and line before is a heading", function() {
      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 6;
        lastLineText = "last element";
        buildBlock = function() {
          // 4-line dialogue, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(34, "1") + ".";
          var dialogueText = fullLine + fullLine + fullLine + fullLine;

          var lineBeforeLastOfPreviousPage = utils.heading("heading");
          var lastLineOfPreviousPage = utils.character("character");
          var firstLineOfNextPage = utils.dialogue(dialogueText);
          var secondLineOfNextPage = utils.dialogue(lastLineText);

          return lineBeforeLastOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      it("pulls character and heading of previous page to next page", function(done) {
        var firstLineOfNextPage = "heading";
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    // contexts for block type:
    // character => (parenthetical || dialogue) (only one line of text) => (parenthetical || dialogue)
    context("and previous line is a parenthetical and line before is a character", function() {
      var dialogueText, parentheticalText;

      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 3;
        lastLineText = "last element";
        buildBlock = function() {
          // 4-line dialogue, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(34, "1") + ".";
          dialogueText = fullLine + fullLine + fullLine + fullLine;

          var lineBeforeLastOfPreviousPage = utils.character("character");
          var lastLineOfPreviousPage = utils.parenthetical(parentheticalText);
          var firstLineOfNextPage = utils.parenthetical(dialogueText);
          var secondLineOfNextPage = utils.dialogue(lastLineText);

          return lineBeforeLastOfPreviousPage + lastLineOfPreviousPage + firstLineOfNextPage + secondLineOfNextPage;
        };
      });

      context("and parenthetical has only one line", function() {
        before(function() {
          parentheticalText = "a short parenthetical";
        });

        it("pulls character and parenthetical of previous page to next page", function(done) {
          var firstLineOfNextPage = "character";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and parenthetical has more than one line", function() {
        before(function() {
          linesBeforeBlock = GENERALS_PER_PAGE - 4;
          parentheticalText = "a very very very very very long parenthetical";
        });

        it("does not pull any line of previous page to next page", function(done) {
          var firstLineOfNextPage = dialogueText;
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          var characterName = "CHARACTER";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });
      });
    });

    // contexts for block type:
    // !(character) => (parenthetical || dialogue) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    context("and previous line is a parenthetical and line before is not a character", function() {
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
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });

        context("and dialogue has a short text (displayed in a single line)", function() {
          before(function() {
            dialogueText = "dialogue";
          });

          it("pulls last line of previous page to next page", function(done) {
            var firstLineOfNextPage = "parenthetical";
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    // contexts for block type:
    // !(character) => (parenthetical || dialogue) (only one line of text) => !(parenthetical || dialogue)
    context("and previous line is not a character nor a parenthetical nor a dialogue", function() {
      var buildNextLine, dialogueText;

      before(function() {
        linesBeforeBlock = GENERALS_PER_PAGE - 1;
        lastLineText = "last element";
        buildBlock = function() {
          var lastLineOfPreviousPage = utils.general("general");
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
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });

        context("and dialogue has a short text (displayed in a single line)", function() {
          before(function() {
            dialogueText = "dialogue";
          });

          it("pulls last line of previous page to next page", function(done) {
            var firstLineOfNextPage = "general";
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
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
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });
});
