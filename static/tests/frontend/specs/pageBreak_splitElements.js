describe("ep_script_page_view - page break on split elements", function() {
  // shortcuts for helper functions
  var utils, splitElements;
  // context-dependent values/functions
  var linesBeforeTargetElement, buildTargetElement, lastLineText, sentences;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
    splitElements = ep_script_page_view_test_helper.splitElements;
  });

  beforeEach(function(cb){
    helper.newPad(function() {
      utils.cleanPad(function() {
        var generals      = utils.buildScriptWithGenerals("general", linesBeforeTargetElement);
        var targetElement = buildTargetElement();
        var script        = generals + targetElement;

        utils.createScriptWith(script, lastLineText, cb);
      });
    });
    this.timeout(60000);
  });

  context("when first line of page is a very long general", function() {
    before(function() {
      // give enough space for first line of general to fit on first page
      linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
      var line1 = utils.buildStringWithLength(58, "1") + "."; // need to leave some room on 1st line for one of the tests
      var line2 = utils.buildStringWithLength(60, "2") + ".";
      var line3 = utils.buildStringWithLength(60, "3") + ".";
      var line4 = utils.buildStringWithLength(60, "4") + ".";
      sentences = [line1, line2, line3, line4];
      lastLineText = line1 + line2 + line3 + line4;
      buildTargetElement = function() {
        return utils.general(lastLineText);
      };
    });

    it("splits the original line into two separated lines", function(done) {
      var inner$ = helper.padInner$;

      // there should be a page break before we start testing
      helper.waitFor(function() {
        var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
        return $splitElementsWithPageBreaks.length === 1;
      }, 2000).done(function() {
        var $lines = inner$("div");
        var textOnLastDiv = sentences[1] + sentences[2] + sentences[3];
        var textOnDivBeforeLast = sentences[0];

        expect($lines.last().text()).to.be(textOnLastDiv);
        expect($lines.last().prev().text()).to.be(textOnDivBeforeLast);

        done();
      });
    });

    it("merges split line back into a single line when it does not have a pageBreak anymore", function(done) {
      this.timeout(5000);
      var inner$ = helper.padInner$;

      // there should be a page break before we start testing
      helper.waitFor(function() {
        var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
        return $splitElementsWithPageBreaks.length === 1;
      }, 2000).done(function() {
        // create another very long general before the last one, so pagination needs to be re-done
        // (The extra ".prev()" is because we insert a "\n" when line is split between pages)
        var $threeLinesGeneral = inner$("div").last().prev().prev();
        var line1 = utils.buildStringWithLength(60, "A") + ".";
        var line2 = utils.buildStringWithLength(60, "B") + ".";
        var line3 = utils.buildStringWithLength(60, "C") + ".";
        $threeLinesGeneral.sendkeys("{selectall}");
        $threeLinesGeneral.sendkeys(line1 + line2 + line3);

        // wait for edition to be processed and pagination to be complete
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = utils.linesAfterSplitPageBreaks();
          var $firstPageBreak = $splitElementsWithPageBreaks.first();

          // page break was added to third line of first very long general
          return $firstPageBreak.text() === line3;
        }, 3000).done(function() {
          // now the last line should had been merged back to the original line
          var $lastLine = inner$("div").last();
          expect($lastLine.text()).to.be(lastLineText);

          done();
        });
      });
    });

    it("removes existing page breaks and recalculates new ones when user changes pad content", function(done) {
      this.timeout(5000);
      var inner$ = helper.padInner$;

      // there should be a page break before we start testing
      helper.waitFor(function() {
        var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
        return $splitElementsWithPageBreaks.length === 1;
      }, 2000).done(function() {
        // create another very long general before the last one, so pagination needs to be re-done
        // (The extra ".prev()" is because we insert a "\n" when line is split between pages)
        var $threeLinesGeneral = inner$("div").last().prev().prev();
        var line1 = utils.buildStringWithLength(60, "A") + ".";
        var line2 = utils.buildStringWithLength(60, "B") + ".";
        var line3 = utils.buildStringWithLength(60, "C") + ".";
        $threeLinesGeneral.sendkeys("{selectall}");
        $threeLinesGeneral.sendkeys(line1 + line2 + line3);

        // wait for edition to be processed and pagination to be complete
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = utils.linesAfterSplitPageBreaks();
          var $firstPageBreak = $splitElementsWithPageBreaks.first();

          // page break was added to third line of first very long general
          return $firstPageBreak.text() === line3;
        }, 3000).done(function() {
          // now there should be only a single page break (on the first very long general)
          var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
          expect($splitElementsWithPageBreaks.length).to.be(1);

          done();
        });
      });
    });

    it("merges lines and split them again when user adds text to the end of first half of the split", function(done) {
      this.timeout(6000);

      var inner$ = helper.padInner$;

      // there should be a page break before we start testing
      helper.waitFor(function() {
        var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
        return $splitElementsWithPageBreaks.length === 1;
      }, 2000).done(function() {
        // write something on fist half of split line
        var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").first();
        $firstHalfOfSplitLine.sendkeys("{selectall}{rightarrow}");
        $firstHalfOfSplitLine.sendkeys("something");

        var textBeforePageBreak = sentences[0];
        var textAfterPageBreak = "something" + sentences[1] + sentences[2] + sentences[3];

        // wait for pagination to finish
        helper.waitFor(function() {
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").first();
          return $firstHalfOfSplitLine.text() === textBeforePageBreak;
        }, 3000).done(function() {
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").first().next();

          expect($secondHalfOfSplitLine.text()).to.be(textAfterPageBreak);

          done();
        });
      });
    });

    it("merges lines and split them again when user adds text to the second half of the split", function(done) {
      this.timeout(6000);

      var inner$ = helper.padInner$;

      // there should be a page break before we start testing
      helper.waitFor(function() {
        var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
        return $splitElementsWithPageBreaks.length === 1;
      }, 2000).done(function() {
        // write something on second half of split line
        var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").first().next();
        // HACK: insert text after first character. If we insert on the beginning of the line
        // (sendkeys("2.")), test fails. Doing that manually works fine, so it's better to have
        // an automated test that can avoid part of the problem than have no test at all.
        $secondHalfOfSplitLine.sendkeys("{rightarrow}.2");

        var textBeforePageBreak = sentences[0] + "2.";
        var textAfterPageBreak = sentences[1] + sentences[2] + sentences[3];

        // wait for pagination to finish
        helper.waitFor(function() {
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").first();
          return $firstHalfOfSplitLine.text() === textBeforePageBreak;
        }, 3000).done(function() {
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").first().next();

          expect($secondHalfOfSplitLine.text()).to.be(textAfterPageBreak);

          done();
        });
      });
    });

    it("merges lines and split them again when user copies & pastes both halves of the split", function(done) {
      this.timeout(6000);

      var inner$ = helper.padInner$;

      // there should be a page break before we start testing
      helper.waitFor(function() {
        var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
        return $splitElementsWithPageBreaks.length === 1;
      }, 2000).done(function() {
        // "copy" content of split line
        var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").first();
        var $secondHalfOfSplitLine = $firstHalfOfSplitLine.next();
        var copiedHtml = $firstHalfOfSplitLine[0].outerHTML + $secondHalfOfSplitLine[0].outerHTML;
        var copiedText = $firstHalfOfSplitLine.text() + $secondHalfOfSplitLine.text();

        // "paste" content of split line on the beginning of pad
        var $firstLine = inner$("div").first();
        $firstLine.prepend(copiedHtml);

        // wait for lines to be processed and page break of 1st line to be removed
        helper.waitFor(function() {
          var $firstLine = inner$("div").first();
          return $firstLine.find("splitPageBreak").length === 0;
        }, 2000).done(function() {
          var $firstLine = inner$("div").first();

          expect($firstLine.text()).to.be(copiedText);

          done();
        });
      });
    });

    context("and there is room on previous page for minimum number of lines (1)", function() {
      it("splits general between the two pages, and first page has one line of the general", function(done) {
        var secondLine = sentences[1];
        utils.testSplitPageBreakIsOn(secondLine, done);
      });

      it("does not add the MORE/CONT'D tags", function(done) {
        utils.testPageBreakDoNotHaveMoreNorContd(done);
      });
    });

    context("and there is room on previous page for more than the minimum line (+1)", function() {
      before(function() {
        // give enough space for first 3 lines of general to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
      });

      it("splits general between the two pages, and first page has as much lines as it can fit", function(done) {
        var lastLine = sentences[3];
        utils.testSplitPageBreakIsOn(lastLine, done);
      });
    });

    context("and there is no room on previous page for any line", function() {
      before(function() {
        // fill the entire page
        linesBeforeTargetElement = GENERALS_PER_PAGE;
      });

      it("moves the entire general for next page", function(done) {
        var wholeElement = lastLineText;
        utils.testNonSplitPageBreakIsOn(wholeElement, done);
      });
    });

    context("and user presses UNDO", function() {
      before(function() {
        // give enough space for a one-line-general + first line of a two-lines-general to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
        buildTargetElement = function() {
          var generalToBeEdited = utils.general("I'm a general, edit me, please");
          var twoLinesGeneral = utils.general(lastLineText);
          return generalToBeEdited + twoLinesGeneral;
        };
      });

      it("disregard changes made by pagination and undoes last edition made by user", function(done) {
        var inner$ = helper.padInner$;

        // there should be a page break before we start testing
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
          return $splitElementsWithPageBreaks.length === 1;
        }, 2000).done(function() {
          // edit one element
          var $elementToBeEdited = inner$("div").last().prev();
          var originalText = $elementToBeEdited.text();
          $elementToBeEdited.sendkeys("{selectall}");
          $elementToBeEdited.sendkeys("Now I'm edited!");

          // first UNDO: should revert edition made on previous step
          utils.undo();
          var $elementToBeEdited = inner$("div").last().prev();
          expect($elementToBeEdited.text()).to.be(originalText);

          // second UNDO: should revert full script creation
          utils.undo();
          var padText = inner$("#innerdocbody").text();
          expect(padText).to.be("");

          done();
        });
      });
    });

    context("and first sentence ends in the middle of last line that fits", function() {
      before(function() {
        // give enough space for first sentence (1.5 line long) to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
        var sentence1 = utils.buildStringWithLength(90, "1") + "."; // 1.5 line long
        var sentence2 = utils.buildStringWithLength(45, "2") + "."; // .75 line long
        sentences = [sentence1, sentence2];
        lastLineText = sentence1 + sentence2;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      it("splits general at the end of first sentence", function(done) {
        var lastSentence = sentences[1];
        utils.testSplitPageBreakIsOn(lastSentence, done);
      });

      context("and there is no delimiter for end of sentence", function() {
        before(function() {
          // build sentence that is 2.5 lines long
          var sentence1 = utils.buildStringWithLength(150, "1");
          sentences = [sentence1];
          lastLineText = sentence1;
        });

        it("moves the entire general for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });
    });

    context("and first sentence ends after last line that fits", function() {
      before(function() {
        // give enough space for only part of first sentence to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        // build sentences that are 1.5 line long
        var sentence1 = utils.buildStringWithLength(90, "1") + ".";
        var sentence2 = utils.buildStringWithLength(90, "2") + ".";
        sentences = [sentence1, sentence2];
        lastLineText = sentence1 + sentence2;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      it("moves the entire general for next page", function(done) {
        var wholeElement = lastLineText;
        utils.testNonSplitPageBreakIsOn(wholeElement, done);
      });
    });

    // when element is split, the resulting two-halves might increase the total number of lines
    // of the element. For example, if it has two sentences with 75 chars each, the two sentences
    // together need only 3 lines to fit, while if they are split it would need 4 lines to fit them
    // (2 for each sentence)
    context("and there is another full page after it", function() {
      before(function() {
        // build 2 pages, but leave space for 3 extra lines (3 will be used for a 3-lines-long
        // general to be edited on the body of the test, and 1 will be the customized general
        // created by buildTargetElement())
        linesBeforeTargetElement = 2*GENERALS_PER_PAGE - 3;
        var sentence = "This line should be on third page";
        sentences = [sentence];
        lastLineText = sentence;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      it("considers the height of the resulting second half of the element split", function(done) {
        this.timeout(5000);

        var inner$ = helper.padInner$;

        // there should be a page break before we start testing
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div nonSplitPageBreak");
          return $splitElementsWithPageBreaks.length === 1;
        }, 2000).done(function() {
          // change 57th line to be 3-lines-long (2 sentences, each ~1.25 long, so when they are
          // split they need 2 lines each)
          // build sentences that are ~1.25 line long (when split they need 2 lines each)
          var sentence1 = utils.buildStringWithLength(75, "1") + ".";
          var sentence2 = utils.buildStringWithLength(75, "2") + ".";
          // GENERALS_PER_PAGE - 1 === line before last of 1st page
          var $lineAtEndOfFirstPage = utils.getLine(GENERALS_PER_PAGE - 2);
          $lineAtEndOfFirstPage.sendkeys("{selectall}");
          $lineAtEndOfFirstPage.sendkeys(sentence1 + sentence2);

          // wait for edition to be processed and pagination to be complete
          helper.waitFor(function() {
            var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
            return $splitElementsWithPageBreaks.length > 0;
          }, 3000).done(function() {
            // 1: verify first page break was added between the two sentences of 57th line
            utils.testSplitPageBreakIsOn(sentence2, function() {
              // 2: verify second page break was added on top of last line
              utils.testNonSplitPageBreakIsOn(lastLineText, done);
            });
          });
        });
      });
    });

    context("and there are whitespaces after last punctuation mark of line that fits on previous page", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var sentence1 = utils.buildStringWithLength(45, "1") + ".     ";
        var sentence2 = utils.buildStringWithLength(45, "2") + ".";
        sentences = [sentence1, sentence2];
        // we need another line with anything because target general has whitespaces, and
        // function to generate script will never recognize last line of text is the one
        // expected (because of those whitespaces)
        var anything = "anything";
        lastLineText = anything;
        buildTargetElement = function() {
          return utils.general(sentence1 + sentence2) + utils.general(anything);
        };
      });

      it("leaves whitespaces on previous page", function(done) {
        var lastSentence = sentences[1];
        utils.testSplitPageBreakIsOn(lastSentence, done);
      });
    });

    context("and user keeps editing pad text after the split line", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var line1 = utils.buildStringWithLength(60, "1") + ".";
        var line2 = utils.buildStringWithLength(60, "2") + ".";
        var line3 = utils.buildStringWithLength(60, "3") + ".";
        var line4 = utils.buildStringWithLength(60, "4") + ".";
        var line5 = utils.buildStringWithLength(60, "5") + ".";
        var line6 = utils.buildStringWithLength(60, "6") + ".";
        sentences = [line1, line2, line3, line4, line5, line6];
        lastLineText = line1 + line2 + line3 + line4 + line5 + line6;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      it("merges lines and split them again on each edition", function(done) {
        this.timeout(10000);

        var inner$ = helper.padInner$;

        // there should be a page break before we start testing
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
          return $splitElementsWithPageBreaks.length === 1;
        }, 2000).done(function() {
          // repeat some times: remove one line then check is pagination is correct
          var textBeforePageBreak = sentences[0] + sentences[1];
          splitElements.removeFirstLineAndExpectTextBeforePageBreakToBe(textBeforePageBreak, function() {
            var textBeforePageBreak = sentences[0] + sentences[1] + sentences[2];
            splitElements.removeFirstLineAndExpectTextBeforePageBreakToBe(textBeforePageBreak, function() {
              var textBeforePageBreak = sentences[0] + sentences[1] + sentences[2] + sentences[3];
              splitElements.removeFirstLineAndExpectTextBeforePageBreakToBe(textBeforePageBreak, function() {
                var textBeforePageBreak = sentences[0] + sentences[1] + sentences[2] + sentences[3] + sentences[4];
                splitElements.removeFirstLineAndExpectTextBeforePageBreakToBe(textBeforePageBreak, done);
              });
            });
          });
        });
      });
    });

    context("and user removes part of lines split between pages", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var line1 = "last general";
        sentences = [line1];
        lastLineText = line1;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      it("does not merge lines on pagination if both halves removed are from the same split", function(done) {
        this.timeout(6000);

        var inner$ = helper.padInner$;

        var veryLongLine = utils.buildStringWithLength(60, ".");

        var line1 = utils.buildStringWithLength(60, "1") + ".";
        var line2 = utils.buildStringWithLength(60, "2") + ".";
        var line3 = utils.buildStringWithLength(60, "3") + ".";
        var line4 = utils.buildStringWithLength(60, "4") + ".";
        var multiLineText = line1 + line2 + line3 + line4;

        // Add a part in bold to be able to select part of the text later
        var $lineBeforeLast = inner$("div").last().prev();
        $lineBeforeLast.html("not<b> bold</b>" + veryLongLine);

        // Replace single-line general by a multi-line general;
        // Select part of 1st and 2nd halves of same split to be able to remove them at the same time.
        var $partOfLineBeforeLast = inner$("div b").last();
        $partOfLineBeforeLast.sendkeys("{selectall}");
        $partOfLineBeforeLast.sendkeys(multiLineText);
        $partOfLineBeforeLast.sendkeys("{selectall}");

        // wait for pagination to finish
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
          return $splitElementsWithPageBreaks.length === 1;
        }, 2000).done(function() {
          // remove all selected content (part of 1st half + entire 2nd half of same split)
          utils.pressBackspace();

          // wait for pagination to finish (content is removed, lines merged, etc.)
          helper.waitFor(function() {
            var $nonSplitElementsWithPageBreaks = inner$("div nonSplitPageBreak");
            return $nonSplitElementsWithPageBreaks.length === 1;
          }, 2000).done(function() {
            var $lines = inner$("div");
            var $lastLine = $lines.last();
            var $lineBeforeLast = $lastLine.prev();

            // last two lines should be "not.....(...)" and "last general"
            expect($lastLine.text()).to.be("last general");
            expect($lineBeforeLast.text()).to.be("not" + veryLongLine);

            done();
          });
        });
      });
    });
  });

  context("when first line of page is a very long action", function() {
    before(function() {
      buildTargetElement = function() {
        return utils.action(lastLineText);
      };
    });

    context("and there is no room on previous page for minimum number of lines (2)", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
        var line1 = utils.buildStringWithLength(60, "1") + ".";
        var line2 = utils.buildStringWithLength(60, "2") + ".";
        var line3 = utils.buildStringWithLength(60, "3") + ".";
        var line4 = utils.buildStringWithLength(60, "4") + ".";
        sentences = [line1, line2, line3, line4];
        lastLineText = line1 + line2 + line3 + line4;
      });

      it("moves the entire action for next page", function(done) {
        var wholeElement = lastLineText;
        utils.testNonSplitPageBreakIsOn(wholeElement, done);
      });
    });

    context("and there is room on previous page for minimum number of lines (2)", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
        // build sentences that are ~1.25 line long (when split they need 2 lines each)
        var line1 = utils.buildStringWithLength(75, "1") + ".";
        var line2 = utils.buildStringWithLength(75, "2") + ".";
        sentences = [line1, line2];
        lastLineText = line1 + line2;
      });

      it("splits action between the two pages, and first page has two lines of the action", function(done) {
        var newThirdLine = sentences[1];
        utils.testSplitPageBreakIsOn(newThirdLine, done);
      });

      it("keeps the two halves of the line as actions", function(done) {
        var inner$ = helper.padInner$;

        // there should be a page break before we start testing
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
          return $splitElementsWithPageBreaks.length === 1;
        }, 2000).done(function() {
          var $secondHalfOfAction = inner$("div").last();
          var $firstHalfOfAction = $secondHalfOfAction.prev();

          var secondHalfIsAnAction = $secondHalfOfAction.find("action").length > 0;
          var firstHalfIsAnAction = $firstHalfOfAction.find("action").length > 0;

          expect(firstHalfIsAnAction).to.be(true);
          expect(secondHalfIsAnAction).to.be(true);

          done();
        });
      });

      it("does not add the MORE/CONT'D tags", function(done) {
        utils.testPageBreakDoNotHaveMoreNorContd(done);
      });

      context("and user edits last line of previous page", function() {
        it("merges the split line and paginate again", function(done) {
          this.timeout(6000);
          var inner$ = helper.padInner$;

          // there should be a page break before we start testing
          helper.waitFor(function() {
            var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
            return $splitElementsWithPageBreaks.length === 1;
          }, 2000).done(function() {
            // edit last line of previous page
            var $lastLineOfFirstPage = inner$("div").last().prev();
            $lastLineOfFirstPage.sendkeys("{selectall}{rightarrow}");
            $lastLineOfFirstPage.sendkeys("something");

            // new content should be moved to next page
            var newLastLine = "something" + sentences[1];
            helper.waitFor(function() {
              var $lastLine = inner$("div").last();
              return $lastLine.text() === newLastLine;
            }, 2000).done(done);
          });
        });
      });

      context("but next page will have less then the minimum lines (2) of an action", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(60, "1") + ".";
          var line2 = utils.buildStringWithLength(60, "2") + ".";
          var line3 = utils.buildStringWithLength(60, "3") + ".";
          sentences = [line1, line2, line3];
          lastLineText = line1 + line2 + line3;
        });

        it("moves the entire action for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });
    });

    context("and there is room on previous page for more than the minimum line (+2)", function() {
      before(function() {
        // give enough space for first 3 lines of action to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
        var line1 = utils.buildStringWithLength(60, "1") + ".";
        var line2 = utils.buildStringWithLength(60, "2") + ".";
        var line3 = utils.buildStringWithLength(60, "3") + ".";
        var line4 = utils.buildStringWithLength(60, "4") + ".";
        var line5 = utils.buildStringWithLength(60, "5") + ".";
        var line6 = utils.buildStringWithLength(60, "6") + ".";
        sentences = [line1, line2, line3, line4, line5, line6];
        lastLineText = line1 + line2 + line3 + line4 + line5 + line6;
      });

      it("splits action between the two pages, and first page has as much lines as it can fit", function(done) {
        var beforeLastLine = sentences[3];
        utils.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an action", function() {
        before(function() {
          // give enough space for first 5 lines of action to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 6;
        });

        it("splits action between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          utils.testSplitPageBreakIsOn(beforeLastLine, done);
        });
      });
    });
  });

  context("when first line of page is a very long transition", function() {
    before(function() {
      buildTargetElement = function() {
        return utils.transition(lastLineText);
      };
    });

    context("and there is room on previous page for minimum number of lines (1)", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
        var line1 = utils.buildStringWithLength(14, "1") + ".";
        // build sentence that is ~1.25 line long (when split it needs 2 lines)
        var line2 = utils.buildStringWithLength(20, "2") + ".";
        sentences = [line1, line2];
        lastLineText = line1 + line2;
      });

      it("splits transition between the two pages, and first page has one line of the transition", function(done) {
        // as line is split into two blocks, the page break will be placed on the
        // first 15 chars of original second sentence
        var newThirdLine = sentences[1];
        utils.testSplitPageBreakIsOn(newThirdLine, done);
      });

      it("does not add the MORE/CONT'D tags", function(done) {
        utils.testPageBreakDoNotHaveMoreNorContd(done);
      });

      context("but next page will have less then the minimum lines (2) of an transition", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(14, "1") + ".";
          var line2 = utils.buildStringWithLength(14, "2") + ".";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("moves the entire transition for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });
    });

    context("and there is room on previous page for more than the minimum line (+1)", function() {
      before(function() {
        // give enough space for first 3 lines of transition to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
        var line1 = utils.buildStringWithLength(14, "1") + ".";
        var line2 = utils.buildStringWithLength(14, "2") + ".";
        var line3 = utils.buildStringWithLength(14, "3") + ".";
        var line4 = utils.buildStringWithLength(14, "4") + ".";
        var line5 = utils.buildStringWithLength(14, "5") + ".";
        var line6 = utils.buildStringWithLength(14, "6") + ".";
        sentences = [line1, line2, line3, line4, line5, line6];
        lastLineText = line1 + line2 + line3 + line4 + line5 + line6;
      });

      it("splits transition between the two pages, and first page has as much lines as it can fit", function(done) {
        var beforeLastLine = sentences[3];
        utils.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an transition", function() {
        before(function() {
          // give enough space for first 5 lines of transition to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 6;
        });

        it("splits transition between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          utils.testSplitPageBreakIsOn(beforeLastLine, done);
        });
      });
    });
  });

  context("when first line of page is a very long dialogue", function() {
    before(function() {
      buildTargetElement = function() {
        return utils.dialogue(lastLineText);
      };
    });

    context("and there is room on previous page for minimum number of lines (1)", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var line1 = utils.buildStringWithLength(34, "1") + ".";
        // build sentence that is ~1.25 line long (when split it needs 2 lines)
        var line2 = utils.buildStringWithLength(45, "2") + ".";
        sentences = [line1, line2];
        lastLineText = line1 + line2;
      });

      it("splits dialogue between the two pages, and first page has one line of the dialogue", function(done) {
        // as line is split into two blocks, the page break will be placed on the
        // first 35 chars of original second sentence
        var newThirdLine = sentences[1];
        utils.testSplitPageBreakIsOn(newThirdLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an dialogue", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(34, "1") + ".";
          var line2 = utils.buildStringWithLength(34, "2") + ".";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("moves the entire dialogue for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });

      context("and there is no character before dialogue", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(34, "1") + ".";
          var line2 = utils.buildStringWithLength(45, "2") + ".";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("adds the MORE/CONT'D tags with an empty character name", function(done) {
          var characterName = "";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });

        context("and 2nd split starts with a short sentence", function() {
          before(function() {
            var line1 = utils.buildStringWithLength(34, "1") + ".";
            var line2 = "2 " + utils.buildStringWithLength(31, "2") + ". "; // "2 " is the short sentence
            var line3 = utils.buildStringWithLength(33, "3") + ".";
            sentences = [line1, line2, line3];
            lastLineText = line1 + line2 + line3;
          });

          // this test is for the CSS of page break and MORE/CONT'D
          it("still places the 2nd half of split on the line below CONT'D", function(done) {
            var inner$ = helper.padInner$;

            // wait for pagination to be finished
            helper.waitFor(function() {
              var $splitPageBreaks = inner$("div splitPageBreak");
              return $splitPageBreaks.length > 0;
            }).done(function() {
              // verify 2nd half is two-lines high
              // (we need to get height of the span because the div will have page break + line -- so it's harder to test)
              var secondHalfHeight = helper.padInner$("div span").last().outerHeight();
              var twoLinesHigh = 2 * utils.regularLineHeight();

              expect(secondHalfHeight).to.be(twoLinesHigh);

              done();
            });
          });
        });
      });

      context("and there is a character before dialogue", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
          var character = utils.character("joe's (V.O.)");
          var dialogue = utils.dialogue(lastLineText);
          buildTargetElement = function() {
            return character + dialogue;
          };
        });
        // revert changed buildTargetElement
        after(function() {
          buildTargetElement = function() {
            return utils.dialogue(lastLineText);
          };
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          var characterName = "JOE'S (V.O.)";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });
      });

      context("and there is a very long character before dialogue", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
          var character = utils.character("VERY LOOOOOOOOOOOOOONG CHARACTER NAME");
          var dialogue = utils.dialogue(lastLineText);
          buildTargetElement = function() {
            return character + dialogue;
          };
        });
        // revert changed buildTargetElement
        after(function() {
          buildTargetElement = function() {
            return utils.dialogue(lastLineText);
          };
        });

        // this test is for the CSS of CONT'D (see comments about ellipsis on CSS file)
        it("only uses one line to display character name and CONT'D", function(done) {
          var inner$ = helper.padInner$;

          // wait for pagination to be finished
          helper.waitFor(function() {
            var $splitPageBreaks = inner$("div splitPageBreak");
            return $splitPageBreaks.length > 0;
          }).done(function() {
            // verify CONT'D is one line high
            // (we need to get height of the div because it has page break + line)
            var totalHeightOf2ndSplit = inner$("div").last().outerHeight();
            var secondSplitHeight = inner$("div span").last().outerHeight();
            var pageBreakHeight = utils.heightOfSplitPageBreak();
            var moreHeight = utils.heightOfMore();
            var contdHeight = totalHeightOf2ndSplit - secondSplitHeight - pageBreakHeight - moreHeight;
            var oneLineHigh = utils.regularLineHeight();

            expect(contdHeight).to.be(oneLineHigh);

            done();
          });
        });
      });
    });

    context("and there is room on previous page for more than the minimum line (+1)", function() {
      before(function() {
        // give enough space for first 3 lines of dialogue to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
        var line1 = utils.buildStringWithLength(34, "1") + ".";
        var line2 = utils.buildStringWithLength(34, "2") + ".";
        var line3 = utils.buildStringWithLength(34, "3") + ".";
        var line4 = utils.buildStringWithLength(34, "4") + ".";
        var line5 = utils.buildStringWithLength(34, "5") + ".";
        var line6 = utils.buildStringWithLength(34, "6") + ".";
        sentences = [line1, line2, line3, line4, line5, line6];
        lastLineText = line1 + line2 + line3 + line4 + line5 + line6;
      });

      it("splits dialogue between the two pages, and first page has as much lines as it can fit", function(done) {
        var beforeLastLine = sentences[3];
        utils.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an dialogue", function() {
        before(function() {
          // give enough space for first 5 lines of dialogue to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 5;
        });

        it("splits dialogue between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          utils.testSplitPageBreakIsOn(beforeLastLine, done);
        });
      });
    });
  });

  context("when first line of page is a very long parenthetical", function() {
    before(function() {
      buildTargetElement = function() {
        return utils.parenthetical(lastLineText);
      };
    });

    context("and there is room on previous page for minimum number of lines (1)", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var line1 = utils.buildStringWithLength(24, "1") + ".";
        // build sentence that is ~1.25 line long (when split it needs 2 lines)
        var line2 = utils.buildStringWithLength(30, "2") + ".";
        sentences = [line1, line2];
        lastLineText = line1 + line2;
      });

      it("splits parenthetical between the two pages, and first page has one line of the parenthetical", function(done) {
        // as line is split into two blocks, the page break will be placed on the
        // first 25 chars of original second sentence
        var newThirdLine = sentences[1];
        utils.testSplitPageBreakIsOn(newThirdLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an parenthetical", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(24, "1") + ".";
          var line2 = utils.buildStringWithLength(24, "2") + ".";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("moves the entire parenthetical for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });

      context("and there is no character before parenthetical", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(24, "1") + ".";
          var line2 = utils.buildStringWithLength(30, "2") + ".";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("adds the MORE/CONT'D tags with an empty character name", function(done) {
          var characterName = "";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });
      });

      context("and there is a character before parenthetical", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
          var character = utils.character("joe's (V.O.)");
          var parenthetical = utils.parenthetical(lastLineText);
          buildTargetElement = function() {
            return character + parenthetical;
          };
        });

        // revert changed buildTargetElement
        after(function() {
          buildTargetElement = function() {
            return utils.parenthetical(lastLineText);
          };
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          var characterName = "JOE'S (V.O.)";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });
      });
    });

    context("and there is room on previous page for more than the minimum line (+1)", function() {
      before(function() {
        // give enough space for first 3 lines of parenthetical to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
        var line1 = utils.buildStringWithLength(24, "1") + ".";
        var line2 = utils.buildStringWithLength(24, "2") + ".";
        var line3 = utils.buildStringWithLength(24, "3") + ".";
        var line4 = utils.buildStringWithLength(24, "4") + ".";
        var line5 = utils.buildStringWithLength(24, "5") + ".";
        var line6 = utils.buildStringWithLength(24, "6") + ".";
        sentences = [line1, line2, line3, line4, line5, line6];
        lastLineText = line1 + line2 + line3 + line4 + line5 + line6;
      });

      it("splits parenthetical between the two pages, and first page has as much lines as it can fit", function(done) {
        var beforeLastLine = sentences[3];
        utils.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an parenthetical", function() {
        before(function() {
          // give enough space for first 5 lines of parenthetical to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 5;
        });

        it("splits parenthetical between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          utils.testSplitPageBreakIsOn(beforeLastLine, done);
        });
      });
    });
  });

  context("when first line of page is a very long heading", function() {
    before(function() {
      linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
      var line1 = utils.buildStringWithLength(60, "1") + ".";
      var line2 = utils.buildStringWithLength(60, "2") + ".";
      lastLineText = line1 + line2;
      buildTargetElement = function() {
        return utils.heading(lastLineText);
      };
    });

    it("does not split heading into two parts, one on each page", function(done) {
      var fullElementText = lastLineText;
      utils.testNonSplitPageBreakIsOn(fullElementText, done);
    });
  });

  context("when first line of page is a very long shot", function() {
    before(function() {
      linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
      var line1 = utils.buildStringWithLength(60, "1") + ".";
      var line2 = utils.buildStringWithLength(60, "2") + ".";
      lastLineText = line1 + line2;
      buildTargetElement = function() {
        return utils.shot(lastLineText);
      };
    });

    it("does not split shot into two parts, one on each page", function(done) {
      var fullElementText = lastLineText;
      utils.testNonSplitPageBreakIsOn(fullElementText, done);
    });
  });

  context("when first line of page is a very long character", function() {
    before(function() {
      linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
      var line1 = utils.buildStringWithLength(37, "1") + ".";
      var line2 = utils.buildStringWithLength(37, "2") + ".";
      lastLineText = line1 + line2;
      buildTargetElement = function() {
        return utils.character(lastLineText);
      };
    });

    it("does not split character into two parts, one on each page", function(done) {
      var fullElementText = lastLineText;
      utils.testNonSplitPageBreakIsOn(fullElementText, done);
    });
  });
});

var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.splitElements = {
  removeFirstLineAndExpectTextBeforePageBreakToBe: function(expectedTextBeforePageBreak, done) {
    var inner$ = helper.padInner$;

    // remove one line to force pagination again
    var $firstLine = inner$("div").first();
    $firstLine.remove();

    // wait for pagination to finish
    helper.waitFor(function() {
      var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
      var textBeforePageBreak = $splitElementsWithPageBreaks.first().closest("div").text();
      return textBeforePageBreak === expectedTextBeforePageBreak;
    }, 3000).done(done);
  },
}