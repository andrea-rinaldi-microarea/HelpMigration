const fs                        = require('fs')
const sql                       = require('mssql')
const options                   = require("./commonOptions")
const chalk                     = require ('chalk')
const path                      = require('path')
const htmlLogFileName           = "elements_with_html.txt"
const emptyLogFileName          = "empty_files.txt"
const NO_FOLDER                 = '__NO_FOLDER'
const MAIN_IMAGES_FOLDER        = '__MAIN_IMAGES'
const pageToTest                = ''
const pages_no_eng_reference    = "pages_no_eng_reference.txt"
const workingFolder             = path.join(options.root, "working")
const englishDictionaryFilename = path.join(options.root, "help_test", "en", "source", "namespace_name_dictionary.json")
var duplicatesLs                = []

var config = 
{
  user                   : 'sa',
  password               : 'Microarea.',
  server                 : 'MARTOM2-NB',
  database               : 'help_test',
  trustServerCertificate : true
}

var statistics = 
{
    extracted         : 0,
    whitelisted       : 0,
    blacklisted       : 0,
    processed         : 0,
    empty             : 0,
    destinated        : 0,
    no_folder         : 0,
    language          : options.italian ? 'italian' : 'english'
}

if(options.italian)
   statistics.no_eng_references = 0

if(options.dbconfig != null) 
{
   if(fs.existsSync(options.dbconfig))
      config = JSON.parse(fs.readFileSync(options.dbconfig, 'utf8'));
}

const whiteList = require('./whitelist.json');

function isWhitelisted(page) 
{
    for (i = 0; i < whiteList.length; i++)
    {
        if (page.match(new RegExp(`${whiteList[i]}`,"i"))) 
        {
            statistics.whitelisted++;
            return true;
        }
    }

    try 
    {
        if(options.italian)
        {
            const whiteList_it = require('./whitelist_it.json');

            for (i = 0; i < whiteList_it.length; i++)
            {
                if (page.match(new RegExp(`${whiteList_it[i]}`,"i"))) 
                {
                    statistics.whitelisted++;
                    return true;
                }
            }
        }
        else 
        {
            const whiteList_en = require('./whitelist_en.json');

            for (i = 0; i < whiteList_en.length; i++)
            {
                if (page.match(new RegExp(`${whiteList_en[i]}`,"i"))) 
                {
                    statistics.whitelisted++;
                    return true;
                }
            }
        }
    }
    catch(err)
    {
        console.log(err)
    }

    return false;
}

const blackList = require('./blacklist.json');

function isBlacklisted(page) 
{
    for (i = 0; i < blackList.length; i++) 
    {
        if (page.match(new RegExp(`${blackList[i]}`,"i"))) 
        {
            statistics.blacklisted++;
            return true;
        }
    }

    try 
    {
        if(options.italian)
        {
            const blackList_it = require('./blacklist_it.json');

            for (i = 0; i < blackList_it.length; i++) 
            {
                if (page.match(new RegExp(`${blackList_it[i]}`,"i"))) 
                {
                    statistics.blacklisted++;
                    return true;
                }
            }
        }
        else 
        {
            const blackList_en = require('./blacklist_en.json');

            for (i = 0; i < blackList_en.length; i++) 
            {
                if (page.match(new RegExp(`${blackList_en[i]}`,"i"))) 
                {
                    statistics.blacklisted++;
                    return true;
                }
            }
        }
    }
    catch(err)
    {
        console.log(err)
    }

    return false;
}

var namespace_name_dictionary = []; 
var locations = require("./menu_locations.json");
var generic = require("./generic_locations.json");
locations = locations.concat(generic);

function replaceAllCaseInsensitive(str, search, replacement) 
{
   var regex = new RegExp(search, 'gi');
   return str.replace(regex, replacement);
}

async function deleteFiles(dir) 
{
    try 
    {
        fs.rmSync(dir, { recursive: true, force: true });
    } 
    catch(err) 
    {
        console.error(err);
    }
}

