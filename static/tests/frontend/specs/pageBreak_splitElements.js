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
      var line1 = utils.buildStringWithLength(56, "1") + ". "; // need to leave some room on 1st line for one of the tests
      var line2 = utils.buildStringWithLength(59, "2") + ". ";
      var line3 = utils.buildStringWithLength(59, "3") + ". ";
      var line4 = utils.buildStringWithLength(59, "4") + ". ";
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

        expect(utils.cleanText($lines.last().text())).to.be(textOnLastDiv);
        expect(utils.cleanText($lines.last().prev().text())).to.be(textOnDivBeforeLast);

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
        var line1 = utils.buildStringWithLength(59, "A") + ". ";
        var line2 = utils.buildStringWithLength(59, "B") + ". ";
        var line3 = utils.buildStringWithLength(59, "C") + ". ";
        $threeLinesGeneral.sendkeys("{selectall}");
        $threeLinesGeneral.sendkeys(line1 + line2 + line3);

        // wait for edition to be processed and pagination to be complete
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = utils.linesAfterSplitPageBreaks();
          var $firstPageBreak = $splitElementsWithPageBreaks.first();

          // page break was added to third line of first very long general
          return utils.cleanText($firstPageBreak.text()) === line3;
        }, 3000).done(function() {
          // now the last line should had been merged back to the original line
          var $lastLine = inner$("div").last();
          expect(utils.cleanText($lastLine.text())).to.be(lastLineText);

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
        var line1 = utils.buildStringWithLength(59, "A") + ". ";
        var line2 = utils.buildStringWithLength(59, "B") + ". ";
        var line3 = utils.buildStringWithLength(59, "C") + ". ";
        $threeLinesGeneral.sendkeys("{selectall}");
        $threeLinesGeneral.sendkeys(line1 + line2 + line3);

        // wait for edition to be processed and pagination to be complete
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = utils.linesAfterSplitPageBreaks();
          var $firstPageBreak = $splitElementsWithPageBreaks.first();

          // page break was added to third line of first very long general
          return utils.cleanText($firstPageBreak.text()) === line3;
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
          return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
        }, 3000).done(function() {
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").first().next();

          expect(utils.cleanText($secondHalfOfSplitLine.text())).to.be(textAfterPageBreak);

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
        // sendkeys fails if we apply it to <div>. Need to apply to the inner span
        $secondHalfOfSplitLine = $secondHalfOfSplitLine.find("span");
        $secondHalfOfSplitLine.sendkeys("1. ");

        var textBeforePageBreak = sentences[0] + "1. ";
        var textAfterPageBreak = sentences[1] + sentences[2] + sentences[3];

        // wait for pagination to finish
        helper.waitFor(function() {
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").first();
          return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
        }, 3000).done(function() {
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").first().next();

          expect(utils.cleanText($secondHalfOfSplitLine.text())).to.be(textAfterPageBreak);

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
        var copiedText = utils.cleanText($firstHalfOfSplitLine.text() + $secondHalfOfSplitLine.text());

        // "paste" content of split line on the beginning of pad
        var $firstLine = inner$("div").first();
        $firstLine.prepend(copiedHtml);

        // wait for lines to be processed and page break of 1st line to be removed
        helper.waitFor(function() {
          var $firstLine = inner$("div").first();
          return $firstLine.find("splitPageBreak").length === 0;
        }, 2000).done(function() {
          var $firstLine = inner$("div").first();

          expect(utils.cleanText($firstLine.text())).to.be(copiedText);

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

    context("and there is room on previous page for more than the minimum line (more than 1)", function() {
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
        var sentence1 = utils.buildStringWithLength(90, "1") + ". "; // 1.5 line long
        var sentence2 = utils.buildStringWithLength(45, "2") + ". "; // .75 line long
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
          var sentence1 = utils.buildStringWithLength(75, "1") + ". ";
          var sentence2 = utils.buildStringWithLength(75, "2") + ". ";
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
              var pageNumber = 3;
              utils.testNonSplitPageBreakIsOn(lastLineText, done, pageNumber);
            });
          });
        });
      });
    });

    context("and there are whitespaces after last punctuation mark of line that fits on previous page", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var sentence1 = utils.buildStringWithLength(45, "1") + ".     ";
        var sentence2 = utils.buildStringWithLength(45, "2") + ". ";
        sentences = [sentence1, sentence2];
        lastLineText = sentences.join("");
      });

      it("leaves whitespaces on previous page", function(done) {
        var lastSentence = sentences[1];
        utils.testSplitPageBreakIsOn(lastSentence, done);
      });
    });

    context("and there are whitespaces but no punctuation mark on line that fits on previous page", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var sentence1 = utils.buildStringWithLength(55, "1") + " 1 ";
        var sentence2 = utils.buildStringWithLength(58, "2");
        sentences = [sentence1, sentence2];
        lastLineText = sentences.join("");
      });

      it("splits line by whitespace", function(done) {
        var lastSentence = sentences[1];
        utils.testSplitPageBreakIsOn(lastSentence, done);
      });
    });

    context("and there are no whitespaces nor punctuation marks on line that fits on previous page", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var sentence1 = utils.buildStringWithLength(61, "1");
        var sentence2 = "2";
        sentences = [sentence1, sentence2];
        lastLineText = sentence1 + sentence2;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      it("forces general to be split at the end of first line", function(done) {
        var lastSentence = sentences[1];
        utils.testSplitPageBreakIsOn(lastSentence, done);
      });
    });

    context("and user keeps editing pad text after the split line", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        var line1 = utils.buildStringWithLength(59, "1") + ". ";
        var line2 = utils.buildStringWithLength(59, "2") + ". ";
        var line3 = utils.buildStringWithLength(59, "3") + ". ";
        var line4 = utils.buildStringWithLength(59, "4") + ". ";
        var line5 = utils.buildStringWithLength(59, "5") + ". ";
        var line6 = utils.buildStringWithLength(59, "6") + ". ";
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

        var veryLongLine = utils.buildStringWithLength(59, ".") + " ";

        var line1 = utils.buildStringWithLength(59, "1") + ". ";
        var line2 = utils.buildStringWithLength(59, "2") + ". ";
        var line3 = utils.buildStringWithLength(59, "3") + ". ";
        var line4 = utils.buildStringWithLength(59, "4") + ". ";
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
            expect(utils.cleanText($lineBeforeLast.text())).to.be("not" + veryLongLine);

            done();
          });
        });
      });
    });

    context("and caret is at the end of 1st half of split line, and user presses DELETE", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        // lines start and end with letters to make it easier to see errors if any test fails
        var line1 = "AA" + utils.buildStringWithLength(55, "1") + "ZZ. ";
        var line2 = "AA" + utils.buildStringWithLength(55, "2") + "ZZ. ";
        var line3 = "AA" + utils.buildStringWithLength(55, "3") + "ZZ. ";
        var line4 = "AA" + utils.buildStringWithLength(55, "4") + "ZZ. ";
        sentences = [line1, line2, line3, line4];
        lastLineText = line1 + line2 + line3 + line4;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      beforeEach(function(done) {
        var inner$ = helper.padInner$;

        // there should be a page break before we start testing
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
          return $splitElementsWithPageBreaks.length === 1;
        }, 2000).done(function() {
          utils.placeCaretAtTheEndOfLine(GENERALS_PER_PAGE-1, done);
        });
      });

      it("merges lines and removes first char of 2nd half", function(done) {
        this.timeout(6000);

        var inner$ = helper.padInner$;

        utils.pressDelete();

        var textBeforePageBreak = sentences[0];
        // first char of sentences[1] was removed by DELETE
        var textAfterPageBreak = sentences[1].substring(1) + sentences[2] + sentences[3];

        // wait for pagination to finish
        helper.waitFor(function() {
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").first().next();
          return utils.cleanText($secondHalfOfSplitLine.text()) === textAfterPageBreak;
        }, 3000).done(function() {
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").first();

          expect(utils.cleanText($firstHalfOfSplitLine.text())).to.be(textBeforePageBreak);

          done();
        });
      });
    });

    context("and caret is at the beginning of 2nd half of split line, and user presses BACKSPACE", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
        // lines start and end with letters to make it easier to see errors if any test fails
        var line1 = "AA" + utils.buildStringWithLength(55, "1") + "ZZ. ";
        var line2 = "AA" + utils.buildStringWithLength(55, "2") + "ZZ. ";
        var line3 = "AA" + utils.buildStringWithLength(55, "3") + "ZZ. ";
        var line4 = "AA" + utils.buildStringWithLength(55, "4") + "ZZ. ";
        sentences = [line1, line2, line3, line4];
        lastLineText = line1 + line2 + line3 + line4;
        buildTargetElement = function() {
          return utils.general(lastLineText);
        };
      });

      beforeEach(function(done) {
        var inner$ = helper.padInner$;

        // there should be a page break before we start testing
        helper.waitFor(function() {
          var $pageBreaks = inner$("div splitPageBreak");
          return $pageBreaks.length === 1;
        }, 2000).done(function() {
          utils.placeCaretInTheBeginningOfLine(GENERALS_PER_PAGE, done);
        });
      });

      it("merges lines and removes last char of 1st half", function(done) {
        this.timeout(6000);

        var inner$ = helper.padInner$;

        utils.pressBackspace();

        // last char of sentences[0] was removed by BACKSPACE,
        // first char of sentences[1] was moved to first line
        var firstSencenceWithoutSpace = sentences[0].substring(0, sentences[0].length-1);
        var firstCharOfSecondSentence = sentences[1].substring(0, 1);
        var expectedTextOnFirstHalf = firstSencenceWithoutSpace + firstCharOfSecondSentence;
        // first char of sentences[1] should be moved to previous line after re-pagination
        var textAfterPageBreak = sentences[1].substring(1) + sentences[2] + sentences[3];

        // wait for pagination to finish
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div:has(splitPageBreak)");

          return ($splitElementsWithPageBreaks.length === 1) &&
                 (utils.cleanText($splitElementsWithPageBreaks.text()) === expectedTextOnFirstHalf);
        }, 3000).done(function() {
          var $lineAfterPageBreak = utils.linesAfterSplitPageBreaks().first();

          expect(utils.cleanText($lineAfterPageBreak.text())).to.be(textAfterPageBreak);

          done();
        });
      });
    });

    context("and pad has multiple split lines", function() {
      before(function() {
        linesBeforeTargetElement = 3*GENERALS_PER_PAGE - 3;
        var line1 = utils.buildStringWithLength(56, "1") + ". ";
        var line2 = utils.buildStringWithLength(56, "2") + ". ";
        var line3 = utils.buildStringWithLength(56, "3") + ". ";
        var line4 = utils.buildStringWithLength(56, "4") + ". ";
        sentences = [line1, line2, line3, line4];
        lastLineText = "the end of the pad";
        buildTargetElement = function() {
          return utils.general(line1 + line2 + line3 + line4) + utils.general(lastLineText);
        };
      });

      beforeEach(function(done) {
        this.timeout(6000);

        var inner$ = helper.padInner$;

        var line1 = utils.buildStringWithLength(59, "X") + ". ";
        var line2 = utils.buildStringWithLength(59, "Y") + ". ";
        var veryLongLine = line1 + line2;

        // there should be a page break before we start creating other split page breaks
        helper.waitFor(function() {
          var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
          return $splitElementsWithPageBreaks.length === 1;
        }, 2000).done(function() {
          // create some other split page breaks before the existing one
          var $lastLineOfSecondPage = utils.getLine(2*GENERALS_PER_PAGE-2);
          $lastLineOfSecondPage.sendkeys("{selectall}");
          $lastLineOfSecondPage.sendkeys(veryLongLine);

          var $lastLineOfFirstPage = utils.getLine(GENERALS_PER_PAGE-1);
          $lastLineOfFirstPage.sendkeys("{selectall}");
          $lastLineOfFirstPage.sendkeys(veryLongLine);

          // there should be 3 page breaks now
          helper.waitFor(function() {
            var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
            return $splitElementsWithPageBreaks.length === 3;
          }, 2000).done(done);
        });
      });

      context("and user adds text before any split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on fist line
          var $firstLine = inner$("div").first();
          $firstLine.sendkeys("{selectall}");
          $firstLine.sendkeys("AAAAAAAAA");

          done();
        });

        it("keeps caret at the end of inserted text", function(done) {
          var firstLine = function() { return helper.padInner$("div").first() };
          var textAfterInsertedText = "AAAAAAAAA".length;

          splitElements.testCaretIsOn(firstLine, textAfterInsertedText, false, done);
        });
      });

      context("and user adds text after all split lines", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on last line
          var $lastLine = inner$("div").last();
          $lastLine.sendkeys("{selectall}{leftarrow}");
          $lastLine.sendkeys("AAAAAAAAA{enter}BBBBBBBBBBBB");

          // wait for changes to be processed and pagination to finish
          helper.waitFor(function() {
            var $lastLine = inner$("div").last();
            return $lastLine.text() === "BBBBBBBBBBBB" + lastLineText;
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var lastLine = function() { return helper.padInner$("div").last() };
          var textAfterInsertedText = "BBBBBBBBBBBB".length;

          splitElements.testCaretIsOn(lastLine, textAfterInsertedText, true, done);
        });
      });

      context("and user adds text before the end of 1st half of split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on fist half of last split line
          // ("1. " will be added to 1st half; "AAAAAAAAA " to the 2nd)
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
          $firstHalfOfSplitLine.sendkeys("{selectall}{rightarrow}{leftarrow}{leftarrow}");
          $firstHalfOfSplitLine.sendkeys("1. AAAAAAAAA");

          var textBeforePageBreak = "1" + sentences[0];

          // wait for pagination to finish
          helper.waitFor(function() {
            var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
            return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var secondHalfOfSplitLine = function() { return helper.padInner$("div:has(splitPageBreak)").last().next() };
          var textAfterInsertedText = "AAAAAAAAA".length;

          splitElements.testCaretIsOn(secondHalfOfSplitLine, textAfterInsertedText, false, done);
        });
      });

      context("and user adds text to the end of 1st half of split line", function() {
        var theText;

        beforeEach(function(done) {
          var inner$ = helper.padInner$;

          // write something on fist half of last split line
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
          $firstHalfOfSplitLine.sendkeys("{selectall}{rightarrow}");
          $firstHalfOfSplitLine.sendkeys(theText);

          done();
        });

        context("and text inserted is short", function() {
          var textBeforePageBreak;

          before(function() {
            theText = "0. ";
            textBeforePageBreak = sentences[0] + theText;
          });

          beforeEach(function(done) {
            this.timeout(6000);

            var inner$ = helper.padInner$;

            helper.waitFor(function() {
              var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
              return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
            }, 3000).done(function() {
              // there's no way to check if pagination was done or not. We need to force a timeout here
              setTimeout(done, 1000);
            });
          });

          it("keeps caret at the end of inserted text", function(done) {
            var firstHalfOfSplitLine = function() { return helper.padInner$("div:has(splitPageBreak)").last() };
            var textAfterInsertedText = textBeforePageBreak.length;

            splitElements.testCaretIsOn(firstHalfOfSplitLine, textAfterInsertedText, false, done);
          });
        });

        context("and text inserted is long", function() {
          before(function() {
            theText = "something";
          });

          beforeEach(function(done) {
            this.timeout(6000);

            var inner$ = helper.padInner$;

            var textBeforePageBreak = sentences[0];

            // wait for pagination to finish
            helper.waitFor(function() {
              var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
              return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
            }, 3000).done(done);
          });

          it("keeps caret at the end of inserted text", function(done) {
            var secondHalfOfSplitLine = function() { return helper.padInner$("div:has(splitPageBreak)").last().next() };
            var textAfterInsertedText = theText.length;

            splitElements.testCaretIsOn(secondHalfOfSplitLine, textAfterInsertedText, false, done);
          });
        });
      });

      context("and user adds text to the end of 2nd half of split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on fist half of last split line
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").last().next();
          $secondHalfOfSplitLine.sendkeys("{selectall}{rightarrow}");
          $secondHalfOfSplitLine.sendkeys("something{enter}else");

          // wait for changes to be processed and pagination to finish
          helper.waitFor(function() {
            var $lineAfterPageBreak = inner$("div:has(splitPageBreak)").last().next().next();
            return $lineAfterPageBreak.text() === "else";
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var lineAfterPageBreak = function() { return helper.padInner$("div:has(splitPageBreak)").last().next().next() };
          var textAfterInsertedText = lineAfterPageBreak().text().length;

          splitElements.testCaretIsOn(lineAfterPageBreak, textAfterInsertedText, true, done);
        });
      });

      context("and user adds text to the beginning of 2nd half of split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on second half of last split line
          // ("1. " will be moved to 1st half; "AAAAAAAAA" to the 2nd)
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").last().next();
          // sendkeys fails if we apply it to <div>. Need to apply to the inner span
          $secondHalfOfSplitLine = $secondHalfOfSplitLine.find("span");
          $secondHalfOfSplitLine.sendkeys("{selectall}{leftarrow}");
          $secondHalfOfSplitLine.sendkeys("1. AAAAAAAAA");

          var textBeforePageBreak = sentences[0] + "1. ";
          // wait for pagination to finish
          helper.waitFor(function() {
            var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
            return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var secondHalfOfSplitLine = function() { return helper.padInner$("div:has(splitPageBreak)").last().next() };
          var textAfterInsertedText = "AAAAAAAAA".length;

          splitElements.testCaretIsOn(secondHalfOfSplitLine, textAfterInsertedText, false, done);
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
        var line1 = utils.buildStringWithLength(59, "1") + ". ";
        var line2 = utils.buildStringWithLength(59, "2") + ". ";
        var line3 = utils.buildStringWithLength(59, "3") + ". ";
        var line4 = utils.buildStringWithLength(59, "4") + ". ";
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
        var line1 = utils.buildStringWithLength(75, "1") + ". ";
        var line2 = utils.buildStringWithLength(75, "2") + ". ";
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
              return utils.cleanText($lastLine.text()) === newLastLine;
            }, 2000).done(done);
          });
        });
      });

      context("but next page will have less then the minimum lines (2) of an action", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(59, "1") + ". ";
          var line2 = utils.buildStringWithLength(59, "2") + ". ";
          var line3 = utils.buildStringWithLength(59, "3") + ". ";
          sentences = [line1, line2, line3];
          lastLineText = line1 + line2 + line3;
        });

        it("moves the entire action for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });

      context("but previous page will have less then the minimum lines (2) of an action", function() {
        before(function() {
          var line1 = utils.buildStringWithLength(59, "1") + ". ";
          var line2 = utils.buildStringWithLength(59, "2");
          var line3 = utils.buildStringWithLength(59, "3");
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
        var line1 = utils.buildStringWithLength(59, "1") + ". ";
        var line2 = utils.buildStringWithLength(59, "2") + ". ";
        var line3 = utils.buildStringWithLength(59, "3") + ". ";
        var line4 = utils.buildStringWithLength(59, "4") + ". ";
        var line5 = utils.buildStringWithLength(59, "5") + ". ";
        var line6 = utils.buildStringWithLength(59, "6") + ". ";
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

    context("and there are no whitespaces nor punctuation marks on lines that fits on previous page", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
        var line1 = utils.buildStringWithLength(61, "1");
        var line2 = utils.buildStringWithLength(61, "2");
        var line3 = utils.buildStringWithLength(61, "3");
        var line4 = utils.buildStringWithLength(61, "4");
        sentences = [line1, line2, line3];
        lastLineText = sentences.join("");
        buildTargetElement = function() {
          return utils.action(lastLineText);
        };
      });

      it("moves the entire action for next page", function(done) {
        var wholeElement = lastLineText;
        utils.testNonSplitPageBreakIsOn(wholeElement, done);
      });
    });

    context("and pad has multiple split lines", function() {
      // (generals to fill the page) +
      // (1st half of split action (2 lines of text + 1 of top margin))
      var LINES_ON_PAGE_1 = (GENERALS_PER_PAGE - 4) + (1);
      // (2nd half of split action of page 1 (2 lines of text + no top margin)) +
      // (generals to fill the page) +
      // (1st half of split action (2 lines of text + 1 of top margin))
      var LINES_ON_PAGE_2 = (1) + (GENERALS_PER_PAGE - 6) + (1);
      // (2nd half of split action of page 2 (2 lines of text + no top margin)) +
      // (generals to fill the page) +
      // (1st half of split action (2 lines of text + 1 of top margin))
      var LINES_ON_PAGE_3 = (1) + (GENERALS_PER_PAGE - 6) + (1);

      var LAST_LINE_OF_PAGE_1 = LINES_ON_PAGE_1 - 1; // line numbers start at 0
      var LAST_LINE_OF_PAGE_2 = LAST_LINE_OF_PAGE_1 + LINES_ON_PAGE_2;

      before(function() {
        linesBeforeTargetElement = LAST_LINE_OF_PAGE_2 + LINES_ON_PAGE_3;
        var line1 = utils.buildStringWithLength(57, "1") + ". ";
        var line2 = utils.buildStringWithLength(57, "2") + ". ";
        var line3 = utils.buildStringWithLength(57, "3") + ". ";
        var line4 = utils.buildStringWithLength(57, "4") + ". ";
        sentences = [line1, line2, line3, line4];
        lastLineText = "the end of the pad";
        buildTargetElement = function() {
          return utils.action(line1 + line2 + line3 + line4) + utils.general(lastLineText);
        };
      });

      beforeEach(function(done) {
        this.timeout(6000);

        var inner$ = helper.padInner$;

        var line1 = utils.buildStringWithLength(59, "W") + ". ";
        var line2 = utils.buildStringWithLength(59, "X") + ". ";
        var line3 = utils.buildStringWithLength(59, "Y") + ". ";
        var line4 = utils.buildStringWithLength(59, "Z") + ". ";
        var veryLongLine = line1 + line2 + line3 + line4;

        // create some other actions with split page breaks before the existing one
        var $lastLineOfFirstPage = utils.getLine(LAST_LINE_OF_PAGE_1);
        $lastLineOfFirstPage.sendkeys("{selectall}");
        $lastLineOfFirstPage.sendkeys(veryLongLine);

        var $lastLineOfSecondPage = utils.getLine(LAST_LINE_OF_PAGE_2);
        $lastLineOfSecondPage.sendkeys("{selectall}");
        $lastLineOfSecondPage.sendkeys(veryLongLine);

        // change both lines to action
        utils.changeToElement(utils.ACTION, function() {
          var $lastLineOfFirstPage = utils.getLine(LAST_LINE_OF_PAGE_1);
          $lastLineOfFirstPage.sendkeys("{selectall}");
          utils.changeToElement(utils.ACTION, function() {
            // there should be 3 page breaks now
            helper.waitFor(function() {
              var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
              return $splitElementsWithPageBreaks.length === 3;
            }, 2000).done(done);
          }, LAST_LINE_OF_PAGE_1);
        }, LAST_LINE_OF_PAGE_2);
      });

      context("and user adds text before any split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on fist line
          var $firstLine = inner$("div").first();
          $firstLine.sendkeys("{selectall}");
          $firstLine.sendkeys("AAAAAAAAA");

          done();
        });

        it("keeps caret at the end of inserted text", function(done) {
          var firstLine = function() { return helper.padInner$("div").first() };
          var textAfterInsertedText = "AAAAAAAAA".length;

          splitElements.testCaretIsOn(firstLine, textAfterInsertedText, false, done);
        });
      });

      context("and user adds text after all split lines", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on last line
          var $lastLine = inner$("div").last();
          $lastLine.sendkeys("{selectall}{leftarrow}");
          $lastLine.sendkeys("AAAAAAAAA{enter}BBBBBBBBBBBB");

          // wait for changes to be processed and pagination to finish
          helper.waitFor(function() {
            var $lastLine = inner$("div").last();
            return $lastLine.text() === "BBBBBBBBBBBB" + lastLineText;
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var lastLine = function() { return helper.padInner$("div").last() };
          var textAfterInsertedText = "BBBBBBBBBBBB".length;

          splitElements.testCaretIsOn(lastLine, textAfterInsertedText, true, done);
        });
      });

      context("and user adds text before the end of 1st half of split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on fist half of last split line
          // ("2." will be added to 1st half; "AAAAAAAAA " to the 2nd)
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
          $firstHalfOfSplitLine.sendkeys("{selectall}{rightarrow}{leftarrow}{leftarrow}");
          $firstHalfOfSplitLine.sendkeys("2. AAAAAAAAA");

          var textBeforePageBreak = sentences[0] + "2" + sentences[1];

          // wait for pagination to finish
          helper.waitFor(function() {
            var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
            return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var secondHalfOfSplitLine = function() { return helper.padInner$("div:has(splitPageBreak)").last().next() };
          var textAfterInsertedText = "AAAAAAAAA".length;

          splitElements.testCaretIsOn(secondHalfOfSplitLine, textAfterInsertedText, false, done);
        });
      });

      context("and user adds text to the end of 1st half of split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on fist half of last split line
          var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
          $firstHalfOfSplitLine.sendkeys("{selectall}{rightarrow}");
          $firstHalfOfSplitLine.sendkeys("something");

          var textBeforePageBreak = sentences[0] + sentences[1];

          // wait for pagination to finish
          helper.waitFor(function() {
            var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
            return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var secondHalfOfSplitLine = function() { return helper.padInner$("div:has(splitPageBreak)").last().next() };
          var textAfterInsertedText = "something".length;

          splitElements.testCaretIsOn(secondHalfOfSplitLine, textAfterInsertedText, false, done);
        });
      });

      context("and user adds text to the end of 2nd half of split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on fist half of last split line
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").last().next();
          $secondHalfOfSplitLine.sendkeys("{selectall}{rightarrow}");
          $secondHalfOfSplitLine.sendkeys("something{enter}else");

          // wait for changes to be processed and pagination to finish
          helper.waitFor(function() {
            var $lineAfterPageBreak = inner$("div:has(splitPageBreak)").last().next().next();
            return $lineAfterPageBreak.text() === "else";
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var lineAfterPageBreak = function() { return helper.padInner$("div:has(splitPageBreak)").last().next().next() };
          var textAfterInsertedText = lineAfterPageBreak().text().length;

          splitElements.testCaretIsOn(lineAfterPageBreak, textAfterInsertedText, true, done);
        });
      });

      context("and user adds text to the beginning of 2nd half of split line", function() {
        beforeEach(function(done) {
          this.timeout(6000);

          var inner$ = helper.padInner$;

          // write something on second half of last split line
          // ("2." will be moved to 1st half; "AAAAAAAAA" to the 2nd)
          var $secondHalfOfSplitLine = inner$("div:has(splitPageBreak)").last().next();
          // sendkeys fails if we apply it to <div>. Need to apply to the inner span
          $secondHalfOfSplitLine = $secondHalfOfSplitLine.find("span");
          $secondHalfOfSplitLine.sendkeys("{selectall}{leftarrow}");
          $secondHalfOfSplitLine.sendkeys("2. AAAAAAAAA");

          var textBeforePageBreak = sentences[0] + sentences[1] + "2. ";
          // wait for pagination to finish
          helper.waitFor(function() {
            var $firstHalfOfSplitLine = inner$("div:has(splitPageBreak)").last();
            return utils.cleanText($firstHalfOfSplitLine.text()) === textBeforePageBreak;
          }, 3000).done(done);
        });

        it("keeps caret at the end of inserted text", function(done) {
          var secondHalfOfSplitLine = function() { return helper.padInner$("div:has(splitPageBreak)").last().next() };
          var textAfterInsertedText = "AAAAAAAAA".length;

          splitElements.testCaretIsOn(secondHalfOfSplitLine, textAfterInsertedText, true, done);
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
        var line1 = utils.buildStringWithLength(14, "1") + ". ";
        // build sentence that is ~1.25 line long (when split it needs 2 lines)
        var line2 = utils.buildStringWithLength(19, "2") + ". ";
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
          var line1 = utils.buildStringWithLength(14, "1") + ". ";
          var line2 = utils.buildStringWithLength(14, "2") + ". ";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("moves the entire transition for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });
    });

    context("and there is room on previous page for more than the minimum line (more than 1)", function() {
      before(function() {
        // give enough space for first 3 lines of transition to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
        var line1 = utils.buildStringWithLength(14, "1") + ". ";
        var line2 = utils.buildStringWithLength(14, "2") + ". ";
        var line3 = utils.buildStringWithLength(14, "3") + ". ";
        var line4 = utils.buildStringWithLength(14, "4") + ". ";
        var line5 = utils.buildStringWithLength(14, "5") + ". ";
        var line6 = utils.buildStringWithLength(14, "6") + ". ";
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

    context("and transition is longer than a full page", function() {
      var sentences, transitionText;

      before(function() {
        linesBeforeTargetElement = 0;
        buildTargetElement = function() {
          return utils.transition(transitionText);
        };

        // build a string GENERALS_PER_PAGE+2 lines long, so page split will be:
        // page 1: GENERALS_PER_PAGE lines;
        // page 2: 2 lines;
        var numberOfInnerLines = GENERALS_PER_PAGE+2;
        var charsPerLine = 16;
        sentences = splitElements.buildLongLine(numberOfInnerLines, charsPerLine);
        lastLineText = sentences.join("");
        transitionText = lastLineText;
      });

      it("splits transition between the two pages, and second page has the last two lines of the transition", function(done) {
        var firstLineOnPage2 = sentences[GENERALS_PER_PAGE];
        utils.testSplitPageBreakIsOn(firstLineOnPage2, done);
      });

      context("and transition has " + (GENERALS_PER_PAGE+1) + " inner lines", function() {
        before(function() {
          // build a string GENERALS_PER_PAGE+1 lines long, so page split will be:
          // page 1: GENERALS_PER_PAGE-1 lines;
          // page 2: 2 lines;
          var numberOfInnerLines = GENERALS_PER_PAGE+1;
          var charsPerLine = 16;
          sentences = splitElements.buildLongLine(numberOfInnerLines, charsPerLine);
          lastLineText = sentences.join("");
          transitionText = lastLineText;
        });

        it("splits transition between the two pages, and second page has the last two lines of the transition", function(done) {
          this.timeout(4000);

          var firstLineOnPage2 = sentences[GENERALS_PER_PAGE-1];
          utils.testSplitPageBreakIsOn(firstLineOnPage2, done);
        });
      });

      context("and there is a general before the transition", function() {
        before(function() {
          linesBeforeTargetElement = 1;

          // pagination will split last line, so we need to get only the part that will be on 2nd half
          var sentencesOnLastPage = sentences.slice(GENERALS_PER_PAGE-1);
          lastLineText = sentencesOnLastPage.join("");
        });

        it("moves the transition to second page and splits the transition between the two pages", function(done) {
          var singleLineOnPage2 = sentences.slice(0, GENERALS_PER_PAGE-1).join("");
          utils.testNonSplitPageBreakIsOn(singleLineOnPage2, function() {
            var firstLineOnPage3 = sentences[GENERALS_PER_PAGE-1];
            var pageNumber = 3;
            utils.testSplitPageBreakIsOn(firstLineOnPage3, done, pageNumber);
          });
        });
      });

      context("and there are generals after the transition", function() {
        before(function() {
          linesBeforeTargetElement = 0;

          // build a page with GENERALS_PER_PAGE-2 generals, so page split will be:
          // page 1: 1st half of transition, with GENERALS_PER_PAGE-1 lines;
          // page 2: 2nd half of transition, with 2 lines + GENERALS_PER_PAGE-2 generals
          // page 3: 1 general
          var pageFilledWithGenerals = utils.general("general on 2nd page").repeat(GENERALS_PER_PAGE-2);
          lastLineText = "general on 3rd page";

          buildTargetElement = function() {
            return utils.transition(transitionText) + pageFilledWithGenerals + utils.general(lastLineText);
          };
        });

        // revert changed buildTargetElement
        after(function() {
          buildTargetElement = function() {
            return utils.transition(transitionText);
          };
        });

        it("considers the height of the resulting second half of the transition split", function(done) {
          var firstLineOnPage3 = lastLineText;
          var pageNumber = 3;
          utils.testNonSplitPageBreakIsOn(firstLineOnPage3, done, 3);
        });
      });

      // FIXME this is an extreme corner case, so we won't work on it for now
      context("and inner lines do not have full length", function() {
        before(function() {
          linesBeforeTargetElement = 0;

          var numberOfInnerLines = GENERALS_PER_PAGE+1;
          // fill 9 out of 16 columns of each inner line
          var charsPerLine = 9;
          sentences = splitElements.buildLongLine(numberOfInnerLines, charsPerLine);
          lastLineText = sentences.join("");
        });

        xit("splits transition between the two pages, and second page has the last two lines of the transition", function(done) {
          var firstLineOnPage2 = sentences[GENERALS_PER_PAGE-1];
          utils.testSplitPageBreakIsOn(firstLineOnPage2, done);
        });
      });
    });

    context("and there are whitespaces but no punctuation mark on line that fits on previous page", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
        var line1 = utils.buildStringWithLength(10, "1") + " 1 ";
        var line2 = utils.buildStringWithLength(16, "2");
        var line3 = utils.buildStringWithLength(16, "3");
        sentences = [line1, line2, line3];
        lastLineText = sentences.join("");
        buildTargetElement = function() {
          return utils.transition(lastLineText);
        };
      });

      it("splits line by whitespace", function(done) {
        var secondAndThirdLines = sentences[1] + sentences[2];
        utils.testSplitPageBreakIsOn(secondAndThirdLines, done);
      });
    });

    context("and there are no whitespaces nor punctuation marks on line that fits on previous page", function() {
      before(function() {
        linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
        var line1 = utils.buildStringWithLength(16, "1");
        var line2 = utils.buildStringWithLength(16, "2");
        var line3 = "3";
        sentences = [line1, line2, line3];
        lastLineText = sentences.join("");
      });

      it("forces transition to be split at the end of first line", function(done) {
        var secondAndThirdLines = sentences[1] + sentences[2];
        utils.testSplitPageBreakIsOn(secondAndThirdLines, done);
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
        var line1 = utils.buildStringWithLength(33, "1") + ". ";
        // build sentence that is ~1.25 line long (when split it needs 2 lines)
        var line2 = utils.buildStringWithLength(44, "2") + ". ";
        sentences = [line1, line2];
        lastLineText = line1 + line2;
      });

      it("splits dialogue between the two pages, and first page has one line of the dialogue", function(done) {
        // as line is split into two blocks, the page break will be placed on the
        // first 35 chars of original second sentence
        var newThirdLine = sentences[1];
        utils.testSplitPageBreakIsOn(newThirdLine, done);
      });

      context("but there is a character before dialogue", function() {
        var characterName = "joe's (V.O.)";

        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
          var character = utils.character(characterName);
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

        it("moves the entire dialogue and character for next page", function(done) {
          utils.testNonSplitPageBreakIsOn(characterName, done);
        });
      });

      context("but next page will have less then the minimum lines (2) of an dialogue", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
          var line1 = utils.buildStringWithLength(33, "1") + ". ";
          var line2 = utils.buildStringWithLength(33, "2") + ". ";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("moves the entire dialogue for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });
    });

    context("and there is room on previous page for more than the minimum line (more than 1)", function() {
      before(function() {
        // give enough space for first 3 lines of dialogue to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
        var line1 = utils.buildStringWithLength(33, "1") + ". ";
        var line2 = utils.buildStringWithLength(33, "2") + ". ";
        var line3 = utils.buildStringWithLength(33, "3") + ". ";
        var line4 = utils.buildStringWithLength(33, "4") + ". ";
        var line5 = utils.buildStringWithLength(33, "5") + ". ";
        var line6 = utils.buildStringWithLength(33, "6") + ". ";
        sentences = [line1, line2, line3, line4, line5, line6];
        lastLineText = line1 + line2 + line3 + line4 + line5 + line6;
      });

      it("splits dialogue between the two pages, and first page has as much lines as it can fit", function(done) {
        var beforeLastLine = sentences[3];
        utils.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of a dialogue", function() {
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

      context("and there is no character before dialogue", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 2;
          var line1 = utils.buildStringWithLength(45, "1") + ". ";
          var line2 = utils.buildStringWithLength(45, "2") + ". ";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("adds the MORE/CONT'D tags with an empty character name", function(done) {
          this.timeout(4000);

          var characterName = "";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });

        context("and 2nd split starts with a short sentence", function() {
          before(function() {
            var line1 = utils.buildStringWithLength(33, "1") + ". ";
            var line2 = utils.buildStringWithLength(33, "2") + ". ";
            var line3 = "3 " + utils.buildStringWithLength(30, "3") + ". "; // "3 " is the short sentence
            var line4 = utils.buildStringWithLength(32, "4") + ". ";
            sentences = [line1, line2, line3, line4];
            lastLineText = line1 + line2 + line3 + line4;
          });

          // this test is for the CSS of page break and MORE/CONT'D
          it("still places the 2nd half of split on the line below CONT'D", function(done) {
            this.timeout(4000);

            var inner$ = helper.padInner$;

            // wait for pagination to be finished
            helper.waitFor(function() {
              var $splitPageBreaks = inner$("div splitPageBreak");
              return $splitPageBreaks.length > 0;
            }, 2000).done(function() {
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

      context("and there is a very long character before dialogue", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
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
          this.timeout(4000);
          var inner$ = helper.padInner$;

          // wait for pagination to be finished
          helper.waitFor(function() {
            var $splitPageBreaks = inner$("div splitPageBreak");
            return $splitPageBreaks.length > 0;
          }).done(function() {
            // verify CONT'D is one line high
            // (if it is not, line number and line position on editor will be different)
            var firstLineOfSecondPage = GENERALS_PER_PAGE-1;
            utils.testLineNumberIsOnTheSamePositionOfItsLineText(firstLineOfSecondPage, done);
          });
        });
      });

      context("and there is a character before dialogue", function() {
        var characterName = "joe's (V.O.)";

        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
          var character = utils.character(characterName);
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

        it("splits dialogue between the two pages", function(done) {
          var thirdLine = sentences[2];
          utils.testSplitPageBreakIsOn(thirdLine, done);
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          utils.testPageBreakHasMoreAndContd(characterName.toUpperCase(), done);
        });

        context("but previous page will have less then the minimum lines (2) of an dialogue preceded by a character", function() {
          before(function() {
            // give enough space for character + two lines of dialogue to fit on first page
            linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
            var line1 = utils.buildStringWithLength(33, "1") + ". ";
            var line2 = utils.buildStringWithLength(33, "2") + ". ";
            var line3 = utils.buildStringWithLength(33, "3") + ". ";
            sentences = [line1, line2, line3];
            lastLineText = line1 + line2 + line3;
            var character = utils.character(characterName);
            var dialogue = utils.dialogue(lastLineText);
            buildTargetElement = function() {
              return character + dialogue;
            };
          });

          it("moves the entire dialogue and character for next page", function(done) {
            utils.testNonSplitPageBreakIsOn(characterName, done);
          });
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
        var line1 = utils.buildStringWithLength(23, "1") + ". ";
        // build sentence that is ~1.25 line long (when split it needs 2 lines)
        var line2 = utils.buildStringWithLength(30, "2") + ". ";
        sentences = [line1, line2];
        lastLineText = line1 + line2;
      });

      it("splits parenthetical between the two pages, and first page has one line of the parenthetical", function(done) {
        // as line is split into two blocks, the page break will be placed on the
        // first 25 chars of original second sentence
        var newThirdLine = sentences[1];
        utils.testSplitPageBreakIsOn(newThirdLine, done);
      });

      context("but there is a character before parenthetical", function() {
        var characterName = "joe's (V.O.)";

        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
          var character = utils.character(characterName);
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

        it("moves the entire parenthetical and character for next page", function(done) {
          utils.testNonSplitPageBreakIsOn(characterName, done);
        });
      });

      context("but next page will have less then the minimum lines (2) of a parenthetical", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 1;
          var line1 = utils.buildStringWithLength(23, "1") + ". ";
          var line2 = utils.buildStringWithLength(23, "2") + ". ";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("moves the entire parenthetical for next page", function(done) {
          var wholeElement = lastLineText;
          utils.testNonSplitPageBreakIsOn(wholeElement, done);
        });
      });
    });

    context("and there is room on previous page for more than the minimum line (more than 1)", function() {
      before(function() {
        // give enough space for first 3 lines of parenthetical to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
        var line1 = utils.buildStringWithLength(23, "1") + ". ";
        var line2 = utils.buildStringWithLength(23, "2") + ". ";
        var line3 = utils.buildStringWithLength(23, "3") + ". ";
        var line4 = utils.buildStringWithLength(23, "4") + ". ";
        var line5 = utils.buildStringWithLength(23, "5") + ". ";
        var line6 = utils.buildStringWithLength(23, "6") + ". ";
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

      context("and there is no character before parenthetical", function() {
        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
          var line1 = utils.buildStringWithLength(30, "1") + ". ";
          var line2 = utils.buildStringWithLength(30, "2") + ". ";
          sentences = [line1, line2];
          lastLineText = line1 + line2;
        });

        it("adds the MORE/CONT'D tags with an empty character name", function(done) {
          var characterName = "";
          utils.testPageBreakHasMoreAndContd(characterName, done);
        });
      });

      context("and there is a character before parenthetical", function() {
        var characterName = "joe's (V.O.)";

        before(function() {
          linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
          var line1 = utils.buildStringWithLength(23, "1") + ". ";
          var line2 = utils.buildStringWithLength(23, "2") + ". ";
          var line3 = utils.buildStringWithLength(23, "3") + ". ";
          var line4 = utils.buildStringWithLength(23, "4") + ". ";
          var line5 = utils.buildStringWithLength(23, "5") + ". ";
          var line6 = utils.buildStringWithLength(23, "6") + ". ";
          sentences = [line1, line2, line3, line4, line5, line6];
          lastLineText = line1 + line2 + line3 + line4 + line5 + line6;
          var character = utils.character(characterName);
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

        it("splits parenthetical between the two pages", function(done) {
          var thirdLine = sentences[2];
          utils.testSplitPageBreakIsOn(thirdLine, done);
        });

        it("adds the MORE/CONT'D tags with character name upper cased", function(done) {
          utils.testPageBreakHasMoreAndContd(characterName.toUpperCase(), done);
        });

        context("but previous page will have less then the minimum lines (2) of an parenthetical preceded by a character", function() {
          before(function() {
            // give enough space for character + two lines of parenthetical to fit on first page
            linesBeforeTargetElement = GENERALS_PER_PAGE - 4;
            var line1 = utils.buildStringWithLength(23, "1") + ". ";
            var line2 = utils.buildStringWithLength(23, "2") + ". ";
            var line3 = utils.buildStringWithLength(23, "3") + ". ";
            sentences = [line1, line2, line3];
            lastLineText = line1 + line2 + line3;
            var character = utils.character(characterName);
            var parenthetical = utils.parenthetical(lastLineText);
            buildTargetElement = function() {
              return character + parenthetical;
            };
          });

          it("moves the entire parenthetical and character for next page", function(done) {
            utils.testNonSplitPageBreakIsOn(characterName, done);
          });
        });
      });
    });
  });

  context("when first line of page is a very long heading", function() {
    before(function() {
      linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
      var line1 = utils.buildStringWithLength(59, "1") + ". ";
      var line2 = utils.buildStringWithLength(59, "2") + ". ";
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
      var line1 = utils.buildStringWithLength(59, "1") + ". ";
      var line2 = utils.buildStringWithLength(59, "2") + ". ";
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
      var line1 = utils.buildStringWithLength(36, "1") + ". ";
      var line2 = utils.buildStringWithLength(36, "2") + ". ";
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
    var utils = ep_script_page_view_test_helper.utils;

    // remove one line to force pagination again
    var $firstLine = inner$("div").first();
    $firstLine.remove();

    // wait for pagination to finish
    helper.waitFor(function() {
      var $splitElementsWithPageBreaks = inner$("div splitPageBreak");
      var textBeforePageBreak = utils.cleanText($splitElementsWithPageBreaks.first().closest("div").text());
      return textBeforePageBreak === expectedTextBeforePageBreak;
    }, 3000).done(done);
  },

  testCaretIsOn: function(expectedLine, expectedColumn, withTimeout, done) {
    var utils = ep_script_page_view_test_helper.utils;

    var theTest = function() {
      var $lineWhereCaretIs = utils.getLineWhereCaretIs();
      var columnWhereCaretIs = utils.getColumnWhereCaretIs();

      expect(columnWhereCaretIs).to.be(expectedColumn);
      expect($lineWhereCaretIs.get(0)).to.be(expectedLine().get(0));

      done();
    };

    // some tests need to to wait some time so caret finishes moving
    if (withTimeout) {
      setTimeout(theTest, 1000);
    } else {
      theTest();
    }
  },

  buildLongLine: function(numberOfInnerLines, charsPerLine) {
    var utils = ep_script_page_view_test_helper.utils;

    var innerLines = new Array(numberOfInnerLines);
    for (var i = 0; i < numberOfInnerLines; i++) {
      // formatted number is 4 chars long, and there is a whitespace at the end of line
      var extraChars = charsPerLine - 5;
      // inner line is "0001XX(...)XX "
      innerLines[i] = utils.formatNumber(i+1) + utils.buildStringWithLength(extraChars, "X") + " ";
    };
    return innerLines;
  },
}