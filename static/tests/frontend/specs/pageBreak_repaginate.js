describe("ep_script_page_view - repaginate", function() {
  var utils;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
  });

  beforeEach(function(done){
    helper.newPad(function() {
      utils.cleanPad(done);
    });
    this.timeout(60000);
  });

  context("when user inserts text on a line", function() {
    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = "general";

      // build script full of generals and with one line on second page
      var script = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE+1);
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("repaginates pad from that line", function(done) {
      this.timeout(4000);

      // insert text on line before page break to make it be 2 inner lines long
      var fullLine = utils.buildStringWithLength(59, "1") + ". ";
      var $lineBeforePageBreak = utils.linesAfterNonSplitPageBreaks().last().prev();
      $lineBeforePageBreak.sendkeys("{selectall}{rightarrow}");
      // first page will have "general. ", second page will have fullLine
      $lineBeforePageBreak.sendkeys('. ' + fullLine);

      // wait for pagination to be re-run
      helper.waitFor(function() {
        // now we have a split page break instead of a non-split one
        var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
        return $linesWithPageBreaks.length > 0;
      }, 2000).done(function() {
        var $firstLineOfSecondPage = utils.linesAfterSplitPageBreaks().first();

        expect(utils.cleanText($firstLineOfSecondPage.text())).to.be(fullLine);

        done();
      });
    });
  });

  context("when user removes text from a line", function() {
    var firstHalfOfSplit, secondHalfOfSplit;

    before(function() {
      firstHalfOfSplit = utils.buildStringWithLength(24, "1") + ". ";
      secondHalfOfSplit = utils.buildStringWithLength(24, "2") + ". ";
    });

    beforeEach(function(done) {
      this.timeout(4000);

      var textToBeRemoved = "<b>remove me.</b>";
      var lastLineText = "last general";

      // build script full of generals + a very long general (split between pages) + another general
      var pageFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE-1);
      var splitGeneral       = utils.general(firstHalfOfSplit + textToBeRemoved + secondHalfOfSplit);
      var lastGeneral        = utils.general(lastLineText);
      var script             = pageFullOfGenerals + splitGeneral + lastGeneral;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("repaginates pad from that line", function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // remove text from split line to make it be 1 inner line long
      var $textToBeRemoved = inner$("div b");
      $textToBeRemoved.sendkeys("{selectall}{backspace}");

      // wait for pagination to be re-run
      helper.waitFor(function() {
        // now we have a non-split page break instead of a split one
        var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
        return $linesWithPageBreaks.length > 0;
      }, 2000).done(function() {
        var $lineBeforePageBreak = utils.linesAfterNonSplitPageBreaks().first().prev();
        var expectedLineBeforePageBreak = firstHalfOfSplit + secondHalfOfSplit;

        expect(utils.cleanText($lineBeforePageBreak.text())).to.be(expectedLineBeforePageBreak);

        done();
      });
    });
  });

  context("when user removes a full line", function() {
    var textToBeOnTopOfSecondPage;
    before(function() {
      textToBeOnTopOfSecondPage = "But I will go to first page when this test is done";
    });

    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = "last general";
      var firstHalfOfSplit = "I'm supposed to be on second page before line is removed... ";
      var secondHalfOfSplit = textToBeOnTopOfSecondPage;

      // build script with a general to be removed + page full of generals +
      // a very long general (to be split between pages) + another general
      var lineToBeRemoved             = utils.general("remove me");
      var pageFullOfGenerals          = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE-1);
      var lineToBeAtBottomOfFirstPage = utils.general(firstHalfOfSplit + secondHalfOfSplit);
      var lastGeneral                 = utils.general(lastLineText);

      var script = lineToBeRemoved + pageFullOfGenerals + lineToBeAtBottomOfFirstPage + lastGeneral;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("repaginates pad from that line", function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // remove first line to make move lines after it one position up
      var $firstLine = inner$("div").first();
      // place caret on line to be removed so Etherpad notices there was a change on DOM
      $firstLine.sendkeys("{selectall}");
      // cannot use sendkeys because it would only remove text inside <div>, we need to remove
      // the <div> itself
      $firstLine.get(0).outerHTML = "";

      // wait for pagination to be re-run
      helper.waitFor(function() {
        // now we have a split page break instead of a non-split one
        var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
        return $linesWithPageBreaks.length > 0;
      }, 2000).done(function() {
        var $firstLineOfSecondPage = utils.linesAfterSplitPageBreaks().first();

        expect($firstLineOfSecondPage.text()).to.be(textToBeOnTopOfSecondPage);

        done();
      });
    });
  });

  context("when user changes the type of a line", function() {
    var buildLineToBeChanged, numberOfGeneralsBeforeHeading;

    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = "last general";

      // build script full of generals + a heading + a character + the line to be changed + another general
      var act                = utils.act('first act', 'summary of act');
      var seq                = utils.sequence('first sequence', 'summary of sequence');
      var firstHeading       = utils.heading('first heading');
      // to make tests easier, replace the first general by a heading with act+seq, so the next
      // heading doesn't need to have any scene mark without any scene mark
      var pageFullOfGenerals = utils.buildScriptWithGenerals("general", numberOfGeneralsBeforeHeading - 1);
      var heading            = utils.heading("heading");
      var character          = utils.character("character");
      var lineToBeChanged    = buildLineToBeChanged("I'll be changed");
      var lastGeneral        = utils.general(lastLineText);

      var script = act + seq + firstHeading
                 + pageFullOfGenerals
                 + heading
                 + character
                 + lineToBeChanged
                 + lastGeneral;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    context("and new line type builds a block of lines", function() {
      before(function() {
        numberOfGeneralsBeforeHeading = GENERALS_PER_PAGE-5;
        buildLineToBeChanged = function(text) {
          return utils.general(text);
        };
      });

      it("repaginates pad from 3 lines above changed line", function(done) {
        this.timeout(4000);

        var inner$ = helper.padInner$;

        // change line on top of second page to build a block (heading => character => dialogue) and
        // push last two lines from first page to second page
        var $firstLineOfSecondPage = inner$("div").prev().last();
        $firstLineOfSecondPage.sendkeys("{selectall}");
        utils.changeToElement(utils.DIALOGUE, function() {
          // wait for pagination to be re-run
          helper.waitFor(function() {
            // now we have a heading on top of second page
            var $firstLineOfSecondPage = utils.linesAfterNonSplitPageBreaks();
            return $firstLineOfSecondPage.first().text() === "heading";
          }, 2000).done(done);
        }, GENERALS_PER_PAGE+1);
      });
    });

    context("and new line type destroys a block of lines", function() {
      var textOfChangedLine;

      before(function() {
        numberOfGeneralsBeforeHeading = GENERALS_PER_PAGE-5;
        buildLineToBeChanged = function(text) {
          textOfChangedLine = text;
          return utils.dialogue(text);
        };
      });

      it("repaginates pad from 3 lines above changed line", function(done) {
        this.timeout(4000);

        var inner$ = helper.padInner$;

        // change line on bottom of block (heading => character => dialogue) to destroy the block and
        // pull first two lines from second page to first page
        var $lastLineOfBlock = inner$("div").prev().last();
        $lastLineOfBlock.sendkeys("{selectall}");
        utils.changeToElement(utils.GENERAL, function() {
          // wait for pagination to be re-run
          helper.waitFor(function() {
            // now we have the changed line on top of second page
            var $firstLineOfSecondPage = utils.linesAfterNonSplitPageBreaks().first();
            return $firstLineOfSecondPage.text() === textOfChangedLine;
          }, 2000).done(done);
        }, GENERALS_PER_PAGE+1);
      });
    });

    context("and changed line is not one of the first 3 lines of a page", function() {
      var originalIdOfFirstLineWithPageBreak, originalIdOfLastLineWithPageBreak;

      before(function() {
        numberOfGeneralsBeforeHeading = GENERALS_PER_PAGE+1;
        buildLineToBeChanged = function(text) {
          return utils.dialogue(text);
        };
      });

      beforeEach(function(done) {
        this.timeout(4000);

        var inner$ = helper.padInner$;

        var lastLineText = "last general";
        var changedLine = GENERALS_PER_PAGE+7;

        // we need another page break for this scenario, so add another page full of generals
        var pageFullOfGenerals = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE);
        var lastGeneral        = utils.general(lastLineText);

        var anotherPage = pageFullOfGenerals + lastGeneral;
        var $lastLine = inner$("div").last();
        $lastLine.html(anotherPage);

        // wait for pagination to finish
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length > 1;
        }, 3000).done(function() {
          // store ids of lines with page break to verify later if they had changed
          var $linesWithPageBreaks           = inner$("div:has(nonsplitpagebreak)");
          originalIdOfFirstLineWithPageBreak = $linesWithPageBreaks.first().attr("id");
          originalIdOfLastLineWithPageBreak  = $linesWithPageBreaks.last().attr("id");

          // change line on bottom of block (heading => character => dialogue) to destroy the block
          var $lastLineOfBlock = inner$("div:has(dialogue)").first();
          $lastLineOfBlock.sendkeys("{selectall}");
          utils.changeToElement(utils.GENERAL, function() {
            // wait for pagination to be re-run before start testing
            helper.waitFor(function() {
              // id of line with last page break should be different
              var $linesAfterPageBreaks = utils.linesAfterNonSplitPageBreaks();
              var $lineWithLastPageBreak = $linesAfterPageBreaks.last().prev();
              var newIdOfLastLineWithPageBreak = $lineWithLastPageBreak.attr("id");

              return ($linesAfterPageBreaks.length === 2) && (newIdOfLastLineWithPageBreak !== originalIdOfLastLineWithPageBreak);
            }, 2000).done(done);
          }, changedLine);
        });
      });

      it("does not repaginate pad 3 lines above changed line", function(done) {
        this.timeout(4000);

        // id of line with first page break should be the same
        var $linesAfterPageBreaks = utils.linesAfterNonSplitPageBreaks();
        var $lineWithFirstPageBreak = $linesAfterPageBreaks.first().prev();
        var actualIdOfFirstLineWithPageBreak = $lineWithFirstPageBreak.attr("id");

        expect(actualIdOfFirstLineWithPageBreak).to.be(originalIdOfFirstLineWithPageBreak);

        done();
      });

      it("assigns new page numbers according to the number of the last unchanged page", function(done) {
        this.timeout(4000);

        var $linesAfterPageBreaks = utils.linesAfterNonSplitPageBreaks();
        var $lineAfterSecondPageBreak = $linesAfterPageBreaks.last();

        var actualPageNumber = utils.pageBreakOfLine($lineAfterSecondPageBreak).closest("div").find("pagenumber").attr("data-page-number");
        expect(actualPageNumber.toString()).to.be("3");

        done();
      });
    });
  });

  context("when line after a page break has top margin", function() {
    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = "general";

      // build script with a heading on top of script + 1st page almost full (leave two lines at
      // the end) + one heading on top of 2nd page + another full page + a single line on 3rd page
      var act                = utils.act('first act', 'summary of act');
      var seq                = utils.sequence('first sequence', 'summary of sequence');
      var firstHeading       = utils.heading('first heading');
      // to make tests easier, replace the first general by a heading with act+seq, so the next
      // heading doesn't need to have any scene mark without any scene mark
      var pageAlmostFullOfGenerals = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE-3);
      var heading = utils.heading("heading");
      var pageFullOfGenerals = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE);
      var script = act + seq + firstHeading + pageAlmostFullOfGenerals + heading + pageFullOfGenerals;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length === 2;
        }, 2000).done(done);
      });
    });

    it("recalculates page breaks taking into account the future margin element will have if it isn't after page break", function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // remove line after heading, so there will be one less page break
      var $lineAfterHeading = inner$("div:has(heading)").last().next();
      $lineAfterHeading.sendkeys("{selectall}");
      $lineAfterHeading.get(0).outerHTML = "";

      // wait for repagination to finish
      helper.waitFor(function() {
        var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
        return $linesWithPageBreaks.length === 1;
      }, 2000).done(function() {
        // although there are 2 empty lines on 1st page, the heading itself needs 3 lines
        // (1 for text and 2 for top margin), so it should still be on top of 2nd page
        var $firstLineOfSecondPage = utils.linesAfterNonSplitPageBreaks().first();

        expect($firstLineOfSecondPage.text()).to.be("heading");

        done();
      });
    });
  });

  context("when a non-split line with page break is repaginated and split", function() {
    var lines;

    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = "general";

      // build script full of generals and with last line with 2 inner lines
      var line1 = "AA" + utils.buildStringWithLength(50, "1") + ". ";
      var line2 = "BB" + utils.buildStringWithLength(50, "2") + ". ";
      lines = [line1, line2];

      var fullPage = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE - 2) +
                     utils.general(line1 + line2);
      var lastGeneral = utils.general(lastLineText);

      var script = fullPage + lastGeneral;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        helper.waitFor(function() {
          var $linesWithPageBreaks = utils.linesAfterNonSplitPageBreaks();
          return $linesWithPageBreaks.length > 0;
        }, 2000).done(done);
      });
    });

    it("splits line after last whitespace that fits on previous page", function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // insert text on first line to change page break from non-split to split
      var longText = utils.buildStringWithLength(62, "1");
      var $firstLine = inner$("div").first();
      $firstLine.sendkeys(longText);

      // wait for pagination to be re-run
      helper.waitFor(function() {
        // now we have a split page break instead of a non-split one
        var $linesWithPageBreaks = utils.linesAfterSplitPageBreaks();
        return $linesWithPageBreaks.length > 0;
      }, 2000).done(function() {
        var $firstLineOfSecondPage = utils.linesAfterSplitPageBreaks().first();
        var secondHalfOfSplit = lines[1];

        expect(utils.cleanText($firstLineOfSecondPage.text())).to.be(secondHalfOfSplit);

        done();
      });
    });
  });
});
