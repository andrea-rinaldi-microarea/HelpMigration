const options = require("../commonOptions");

var whiteList = require('./whitelist.json');
if (options.language == "it-IT")
    whiteList = whiteList.concat(require('./whitelist_it-IT.json'));
else // default english language
    whiteList = whiteList.concat(require('./whitelist_en.json'));

function isWhitelisted(page) 
{
    for (i = 0; i < whiteList.length; i++) {
        if(page.match(new RegExp(`${whiteList[i]}`,"i")))
           return true;
    }
    return false;
}

var blackList = require('./blacklist.json');
if (options.language == "it-IT")
    blackList = blackList.concat(require('./blacklist_it-IT.json'));
else // default english language
    blackList = blackList.concat(require('./blacklist_en.json'));

function isBlacklisted(page) 
{
    for (i = 0; i < blackList.length; i++) 
    {
        if(page.match(new RegExp(`${blackList[i]}`,"i")))
           return true;
    }
    return false;
}

module.exports = { isBlacklisted, isWhitelisted };