// Letter
// var GENERALS_PER_PAGE = 54;
// A4
var GENERALS_PER_PAGE = 58;

describe("ep_script_page_view - pagination of element blocks", function() {
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

  var changeLineTo = function(type, text, lineNumber, done, newLineNumber) {
    var smUtils = ep_script_scene_marks_test_helper.utils;

    var $targetLine = utils.getLine(lineNumber);
    $targetLine.sendkeys('{selectall}').sendkeys(text);
    smUtils.changeLineToElement(type, lineNumber, done, newLineNumber);
  }

  var changeLineToHeadingWithActAndSeq = function(lineNumber, done) {
    var lineNumberOfHeading = lineNumber + 2; // heading has also synopsis

    changeLineTo(utils.HEADING, 'heading with act and seq', lineNumber, function() {
      utils.addActToLine(lineNumberOfHeading, function() {
        // wait for act/seq to be created
        helper.waitFor(function() {
          var actCreated = utils.getLine(lineNumber).find('act_name').length > 0;
          return actCreated;
        }, 2000).done(done);
      });
    }, lineNumberOfHeading);
  }
  // undo actions of previous function
  var undoChangeToHeadingWithAS = function(done) {
    undoLastChanges(function() {
      utils.undo();
      utils.undo();
      done();
    });
  }
  var changeLineBeforeBlockIntoHeading = function(firstLineOfBlock, done) {
    changeLineTo(utils.HEADING, 'heading', firstLineOfBlock-1, done);
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
      var lineBeforeNewGeneral = 20;
      utils.placeCaretAtTheEndOfLine(lineBeforeNewGeneral, function() {
        var createGeneral = ep_script_element_transitions_test_helper.commandNumber.buildShortcut(0);
        createGeneral();

        // wait for lines to be split
        helper.waitFor(function() {
          var transitionMovedOneLineDown = utils.getLine(firstLineOfBlock).find('transition');
          return transitionMovedOneLineDown;
        }).done(function() {
          // type something on first line just to be clearer that it is not a high margin
          utils.getLine(lineBeforeNewGeneral+1).sendkeys('new general');
          done();
        });
      });
    });
  }
  // undo actions of previous function
  var undoChangeToSomethingElse = function(done) {
    undoLastChanges(function() { // remove 'new general' text
      utils.undo();              // removed line with general
      utils.undo();              // transform 'something else' back to general
      utils.undo();              // undo text editing of first line of block
      done();
    });
  }

  var createBaseScript = function(test, done) {
    test.timeout(5000);

    utils.cleanPad(function() {
      var act         = utils.act('first act', 'summary of act');
      var seq         = utils.sequence('first sequence', 'summary of sequence');
      var synopsis    = utils.synopsis('first scene', 'summary of scene');
      var heading     = utils.heading('first heading');
      var generals    = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE);
      var lastGeneral = utils.general("last general");
      var script      = act + seq + synopsis + heading + generals + lastGeneral;
      utils.createScriptWith(script, "last general", done);
    });
  }

  // create a single script for all tests
  before(function(done) {
    utils = ep_script_page_view_test_helper.utils;

    helper.newPad(done);

    this.timeout(60000);
  });

  context('when first line of page is a heading with act and sequence', function() {
    before(function(done) {
      createBaseScript(this, function() {
        var firstLineOfNextPage = GENERALS_PER_PAGE + 6; // 1st act/seq/synopsis are hidden on top of page
        changeLineToHeadingWithActAndSeq(firstLineOfNextPage, done);
      });
    });
    after(function(done) {
      // don't need to wait, changes were already saved
      utils.undo(); // change line text back to original
      utils.undo(); // change line type back to original
      utils.undo(); // remove act/seq
      done();
    });

    it("pulls act and sequence from previous page to next page", function(done) {
      // wait for pagination to finish
      helper.waitFor(function() {
        var $lineAfterPageBreak = utils.linesAfterNonSplitPageBreaks().first();
        return $lineAfterPageBreak.hasClass('sceneMark');
      }).done(function() {
        utils.testLineAfterPageBreakIsAHeadingWithActAndSeq(done);
      });
    });
  });

  //                            +--------- top of page --------+
  describe('(heading || shot) > (action || character || general)', function() {
    // FIXME flaky tests on this context. Might be related to https://trello.com/c/17moUuIt/316
    context.skip("when first line of page is an action", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 4;

      before(function(done) {
        createBaseScript(this, function() {
          changeLineTo(utils.ACTION, 'action', firstLineOfBlock, done);
        });
      });

      context("and last line of previous page is a heading without act nor sequence", function() {
        before(function(done) {
          changeLineBeforeBlockIntoHeading(firstLineOfBlock, done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is a heading with act and sequence", function() {
        before(function(done) {
          changeLineToHeadingWithActAndSeq(firstLineOfBlock-1, done);
          this.timeout(5000);
        });
        after(function(done) {
          undoChangeToHeadingWithAS(done);
        });

        it("pulls last line of previous page to next page, with its act and seq", function(done) {
          // wait for pagination to finish
          helper.waitFor(function() {
            var $lineAfterPageBreak = utils.linesAfterNonSplitPageBreaks().first();
            return $lineAfterPageBreak.hasClass('sceneMark');
          }).done(function() {
            utils.testLineAfterPageBreakIsAHeadingWithActAndSeq(done);
          });
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is something else", function() {
        before(function(done) {
          changeLineBeforeBlockIntoSomethingElse(firstLineOfBlock, done);
        });
        after(function(done) {
          undoChangeToSomethingElse(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "action";
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a character", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 4;

      before(function(done) {
        createBaseScript(this, function() {
          changeLineTo(utils.CHARACTER, 'character', firstLineOfBlock, done);
        });
      });

      context.skip("and last line of previous page is a heading", function() {
        before(function(done) {
          changeLineBeforeBlockIntoHeading(firstLineOfBlock, done);
        });
        after(function(done) {
          // FIXME this UNDO is not reverting line back to original type. It looks
          // like when adding a heading + creating its SMs + pressing UNDO, the
          // pad is not returning to original state.
          // see https://trello.com/c/CqWW4Sr2/943
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is something else", function() {
        before(function(done) {
          changeLineBeforeBlockIntoSomethingElse(firstLineOfBlock, done);
        });
        after(function(done) {
          undoChangeToSomethingElse(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "character";
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a general", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 4;

      before(function(done) {
        createBaseScript(this, done);
      });

      context.skip("and last line of previous page is a heading", function() {
        before(function(done) {
          changeLineBeforeBlockIntoHeading(firstLineOfBlock, done);
        });
        after(function(done) {
          // FIXME this UNDO is not reverting line back to original type. It looks
          // like when adding a heading + creating its SMs + pressing UNDO, the
          // pad is not returning to original state.
          // see https://trello.com/c/CqWW4Sr2/943
          undoLastChanges(done);
        });

        it("pulls last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "heading";
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });

      context("and last line of previous page is something else", function() {
        before(function(done) {
          // just change text of target line for clarity of test result on screen
          utils.getLine(firstLineOfBlock).sendkeys('{selectall}').sendkeys('another general');
          changeLineBeforeBlockIntoSomethingElse(firstLineOfBlock, done);
        });
        after(function(done) {
          undoChangeToSomethingElse(done);
        });

        it("does not pull last line of previous page to next page", function(done) {
          var firstLineOfNextPage = "another general";
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });

        it("does not add the MORE/CONT'D tags", function(done) {
          utils.testPageBreakDoNotHaveMoreNorContd(done);
        });
      });
    });
  });

  //                               +------ top of page ------+
  describe('!heading > character > (parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 5;

      before(function(done) {
        createBaseScript(this, function() {
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });

      // FIXME UNDO is not reverting line back to original type when
      // adding a heading + creating its SMs + pressing UNDO.
      // see https://trello.com/c/CqWW4Sr2/943
      context.skip("and previous line is a character and line before is a heading", function() {
        before(function(done) {
          // 4-line parenthetical, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(22, "1") + ". ";
          var parentheticalText = fullLine + fullLine + fullLine + fullLine;
          var $topOfBlock = utils.getLine(firstLineOfBlock).find('parenthetical');
          $topOfBlock.sendkeys('{selectall}').sendkeys(parentheticalText);

          changeLineBeforeBlockIntoCharacter(firstLineOfBlock, function() {
            changeLineBeforeBlockIntoHeading(firstLineOfBlock-1, function() {
              // remove 2 lines above top of block to compensate the 2 extra lines of margin
              // above heading
              var $lines = helper.padInner$('div');
              var $linesAboveBlock = $lines.slice(5,7);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 5;

      before(function(done) {
        createBaseScript(this, function() {
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });

      // FIXME UNDO is not reverting line back to original type when
      // adding a heading + creating its SMs + pressing UNDO.
      // see https://trello.com/c/CqWW4Sr2/943
      context.skip("and previous line is a character and line before is a heading", function() {
        before(function(done) {
          // 4-line dialogue, so it is long enough to be split if necessary
          var fullLine = utils.buildStringWithLength(32, "1") + ". ";
          var parentheticalText = fullLine + fullLine + fullLine + fullLine;
          var $topOfBlock = utils.getLine(firstLineOfBlock).find('dialogue');
          $topOfBlock.sendkeys('{selectall}').sendkeys(parentheticalText);

          changeLineBeforeBlockIntoCharacter(firstLineOfBlock, function() {
            changeLineBeforeBlockIntoHeading(firstLineOfBlock-1, function() {
              // remove 2 lines above top of block to compensate the 2 extra lines of margin
              // above heading
              var $lines = helper.padInner$('div');
              var $linesAboveBlock = $lines.slice(5,7);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                                          +------ top of page ------+
  describe('character > (parenthetical || dialogue) (only one line of text) > (parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 5;
      var parentheticalText;

      before(function(done) {
        createBaseScript(this, function() {
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
            utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
          });
        });
      });

      // FIXME flaky tests on this context. Might be related to https://trello.com/c/17moUuIt/316
      context.skip("and dialogue on previous line has more one line", function() {
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 5;
      var parentheticalText;

      before(function(done) {
        createBaseScript(this, function() {
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
            utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
          });
        });
      });

      // FIXME flaky tests on this context. Might be related to https://trello.com/c/17moUuIt/316
      context.skip("and parenthetical on previous line has more one line", function() {
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                     +------------------ top of page ------------------+
  describe('!(character) > (parenthetical || dialogue) > (parenthetical || dialogue) (only one line of text) > !(parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical, previous line is a dialogue, and line before is not a character", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 6;
      var parentheticalText;

      before(function(done) {
        createBaseScript(this, function() {
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
              utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
              utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue, previous line is a parenthetical, and line before is not a character", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 6;
      var parentheticalText;

      before(function(done) {
        createBaseScript(this, function() {
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
              utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
              utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                       +------------------ top of page ------------------+
  describe('!(character) > (parenthetical || dialogue) (only one line of text) > !(parenthetical || dialogue)', function() {
    context("when first line of page is a parenthetical and previous line is not a character", function() {
      var LAST_LINE_OF_PREV_PAGE = 'last general of previous page';

      var firstLineOfBlock = GENERALS_PER_PAGE + 6;

      before(function(done) {
        createBaseScript(this, function() {
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
              utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
            utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });

    context("when first line of page is a dialogue and previous line is not a character", function() {
      var LAST_LINE_OF_PREV_PAGE = 'last general of previous page';

      var firstLineOfBlock = GENERALS_PER_PAGE + 6;

      before(function(done) {
        createBaseScript(this, function() {
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
              utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
            utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                                    +--------- $currentLine ---------+
  describe('(*) > (parenthetical || dialogue) (only one line of text) > transition (only one line of text)', function() {
    context("when first line of page is a transition", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 5;

      before(function(done) {
        createBaseScript(this, function() {
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
          utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
        });
      });
    });
  });

  //                                                                   +--------- $currentLine ---------+
  describe('(parenthetical || dialogue) (more than one line of text) > transition (only one line of text)', function() {
    context("when first line of page is a transition", function() {
      var firstLineOfBlock = GENERALS_PER_PAGE + 5;

      before(function(done) {
        createBaseScript(this, function() {
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
            utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
            utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
          });
        });
      });
    });
  });

  //              +--------- $currentLine ---------+
  describe('(*) > transition (only one line of text)', function() {
    var firstLineOfBlock = GENERALS_PER_PAGE + 5;

    context("when first line of page is a transition with one line", function() {
      before(function(done) {
        createBaseScript(this, function() {
          changeLineTo(utils.TRANSITION, 'transition', firstLineOfBlock, function() {
            changeLineBeforeBlockIntoAction(firstLineOfBlock, done);
          });
        });
      });

      it("pulls last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "action";
        utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
      });
    });

    context("when first line of page is a transition with more than one line", function() {
      var LONG_TEXT = 'very long transition';

      before(function(done) {
        createBaseScript(this, function() {
          changeLineTo(utils.TRANSITION, LONG_TEXT, firstLineOfBlock, function() {
            changeLineBeforeBlockIntoAction(firstLineOfBlock, done);
          });
        });
      });

      it("does not pull last line of previous page to next page", function(done) {
        var firstLineOfNextPage = "very long transition";
        utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfNextPage, done);
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
        var act          = utils.act('first act', 'summary of act');
        var seq          = utils.sequence('first sequence', 'summary of sequence');
        var firstHeading = utils.heading('first heading');
        var firstPageAlmostFullOfGenerals  = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE - 5);
        var secondPageAlmostFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE - 5);

        // block of 1st page to be moved to 2nd page (5 lines high, including 2 lines for top margin)
        var lastLineOfPreviousPage = utils.heading("heading");
        var firstLineOfNextPage = utils.transition("transition");

        // element of 2nd page to be split between pages
        var lastBlock = utils.general(targetLineText);
        var lastGeneral = utils.general("last general");

        var script = act + seq + firstHeading +
                     firstPageAlmostFullOfGenerals +
                     lastLineOfPreviousPage +
                     firstLineOfNextPage +
                     secondPageAlmostFullOfGenerals +
                     lastBlock +
                     lastGeneral;

        utils.createScriptWith(script, "last general", done);
      });
    });
    after(function(done) {
      createBaseScript(this, done);
    });

    it("considers the height of the resulting block without top margin", function(done) {
      // test page break 1st => 2nd page
      var firstLineOfSecondPage = "heading";
      utils.testNonSplitPageBreakIsOnScriptElementWithText(firstLineOfSecondPage, function() {
        // test page break 2nd => 3rd page
        var firstLineOfThirdPage = sentences[2];
        var pageNumber = 3;
        utils.testSplitPageBreakIsOn(firstLineOfThirdPage, done, pageNumber);
      });
    })
  });
});
