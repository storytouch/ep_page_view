describe.skip("ep_script_page_view - other MORE/CONT'D tests", function() {
  // Letter
  // var PAPER = 'Letter';
  // var GENERALS_PER_PAGE = 54;
  // A4
  var PAPER = 'A4';
  var GENERALS_PER_PAGE = 58;

  var utils, scriptBuilder, lastLineText;

  before(function(){
    utils = ep_script_page_view_test_helper.utils;
  });

  beforeEach(function(cb){
    var simplePageViewUtils = ep_script_simple_page_view_test_helper.utils;
    simplePageViewUtils.newPadWithPaperType(function() {
      utils.cleanPad(function() {
        utils.createScriptWith(scriptBuilder(), lastLineText, cb);
      });
    }, PAPER);
    this.timeout(60000);
  });

  context("when first page ends on a dialogue and second page starts on a parenthetical", function() {
    before(function() {
      scriptBuilder = function() {
        var line1 = utils.buildStringWithLength(23, "1") + ". ";
        var line2 = utils.buildStringWithLength(23, "2") + ". ";
        var longParenthetical = line1 + line2;
        lastLineText = "last general";

        var generals      = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE-2);
        var dialogue      = utils.dialogue("dialogue");
        var parenthetical = utils.parenthetical(longParenthetical);
        var lastGeneral   = utils.general(lastLineText);

        return generals + dialogue + parenthetical + lastGeneral;
      };
    });

    it("adds the MORE/CONT'D tags", function(done) {
      var noCharacter = "";
      utils.testPageBreakHasMoreAndContd(noCharacter, done);
    });
  });

  context("when first page ends on a parenthetical and second page starts on a dialogue", function() {
    before(function() {
      scriptBuilder = function() {
        var line1 = utils.buildStringWithLength(33, "1") + ". ";
        var line2 = utils.buildStringWithLength(33, "2") + ". ";
        var longDialogue = line1 + line2;
        lastLineText = "last general";

        var generals      = utils.buildScriptWithGenerals("general", GENERALS_PER_PAGE-2);
        var parenthetical = utils.parenthetical("parenthetical");
        var dialogue      = utils.dialogue(longDialogue);
        var lastGeneral   = utils.general(lastLineText);

        return generals + parenthetical + dialogue + lastGeneral;
      };
    });

    it("adds the MORE/CONT'D tags", function(done) {
      var noCharacter = "";
      utils.testPageBreakHasMoreAndContd(noCharacter, done);
    });
  });
});
