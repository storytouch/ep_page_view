exports.eejsBlock_styles = function (hook_name, args, cb){
  args.content = args.content + '<link href="../static/plugins/ep_script_page_view/static/css/page_view.css" rel="stylesheet">';
}