function convertDocument(docFromDb,outputFolder) 
{
     var tocData = []
 
     if(pageToTest != '' && docFromDb.Page.toLowerCase() == pageToTest.toLowerCase()) 
         console.log(docFromDb.Content)
 
     function createTocStructure(text) 
     {
         var phrases = [];
         var regex = /^(=+)(\s*(.+?)\s*)$/gm; 
         
         var matchStructure;
         while ((matchStructure = regex.exec(text)) !== null) 
         {
             var level = matchStructure[1].length - 1; 
             var linkValue = matchStructure[3].trim().replaceAll('=',''); 
             phrases.push({ linkValue, level });
         }
         
         return phrases;
     }
 
     var source = ''
 
     source = '[H4 '+ outputFolder + docFromDb.Title.replaceAll(' ','_') + '] ' + docFromDb.Title + '\n[BR]\n' + docFromDb.Content
 
     if(source.includes('{TOC}')) 
        tocData = createTocStructure(source);

     source = source.replaceAll('\r\n','\n')
     source = source.replace(/%2f/gi,"/").replace(/\{UP\}/gi,"").replace(/\[image\|(.*?)\|(.*?)\]/g, function (match, p1, p2) 
     {
         var imagePath = p2;
         var splittedPath = imagePath.split('/')
         if(splittedPath.length == 2 && splittedPath[0] == '' && splittedPath[1].includes('.'))
             return '[IMG ' + MAIN_IMAGES_FOLDER + '/' + splittedPath[1].replaceAll('|','') + ']'
 
         return `[IMG ${imagePath.replaceAll('|','')}]`;                
     })

     source = replaceAllCaseInsensitive(source,'<[ ]*li[ ]*>','<li>');
     source = replaceAllCaseInsensitive(source,'</[ ]*li[ ]*>','</li>');
     source = replaceAllCaseInsensitive(source,'<[ ]*ol[ ]*>','<ol>');
     source = replaceAllCaseInsensitive(source,'</[ ]*ol[ ]*>','</ol>');
     source = replaceAllCaseInsensitive(source,'<[ ]*ul[ ]*>','<ul>');
     source = replaceAllCaseInsensitive(source,'</[ ]*ul[ ]*>','</ul>');
                    
     source = source.replace(/\<ol\>([\s\S]*?)\<\/ol\>/gi, (p1) =>
     {
         p1 = p1.replaceAll('*','')
         p1 = p1.replace(/\<ol\>/gi,"")
         p1 = p1.replace(/\<\/ol\>/gi,"")
         p1 = p1.replace(/\<li\>([\s\S]*?)\<\/li\>/gi,"0) $1")
         p1 = p1.replace(/{BR}/gi,"")
         p1 = p1.replace(/\n/gi,'')
         return p1
     })

     source = source.replace(/\<ul\>([\s\S]*?)\<\/ul\>/gi, (p1) =>
     {
         p1 = p1.replaceAll('*','')
         p1 = p1.replace(/\<ul\>/gi,"")
         p1 = p1.replace(/\<\/ul\>/gi,"")
         p1 = p1.replace(/\*/g, '$')
         p1 = p1.replace(/\<li\>((.|\n)*?)\<\/li\>/gi,"* $1")
         p1 = p1.replace(/{BR}/gi,"")
         p1 = p1.replace(/\n/gi,'')
         p1 = p1.replace(/\*/gi,"\n*")
         p1 = p1.replace(/\$/g, '\n  *')
         return p1
     })

     source = source.replace(/\<li\>([\s\S]*?)\<\/li\>/gi, (p1) =>
     {
         p1 = p1.replaceAll('*','')
         p1 = p1.replace(/\<li\>([\s\S]*?)\<\/li\>/gi,"* $1")
         p1 = p1.replace(/{BR}/gi,"")
         p1 = p1.replace(/\n/gi,'')
         p1 = p1.replace(/\*/gi,"\n*")
         p1 = p1.replace(/\$/g, '\n  *')
         return p1
     })
 
     if(pageToTest != '' && docFromDb.Page.toLowerCase() == pageToTest.toLowerCase()) 
        console.log(source)    
        
     function getStructureLink(theBlock)
     {
        if(theBlock.includes('*'))
        {
            var splittedLink = theBlock.split('*')
            splittedLink[0] = splittedLink[0].replace('[','').replace(' ','')
            splittedLink[1] = splittedLink[1].replace(']','')

                                                      //businessobjects?
            return "[SECTION box_info_document] [LINK pages/" + splittedLink[0] + " " + splittedLink[1] + "][/SECTION][BR]"
        }
        else 
            return "[SECTION box_info_document] " + block + " [/SECTION][BR]"
     }
               
     source = source.replace(/\[(.*?)\^\]/g,"") // remove link to parent page: [Parent Page^]
                    .replace(/\<preserve\>([\s\S]*?)\<\/preserve\>/gi,"$1")
                    .replace(/\<\/preserve\>/gi,"")                        
                    .replace(/\{TOC\}/gi, () => 
                    {                        
                        var theToc =  options.italian ? '\n**Tabella dei contenuti**' : '\n**Table of contents**'
                        theToc += '\n'

                        tocData.forEach(element => 
                        {
                            theToc += (element.level == 1 ? '* ' : ' *').split('').join(' ') + ` [LINK '#${element.linkValue}' '${element.linkValue}'] \n`
                        });
                        return theToc
                    })
                    .replace(/\<table\>[\s\S]*?\<\/table\>/gi, (htmlTable) => //html table
                    { 
                        return htmlTable.replace(/<table(.*?)>/gi, "[TABLE border=simple]")
                                        .replace(/<\/table\>/gi, "[/TABLE]")
                                        .replace(/<tr>/gi, "|-")
                                        .replace(/<td>(.*?)<\/td>/gi, "||$1")
                                        .replace(/\<\/tr>/gi, "");    
                    })
                    .replace(/\{SEE ALSO\}/gi,"")
                    .replace(/\<hide\>([\s\S]*?)\<\/hide\>/gi,"[HIDDEN show_draft_text][BR]$1\n[/HIDDEN][BR]")
                    .replace(/\<draft\>([\s\S]*?)\<\/draft\>/gi,"[HIDDEN show_draft_text][BR]$1\n[/HIDDEN][BR]")
                    .replaceAll(/\<\/draft\>/gi,"")
                    .replace(/\<draft\>/gi,"")
                    .replace(/\<\/draft\>/gi,"")                    
                    .replace(/\<esc\>(.*?)\<\/esc\>/gi,"$1")
                    .replace(/{br}/gi,"[BR]")
                    .replace(/\{br\)/gi,"[BR]")
                    .replace(/<br>/gi,"[BR]")
                    .replace(/<br \/>/gi,"[BR]")
                    .replace(/<hr>/gi,"[BR]")
                    .replace(/<br\/\>/gi,"[BR]")
                    .replace(/\<p style\=\"line\-height\:20px\;\"\>/gi,"")
                    .replace(/\<p[^>]*\>(.*?)\<\/p\>/g,"$1")
                    .replace(/\<p\>([\s\S]*?)\<\/p\>/gi,"$1")
                    .replace(/\<p\>/gi,"")
                    .replace(/\<\/p\>/gi,"")
                    .replace(/\<\/nowiki\>/gi,"")
                    .replace(/\<nowiki\>/gi,"")
                    .replace(/\<h2\>([\s\S]*?)\<\/h2\>/gi,"**$1**")
                    .replace(/\<h3\>([\s\S]*?)\<\/h3\>/gi,"**$1**")
                    .replace(/\<h4\>([\s\S]*?)\<\/h4\>/gi,"**$1**")
                    .replace(/\<h5\>([\s\S]*?)\<\/h5\>/gi,"**$1**")
                    .replace(/\<u\>([\s\S]*?)\<\/u\>/gi,"$1")
                    .replace(/\<font[^>]*\>(.*?)\<\/font\>/g,"$1")
                    .replace(/\<font[^>]*\>/g,"")
                    .replace(/\<div[^>]*\>(.*?)\<\/div\>/g,"$1")
                    .replace(/\<div[^>]*\>/g,"")
                    .replace(/\<\/div\>/g,"")
                    .replace(/\<dev\>([\s\S]*?)\<\/dev\>/gi,"$1")
                    .replace(/\&nbsp;/gi,"")
                    .replace(/\<span\>([\s\S]*?)\<\/span\>/gi,"$1")
                    .replace(/\<span[^>]*\>/gi,"")
                    .replace(/\<\/span\>/gi,"")
                    .replace(/\<sup\>([\s\S]*?)\<\/sup\>/gi,"$1")
                    .replace(/\<\/a\>/gi,"")
                    .replace(/\<strong\>/gi,"")
                    .replace(/\<\/strong\>/gi,"")
                    .replace(/\'\'\'(.*?)\'\'\'/g, (_, text) => // change bold: '''bold text''' => **bold text**
                    { 
                        return `**${text.trim()}** `; 
                    })
                    .replace(/\<b\>([\s\S]*?)\<\/b\>/gi,"**$1**")
                    .replace(/\<\/b\>/gi,"")
                    .replace(/\'\'(.*?)\'\'/g,"_/$1/_") // change italic: ''italic text'' => _/italic text/_
                    .replace(/\<i\>([\s\S]*?)\<\/i\>/gi,"_/$1/_")
                    .replace(/=====(.*?)=====/g,(_, text) => // header 4: =====title===== => [H6] title
                    {
                        return`[H6 '#${text}' NOINDEX] ${text}`;
                    })      
                    .replace(/====(.*?)====/g,(_, text) => // header 3: ====title==== => [H6] title
                    {
                        return`[H6 '#${text}' NOINDEX] ${text}`;
                    }) 
                    .replace(/===(.*?)===/g,(_, text) => // header 2: ===title=== => [H6] title
                    {
                        return`[H6 '#${text}' NOINDEX] ${text}`;
                    })
                    .replace(/==(.*?)==/g,(_, text) => // header 1: ==title== => [H5] title
                    {
                        return`[H5 '#${text}' NOINDEX] ${text}`;
                    })
                    .replace(/\{\{\{\{((.|\n)*?)\}\}\}\}/g, (block) => // code block: split by lines, each line beginning with 2 blanks   
                    {
                        block = block.replace("{{{{","").replace("}}}}","");
                        var lines = block.split("\n");
                        result = "";
                        lines.forEach(line => {
                            result += "  " + line + "\n";
                        });
                        return result;
                    })
                    .replace(/\{\{(.*?)\}\}/g,"++$1++") // inline code: {{inline code}} => ++inline code++
                    .replace(/\[imageauto\|(.*?)\|(.*?)\]/g,'[IMG "$2"]\n[LABEL $1]')
                    .replace(/<a href='(.*?)' target='new'>(\d+)<\/a>/g, (match, url, numero) => `[LINK ${url} ${url}]`) // html links
                    .replace(/\{\|((.|\n)*?)\|\}/g, (block) => // table with fields explanation
                    {
                        block = block.replace("{|", "[TABLE header=1 border=simple]\n|-").replace("|}","[/TABLE]").replace('class="FieldsTable"',"").replace('cellspacing="0"', "").replaceAll(" align = 'Left' ",'');
                        var lines = block.split("\n");
                        result = "";
                        lines.forEach(line => 
                        {
                              result += line.replace('| class="FieldsTableTitle" |','|^')
                                            .replace('| class="FieldsTableExplain" |','||')
                                            .replace('| class="FieldsTableExplainNB" |','\xA6\xA6') + "\n"; // \xA6 = ANSII code for "¦"
                        });
                        return result;
                    })
                    .replace(/\{S:MenuLocalization\}/gmi,"[# img_localized][/#] [# img_menu_path][/#]")
                    .replace(/\{S:MenuConfiguration\}/gmi,"[# img_configuration][/#] [# img_menu_path][/#]")
                    .replace(/\{S:MenuBatch}\}/gmi,"")
                    .replace(/\(\(\(\{S:Settings\}([\s\S]*?)\)\)\)/gim,"$1")
                    .replace(/\(\(\(\{S:InfoDocumentDetail\}([\s\S]*?)\)\)\)/gim,(_, block) =>
                    {
                        return getStructureLink(block)
                    })
                    .replace(/\(\(\(\{S:InfoDocumentDetail_it\}([\s\S]*?)\)\)\)/gim,(_, block) =>
                    {
                        return getStructureLink(block)
                    })
                    .replace(/\(\(\(\{S:InfoDocumentDetail_en\}([\s\S]*?)\)\)\)/gim,(_, block) =>
                    {
                        return getStructureLink(block)
                    })   
                    .replace(/\{S:InfoDocumentDetail\}/gmi,"[# img_info_document][/#] ")
                    .replace(/\{S:InfoDocumentDetail_it\}/gmi,"[# img_info_document][/#] ")
                    .replace(/\{S:InfoDocumentDetail_en\}/gmi,"[# img_info_document][/#] ")
                    .replace(/\(\(\(\{S:Info\}([\s\S]*?)\)\)\)/gim,"[SECTION box_info]$1[/SECTION][BR]")
                    .replace(/\{S:Info\}/gmi,"[# img_info][/#] ")
                    .replace(/\(\(\(\{S:PathMenu\} ([\s\S]*?)\)\)\)/gim,'[SECTION box_menu_path]$1[/SECTION][BR]')
                    .replace(/\{S:PathMenu\}/gmi,"[# img_menu_path][/#] ")
                    .replace(/\(\(\(\{S:PathMenu_en\} ([\s\S]*?)\)\)\)/gim,'[SECTION box_menu_path]$1[/SECTION][BR]')
                    .replace(/\{S:PathMenu_en\}/gmi,"[# img_menu_path][/#] ")
                    .replace(/\(\(\(\{S:PathMenu_it\} ([\s\S]*?)\)\)\)/gim,'[SECTION box_menu_path]$1[/SECTION][BR]')
                    .replace(/\{S:PathMenu_it\}/gmi,"[# img_menu_path][/#] ")
                    .replace(/\(\(\(\{S:LocalizedFeatures\} ([\s\S]*?)\)\)\)/gmi,"[SECTION box_localized]%%LOCALIZED%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:LocalizedFeatures_it\} ([\s\S]*?)\)\)\)/gmi,"[SECTION box_localized]%%LOCALIZED_IT%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:LocalizedFeatures_en\} ([\s\S]*?)\)\)\)/gmi,"[SECTION box_localized]%%LOCALIZED_EN%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:Localization\} ([\s\S]*?)\)\)\)/gmi,"[SECTION box_localized]%%LOCALIZED%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:LocalizedTab_en\} ([\s\S]*?)\)\)\)/gmi,"[SECTION box_localized]%%LOCALIZED_EN_TAB%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:LocalizedTab_it\} ([\s\S]*?)\)\)\)/gmi,"[SECTION box_localized]%%LOCALIZED_IT_TAB%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:LocalizedTab\} ([\s\S]*?)\)\)\)/gmi,"[SECTION box_localized]%%LOCALIZED_TAB%% $1[/SECTION][BR]")
                    .replace(/\{S:LocalizedFeatures\}/gmi,"[# img_localized][/#] ")
                    .replace(/\{S:LocalizedFeatures_it\}/gmi,"[# img_localized][/#] ")
                    .replace(/\{S:LocalizedFeatures_en\}/gmi,"[# img_localized][/#] ")
                    .replace(/\{S:Localization\}/gmi,"[# img_localized][/#] ")
                    .replace(/\(\(\(\{S:VideoCourse\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_video]$1\n[/SECTION][BR]")
                    .replace(/\{S:VideoCourse\}/gmi,"[# img_video][/#] ")
                    .replace(/\(\(\(\{S:VideoCourse_it\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_video]$1\n[/SECTION][BR]")
                    .replace(/\{S:VideoCourse_it\}/gmi,"[# img_video][/#] ")
                    .replace(/\(\(\(\{S:VideoCourse_en\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_video]$1\n[/SECTION][BR]")
                    .replace(/\{S:VideoCourse_en\}/gmi,"[# img_video][/#] ")
                    .replace(/\(\(\(\{S:Download\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_download]$1\n[/SECTION][BR]")
                    .replace(/\{S:Download\}/gmi,"[# img_download][/#] ")
                    .replace(/\(\(\(\{S:Example\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_example]$1\n[/SECTION][BR]")
                    .replace(/\{S:Example\}/gmi,"[# img_example][/#] ")
                    .replace(/\(\(\(\{S:Configuration\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_configuration]%%CONFIGURED%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:ConfiguredFeatures\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_configuration]%%CONFIGURED%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:ConfiguredFeatures_it\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_configuration]%%CONFIGURED_IT%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:ConfiguredFeatures_en\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_configuration]%%CONFIGURED_EN%% $1[/SECTION][BR]")
                    .replace(/\(\(\(\{S:ConfiguredTab_en\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_configuration]%%CONFIGURED_EN_TAB%% $1[/SECTION][BR]")
                    .replace(/\{S:ConfiguredFeatures\}/gmi,"[# img_configuration][/#] ")
                    .replace(/\{S:ConfiguredFeatures_it\}/gmi,"[# img_configuration][/#] ")
                    .replace(/\{S:ConfiguredFeatures_en\}/gmi,"[# img_configuration][/#] ")
                    .replace(/\{S:ConfiguredTab_it\}/gmi,"[# img_configuration][/#] ")
                    .replace(/\{S:ConfiguredTab_en\}/gmi,"[# img_configuration][/#] ")
                    .replace(/\{S:ConfiguredTab\}/gmi,"[# img_configuration][/#] ")
                    .replace(/\{S:Configuration\}/gmi,"[# img_configuration][/#] ")
                    .replace(/\(\(\(\{S:Warning\}([\s\S]*?)\)\)\)/gmi,"[SECTION box_warning]$1[/SECTION][BR]")
                    .replace(/\{S:Warning\}/gmi,"[# img_warning][/#] ")    
                    .replace(/^#/gi,"1) ") // numbered lists               
                    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">") // escape of "<" and ">"

    var regexConstructionBig = new RegExp(/{S:Under Construction Big}/i)
    if (regexConstructionBig.test(source))
    {
        source = source.replace(regexConstructionBig,"[HIDDEN show_draft_text][BR]")
        source = source + "\n[BR]\n[/HIDDEN]"
    }

    if(pageToTest != '' && docFromDb.Page.toLowerCase() == pageToTest.toLowerCase()) 
       console.log(source)

    return source
};

function getPage(namespace)
{
    return `RefGuide-${namespace.replace(/erp\./ig,'M4.').replace(/mdc\./ig,'M4.').replaceAll('.','-')}`;
}

function getDestinationFolder(location)
{
    var f = location.destination.root;
    if (location.destination.folder != undefined) 
        f = path.join(f, location.destination.folder);
    if (location.destination.subfolder != undefined) 
        f = path.join(f, location.destination.subfolder);

    return f;
} 

function menuLocation(source) 
{
    // check for a precise correspondance with the menu position
    for(let l = 0; l < locations.length; l ++) 
        {
            if (locations[l].source == undefined) continue;
    
            // the source used in the redirect is exactly the namespace on the menu
            if (locations[l].source.toLowerCase() == source.toLowerCase())
                return locations[l];
        }
    
    // should not occur, the redirections has been defined manually
    console.error('Redirection not found in menu:', source);
    return { destination: { root: NO_FOLDER } }
}

function findLocation(page) 
{
    // check for a precise correspondance with the menu position
    for(let l = 0; l < locations.length; l ++) 
    {
        if (locations[l].source == undefined) continue;

        // console.log(`${l} - ${getPage(locations[l].source).toLowerCase()}`);
        // compare the page name with those generated from the source namespace when F1 is pressed
        if (getPage(locations[l].source).toLowerCase() == page.toLowerCase())
            return locations[l];
    }
    // check for a match for generic destinations
    for(let l = 0; l < locations.length; l ++) 
    {
        if (locations[l].match == undefined) continue;
        
        for (let m = 0; m< locations[l].match.length; m++) 
        {
            if (page.match(new RegExp(`${locations[l].match[m]}`,"i"))) 
            {
                // the "redirect" property indicates that the page is correspondng to a menu item, 
                // just the namespace doesn't match entirely (i.e.: report)
                if (locations[l].redirect != undefined)
                    return (menuLocation(locations[l].redirect))
    
                return locations[l];
            }
        };
    }
    // no matches, "lost and found" folder
    return { destination: { root: NO_FOLDER } }; 
}

async function getDataFromDb() 
{
    console.log(chalk.hidden(''))
    console.log(chalk.bold.white.inverse("***********************HELP MIGRATION PROCESS***********************"));                                                                       
    console.log(chalk.hidden(''))
    console.log(chalk.bold.white.inverse("*************" + (options.italian ? "ITALIAN" : "ENGLISH") + " GENERATION*************"));                                                                       
    console.log(chalk.hidden(''))
    console.log(chalk.hex('#FF0000').bold('Connecting to database...'))

    sql.connect(config)
    .then(pool => 
    {
      var request = new sql.Request(pool); 
      var query = 'SELECT [Page],' + 
                         '[Title],' + 
                         '[Content] ' + 
                    'FROM [dbo].[PageContent] ' + 
                   "WHERE LOWER([Page]) " + (options.italian ? "" : "NOT") + " LIKE '%(it-it)%'" +
               ' ORDER BY Page';
      return request.query(query);
    })
    .then(result => 
    {
        for(let i = 0; i < result.recordset.length; i ++) 
        {
            statistics.extracted++;

            var helpPage = result.recordset[i];

            helpPage.Page = helpPage.Page.replace('(it-IT)','').replaceAll(' ','')

            if (!isWhitelisted(helpPage.Page) || isBlacklisted(helpPage.Page))
                continue;

            statistics.processed++;

            if(helpPage.Content.trim() == '')
            {
                statistics.empty++
                if(fs.existsSync(path.join(workingFolder, emptyLogFileName)))
                   fs.appendFileSync(path.join(workingFolder, emptyLogFileName), helpPage.Page + '\n', (err) => { if (err) throw err; });
                else 
                   fs.writeFileSync(path.join(workingFolder, emptyLogFileName), helpPage.Page + '\n', (err) => { if(err) throw err; });
                
                continue;
            }

            var location = findLocation(helpPage.Page);

            //location.destination.root + '_' + location.destination.folder 

            helpPage.Title = helpPage.Title.replace(':','').trim().replaceAll('/',' ').replace('*',' ').replaceAll("\\",' ');
    
            var filename = (location.destination.root == NO_FOLDER) ? helpPage.Page : helpPage.Title.replaceAll(' ', '_'); 

            var destFolder = getDestinationFolder(location);
            var destination = path.join(workingFolder, destFolder);
            // if no valid destination folder, keep the page ID as filename, to easy identification
            if (location.destination.root == NO_FOLDER)
                statistics.no_folder++;
            else
                statistics.destinated++;
         
            try 
            {
                fs.mkdirSync(destination,{recursive: true});
            } 
            catch (err) 
            {
                console.error('Error creating directory of module:', err);
            }

            var englishSamName = '';

            if(options.italian)
            {
                if(fs.existsSync(englishDictionaryFilename))
                {
                    var data = fs.readFileSync(englishDictionaryFilename, 'utf-8');
                    var namespaces_dictionary_en = JSON.parse(data)
            
                    for(let i = 0; i < namespaces_dictionary_en.length; i ++)
                    {
                        if(helpPage.Page == namespaces_dictionary_en[i].namespace)
                        {
                            englishSamName = namespaces_dictionary_en[i].filename
                            filename       = namespaces_dictionary_en[i].filename
                            break;                    
                        }
                    }
                }
            }

            let theOutputFolder = location.destination.root
            if(location.destination.folder != undefined)
            {
                theOutputFolder += '_' + location.destination.folder
                if(location.destination.subfolder != undefined)
                    theOutputFolder += '_' + location.destination.subfolder
            }

            theOutputFolder += '/'
  
            var samContent = '[VAR advanced_var_expansion true]\n' + 
                             '[VAR MAGO MagoCloud]\n' + 
                             '[VAR LOCALIZED "This feature is only available in :"]\n' + 
                             '[VAR LOCALIZED_EN "This feature is only available in :"]\n' +  
                             '[VAR LOCALIZED_IT "Questa funzionalità è disponibile solo in :"]\n' + 
                             '[VAR LOCALIZED_TAB "This card is only available in :"]\n' +
                             '[VAR LOCALIZED_IT_TAB "This card is only available in :"]\n' +
                             '[VAR LOCALIZED_EN_TAB "This card is only available in :"]\n' +
                             '[VAR CONFIGURED_EN_TAB "This card is only available with :"]\n' +
                             '[VAR CONFIGURED "This feature is only available with :"]\n' + 
                             '[VAR CONFIGURED_EN "This feature is only available with :"]\n' + 
                             '[VAR CONFIGURED_IT "Questa funzionalità è disponibile solo con :"]\n\n' + 
                             '[STYLE ../../../mago-styles/mago-help-custom.css]\n' + 
                             '[REDIRECT pages/' + helpPage.Page + ' ' + theOutputFolder + 
                             (englishSamName != '' ? englishSamName : (helpPage.Title.replaceAll(' ', '_'))) + ']\n'
                             
   
            samContent += convertDocument(helpPage,theOutputFolder);

            if(englishSamName != '')
            {
                if(samContent.includes('[h1 ' + theOutputFolder))
                {
                    samContent = samContent.replace(/\[h1[\s\S]*?\]/i,"[h1 " + theOutputFolder + englishSamName + "]")
                }
                else 
                {
                    if(samContent.includes('[h2 ' + theOutputFolder))
                    {
                        samContent = samContent.replace(/\[H2[\s\S]*?\]/i,"[h2 " + theOutputFolder + englishSamName + "]")
                    }
                    else 
                    {
                        if(samContent.includes('[h3 ' + theOutputFolder))
                        {
                            samContent = samContent.replace(/\[H3[\s\S]*?\]/i,"[h3 " + theOutputFolder + englishSamName + "]")
                        }
                        else 
                        {
                            samContent = samContent.replace(/\[h4[\s\S]*?\]/i,"[h4 " + theOutputFolder + englishSamName + "]")
                        }
                    }
                }
            }

            function hasHtmlTags(text) 
            {
                var regex = /<\/?\w+(?:\s+[\w\-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+))*\s*\/?>/g;          
                return regex.test(text);
            }

            if(hasHtmlTags(samContent))
            {
                if(fs.existsSync(path.join(workingFolder, htmlLogFileName)))
                   fs.appendFileSync(path.join(workingFolder, htmlLogFileName), destination.replace('EN/','') + '/' + filename + '.sam\n', (err) => { if (err) throw err; });
                else 
                   fs.writeFileSync(path.join(workingFolder, htmlLogFileName), destination + '/' + filename + '.sam\n', (err) => { if(err) throw err; });
            }
                
            try
            {
                var duplicateFound = false
                function searchFile(dir, fileName) 
                {
                    const files = fs.readdirSync(dir);
                    
                    for (const file of files) 
                    {
                        const filePath = path.join(dir, file);
                    
                        const fileStat = fs.statSync(filePath);
                    
                        if(fileStat.isDirectory()) 
                           searchFile(filePath, fileName);
                        else if (file.endsWith(fileName))
                        {
                           duplicateFound = true
                           break;
                        }
                    }
                }
                  
                searchFile(workingFolder, filename + '.sam')

                if(duplicateFound)
                {
                    duplicatesLs.push({
                                         destFolder  : destFolder,
                                         content     : samContent, 
                                         namespace   : helpPage.Page, 
                                         filename    : filename, 
                                         destination : location.destination
                                       })
                }
                else 
                {
                    fs.writeFileSync(path.join(destination, filename + '.sam'), samContent, ()=>{});

                    namespace_name_dictionary.push({
                                                     namespace   : helpPage.Page,
                                                     filename    : filename,
                                                     destination : location.destination
                                                    });
                }
            }
            catch(err)
            {
                console.error(err)
            }
        }
    })
    .then(() => 
    {
        console.log(chalk.hex('#FF4000').bold('Creating dictionary and edit duplicates...'))

        function updateDuplicateFilenames(list) 
        {
            const filenameCounts = {}; 
        
            return list.map(obj => 
            {
                let filename = obj.filename;
        
                if (filenameCounts[filename] !== undefined) 
                    filenameCounts[filename]++;
                else 
                    filenameCounts[filename] = 0; 
                
                const newFilename = `${filename}_${filenameCounts[filename] + 1}`;
                const oldName     = `${filename}`;
        
                return { ...obj, filename: newFilename, oldFilename : oldName };
            });
        }
    
        duplicatesLs = updateDuplicateFilenames(duplicatesLs);

        for(let i = 0; i < duplicatesLs.length; i ++)
        {
            try 
            {
                var theDuplicateOutputFolder = (duplicatesLs[i].destination.root == NO_FOLDER ? (NO_FOLDER) : (duplicatesLs[i].destination.root + '_' + duplicatesLs[i].destination.folder)) + '/'

                duplicatesLs[i].content = duplicatesLs[i].content.replace(`[H4 ${theDuplicateOutputFolder}${duplicatesLs[i].oldFilename}]`, `[H4 ${theDuplicateOutputFolder}${duplicatesLs[i].filename}]`)

                fs.writeFileSync(path.join(workingFolder,duplicatesLs[i].destFolder, duplicatesLs[i].filename + '.sam'), duplicatesLs[i].content, ()=>{});

                namespace_name_dictionary.push({
                                                 namespace   : duplicatesLs[i].namespace,
                                                 filename    : duplicatesLs[i].filename,
                                                 destination : duplicatesLs[i].destination
                                               });
            }
            catch(err)
            {
                console.error(err)
            }
        }

        if(options.italian)
        {
            var ls_no_eng_reference         = []
            if(fs.existsSync(englishDictionaryFilename))
            {
               var data = fs.readFileSync(englishDictionaryFilename, 'utf-8');
               var namespaces_dictionary_en = JSON.parse(data)
        
               for(let i = 0; i < namespace_name_dictionary.length; i ++)
               {
                   var found = false;
                   for(let j = 0; j < namespaces_dictionary_en.length; j ++)
                   {
                       if(namespace_name_dictionary[i].namespace == namespaces_dictionary_en[j].namespace)
                       {
                          found = true;
                          namespace_name_dictionary[i].english_filename = namespaces_dictionary_en[j].filename
                          break;
                       }
                   }
                   if(!found)
                   {
                      statistics.no_eng_references ++
                      ls_no_eng_reference.push(namespace_name_dictionary[i])
                   }
               }

               fs.writeFileSync(path.join(workingFolder,pages_no_eng_reference) , JSON.stringify(ls_no_eng_reference,{},2), err => 
               {
                  if(err)
                     console.error(err)
               });
            }
        }

        fs.writeFileSync(path.join(workingFolder,"namespace_name_dictionary.json") , JSON.stringify(namespace_name_dictionary,{},2), err => 
        {
            if(err)
                console.error(err)
        });
    })
    .catch(err => 
    {
      console.error(err);
    })
    .finally( () =>
    {
        fs.mkdirSync(workingFolder + '/TB_Studio/BusinessObjects',{recursive: true});
        fs.cpSync(options.businessObjectsSourceFolder, workingFolder + '/TB_Studio/BusinessObjects', { recursive: true }, ()=> {});

        if(options.italian)
        {
           var businessObjectsSam = workingFolder + '/TB_Studio/BusinessObjects/BusinessObjects.sam'
           var data = fs.readFileSync(businessObjectsSam, 'utf-8');
           data = data.replace('[LANG en]','')
           fs.unlinkSync(businessObjectsSam)
           fs.writeFileSync(businessObjectsSam, data);
        }

        console.log(chalk.hex('#FF7F00').bold('Disconnecting from database...'))
        console.log(chalk.hex('#FFBF00').bold('...PHASE 1 COMPLETED!'))
        console.log(chalk.hidden(''))
        console.log(JSON.stringify(statistics,{},2))
        if (!options.noSpawn) 
        {
            const scriptPath = path.resolve(__dirname, `${options.root}/help_conversion/prepare_output.js`);
            const { spawn } = require('child_process');
            spawn('node', [scriptPath, "--root", options.root, "--dbconfig", options.dbconfig, "--businessObjectsSourceFolder", options.businessObjectsSourceFolder], {stdio: 'inherit', shell: true})
        }
    });
}

async function getAndConvertAssets()
{
    await deleteFiles(workingFolder);

    fs.mkdirSync(workingFolder,{recursive: true});
    
    if(fs.existsSync(path.join(workingFolder, htmlLogFileName)))
       fs.unlinkSync(path.join(workingFolder, htmlLogFileName));

    if(fs.existsSync(path.join(workingFolder, emptyLogFileName)))
       fs.unlinkSync(path.join(workingFolder, emptyLogFileName));

    await getDataFromDb();     
}

getAndConvertAssets();