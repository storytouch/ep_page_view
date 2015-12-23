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
      var line1 = utils.buildStringWithLength(60, "1") + ".";
      var line2 = utils.buildStringWithLength(60, "2") + ".";
      var line3 = utils.buildStringWithLength(60, "3") + ".";
      var line4 = utils.buildStringWithLength(60, "4") + ".";
      sentences = [line1, line2, line3, line4];
      lastLineText = line1 + line2 + line3 + line4;
      buildTargetElement = function() {
        return utils.general(lastLineText);
      };
    });

    it("removes existing page breaks and recalculates new ones when user changes pad content", function(done) {
      this.timeout(5000);
      var inner$ = helper.padInner$;

      // there should be a page break before we start testing
      var $splitElementsWithPageBreaks = inner$("div elementPageBreak");
      expect($splitElementsWithPageBreaks.length).to.be(1);

      // create another very long general before the last one, so pagination needs to be re-done
      var $threeLinesGeneral = inner$("div").last().prev();
      var line1 = utils.buildStringWithLength(60, "A") + ".";
      var line2 = utils.buildStringWithLength(60, "B") + ".";
      var line3 = utils.buildStringWithLength(60, "C") + ".";
      $threeLinesGeneral.sendkeys("{selectall}");
      $threeLinesGeneral.sendkeys(line1 + line2 + line3);

      // wait for edition to be processed and pagination to be complete
      helper.waitFor(function() {
        var $splitElementsWithPageBreaks = inner$("div elementPageBreak");
        var $firstPageBreak = $splitElementsWithPageBreaks.first().parent();

        // page break was added to third line of first very long general
        return $firstPageBreak.text() === line3;
      }).done(function() {
        // now there should be only a single page break (on the first very long general)
        var $splitElementsWithPageBreaks = inner$("div elementPageBreak");
        expect($splitElementsWithPageBreaks.length).to.be(1);

        done();
      });
    });

    context("and there is room on previous page for minimum number of lines (1)", function() {
      it("splits general between the two pages, and first page has one line of the general", function(done) {
        var secondLine = sentences[1];
        splitElements.testSplitPageBreakIsOn(secondLine, done);
      });

      it("does not add the MORE/CONT'D tags", function(done) {
        splitElements.testSplitPageBreakDoNotHaveMoreNorContd(done);
      });
    });

    context("and there is room on previous page for more than the minimum line (+1)", function() {
      before(function() {
        // give enough space for first 3 lines of general to fit on first page
        linesBeforeTargetElement = GENERALS_PER_PAGE - 3;
      });

      it("splits general between the two pages, and first page has as much lines as it can fit", function(done) {
        var lastLine = sentences[3];
        splitElements.testSplitPageBreakIsOn(lastLine, done);
      });
    });

    context("and there is no room on previous page for any line", function() {
      before(function() {
        // fill the entire page
        linesBeforeTargetElement = GENERALS_PER_PAGE;
      });

      it("moves the entire general for next page", function(done) {
        var wholeElement = lastLineText;
        splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        var $splitElementsWithPageBreaks = inner$("div elementPageBreak");
        expect($splitElementsWithPageBreaks.length).to.be(1);

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
      })
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
        splitElements.testSplitPageBreakIsOn(lastSentence, done);
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
          splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        var inner$ = helper.padInner$;

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
          var $splitElementsWithPageBreaks = inner$("div elementPageBreak");
          return $splitElementsWithPageBreaks.length > 0;
        }).done(function() {
          // 1: verify first page break was added between the two sentences of 57th line
          var topLineOfSentence2 = sentence2.substring(0, 61);
          splitElements.testSplitPageBreakIsOn(topLineOfSentence2, function() {
            // 2: verify second page break was added on top of last line
            splitElements.testNonSplitPageBreakIsOn(lastLineText, done);
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
        splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        // as line is split into two blocks of 1.25 lines each, the page break will be placed on the
        // first 61 chars of original second sentence
        var newThirdLine = sentences[1].substring(0,61);
        splitElements.testSplitPageBreakIsOn(newThirdLine, done);
      });

      it("does not add the MORE/CONT'D tags", function(done) {
        splitElements.testSplitPageBreakDoNotHaveMoreNorContd(done);
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
          splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an action", function() {
        before(function() {
          // give enough space for first 5 lines of action to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 6;
        });

        it("splits action between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
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
        var newThirdLine = sentences[1].substring(0, 15);
        splitElements.testSplitPageBreakIsOn(newThirdLine, done);
      });

      it("does not add the MORE/CONT'D tags", function(done) {
        splitElements.testSplitPageBreakDoNotHaveMoreNorContd(done);
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
          splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an transition", function() {
        before(function() {
          // give enough space for first 5 lines of transition to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 6;
        });

        it("splits transition between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
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
        var newThirdLine = sentences[1].substring(0, 35);
        splitElements.testSplitPageBreakIsOn(newThirdLine, done);
      });

      it("adds the MORE/CONT'D tags", function(done) {
        splitElements.testSplitPageBreakHasMoreAndContd(done);
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
          splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an dialogue", function() {
        before(function() {
          // give enough space for first 5 lines of dialogue to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 5;
        });

        it("splits dialogue between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
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
        var newThirdLine = sentences[1].substring(0, 25);
        splitElements.testSplitPageBreakIsOn(newThirdLine, done);
      });

      it("adds the MORE/CONT'D tags", function(done) {
        splitElements.testSplitPageBreakHasMoreAndContd(done);
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
          splitElements.testNonSplitPageBreakIsOn(wholeElement, done);
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
        splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
      });

      context("but next page will have less then the minimum lines (2) of an parenthetical", function() {
        before(function() {
          // give enough space for first 5 lines of parenthetical to fit on first page (which would leave
          // only one line on next page)
          linesBeforeTargetElement = GENERALS_PER_PAGE - 5;
        });

        it("splits parenthetical between the two pages, and second page keep the minimum lines it needs", function(done) {
          var beforeLastLine = sentences[4];
          splitElements.testSplitPageBreakIsOn(beforeLastLine, done);
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
      splitElements.testNonSplitPageBreakIsOn(fullElementText, done);
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
      splitElements.testNonSplitPageBreakIsOn(fullElementText, done);
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
      splitElements.testNonSplitPageBreakIsOn(fullElementText, done);
    });
  });
});

var ep_script_page_view_test_helper = ep_script_page_view_test_helper || {};
ep_script_page_view_test_helper.splitElements = {
  testSplitPageBreakIsOn: function(textAfterPageBreak, done) {
    var inner$ = helper.padInner$;

    // verify there is one page break
    var $splitElementsWithPageBreaks = inner$("div elementPageBreak");
    expect($splitElementsWithPageBreaks.length).to.be(1);

    // verify page break is on targetElement
    var $firstPageBreak = $splitElementsWithPageBreaks.first().parent();
    expect($firstPageBreak.text()).to.be(textAfterPageBreak);

    done();
  },

  testNonSplitPageBreakIsOn: function(textAfterPageBreak, done) {
    var inner$ = helper.padInner$;

    // verify there is one page break
    var $elementsWithPageBreaksOnTop = inner$("div.pageBreak");
    expect($elementsWithPageBreaksOnTop.length).to.be(1);

    // verify page break is above targetElement
    var $firstPageBreak = $elementsWithPageBreaksOnTop.first();
    expect($firstPageBreak.text()).to.be(textAfterPageBreak);

    done();
  },

  testSplitPageBreakDoNotHaveMoreNorContd: function(done) {
    var inner$ = helper.padInner$;

    // verify there is no MORE tag
    var $moreTags = inner$("div more");
    expect($moreTags.length).to.be(0);

    // verify there is no CONT'D tag
    var $contdTags = inner$("div contd");
    expect($contdTags.length).to.be(0);

    done();
  },

  testSplitPageBreakHasMoreAndContd: function(done) {
    var inner$ = helper.padInner$;

    // verify there is a MORE tag
    var $moreTags = inner$("div more");
    expect($moreTags.length).to.be(1);

    // verify there is a CONT'D tag
    var $contdTags = inner$("div contd");
    expect($contdTags.length).to.be(1);

    done();
  },
}
