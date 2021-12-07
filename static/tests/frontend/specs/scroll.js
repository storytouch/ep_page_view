describe.skip("ep_script_page_view - scroll", function() {
  // Letter
  // var PAPER = 'Letter';
  // var GENERALS_PER_PAGE = 54;
  // A4
  var PAPER = 'A4';
  var GENERALS_PER_PAGE = 58;

  var utils;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
  });

  beforeEach(function(done){
    var simplePageViewUtils = ep_script_simple_page_view_test_helper.utils;
    simplePageViewUtils.newPadWithPaperType(function() {
      utils.cleanPad(done);
    }, PAPER);
    this.timeout(60000);
  });

  context("when user edits a line with page break", function() {
    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = "general";

      // build script full of generals with 2 page breaks
      var script = utils.buildScriptWithGenerals(lastLineText, 3*GENERALS_PER_PAGE);
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length === 2;
        }, 2000).done(done);
      });
    });

    it("keeps line with caret on same position of viewport", function(done) {
      this.timeout(3000);

      var lastLineOfSecondPage = 2*GENERALS_PER_PAGE-1;
      utils.moveViewportToLine(lastLineOfSecondPage);

      utils.getLine(lastLineOfSecondPage).sendkeys("changed ");

      // this scenario failed only when editing a line with non-split page break that resulted
      // in a new non-split page break, so there's nothing we can do to avoid the timeout here
      // (there's no way to find out when pagination is done)
      setTimeout(function() {
        utils.testLineIsOnTopOfViewport(lastLineOfSecondPage, done);
      }, 1000);
    });

    context("and edited line is split", function() {
      var lastLineOfSecondPage = 2*GENERALS_PER_PAGE-1;

      beforeEach(function (done) {
        this.timeout(3000);

        // make line a split line, but leave room for some more text at the end of 1st half
        var longText = utils.buildStringWithLength(57, "1") + " ";
        utils.getLine(lastLineOfSecondPage).sendkeys(longText);

        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithSplitPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithSplitPageBreaks.length === 1;
        }, 2000).done(done);
      });

      it("keeps line with caret on same position of viewport when edit 1st half of split", function(done) {
        this.timeout(3000);

        utils.moveViewportToLine(lastLineOfSecondPage);

        var placeCaretOnSecondColumn = "{selectall}{leftarrow}{rightarrow}";
        var $targetLine = utils.getLine(lastLineOfSecondPage);
        $targetLine.sendkeys(placeCaretOnSecondColumn);
        $targetLine.sendkeys(". 111"); // first half will have only "1. "

        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $lineBeforePageBreak = utils.linesAfterSplitPageBreaks().first().prev();
          return utils.cleanText($lineBeforePageBreak.text()) === utils.cleanText("1. ");
        }, 2000).done(function() {
          utils.testLineIsOnTopOfViewport(lastLineOfSecondPage, done);
        });
      });

      it("keeps line with caret on same position of viewport when edit 2nd half of split", function(done) {
        this.timeout(3000);

        var firstLineOfThirdPage = lastLineOfSecondPage + 1;

        utils.moveViewportToLine(firstLineOfThirdPage);

        // need to get line inner tag to call sendkeys(), otherwise it will destroy split data
        var $targetLine = utils.getLine(firstLineOfThirdPage).find("split_second_half");
        $targetLine.sendkeys("1. "); // "1. " will be moved to first half

        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $lineAfterPageBreak = utils.linesAfterSplitPageBreaks().first();
          return $lineAfterPageBreak.text() === "general";
        }, 2000).done(function() {
          utils.testLineIsOnTopOfViewport(firstLineOfThirdPage, done);
        });
      });
    });
  });

  context("when user changes viewport to a line not repaginated yet", function() {
    var MAX_PAGE_BREAKS_PER_CYCLE = 5;
    var DO_NOT_MOVE_CARET = -1;

    // build script with lots of pages, so repagination takes a while to finish
    var NUMBER_OF_PAGES = 20;
    var targetLineNumber, targetLineText;
    var caretLineNumber = DO_NOT_MOVE_CARET;

    var targetLineNumberAfter1stCycleWithSplitPageBreaks = function() {
      // after first repagination cycle, there are 5 new split lines
      return targetLineNumber + MAX_PAGE_BREAKS_PER_CYCLE;
    }
    var targetLineNumberAfterFullRepaginationWithSplitPageBreaks = function() {
      // after repagination is complete, each page end with a split line,
      // so there will be NUMBER_OF_PAGES extra lines on script (NUMBER_OF_PAGES - 1 before
      // the "page before last")
      var pageBeforeLast = NUMBER_OF_PAGES - 1;
      return targetLineNumber + pageBeforeLast - 1;
    }
    var targetLineNumberAfter1stCycleWithNonSplitPageBreaks = function() {
      // after first repagination cycle, 5 split lines were removed
      return targetLineNumberAfterFullRepaginationWithSplitPageBreaks() - MAX_PAGE_BREAKS_PER_CYCLE;
    }

    var lastLineOfPageBeforeLast = function() {
      var linesPerPage = GENERALS_PER_PAGE - 1; // -1: each page has a double-line at the end
      var pageBeforeLast = NUMBER_OF_PAGES - 1;
      var lastLineOfPageBeforeLast = pageBeforeLast * linesPerPage - 1; // -1: lines are zero-based

      return lastLineOfPageBeforeLast;
    }

    var moveCaretToLineAfterFirstPaginationCycle = function(done) {
      // change caret line text too, if needed
      if (caretLineNumber !== DO_NOT_MOVE_CARET) {
        var waitFor = function() {
          // the original line where caret was might have changed, as pagination keeps running
          // while we wait for condition to be true. The only thing we know is that the line
          // should be at caretLineNumber + numberOfSplitPageBreaks
          var numberOfSplitPageBreaks = utils.linesAfterSplitPageBreaks().length;
          var $lineWhereCaretShouldBe = utils.getLine(caretLineNumber + numberOfSplitPageBreaks);
          var $lineWhereCaretIs = utils.getLineWhereCaretIs();

          return $lineWhereCaretShouldBe.get(0) === $lineWhereCaretIs.get(0);
        };

        var caretLineNumberAfterFirstPaginationCycle = caretLineNumber + MAX_PAGE_BREAKS_PER_CYCLE;
        utils.placeCaretInTheBeginningOfLine(caretLineNumberAfterFirstPaginationCycle, done, waitFor);
      } else {
        done();
      }
    }

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
          // change target line text, to be easier to visualize what should be on top of viewport
          var $targetLine = utils.getLine(targetLineNumber);
          $targetLine.sendkeys("{selectall}{backspace}");
          $targetLine.sendkeys(targetLineText);

          // change caret line text too, if needed
          if (caretLineNumber !== DO_NOT_MOVE_CARET) {
            var $caretLine = utils.getLine(caretLineNumber);
            $caretLine.sendkeys("{selectall}{backspace}");
            $caretLine.sendkeys("This is the line where caret will be");
          }

          // inserts a long text to first line, so all lines will be shift one line down
          // and pagination will change scroll position of elements
          var longText = utils.buildStringWithLength(62, "1");
          var $firstLine = inner$("div").first();
          $firstLine.sendkeys(longText);

          // wait for first cycle of repagination to be completed before moving caret and viewport
          // to target lines (otherwise Etherpad will overwrite this viewport moving)
          helper.waitFor(function() {
            var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
            return $linesWithPageBreaks.length > 1;
          }, 2000).done(function() {
            moveCaretToLineAfterFirstPaginationCycle(function() {
              utils.moveViewportToLine(targetLineNumberAfter1stCycleWithSplitPageBreaks());

              done();
            });
          });
        });
      });
    });

    context("and line on top of viewport does not receive a page break", function() {
      before(function() {
        var middleOfPage = GENERALS_PER_PAGE/2;
        var linesPerPage = GENERALS_PER_PAGE - 1; // -1: each page has a double-line at the end
        var pageBeforeLast = NUMBER_OF_PAGES - 1;
        var middleOfPageBeforeLast = pageBeforeLast * linesPerPage - middleOfPage;

        targetLineNumber = middleOfPageBeforeLast;
        targetLineText = "This line should be on top of viewport";
      });

      it("keeps first visible line always on top of viewport", function(done) {
        this.timeout(14000);

        // check if viewport is still where it should be after repagination is complete
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithPageBreaks.length === NUMBER_OF_PAGES;
        }, 10000).done(function() {
          utils.testLineIsOnTopOfViewport(targetLineNumberAfterFullRepaginationWithSplitPageBreaks(), done);
        });
      });
    });

    context("and line on top of viewport receives a page break", function() {
      before(function() {
        targetLineNumber = lastLineOfPageBeforeLast();
        // as target line is a double-line, keep it that way and use a long text
        targetLineText = "This very very very very very long line should be on top of viewport";
      });

      beforeEach(function(done) {
        this.timeout(10000);

        // wait for repagination to complete
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithPageBreaks.length === NUMBER_OF_PAGES;
        }, 10000).done(done);
      });

      it("keeps first visible line always on top of viewport", function(done) {
        var lineNumberAfterFullRepagination = targetLineNumberAfterFullRepaginationWithSplitPageBreaks();
        utils.testLineIsOnTopOfViewport(lineNumberAfterFullRepagination, done);
      });

      context("then line on top of viewport has its page break removed", function() {
        var lineNumberAfterFirstCycle, editFirstLine;

        beforeEach(function(done) {
          this.timeout(14000);

          // edit first line to trigger repagination
          editFirstLine();

          // wait for first cycle of repagination to be completed before moving viewport
          // to target line (otherwise Etherpad will overrite this viewport moving)
          helper.waitFor(function() {
            var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
            return $linesWithPageBreaks.length > 1;
          }, 2000).done(function() {
            utils.moveViewportToLine(lineNumberAfterFirstCycle);

            helper.waitFor(function() {
              var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
              return $linesWithPageBreaks.length === NUMBER_OF_PAGES;
            }, 10000).done(done);
          });
        });

        context("and line is moved above a page break", function() {
          before(function() {
            editFirstLine = function() {
              var inner$ = helper.padInner$;

              // edit first line to make it have one inner line only
              var $firstLine = inner$("div").first();
              $firstLine.sendkeys("{selectall}{backspace}");
              $firstLine.sendkeys("general");
            };
          });

          context("and line on top is first half of split line", function() {
            before(function() {
              lineNumberAfterFirstCycle = targetLineNumberAfter1stCycleWithNonSplitPageBreaks();
            });

            it("keeps first visible line always on top of viewport", function(done) {
              // check if viewport is still where it should be after repagination is complete
              utils.testLineIsOnTopOfViewport(targetLineNumber, done);
            });
          });

          context("and line on top is second half of split line", function() {
            before(function() {
              lineNumberAfterFirstCycle = 1 + targetLineNumberAfter1stCycleWithNonSplitPageBreaks();
            });

            it("keeps first visible line always on top of viewport", function(done) {
              // top of viewport should have second inner line of target line
              var innerLineNumber = 1;
              utils.testLineIsOnTopOfViewport(targetLineNumber, done, innerLineNumber);
            });
          });
        });

        context("and line is moved bellow a page break", function() {
          before(function() {
            editFirstLine = function() {
              var inner$ = helper.padInner$;

              // edit first line to make it have three inner lines
              var longText = utils.buildStringWithLength(60, "1");
              var $firstLine = inner$("div").first();
              $firstLine.sendkeys("{selectall}{backspace}");
              $firstLine.sendkeys(longText + longText + longText);
            };

            targetLineNumberAfter1stCycleWithNonSplitPageBreaks = function() {
              // after first repagination cycle, 4 split lines were removed (the 5th one now will
              // be removed on next cycle, as we moved split lines to next page)
              return targetLineNumberAfterFullRepaginationWithSplitPageBreaks() - MAX_PAGE_BREAKS_PER_CYCLE + 1;
            }
          });

          context("and line on top is first half of split line", function() {
            before(function() {
              lineNumberAfterFirstCycle = targetLineNumberAfter1stCycleWithNonSplitPageBreaks();
            });

            it("keeps first visible line always on top of viewport", function(done) {
              utils.testLineIsOnTopOfViewport(targetLineNumber, done);
            });
          });

          context("and line on top is second half of split line", function() {
            before(function() {
              lineNumberAfterFirstCycle = 1 + targetLineNumberAfter1stCycleWithNonSplitPageBreaks();
            });

            it("keeps first visible line always on top of viewport", function(done) {
              // top of viewport should have second inner line of target line
              var innerLineNumber = 1;
              utils.testLineIsOnTopOfViewport(targetLineNumber, done, innerLineNumber);
            });
          });
        });
      });
    });

    context("and caret is visible but is not on line on top of viewport", function() {
      before(function() {
        targetLineNumber = lastLineOfPageBeforeLast();
        // as target line is a double-line, keep it that way and use a long text
        targetLineText = "This very very very very very long line should be on top of viewport";
        // line with page break above caret was not split yet
        caretLineNumber = targetLineNumber + 1;
      });

      it("keeps line with caret on same position of viewport", function(done) {
        this.timeout(14000);

        // there were some repagination cycles already
        var numberOfSplitPageBreaks = utils.linesAfterSplitPageBreaks().length;
        var lineNumberBeforePagination = caretLineNumber + numberOfSplitPageBreaks;
        // line with page break above caret was split
        var lineNumberAfterPagination = targetLineNumberAfterFullRepaginationWithSplitPageBreaks() + 2;
        var waitFor = function() {
          var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithPageBreaks.length === NUMBER_OF_PAGES;
        };
        utils.testLineIsStillOnSamePositionOfViewport(lineNumberBeforePagination, lineNumberAfterPagination, waitFor, 10000, done);
      });
    });
  });
});
