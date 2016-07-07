// Letter
// var GENERALS_PER_PAGE = 54;
// A4
var GENERALS_PER_PAGE = 58;

describe("ep_script_page_view - page break on element blocks", function() {
  var utils;

  var undoLastChanges = function(done) {
    // wait for changes to be saved as a revision before undoing, otherwise
    // it won't have saved scene moving
    setTimeout(function() {
      utils.undo();
      // wait some more to make sure undo is committed before performing next action
      setTimeout(done, 0);
    }, 1000);
  }

  var changeLineTo = function(type, text, lineNumber, done, extraLinesCreated) {
    // default: no extra line created
    extraLinesCreated = extraLinesCreated || 0;

    var $targetLine = utils.getLine(lineNumber);
    $targetLine.sendkeys('{selectall}').sendkeys(text);
    utils.changeToElement(type, done, lineNumber + extraLinesCreated);
  }

  var changeLineBeforeBlockIntoHeading = function(firstLineOfBlock, done) {
    // this is the first heading of script, creates an act and a seq before it
    var createLinesWithActAndSeq = 4;
    changeLineTo(utils.HEADING, 'heading', firstLineOfBlock-1, done, createLinesWithActAndSeq);
  }
  var changeLineBeforeBlockIntoShot = function(firstLineOfBlock, done) {
    changeLineTo(utils.SHOT, 'shot', firstLineOfBlock-1, done);
  }
  var changeLineBeforeBlockIntoAction = function(firstLineOfBlock, done) {
    changeLineTo(utils.ACTION, 'action', firstLineOfBlock-1, done);
  }
  var changeLineBeforeBlockIntoCharacter = function(firstLineOfBlock, done) {
    changeLineTo(utils.CHARACTER, 'character', firstLineOfBlock-1, done);
  }
  var changeLineBeforeBlockIntoDialogue = function(firstLineOfBlock, done) {
    changeLineTo(utils.DIALOGUE, 'dialogue', firstLineOfBlock-1, done);
  }
  var changeLineBeforeBlockIntoParenthetical = function(firstLineOfBlock, done) {
    changeLineTo(utils.PARENTHETICAL, 'parenthetical', firstLineOfBlock-1, done);
  }
  var changeLineBeforeBlockIntoSomethingElse = function(firstLineOfBlock, done) {
    changeLineTo(utils.TRANSITION, 'transition', firstLineOfBlock-1, function() {
      // transitions have lower top margin, so create one line above block to
      // place block at right position
      utils.getLine(0).sendkeys('{enter}new general');

      // wait for lines to be split
      helper.waitFor(function() {
        var $newLine = utils.getLine(1);
        return utils.cleanText($newLine.text()) === 'new general';
      }).done(done);
    });
  }

  var createBaseScript = function(done) {
    utils.cleanPad(function() {
      var generals    = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE+1);
      var lastGeneral = utils.general("last general");
      var script      = generals + lastGeneral;
      utils.createScriptWith(script, "last general", done);
    });
  }

  // create a single script for all tests
  before(function(done) {
    utils = ep_script_page_view_test_helper.utils;

    helper.newPad(done);

    this.timeout(60000);
  });

  //                             +--------- top of page --------+
  describe('(heading || shot) > (action || character || general)', function() {
    context("when first line of page is an action", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 3;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.ACTION, 'action', firstLineOfBlock, done);
        });
      });

      context("and last line of previous page is a heading", function() {
        before(function(done) {
          changeLineBeforeBlockIntoHeading(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is a shot", function() {
        before(function(done) {
          changeLineBeforeBlockIntoShot(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "shot";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is something else", function() {
        before(function(done) {
          changeLineBeforeBlockIntoSomethingElse(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "action";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a character", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 3;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.CHARACTER, 'character', firstLineOfBlock, done);
        });
      });

      context("and last line of previous page is a heading", function() {
        before(function(done) {
          changeLineBeforeBlockIntoHeading(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is a shot", function() {
        before(function(done) {
          changeLineBeforeBlockIntoShot(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "shot";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is something else", function() {
        before(function(done) {
          changeLineBeforeBlockIntoSomethingElse(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "character";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a general", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 2;

      before(function(done) {
        createBaseScript(done);
      });

      context("and last line of previous page is a heading", function() {
        before(function(done) {
          changeLineBeforeBlockIntoHeading(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is a shot", function() {
        before(function(done) {
          changeLineBeforeBlockIntoShot(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "shot";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is something else", function() {
        before(function(done) {
          // just change text of target line for clarity of test result on screen
          utils.getLine(firstLineOfBlock).sendkeys('{selectall}').sendkeys('another general');
          changeLineBeforeBlockIntoSomethingElse(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
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
  });

  //                                 +------ top of page ------+
  describe('!heading > character > (parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 1;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.PARENTHETICAL, 'parenthetical', firstLineOfBlock, done);
        });
      });

      context("and previous line is a character and line before is not a heading", function() {
        before(function(done) {
          changeLineBeforeBlockIntoCharacter(firstLineOfBlock, done);
          // leave line before as general
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "character";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and previous line is a character and line before is a heading", function() {
        before(function(done) {
          // 4-line parenthetical, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(22, "1") + ". ";
          var parentheticalText = fullLine + fullLine + fullLine + fullLine;
          var $topOfBlock = utils.getLine(firstLineOfBlock).find('parenthetical');
          $topOfBlock.sendkeys('{selectall}').sendkeys(parentheticalText);

          changeLineBeforeBlockIntoCharacter(firstLineOfBlock, function() {
            changeLineBeforeBlockIntoHeading(firstLineOfBlock-1, function() {
              // remove 4 lines above top of block
              var $lines = helper.padInner$('div');
              var $linesAboveBlock = $lines.slice(5,9);
              $linesAboveBlock.remove();

              done();
            });
          });
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls character and heading of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 1;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.DIALOGUE, 'dialogue', firstLineOfBlock, done);
        });
      });

      context("and previous line is a character and line before is not a heading", function() {
        before(function(done) {
          changeLineBeforeBlockIntoCharacter(firstLineOfBlock, done);
          // leave line before as general
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "character";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and previous line is a character and line before is a heading", function() {
        before(function(done) {
          // 4-line dialogue, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(32, "1") + ". ";
          var parentheticalText = fullLine + fullLine + fullLine + fullLine;
          var $topOfBlock = utils.getLine(firstLineOfBlock).find('dialogue');
          $topOfBlock.sendkeys('{selectall}').sendkeys(parentheticalText);

          changeLineBeforeBlockIntoCharacter(firstLineOfBlock, function() {
            changeLineBeforeBlockIntoHeading(firstLineOfBlock-1, function() {
              // remove 4 lines above top of block
              var $lines = helper.padInner$('div');
              var $linesAboveBlock = $lines.slice(5,9);
              $linesAboveBlock.remove();

              done();
            });
          });
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls character and heading of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                                            +------ top of page ------+
  describe('character > (parenthetical || dialogue) (only one line of text) > (parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 1;
      var parentheticalText;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.PARENTHETICAL, 'parenthetical', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoDialogue(firstLineOfBlock, function() {
              changeLineBeforeBlockIntoCharacter(firstLineOfBlock-1, function() {
                // 4-line parenthetical, so it is long enough to be split if necessary
                var fullLine = utils.buildStringWithLength(22, "1") + ". ";
                parentheticalText = fullLine + fullLine + fullLine + fullLine;
                var $topOfBlock = utils.getLine(firstLineOfBlock).find('parenthetical');
                $topOfBlock.sendkeys('{selectall}').sendkeys(parentheticalText);

                done();
              });
            });
          });
        });
      });

      context("and dialogue on previous line has one line", function() {
        it("pulls character and dialogue of previous page to next page", function(done) {
          // wait for pagination to finish
          helper.waitFor(function() {
            var $firstLineOfNextPage = utils.linesAfterNonSplitPageBreaks().last();
            var parentheticalIsNotOnTopOfPageAnymore = $firstLineOfNextPage.find('parenthetical').length === 0;

            return parentheticalIsNotOnTopOfPageAnymore;
          }).done(function() {
            var firstLineOfNextPage = "character";
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });

      context("and dialogue on previous line has more one line", function() {
        before(function(done) {
          var $dialogue = utils.getLine(firstLineOfBlock-1).find('dialogue');
          $dialogue.sendkeys('{selectall}').sendkeys('a very very very very very long dialogue');

          // remove a line above top of block, now that dialogue has more than one line
          var $lines = helper.padInner$('div');
          var $linesAboveBlock = $lines.slice(5,6);
          $linesAboveBlock.remove();

          done();
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          // wait for pagination to finish
          helper.waitFor(function() {
            var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
            return hasMoreTag;
          }).done(function() {
            var characterName = "CHARACTER";
            utils.testPageBreakHasMoreAndContd(characterName, done);
          });
        });

        it("does not pull any line of previous page to next page", function(done) {
          var firstLineOfNextPage = parentheticalText;
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 1;
      var parentheticalText;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.DIALOGUE, 'dialogue', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoParenthetical(firstLineOfBlock, function() {
              changeLineBeforeBlockIntoCharacter(firstLineOfBlock-1, function() {
                // 4-line dialogue, so it is long enough to be split if necessary
                var fullLine = utils.buildStringWithLength(32, "1") + ". ";
                parentheticalText = fullLine + fullLine + fullLine + fullLine;
                var $topOfBlock = utils.getLine(firstLineOfBlock).find('dialogue');
                $topOfBlock.sendkeys('{selectall}').sendkeys(parentheticalText);

                done();
              });
            });
          });
        });
      });

      context("and parenthetical on previous line has one line", function() {
        it("pulls character and parenthetical of previous page to next page", function(done) {
          // wait for pagination to finish
          helper.waitFor(function() {
            var $firstLineOfNextPage = utils.linesAfterNonSplitPageBreaks().last();
            var dialogueIsNotOnTopOfPageAnymore = $firstLineOfNextPage.find('dialogue').length === 0;

            return dialogueIsNotOnTopOfPageAnymore;
          }).done(function() {
            var firstLineOfNextPage = "character";
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });

      context("and parenthetical on previous line has more one line", function() {
        before(function(done) {
          var $parenthetical = utils.getLine(firstLineOfBlock-1).find('parenthetical');
          $parenthetical.sendkeys('{selectall}').sendkeys('a very very very very very long parenthetical');

          // remove a line above top of block, now that parenthetical has more than one line
          var $lines = helper.padInner$('div');
          var $linesAboveBlock = $lines.slice(5,6);
          $linesAboveBlock.remove();

          done();
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          // wait for pagination to finish
          helper.waitFor(function() {
            var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
            return hasMoreTag;
          }).done(function() {
            var characterName = "CHARACTER";
            utils.testPageBreakHasMoreAndContd(characterName, done);
          });
        });

        it("does not pull any line of previous page to next page", function(done) {
          var firstLineOfNextPage = parentheticalText;
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                       +------------------ top of page ------------------+
  describe('!(character) > (parenthetical || dialogue) > (parenthetical || dialogue) (only one line of text) > !(parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical, previous line is a dialogue, and line before is not a character", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE;
      var parentheticalText;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.PARENTHETICAL, 'parenthetical', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoDialogue(firstLineOfBlock, done);
          });
        });
      });

      context("and next line is not a parenthetical nor a dialogue", function() {
        context("and first line of page has one line", function() {
          it("pulls last line of previous page to next page", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var $firstLineOfNextPage = utils.linesAfterNonSplitPageBreaks().last();
              var parentheticalIsNotOnTopOfPageAnymore = $firstLineOfNextPage.find('parenthetical').length === 0;

              return parentheticalIsNotOnTopOfPageAnymore;
            }).done(function() {
              var firstLineOfNextPage = "dialogue";
              utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
            });
          });
        });

        context("and first line of page has more one line", function() {
          var LONG_TEXT = 'a very very very very very long parenthetical';

          before(function(done) {
            var $parenthetical = utils.getLine(firstLineOfBlock).find('parenthetical');
            $parenthetical.sendkeys('{selectall}').sendkeys(LONG_TEXT);

            done();
          });
          after(function(done) {
            undoLastChanges(done);
          });

          it("does not pull last line of previous page to next page", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
              return hasMoreTag;
            }).done(function() {
              var firstLineOfNextPage = LONG_TEXT;
              utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
            });
          });
        });
      });

      context("and next line is a parenthetical", function() {
        before(function(done) {
          changeLineTo(utils.PARENTHETICAL, 'another parenthetical', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "parenthetical";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and next line is a dialogue", function() {
        before(function(done) {
          changeLineTo(utils.DIALOGUE, 'another dialogue', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "parenthetical";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue, previous line is a parenthetical, and line before is not a character", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE;
      var parentheticalText;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.DIALOGUE, 'dialogue', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoParenthetical(firstLineOfBlock, done);
          });
        });
      });

      context("and next line is not a dialogue nor a parenthetical", function() {
        context("and first line of page has one line", function() {
          it("pulls last line of previous page to next page", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var $firstLineOfNextPage = utils.linesAfterNonSplitPageBreaks().last();
              var dialogueIsNotOnTopOfPageAnymore = $firstLineOfNextPage.find('dialogue').length === 0;

              return dialogueIsNotOnTopOfPageAnymore;
            }).done(function() {
              var firstLineOfNextPage = "parenthetical";
              utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
            });
          });
        });

        context("and first line of page has more one line", function() {
          var LONG_TEXT = 'a very very very very very long dialogue';

          before(function(done) {
            var $dialogue = utils.getLine(firstLineOfBlock).find('dialogue');
            $dialogue.sendkeys('{selectall}').sendkeys(LONG_TEXT);

            done();
          });
          after(function(done) {
            undoLastChanges(done);
          });

          it("does not pull last line of previous page to next page", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
              return hasMoreTag;
            }).done(function() {
              var firstLineOfNextPage = LONG_TEXT;
              utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
            });
          });
        });
      });

      context("and next line is a dialogue", function() {
        before(function(done) {
          changeLineTo(utils.DIALOGUE, 'another dialogue', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "dialogue";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and next line is a parenthetical", function() {
        before(function(done) {
          changeLineTo(utils.PARENTHETICAL, 'another parenthetical', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "dialogue";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                        +------------------ top of page ------------------+
  describe('!(character) > (parenthetical || dialogue) (only one line of text) > !(parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical and previous line is not a character", function() {
      var LAST_LINE_OF_PREV_PAGE = 'last general of previous page';

      var firstLineOfBlock = GENERALS_PER_PAGE;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.PARENTHETICAL, 'parenthetical', firstLineOfBlock, function() {
            var $lastLineOfPreviousPage = utils.getLine(firstLineOfBlock-1);
            $lastLineOfPreviousPage.sendkeys('{selectall}').sendkeys(LAST_LINE_OF_PREV_PAGE);
            done();
          });
        });
      });

      context("and next line is not a parenthetical nor a dialogue", function() {
        context("and first line of page has one line", function() {
          it("pulls last line of previous page to next page", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var $firstLineOfNextPage = utils.linesAfterNonSplitPageBreaks().last();
              var parentheticalIsNotOnTopOfPageAnymore = $firstLineOfNextPage.find('parenthetical').length === 0;

              return parentheticalIsNotOnTopOfPageAnymore;
            }).done(function() {
              var firstLineOfNextPage = LAST_LINE_OF_PREV_PAGE;
              utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
            });
          });
        });

        context("and first line of page has more one line", function() {
          var LONG_TEXT = 'a very very very very very long parenthetical';

          before(function(done) {
            var $parenthetical = utils.getLine(firstLineOfBlock).find('parenthetical');
            $parenthetical.sendkeys('{selectall}').sendkeys(LONG_TEXT);

            done();
          });
          after(function(done) {
            undoLastChanges(done);
          });

          it("does not add the MORE/CONT'D tags", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
              return hasMoreTag;
            }).fail(function() {
              utils.testPageBreakDoNotHaveMoreNorContd(done);
            });
          });

          it("does not pull last line of previous page to next page", function(done) {
            var firstLineOfNextPage = LONG_TEXT;
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });

      context("and next line is a parenthetical", function() {
        before(function(done) {
          changeLineTo(utils.PARENTHETICAL, 'another parenthetical', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "parenthetical";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and next line is a dialogue", function() {
        before(function(done) {
          changeLineTo(utils.DIALOGUE, 'another dialogue', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "parenthetical";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue and previous line is not a character", function() {
      var LAST_LINE_OF_PREV_PAGE = 'last general of previous page';

      var firstLineOfBlock = GENERALS_PER_PAGE;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.DIALOGUE, 'dialogue', firstLineOfBlock, function() {
            var $lastLineOfPreviousPage = utils.getLine(firstLineOfBlock-1);
            $lastLineOfPreviousPage.sendkeys('{selectall}').sendkeys(LAST_LINE_OF_PREV_PAGE);
            done();
          });
        });
      });

      context("and next line is not a dialogue nor a parenthetical", function() {
        context("and first line of page has one line", function() {
          it("pulls last line of previous page to next page", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var $firstLineOfNextPage = utils.linesAfterNonSplitPageBreaks().last();
              var parentheticalIsNotOnTopOfPageAnymore = $firstLineOfNextPage.find('dialogue').length === 0;

              return parentheticalIsNotOnTopOfPageAnymore;
            }).done(function() {
              var firstLineOfNextPage = LAST_LINE_OF_PREV_PAGE;
              utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
            });
          });
        });

        context("and first line of page has more one line", function() {
          var LONG_TEXT = 'a very very very very very long dialogue';

          before(function(done) {
            var $dialogue = utils.getLine(firstLineOfBlock).find('dialogue');
            $dialogue.sendkeys('{selectall}').sendkeys(LONG_TEXT);

            done();
          });
          after(function(done) {
            undoLastChanges(done);
          });

          it("does not add the MORE/CONT'D tags", function(done) {
            // wait for pagination to finish
            helper.waitFor(function() {
              var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
              return hasMoreTag;
            }).fail(function() {
              utils.testPageBreakDoNotHaveMoreNorContd(done);
            });
          });

          it("does not pull last line of previous page to next page", function(done) {
            var firstLineOfNextPage = LONG_TEXT;
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });

      context("and next line is a dialogue", function() {
        before(function(done) {
          changeLineTo(utils.DIALOGUE, 'another dialogue', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "dialogue";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context("and next line is a parenthetical", function() {
        before(function(done) {
          changeLineTo(utils.PARENTHETICAL, 'another parenthetical', firstLineOfBlock+1, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "dialogue";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                                      +--------- $currentLine ---------+
  describe('(*) > (parenthetical || dialogue) (only one line of text) > transition (only one line of text)', function() {
    context("when first line of page is a transition", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 1;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.TRANSITION, 'transition', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoAction(firstLineOfBlock-1, done);
          });
        });
      });

      context('and previous line is a parenthetical with one line', function() {
        before(function(done) {
          changeLineBeforeBlockIntoParenthetical(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last two lines of previous page to next page", function(done) {
          var firstLineOfNextPage = "action";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });

      context('and previous line is a dialogue with one line', function() {
        before(function(done) {
          changeLineBeforeBlockIntoDialogue(firstLineOfBlock, done);
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last two lines of previous page to next page", function(done) {
          var firstLineOfNextPage = "action";
          utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                                    +--------- $currentLine ---------+
  describe('(parenthetical || dialogue) (more than one line of text) > transition (only one line of text)', function() {
    context("when first line of page is a transition", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 1;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.TRANSITION, 'transition', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoAction(firstLineOfBlock-1, function() {
              // remove a line above top of block, as last line of previous page will have
              // more than one line
              var $lines = helper.padInner$('div');
              var $linesAboveBlock = $lines.slice(5,6);
              $linesAboveBlock.remove();

              done();
            });
          });
        });
      });

      context('and previous line is a parenthetical with more than one line', function() {
        var LONG_TEXT = 'a very very very very very long parenthetical';

        before(function(done) {
          changeLineBeforeBlockIntoParenthetical(firstLineOfBlock, function() {
            var $parenthetical = utils.getLine(firstLineOfBlock-1).find('parenthetical');
            $parenthetical.sendkeys('{selectall}').sendkeys(LONG_TEXT);
            done();
          });
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          // wait for pagination to finish
          helper.waitFor(function() {
            var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
            return hasMoreTag;
          }).fail(function() {
            var firstLineOfNextPage = LONG_TEXT;
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });

      context('and previous line is a dialogue with more than one line', function() {
        var LONG_TEXT = 'a very very very very very long dialogue';

        before(function(done) {
          changeLineBeforeBlockIntoDialogue(firstLineOfBlock, function() {
            var $dialogue = utils.getLine(firstLineOfBlock-1).find('dialogue');
            $dialogue.sendkeys('{selectall}').sendkeys(LONG_TEXT);
            done();
          });
        });
        after(function(done) {
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          // wait for pagination to finish
          helper.waitFor(function() {
            var hasMoreTag = helper.padInner$('.withMoreAndContd').length > 0;
            return hasMoreTag;
          }).fail(function() {
            var firstLineOfNextPage = LONG_TEXT;
            utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
          });
        });
      });
    });
  });

  //               +--------- $currentLine ---------+
  describe('(*) > transition (only one line of text)', function() {
    context("when first line of page is a transition with one line", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE - 1;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.TRANSITION, 'transition', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoAction(firstLineOfBlock, done);
          });
        });
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "action";
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });

    context("when first line of page is a transition with more than one line", function() {
      var LONG_TEXT = 'very long transition';

      var firstLineOfBlock = GENERALS_PER_PAGE - 1;

      before(function(done) {
        createBaseScript(function() {
          changeLineTo(utils.TRANSITION, LONG_TEXT, firstLineOfBlock, function() {
            changeLineBeforeBlockIntoAction(firstLineOfBlock, done);
          });
        });
      });

      it("does not pull last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "very long transition";
        utils.testNonSplitPageBreakIsOn(firstLineOfNextPage, done);
      });
    });
  });

  context("when script has multiple pages and one of them has a block", function() {
    var sentences;

    before(function(done) {
      var line1 = utils.buildStringWithLength(59, "1") + ". ";
      var line2 = utils.buildStringWithLength(59, "2") + ". ";
      var line3 = utils.buildStringWithLength(59, "3") + ". ";
      var line4 = utils.buildStringWithLength(59, "4") + ". ";
      sentences = [line1, line2, line3, line4];
      targetLineText = line1 + line2 + line3 + line4;

      utils.cleanPad(function() {
        var firstPageAlmostFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE - 1);
        var secondPageAlmostFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE - 5);

        // block of 1st page to be moved to 2nd page (5 lines high, including 2 lines for top margin)
        var lastLineOfPreviousPage = utils.heading("heading");
        var firstLineOfNextPage = utils.transition("transition");

        // element of 2nd page to be split between pages
        var lastBlock = utils.general(targetLineText);
        var lastGeneral = utils.general("last general");

        var script = firstPageAlmostFullOfGenerals +
                     lastLineOfPreviousPage +
                     firstLineOfNextPage +
                     secondPageAlmostFullOfGenerals +
                     lastBlock +
                     lastGeneral;

        utils.createScriptWith(script, "last general", done);
      });
    });
    after(function(done) {
      createBaseScript(done);
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
});
