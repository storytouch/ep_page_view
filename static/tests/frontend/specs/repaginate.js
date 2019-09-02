describe('ep_script_page_view - repaginate', function() {
  var utils = ep_script_page_view_test_helper.utils;
  var smUtils;

  before(function(done) {
    smUtils = ep_script_scene_marks_test_helper.utils;
    helper.newPad(done);
    this.timeout(60000);
  });

  beforeEach(function(done) {
    utils.cleanPad(done);
  });

  context('when user inserts text on a line', function() {
    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = 'general';

      // build script full of generals and with one line on second page
      var script = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE + 1);
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnyNonSplitPageBreak(done);
      });
    });

    it('repaginates pad from 3 lines above changed line', function(done) {
      this.timeout(4000);

      // insert text on line before page break to make it be 2 inner lines long
      var fullLine = utils.buildStringWithLength(59, '1') + '. ';
      var $lineBeforePageBreak = utils.linesAfterNonSplitPageBreaks().last().prev();
      $lineBeforePageBreak.sendkeys('{selectall}{rightarrow}');
      // first page will have 'general. ', second page will have fullLine
      $lineBeforePageBreak.sendkeys('. ' + fullLine);

      // wait for pagination to be re-run
      utils.waitToHaveAnySplitPageBreak(function() {
        var $firstLineOfSecondPage = utils.linesAfterSplitPageBreaks().first();

        expect(utils.cleanText($firstLineOfSecondPage.text())).to.be(fullLine);

        done();
      });
    });
  });

  // FIXME
  context('when user removes text from a line', function() {
    var firstHalfOfSplit, secondHalfOfSplit;

    before(function() {
      firstHalfOfSplit = utils.buildStringWithLength(24, '1') + '. ';
      secondHalfOfSplit = utils.buildStringWithLength(24, '2') + '. ';
    });

    beforeEach(function(done) {
      this.timeout(4000);

      var textToBeRemoved = '<b>remove me.</b>';
      var lastLineText = 'last general';

      // build script full of generals + a very long general (split between pages) + another general
      var pageFullOfGenerals = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE - 1);
      var splitGeneral       = utils.general(firstHalfOfSplit + textToBeRemoved + secondHalfOfSplit);
      var lastGeneral        = utils.general(lastLineText);
      var script             = pageFullOfGenerals + splitGeneral + lastGeneral;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnySplitPageBreak(done);
      });
    });

    it('repaginates pad from 3 lines above changed line', function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // remove text from split line to make it be 1 inner line long
      var $textToBeRemoved = inner$('div b');
      $textToBeRemoved.sendkeys('{selectall}{backspace}');

      // wait for pagination to be re-run. Now we have a non-split page break
      // instead of a split one
      utils.waitToHaveAnyNonSplitPageBreak(function() {
        var $lineBeforePageBreak = utils.linesAfterNonSplitPageBreaks().first().prev();
        var expectedLineBeforePageBreak = firstHalfOfSplit + secondHalfOfSplit;

        expect(utils.cleanText($lineBeforePageBreak.text())).to.be(expectedLineBeforePageBreak);

        done();
      });
    });
  });

  // FIXME
  context('when user removes a full line', function() {
    var textToBeOnTopOfSecondPage;
    before(function() {
      textToBeOnTopOfSecondPage = 'But I will go to first page when this test is done';
    });

    beforeEach(function(done) {
      this.timeout(4000);

      var lastLineText = 'last general';
      var firstHalfOfSplit = 'I am supposed to be on second page before line is removed... ';
      var secondHalfOfSplit = textToBeOnTopOfSecondPage;

      // build script with a general to be removed + page full of generals +
      // a very long general (to be split between pages) + another general
      var lineToBeRemoved             = utils.general('remove me');
      var pageFullOfGenerals          = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE - 1);
      var lineToBeAtBottomOfFirstPage = utils.general(firstHalfOfSplit + secondHalfOfSplit);
      var lastGeneral                 = utils.general(lastLineText);

      var script = lineToBeRemoved + pageFullOfGenerals + lineToBeAtBottomOfFirstPage + lastGeneral;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnyNonSplitPageBreak(done);
      });
    });

    it('repaginates pad from 3 lines above changed line', function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // remove first line to make move lines after it one position up
      var $firstLine = inner$('div').first();
      // place caret on line to be removed so Etherpad notices there was a change on DOM
      $firstLine.sendkeys('{selectall}');
      // cannot use sendkeys because it would only remove text inside <div>, we need to remove
      // the <div> itself
      $firstLine.get(0).outerHTML = '';

      // wait for pagination to be re-run. Now we have a split page break
      // instead of a non-split one
      utils.waitToHaveAnyNonSplitPageBreak(function() {
        var $firstLineOfSecondPage = utils.linesAfterSplitPageBreaks().first();

        expect($firstLineOfSecondPage.text()).to.be(textToBeOnTopOfSecondPage);

        done();
      });
    });
  });

  context('when user changes the type of a line', function() {
    var buildLineToBeChanged, numberOfGeneralsBeforeHeading;

    beforeEach(function(done) {
      this.timeout(10000);

      var lastLineText = 'last general';

      // build script full of generals + a heading + a character + the line to be changed + another general
      var act                = utils.act('first act', 'summary of act');
      var seq                = utils.sequence('first sequence', 'summary of sequence');
      var firstHeading       = utils.heading('first heading');
      // to make tests easier, replace the first general by a heading with act+seq, so the next
      // heading doesn't need to have any scene mark
      var pageFullOfGenerals = utils.buildScriptWithGenerals('general', numberOfGeneralsBeforeHeading - 1);
      var heading            = utils.heading('heading');
      var character          = utils.character('character');
      var lineToBeChanged    = buildLineToBeChanged('I will be changed');
      var lastGeneral        = utils.general(lastLineText);

      var script = act + seq + firstHeading
                 + pageFullOfGenerals
                 + heading
                 + character
                 + lineToBeChanged
                 + lastGeneral;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnyNonSplitPageBreak(done);
      });
    });

    context('and new line type builds a block of lines', function() {
      before(function() {
        numberOfGeneralsBeforeHeading = GENERALS_PER_PAGE - 5;
        buildLineToBeChanged = function(text) {
          return utils.general(text);
        };
      });

      it('repaginates pad from 3 lines above changed line', function(done) {
        this.timeout(4000);

        // +7: act + seq + synopsis + 1st heading
        // +4: synopsis + heading + character
        // -1: lines are zero-based
        var lineNumberToBeChanged = 7 + numberOfGeneralsBeforeHeading + 4 - 1;

        // change line on top of second page to build a block (heading => character => dialogue) and
        // push last two lines from first page to second page
        smUtils.changeLineToElement(utils.DIALOGUE, lineNumberToBeChanged, function() {
          // wait for pagination to be re-run
          helper.waitFor(function() {
            // now we have a heading on top of second page
            var $firstLineOfSecondPage = utils.linesAfterNonSplitPageBreaks().first();
            var $firstScriptElementOfSecondPage = utils.getFirstScriptElementOfPageStartingAt($firstLineOfSecondPage);
            return $firstScriptElementOfSecondPage.text() === 'heading';
          }, 2000).done(done);
        });
      });
    });

    context('and new line type destroys a block of lines', function() {
      var textOfChangedLine;

      before(function() {
        numberOfGeneralsBeforeHeading = GENERALS_PER_PAGE - 5;
        buildLineToBeChanged = function(text) {
          textOfChangedLine = text;
          return utils.dialogue(text);
        };
      });

      it('repaginates pad from 3 lines above changed line', function(done) {
        this.timeout(4000);

        var lineNumberToBeChanged = 7 + numberOfGeneralsBeforeHeading + 4 - 1;

        // change line on bottom of block (heading => character => dialogue) to destroy the block and
        // pull first two lines from second page to first page
        smUtils.changeLineToElement(utils.GENERAL, lineNumberToBeChanged, function() {
          // wait for pagination to be re-run
          helper.waitFor(function() {
            // now we have the changed line on top of second page
            var $firstLineOfSecondPage = utils.linesAfterNonSplitPageBreaks().first();
            var $firstScriptElementOfSecondPage = utils.getFirstScriptElementOfPageStartingAt($firstLineOfSecondPage);
            return $firstScriptElementOfSecondPage.text() === textOfChangedLine;
          }, 2000).done(done);
        });
      });
    });

    context('and changed line is not one of the first 3 lines of a page', function() {
      var originalIdOfFirstLineWithPageBreak, originalIdOfLastLineWithPageBreak;

      before(function() {
        numberOfGeneralsBeforeHeading = GENERALS_PER_PAGE + 1;
        buildLineToBeChanged = function(text) {
          return utils.dialogue(text);
        };
      });

      beforeEach(function(done) {
        this.timeout(10000);

        var inner$ = helper.padInner$;

        var lastLineText = 'last general';
        var changedLine = GENERALS_PER_PAGE + 11;

        // we need another page break for this scenario, so add another page full of generals
        var pageFullOfGenerals = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE);
        var lastGeneral        = utils.general(lastLineText);

        var anotherPage = pageFullOfGenerals + lastGeneral;
        var $lastLine = inner$('div').last();
        $lastLine.html(anotherPage);

        // wait for pagination to finish
        utils.waitToHaveNNonSplitPageBreaks(2, function() {
          // store ids of lines with page break to verify later if they had changed
          var $linesWithPageBreaks           = inner$('div:has(nonsplitpagebreak)');
          originalIdOfFirstLineWithPageBreak = $linesWithPageBreaks.first().attr('id');
          originalIdOfLastLineWithPageBreak  = $linesWithPageBreaks.last().attr('id');

          // change line on bottom of block (heading => character => dialogue) to destroy the block
          smUtils.changeLineToElement(utils.ACTION, changedLine, function() {
            // wait for pagination to be re-run before start testing
            helper.waitFor(function() {
              // id of line with last page break should be different
              var $linesAfterPageBreaks = utils.linesAfterNonSplitPageBreaks();
              var $lineWithLastPageBreak = $linesAfterPageBreaks.last().prev();
              var newIdOfLastLineWithPageBreak = $lineWithLastPageBreak.attr('id');

              return ($linesAfterPageBreaks.length === 2) && (newIdOfLastLineWithPageBreak !== originalIdOfLastLineWithPageBreak);
            }, 5000).done(done);
          });
        });
      });

      it('does not repaginate pad 3 lines above changed line', function(done) {
        this.timeout(4000);

        // id of line with first page break should be the same
        var $linesAfterPageBreaks = utils.linesAfterNonSplitPageBreaks();
        var $lineWithFirstPageBreak = $linesAfterPageBreaks.first().prev();
        var actualIdOfFirstLineWithPageBreak = $lineWithFirstPageBreak.attr('id');

        expect(actualIdOfFirstLineWithPageBreak).to.be(originalIdOfFirstLineWithPageBreak);

        done();
      });

      it('assigns new page numbers according to the number of the last unchanged page', function(done) {
        this.timeout(4000);

        var $linesAfterPageBreaks = utils.linesAfterNonSplitPageBreaks();
        var $lineAfterSecondPageBreak = $linesAfterPageBreaks.last();

        var actualPageNumber = utils.pageBreakOfLine($lineAfterSecondPageBreak).closest('div').find('pagenumber').attr('data-page-number');
        expect(actualPageNumber.toString()).to.be('3');

        done();
      });
    });
  });

  context('when user starts a char composition', function() {
    var originalIdOfLastLineWithPageBreak;

    var getIdOfLineWithLastPageBreak = function() {
      var $lineWithPageBreak = utils.linesAfterNonSplitPageBreaks().last().prev();
      var currentIdOfLineWithLastPageBreak = $lineWithPageBreak.attr('id');

      return currentIdOfLineWithLastPageBreak;
    }

    var startCharComposition = function() {
      triggerCompositionEvent('compositionstart');
    }
    var endCharComposition = function() {
      triggerCompositionEvent('compositionend');
    }
    var triggerCompositionEvent = function(eventName) {
      helper.padInner$(helper.padInner$.document.documentElement).trigger(eventName);
    }

    beforeEach(function(done) {
      this.timeout(20000);

      var lastLineText = 'last line';

      // build script with several pages full of generals + a final general
      var pageFullOfGenerals = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE);
      var pages              = pageFullOfGenerals.repeat(7);
      var lastGeneral        = utils.general(lastLineText);
      var script             = pages + lastGeneral;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish
        utils.waitToHaveAnyNonSplitPageBreak(function() {
          // store value for tests
          originalIdOfLineWithLastPageBreak = getIdOfLineWithLastPageBreak();

          // start char composition and force Etherpad to generate an edit event by inserting some chars
          startCharComposition();
          utils.getLine(0).sendkeys('some new text... ');

          done();
        });
      });
    });

    it('does not repaginate any part of the script', function(done) {
      this.timeout(2100);

      helper.waitFor(function() {
        // wait for pagination to re-run (should fail, i.e., not re-run)
        return getIdOfLineWithLastPageBreak() !== originalIdOfLineWithLastPageBreak;
      }, 2000).done(function() {
        expect().fail(function() { return 'Pagination was re-run while on a char composition' });
      }).fail(function() {
        done();
      });
    });

    context('then finishes the composition', function() {
      beforeEach(function(done) {
        endCharComposition();
        done();
      });

      it('repaginates the script', function(done) {
        this.timeout(2100);

        helper.waitFor(function() {
          // wait for pagination to re-run
          return getIdOfLineWithLastPageBreak() !== originalIdOfLineWithLastPageBreak;
        }, 2000).done(done);
      });
    });
  });

  context('when line after a page break has top margin', function() {
    beforeEach(function(done) {
      this.timeout(10000);

      var lastLineText = 'general';

      // build script with a heading on top of script + 1st page almost full (leave two lines at
      // the end) + one heading on top of 2nd page + another full page + a single line on 3rd page
      var act                = utils.act('first act', 'summary of act');
      var seq                = utils.sequence('first sequence', 'summary of sequence');
      var firstHeading       = utils.heading('first heading');
      // to make tests easier, replace the first general by a heading with act+seq, so the next
      // heading doesn't need to have any scene mark without any scene mark
      var pageAlmostFullOfGenerals = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE - 3);
      var heading = utils.heading('heading');
      var pageFullOfGenerals = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE);
      var script = act + seq + firstHeading + pageAlmostFullOfGenerals + heading + pageFullOfGenerals;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveNNonSplitPageBreaks(2, done);
      });
    });

    it('recalculates page breaks taking into account the future margin element will have if it is not after page break', function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // remove line after heading, so there will be one less page break
      var $lineAfterHeading = inner$('div:has(heading)').last().next();
      $lineAfterHeading.sendkeys('{selectall}');
      $lineAfterHeading.get(0).outerHTML = '';

      // wait for repagination to finish
      utils.waitToHaveNNonSplitPageBreaks(1, function() {
        // although there are 2 empty lines on 1st page, the heading itself needs 3 lines
        // (1 for text and 2 for top margin), so it should still be on top of 2nd page
        var $firstLineOfSecondPage = utils.linesAfterNonSplitPageBreaks().first();
        var $firstScriptElementOfSecondPage = utils.getFirstScriptElementOfPageStartingAt($firstLineOfSecondPage);
        expect($firstScriptElementOfSecondPage.text()).to.be('heading');

        done();
      });
    });
  });

  context('when a non-split line with page break is repaginated and split', function() {
    var lines;

    beforeEach(function(done) {
      this.timeout(10000);

      var lastLineText = 'general';

      // build script full of generals and with last line with 2 inner lines
      var line1 = 'AA' + utils.buildStringWithLength(50, '1') + '. ';
      var line2 = 'BB' + utils.buildStringWithLength(50, '2') + '. ';
      lines = [line1, line2];

      var fullPage = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE - 2) +
                     utils.general(line1 + line2);
      var lastGeneral = utils.general(lastLineText);

      var script = fullPage + lastGeneral;
      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnyNonSplitPageBreak(done);
      });
    });

    it('splits line after last whitespace that fits on previous page', function(done) {
      this.timeout(4000);

      var inner$ = helper.padInner$;

      // insert text on first line to change page break from non-split to split
      var longText = utils.buildStringWithLength(62, '1');
      var $firstLine = inner$('div span').first();
      $firstLine.sendkeys(longText);

      // wait for pagination to be re-run. Now we have a split page break
      // instead of a non-split one
      utils.waitToHaveAnySplitPageBreak(function() {
        var $firstLineOfSecondPage = utils.linesAfterSplitPageBreaks().first();
        var secondHalfOfSplit = lines[1];

        expect(utils.cleanText($firstLineOfSecondPage.text())).to.be(secondHalfOfSplit);

        done();
      });
    });
  });

  context('when user expands the scene marks of a scene', function() {
    var originalIdOfLineWithPageBreak;

    var HEADING_LINE = 4;

    var getIdOfLineWithPageBreak = function() {
      var $lineWithPageBreak = utils.linesAfterNonSplitPageBreaks().first().prev();
      var currentIdOfLineWithPageBreak = $lineWithPageBreak.attr('id');

      return currentIdOfLineWithPageBreak;
    }

    var clickToShowSceneMarks = function(done) {
      clickToShowOrHideSceneMarks(true, done);
    }
    var clickToHideSceneMarks = function(done) {
      clickToShowOrHideSceneMarks(false, done);
    }
    var clickToShowOrHideSceneMarks = function(isShowing, done) {
      // store value for tests
      originalIdOfLineWithPageBreak = getIdOfLineWithPageBreak();

      // show/hide scene marks
      ep_script_scene_marks_test_helper.utils.clickOnSceneMarkButtonOfLine(HEADING_LINE);

      var sceneMarkSelector = isShowing ? 'div.sceneMark.hidden' : 'div.sceneMark:not(.hidden)';

      helper.waitFor(function() {
        var sceneMarksAreVisible = helper.padInner$(sceneMarkSelector).length === 0;
        return sceneMarksAreVisible;
      }).done(done);
    }

    beforeEach(function(done) {
      this.timeout(10000);

      var lastLineText = 'general';

      // build script with a heading on top of script + 1st page full of generals + 1 line on 2nd page
      var act                = utils.act('first act', 'summary of act');
      var seq                = utils.sequence('first sequence', 'summary of sequence');
      var heading            = utils.heading('first heading');
      var pageFullOfGenerals = utils.buildScriptWithGenerals(lastLineText, GENERALS_PER_PAGE);

      var script = act + seq + heading + pageFullOfGenerals;

      utils.createScriptWith(script, lastLineText, function() {
        // wait for pagination to finish
        utils.waitToHaveNNonSplitPageBreaks(1, function() {
          // show/hide once first, then show again (to force char to move from
          // act to heading to act again)
          clickToShowSceneMarks(function() {
            clickToHideSceneMarks(function() {
              clickToShowSceneMarks(done);
            });
          });
        });
      });
    });

    it('does not repaginate any part of the script', function(done) {
      // id of line with first page break should be the same
      var currentIdOfLineWithPageBreak = getIdOfLineWithPageBreak();

      expect(currentIdOfLineWithPageBreak).to.be(originalIdOfLineWithPageBreak);

      done();
    });

    context('then minimize scene marks again', function() {
      beforeEach(function(done) {
        clickToHideSceneMarks(done);
      });

      it('does not repaginate any part of the script', function(done) {
        // id of line with first page break should be the same
        var currentIdOfLineWithPageBreak = getIdOfLineWithPageBreak();;

        expect(currentIdOfLineWithPageBreak).to.be(originalIdOfLineWithPageBreak);

        done();
      });
    });
  });

  context('when heading with act is not on top of page, then is repaginated and moves to the top of page', function() {
    var TEXT_OF_LAST_LINE = 'first line of 3rd page';

    beforeEach(function(done) {
      this.timeout(10000);

      // build script with 1st page almost full of generals + one heading with act and seq on
      // bottom of 1st page (to be moved to 2nd page) + a page almost full of generals +
      // one last general (to be moved to top of 3rd page)

      // leave room for heading + top margin + a general (so heading is not moved down as a top of block)
      var firstPageFullOfGenerals  = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE - 4);
      var act                      = utils.act('first act', 'summary of act');
      var seq                      = utils.sequence('first sequence', 'summary of sequence');
      var firstHeading             = utils.heading('first heading');
      var lineToBeOnTopOf3rdPage   = utils.general(TEXT_OF_LAST_LINE);
      // leave room for future moving of heading (without top margin)
      var secondPageFullOfGenerals = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE - 1);

      var script = firstPageFullOfGenerals + act + seq + firstHeading + secondPageFullOfGenerals + lineToBeOnTopOf3rdPage;

      utils.createScriptWith(script, TEXT_OF_LAST_LINE, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnyNonSplitPageBreak(done);
      });
    });

    it('recalculates page breaks taking into account the future margin element will (NOT) have when it is moved to top of page', function(done) {
      this.timeout(4000);

      // edit a line on first page to make it have 2 lines, so heading will be moved
      // to next page and last line to the 3rd page
      var oneLineLong = utils.buildStringWithLength(61, '.');
      var $lineOn1stPage = utils.getLine(GENERALS_PER_PAGE/2);
      // need to change the span, not the div. Otherwise we would not correctly
      // simulate what happens when user types something on the pad
      $lineOn1stPage.find('span').first().sendkeys(oneLineLong);

      // wait for repagination to finish
      utils.waitToHaveNNonSplitPageBreaks(2, function() {
        var $topOfPages = utils.linesAfterNonSplitPageBreaks();
        var $topOf2ndPage = $topOfPages.first();
        var $topOfLastPage = $topOfPages.last();

        expect($topOf2ndPage.text()).to.be('first act');
        expect($topOfLastPage.text()).to.be(TEXT_OF_LAST_LINE);

        done();
      });
    });
  });

  context('when line after a page break is a heading with act forming a top of block, then is repaginated and moves to the top of page', function() {
    var TEXT_OF_LAST_LINE = 'first line of 3rd page';

    beforeEach(function(done) {
      this.timeout(10000);

      // build script with 1st page almost full of generals + one heading with act and seq on
      // bottom of 1st page (to be moved to 2nd page) + a page almost full of generals +
      // one last general (to be moved to top of 3rd page)

      // leave room for heading + top margin + a general (so heading is not moved down as a top of block)
      var firstPageFullOfGenerals  = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE - 4);
      var act                      = utils.act('first act', 'summary of act');
      var seq                      = utils.sequence('first sequence', 'summary of sequence');
      var firstHeading             = utils.heading('first heading');
      var lineToBeOnTopOf3rdPage   = utils.general(TEXT_OF_LAST_LINE);
      // leave room for future moving of heading (without top margin)
      var secondPageFullOfGenerals = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE - 1);

      var script = firstPageFullOfGenerals + act + seq + firstHeading + secondPageFullOfGenerals + lineToBeOnTopOf3rdPage;

      utils.createScriptWith(script, TEXT_OF_LAST_LINE, function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnyNonSplitPageBreak(done);
      });
    });

    it('recalculates page breaks taking into account the future margin element will (NOT) have when it is moved to top of page', function(done) {
      this.timeout(4000);

      // edit a line on first page to make it have 2 lines, so heading will be moved
      // to next page and last line to the 3rd page
      var oneLineLong = utils.buildStringWithLength(61, '.');
      var $lineOn1stPage = utils.getLine(GENERALS_PER_PAGE/2);
      // need to change the span, not the div. Otherwise we would not correctly
      // simulate what happens when user types something on the pad
      $lineOn1stPage.find('span').first().sendkeys(oneLineLong);

      // wait for repagination to finish
      utils.waitToHaveNNonSplitPageBreaks(2, function() {
        var $topOfPages = utils.linesAfterNonSplitPageBreaks();
        var $topOf2ndPage = $topOfPages.first();
        var $topOfLastPage = $topOfPages.last();

        expect($topOf2ndPage.text()).to.be('first act');
        expect($topOfLastPage.text()).to.be(TEXT_OF_LAST_LINE);

        done();
      });
    });
  });

  context('when line after a page break is a heading with act forming a top of block', function() {
    var TEXT_OF_FUTURE_TOP_OF_PAGE = 'this is going to be a heading';

    beforeEach(function(done) {
      this.timeout(10000);

      // build script with 1st page full of generals + one heading with act and seq on
      // top of 2nd page + some generals
      var pageFullOfGenerals = utils.buildScriptWithGenerals('general', GENERALS_PER_PAGE - 3);
      var act                = utils.act('first act', 'summary of act');
      var seq                = utils.sequence('first sequence', 'summary of sequence');
      var firstHeading       = utils.heading('first heading');
      var futureHeading      = utils.general(TEXT_OF_FUTURE_TOP_OF_PAGE);
      var someGenerals       = utils.buildScriptWithGenerals('general', 3);

      var script = pageFullOfGenerals + act + seq + firstHeading + futureHeading + someGenerals;

      utils.createScriptWith(script, 'general', function() {
        // wait for pagination to finish before start testing
        utils.waitToHaveAnyNonSplitPageBreak(done);
      });
    });

    context('and user changes the type of next line to break that block', function() {
      // GENERALS_PER_PAGE - 3: generals
      // +7: act + seq + synopsis + 1st heading
      var LINE_TO_BE_MOVED_TO_TOP_OF_PAGE = GENERALS_PER_PAGE - 3 + 7;

      beforeEach(function(done) {
        // change line on bottom of block (heading => general) to destroy the block and
        // pull heading (and its scene marks) from second page to first page
        smUtils.changeLineToElement(utils.HEADING, LINE_TO_BE_MOVED_TO_TOP_OF_PAGE, done);
      });

      it('repaginates pad from 3 lines above changed line', function(done) {
        this.timeout(4000);

        // wait for pagination to be re-run
        helper.waitFor(function() {
          // now we have the changed line on top of second page
          var $firstLineOfSecondPage = utils.linesAfterNonSplitPageBreaks().first();
          var $firstScriptElementOfSecondPage = utils.getFirstScriptElementOfPageStartingAt($firstLineOfSecondPage);
          return $firstScriptElementOfSecondPage.text() === TEXT_OF_FUTURE_TOP_OF_PAGE;
        }, 2000).done(done);
      });
    });
  });
});
