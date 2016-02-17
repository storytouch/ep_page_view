describe("ep_script_page_view - page view", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  // Create Pad
   // Disable Page View & Ensure Page View is disabled
     // Ensure Page View is enabled on refresh after disabled
       // Enable Page View & Ensure Page View is enabled

  it("Disable Page View", function(done) {
    this.timeout(60000);
    var chrome$ = helper.padChrome$;
    if(chrome$('#options-pageview').prop("checked")) chrome$('#options-pageview').click();
    var $editorContainer = chrome$("#editorcontainer");

    helper.waitFor(function(){
      return !$editorContainer.hasClass("page_view");
    }).done(function(){
      expect($editorContainer.hasClass("page_view")).to.be(false);
      done();
    });
  });

  it("Ensure Page View is enabled on refresh after being disabled", function(done) {
    this.timeout(60000);
    var chrome$ = helper.padChrome$;
    var $editorContainer = chrome$("#editorcontainer");

    helper.waitFor(function(){
      return $editorContainer.hasClass("page_view");
    }).done(function(){
      expect($editorContainer.hasClass("page_view")).to.be(true);
      done();
    });
  });

  it("Enable Page View", function(done) {
    this.timeout(60000);
    var chrome$ = helper.padChrome$;
    if(!chrome$('#options-pageview').prop("checked")) chrome$('#options-pageview').click();
    var $editorContainer = chrome$("#editorcontainer");

    helper.waitFor(function(){
      return $editorContainer.hasClass("page_view");
    }).done(function(){
      expect($editorContainer.hasClass("page_view")).to.be(true);
      done();
    });
  });

});
