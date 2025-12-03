const options = require("./commonOptions");
// const MAIN_IMAGES_FOLDER        = '__MAIN_IMAGES'

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

function replaceAllCaseInsensitive(str, search, replacement) 
{
   var regex = new RegExp(search, 'gi');
   return str.replace(regex, replacement);
}

function convertPage(helpPage, imagesTracker)
{
     var tocData = []

     source = helpPage.Content;

     if(source.includes('{TOC}')) 
        tocData = createTocStructure(source);

     source = source.replaceAll('\r\n','\n')
     source = source.replace(/%2f/gi,"/").replace(/\{UP\}\//gi,"").replace(/\{UP\}/gi,"")
     source = source.replace(/\[image\|(.*?)\|(.*?)\]/g, (match, p1, p2) =>
     {
         var imagePath = p2.replaceAll('|','');
        //  var splittedPath = imagePath.split('/')
        //  if(splittedPath.length == 2 && splittedPath[0] == '' && splittedPath[1].includes('.'))
        //      return '[IMG ' + MAIN_IMAGES_FOLDER + '/' + splittedPath[1].replaceAll('|','') + ']'
 
        if (imagesTracker !== undefined)
            imagesTracker(imagePath);

         return `[IMG ${imagePath}]`;                
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

    //  source = '[H4 '+ outputFolder + docFromDb.Title.replaceAll(' ','_') + '] ' + docFromDb.Title + '\n[BR]\n' + docFromDb.Content
 
     return  '[STYLE ../../../mago-styles/mago-help-custom.css]\n\n' +
            // `[REDIRECT ${namespace} ${folder}/${namespace}]\n\n` +
            // '[NEWPAGEIDX]\n\n' +
            // `[H4 ${folder}/${namespace}] ${title}\n` +
            source;
}

module.exports = { convertPage };

