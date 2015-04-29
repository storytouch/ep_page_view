# Etherpad Script Page View

<img src="http://i.imgur.com/tanIwza.png" alt="Page view">

Add support to do 'page view' for movie scripts, with a toggle on/off option in Settings. Forked from [ep_page_view](https://github.com/ether/ep_page_view) project from Etherpad, version 0.5.22.

Features:
* Ability to turn on/off page view
* Setting to turn on/off page view
* Setting Persistance
* Ability to add page breaks (Using Control Enter)
* Automatic detection of page length to create pages
* Toggle on/off Line Numbers support without breaking styling
* Toggle Page breaks Visibility
* Maintain page breaks when in non-page view.

## Set page view as default

1. Open `settings.json`
2. Append:
   `"ep_script_page_view_default" : true,`

## Embed parameter
Suffix this on your pad URL to auto display page view when opening a pad ``&pageview=true``

## License
Apache 2.

## Donations
Donations can be made via http://etherpad.org
