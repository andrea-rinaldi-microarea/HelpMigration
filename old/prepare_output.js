const fs                   = require('fs')
const pathModule           = require('path')
const options              = require("./commonOptions")
const chalk                = require('chalk')
const sourceDirectory      = `${options.root}/working`
const mainDirectory        = `${options.root}/help_test/${options.italian ? 'it' : 'en'}`
const finalSourceDirectory = mainDirectory + '/source'
const htmlLogFileName      = "elements_with_html.txt"
const emptyLogFileName     = "empty_files.txt"
const oldMarkupLogFileName = "elements_with_old_markup.txt"
const includeFileName      = "include_list.txt"
const referencedIncludes   = "referenced_include_list.txt"
const linkFileName         = "link_list.txt"
const missinglinkFileName  = "missing_link_list.txt"
const imageFileName        = "image_reference_list.txt"
const NO_FOLDER            = '__NO_FOLDER'
const MAIN_IMAGES_FOLDER   = '__MAIN_IMAGES'
const COMMON_FOLDER        = '_Common'
const startOfContent       = (options.italian ? '' : '[LANG en]\n') + 
                            '[STYLE ../../../mago-styles/mago-custom.css]\n' +
                            '[STYLE ../../../mago-styles/mago-help-custom.css]\n' +
                            '[RESOURCES ../../../mago-styles/skin.css]\n' +
                            '[RESOURCES ../../../mago-styles/logo_top.png]\n' +
                            '[RESOURCES ../../../mago-styles/favicon.png]\n' +
                            '[NOCOVER]\n'

function reorderLogFile(file)
{
    try 
    {
        var data            = fs.readFileSync(file, 'utf-8');
        var filenames       = data.split('\n');
        var sortedFileNames = filenames.sort((a, b) => a.localeCompare(b));
        var dataFinal       = sortedFileNames.join('\n');
        fs.unlinkSync(file)
        fs.writeFileSync(file, dataFinal);
    }
    catch(err)
    {
        console.error(err)
    }
}

function deleteDuplicatesFromFile(file)
{
    try 
    {
        var data        = fs.readFileSync(file, 'utf-8');
        var filenames   = data.split('\n');
        var uniqueArray = filenames.filter((item, index) => filenames.indexOf(item) === index);
        var dataFinal   = uniqueArray.join('\n');
        fs.unlinkSync(file)
        fs.writeFileSync(file, dataFinal);
    }
    catch(err)
    {
        console.error(err)
    }
}

async function readAndParseFile(path) 
{
    try 
    { 
        var data = await fs.promises.readFile(path, 'utf-8');
        return JSON.parse(data)
    } 
    catch(err)
    {
        console.error(err)
    }
}

async function deleteFiles(directory) 
{
    try 
    { 
        var files = fs.readdirSync(directory);

        for (var file of files) 
        {
            var filePath = `${directory}/${file}`;

            if(fs.statSync(filePath).isDirectory())
               fs.rmSync(filePath, { recursive: true, force: true });
            else fs.unlinkSync(filePath);
        }
    }
    catch(err)
    {
        console.error(err)
    }
}

function getNamespace(page)
{
    return page.split('-').splice(1).join('.').replace(/m4/ig,'ERP').replace(/mdc\./ig,'M4.') 
}

async function checkOldBlock(directory) 
{
    try 
    { 
       fs.readdirSync(directory, { withFileTypes: true }).forEach(dirent => 
       {
            var path = `${directory}/${dirent.name}`;
            if (dirent.isDirectory()) 
                checkOldBlock(path)
            else if (dirent.isFile() && path.endsWith('.sam')) 
            {
                var content = fs.readFileSync(path, 'utf-8');

                var regex = /\{|\}/;          
                if(regex.test(content))
                {
                   if(fs.existsSync(finalSourceDirectory + '/' + oldMarkupLogFileName))
                       fs.appendFileSync(finalSourceDirectory + '/' + oldMarkupLogFileName, path + '\n', (err) => { if (err) throw err; });
                    else fs.writeFileSync(finalSourceDirectory + '/' + oldMarkupLogFileName, path + '\n', (err) => { if(err) throw err; });    
                }                
            }
       });
    }
    catch(err) 
    {
       console.error(err)
    }
} 

function addLineToIncludesFile(file,finalSource = true)
{
    var theSource = finalSource ? finalSourceDirectory : sourceDirectory
    if(fs.existsSync(theSource + '/' + referencedIncludes))
       fs.appendFileSync(theSource + '/' + referencedIncludes, file + '\n', (err) => { if (err) throw err; });
    else 
       fs.writeFileSync(theSource + '/' + referencedIncludes, file + '\n', (err) => { if(err) throw err; });
}

function calculateBackPaths(from, to) 
{
    const relativePath = pathModule.relative(from, to);
    
    const pathParts = relativePath.split(pathModule.sep);

    const backLevels = pathParts.reduce((count, part) => {
        if (part === '..') {
            count++;
        }
        return count;
    }, 0);

    return backLevels;
}

async function replaceIncludeImageAndLinkBlock(directory,dictionary) 
{
    try 
    { 
       fs.readdirSync(directory, { withFileTypes: true }).forEach(dirent => 
       {
            var path = `${directory}/${dirent.name}`;
            if (dirent.isDirectory()) 
                replaceIncludeImageAndLinkBlock(path,dictionary)
            else if (dirent.isFile() && path.endsWith('.sam') && !path.includes('BusinessObjects')) 
            {
                var content = fs.readFileSync(path, 'utf-8');

                if(path.includes('RefGuide-M4-Common-RabbitMQTCPOS.sam') && content.includes('RefGuide-M4-Common-RabbitMQTCPOS'))
                    content = content.replace('{Include:RefGuide-M4-Common-RabbitMQTCPOS}','') 

                var thisFileDestination = null; 
                var currentSplittedPath = path.split('/')
                var theName = currentSplittedPath[currentSplittedPath.length - 1].replace('.sam','')

                for(let i = 0; i < dictionary.length; i ++) 
                {
                    if(dictionary[i].filename == theName)
                       thisFileDestination = dictionary[i].destination                         
                }

                if(thisFileDestination == null) 
                {
                   console.error('No destination found for element : ' + path)
                } 

                var newContent = content.replace(/\{Include:(.*?)\}/g, (_,block) => 
                {
                    if(fs.existsSync(sourceDirectory + '/' + includeFileName))
                       fs.appendFileSync(sourceDirectory + '/' + includeFileName, block + '\n', (err) => { if (err) throw err; });
                    else fs.writeFileSync(sourceDirectory + '/' + includeFileName, block + '\n', (err) => { if(err) throw err; });

                    for(let i = 0; i < dictionary.length; i ++) 
                    {
                        var namespaceTmp = getNamespace(dictionary[i].namespace)
                        var blockTmp     = getNamespace(block)

                        if(namespaceTmp.toLowerCase() == blockTmp.toLowerCase())
                        { 
                            var fileName             = dictionary[i].filename;
                            var destinationRoot      = ''
                            var destinationFolder    = ''
                            var destinationSubfolder = ''

                            var fromDestinationRoot      = ''
                            var fromDestinationFolder    = ''
                            var fromDestinationSubfolder = ''
                            //groups elements don't have a subfolder

                            if(dictionary[i].destination != null)
                            {
                               destinationRoot      = dictionary[i].destination.root;
                               destinationFolder    = dictionary[i].destination.folder != undefined ? dictionary[i].destination.folder : '';
                               destinationSubfolder = dictionary[i].destination.subfolder != undefined ? dictionary[i].destination.subfolder : '';
                            }  
                            
                            if(thisFileDestination != null)
                            {
                                fromDestinationRoot      = thisFileDestination.root;
                                fromDestinationFolder    = thisFileDestination.folder != undefined ? thisFileDestination.folder : '';
                                fromDestinationSubfolder = thisFileDestination.subfolder != undefined ? thisFileDestination.subfolder : '';
    
                                var toPath = destinationRoot;
                                if(destinationFolder != '')
                                   toPath += '/' + destinationFolder
                                if(destinationSubfolder != '')
                                    toPath += '/' + destinationSubfolder
        
                                addLineToIncludesFile(fileName + '.sam',false)
    
                                var fromPath = fromDestinationRoot;
                                if(fromDestinationFolder != '')
                                    fromPath += '/' + fromDestinationFolder
                                if(fromDestinationSubfolder != '')
                                    fromPath += '/' + fromDestinationSubfolder
        
                                const backPathLevel = calculateBackPaths(fromPath, toPath);
    
                                switch(backPathLevel)
                                {
                                    case 0 : return '[INCLUDE ' + fileName + '.sam]' 
                                    case 1 : return '[INCLUDE ../' + destinationSubfolder + '/' + fileName + '.sam]' 
                                    case 2 : return '[INCLUDE ../../' + destinationFolder + '/' + destinationSubfolder + '/' + fileName + '.sam]' 
                                    case 3 : return '[INCLUDE ../../../' + destinationRoot + '/' + destinationFolder + '/' + destinationSubfolder + '/' + fileName + '.sam]' 
                                }   
                            }      
                        }
                    }
    
                    return '[INCLUDE ' + block + '.sam]'                  
                });

                newContent = newContent.replace(/\[IMG (.*?)\]/gi, (_,block) => 
                {
                    block = block.replace("(it-IT)","")

                    if(block.includes(MAIN_IMAGES_FOLDER))
                    {
                        if(thisFileDestination != null)
                        {
                            fromDestinationRoot      = thisFileDestination.root;
                            fromDestinationFolder    = thisFileDestination.folder != undefined ? thisFileDestination.folder : '';
                            fromDestinationSubfolder = thisFileDestination.subfolder != undefined ? thisFileDestination.subfolder : '';
        
                            var fromPath = fromDestinationRoot;
                            if(fromDestinationFolder != '')
                                fromPath += '/' + fromDestinationFolder
                            if(fromDestinationSubfolder != '')
                                fromPath += '/' + fromDestinationSubfolder

                            var pathOfMainImages = finalSourceDirectory + '/' + MAIN_IMAGES_FOLDER

                            const backPathLevelImage = calculateBackPaths(fromPath, pathOfMainImages);

                            var backLevelString = '';
                            for(let l = 1; l < backPathLevelImage; l ++)
                                backLevelString += '../'

                            return '[IMG ' + backLevelString + block + ']'
                        }
                    }

                    var blockSplitted = block.split('/')

                    if(blockSplitted[0] == '' || blockSplitted[0] == '"')
                       blockSplitted.shift();

                    if(fs.existsSync(sourceDirectory + '/' + imageFileName))
                        fs.appendFileSync(sourceDirectory + '/' + imageFileName, blockSplitted[blockSplitted.length - 1].replaceAll('"','') + '\n', (err) => { if (err) throw err; });
                    else fs.writeFileSync(sourceDirectory + '/' + imageFileName, blockSplitted[blockSplitted.length - 1].replaceAll('"','') + '\n', (err) => { if(err) throw err; });

                    for(let i = 0; i < dictionary.length; i ++) 
                    {
                        if(blockSplitted[0] == dictionary[i].namespace)
                           return '[IMG _images/' + (blockSplitted[blockSplitted.length - 1]).replaceAll('"','') + ']'
                    } 
                    return '[IMG _images/' + (blockSplitted[blockSplitted.length - 1]).replaceAll('"','') + ']' 
                });

                var newContent = newContent.replace(/\[(.*?)\]/g, (_,block) => 
                {
                    function has_valid_symbol_count(string) 
                    {
                        if (!string) return false;

                        var pipeCount = 0; 
                        var starCount = 0;
                        for (const char of string) 
                        {
                          if(char === '|') 
                             pipeCount++;
                          else if (char === '*') 
                             starCount++;

                          if(pipeCount > 1 || starCount > 1) 
                             return false;
                        }
                        return (pipeCount === 1 || starCount === 1)
                        //pipe or star are used for english/other languages links
                    }                   

                    if(block.includes('#') || block.includes('anchor') || block.includes('http') || block.includes('H4') || block.includes('H5') || block.includes('H6') || 
                       block.includes('Image') || block.includes('imageleft') || block.includes('imageright') || block.includes('imagerightnoborder') || block.includes('IMG') || 
                       block.includes('LINK') || block.includes('STYLE'))
                       return "[" + block + "]";

                    if(!has_valid_symbol_count(block))
                        return "[" + block + "]";

                    var splittedLink = [];
                    if(block.includes('|'))
                       splittedLink = block.split('|')
                    else 
                    {
                       if(block.includes('*'))
                          splittedLink = block.split('*')
                    }

                    if(fs.existsSync(sourceDirectory + '/' + linkFileName))
                       fs.appendFileSync(sourceDirectory + '/' + linkFileName, block + '\n', (err) => { if (err) throw err; });
                    else 
                       fs.writeFileSync(sourceDirectory + '/' + linkFileName, block + '\n', (err) => { if(err) throw err; });

                    var elementForLinkFound = false;

                    for(let i = 0; i < dictionary.length; i ++) 
                    {
                        var namespaceTmp = getNamespace(dictionary[i].namespace)

                        splittedLink[0] = splittedLink[0].replace('(it-IT)','')
                        var blockTmp     = getNamespace(splittedLink[0])
    
                        if(namespaceTmp.toLowerCase() == blockTmp.toLowerCase())
                        {
                            elementForLinkFound = true;

                            let theOutputFolder = dictionary[i].destination.root
                            if(dictionary[i].destination.folder != undefined)
                            {
                                theOutputFolder += '_' + dictionary[i].destination.folder
                                if(dictionary[i].destination.subfolder != undefined)
                                    theOutputFolder += '_' + dictionary[i].destination.subfolder
                            }
                
                            theOutputFolder += '/'

                            var result = "[LINK " + theOutputFolder + dictionary[i].filename + ' ' + splittedLink[1] + "]"
                            return result
                        }
                    }

                    if(!elementForLinkFound)
                    {
                        if(fs.existsSync(sourceDirectory + '/' + missinglinkFileName))
                            fs.appendFileSync(sourceDirectory + '/' + missinglinkFileName, splittedLink[0] + '\n', (err) => { if (err) throw err; });
                         else fs.writeFileSync(sourceDirectory + '/' + missinglinkFileName, splittedLink[0] + '\n', (err) => { if(err) throw err; });
                    }
                    
                    return "[" + block + "]";
                })

                fs.writeFileSync(path, newContent, 'utf-8');
            }
       });
    }
    catch(err) 
    {
       console.error(err)
    }
} 

async function editGroupsFilesAndCreateChaptersStructure() 
{
    try 
    {
        var magoGroups = fs.readdirSync(finalSourceDirectory + '/Mago',{ withFileTypes: true });

        var dataToAppend = ''
        var magoGroupsLs = []
        var magoGeneralFiles = []

        for(let i = 0; i < magoGroups.length; i ++) 
        {      
            if(!magoGroups[i].isDirectory()) 
            {
                magoGeneralFiles.push(magoGroups[i].name)
                continue; 
            }

            var magoContent = startOfContent;
            magoContent     += '[H1 ' + magoGroups[i].name + ' ] ' + magoGroups[i].name + '\n' + 
                               (options.italian ? ('Queste pagine contengono informazioni dettagliate sugli elementi presenti nel menu ' +  magoGroups[i].name + '.\n')  : ('These pages provide detailed information on the features contained in the ' +  magoGroups[i].name + ' menu.\n'))

            fs.writeFileSync(finalSourceDirectory + '/Mago/' + magoGroups[i].name + '/' + magoGroups[i].name + '.sam' , magoContent, err => 
            {
                if (err) 
                console.error(err)
            })

            addLineToIncludesFile(magoGroups[i].name + '.sam')
            dataToAppend += '[INCLUDE source/Mago/' +  magoGroups[i].name + '/' + magoGroups[i].name + '.sam]\n'

            var allTabs  = []
            allTabs      = fs.readdirSync(finalSourceDirectory + '/Mago/' + magoGroups[i].name, { withFileTypes: true });
            allTabsFinal = []
            var genericTabs = []

            for(let j = 0; j < allTabs.length; j ++) 
            {
                if(allTabs[j].isDirectory()) 
                {
                    var allElements = fs.readdirSync(finalSourceDirectory + '/Mago/' + magoGroups[i].name + '/' + allTabs[j].name, { withFileTypes: true });     
                    allTabsFinal.push({ tab : allTabs[j].name, lsFiles : allElements})
                }
                else 
                {
                    if(allTabs[j].name != (magoGroups[i].name + '.sam'))
                       genericTabs.push(allTabs[j].name)
                }
            }
            magoGroupsLs.push({ group : magoGroups[i].name, lsTabs : allTabsFinal, genericTabsLs : genericTabs })
        }

        for(let i = 0; i < magoGroupsLs.length; i ++) 
        {
            var dataToAppendMago = '';
        
            for(let j = 0; j < magoGroupsLs[i].lsTabs.length; j ++) 
            {
                if(magoGroupsLs[i].lsTabs[j].tab != COMMON_FOLDER)
                   dataToAppendMago += '\n[H2 INDEX] ' + magoGroupsLs[i].lsTabs[j].tab + '\n'

                addLineToIncludesFile(magoGroupsLs[i].lsTabs[j].tab)

                for(let k = 0; k < magoGroupsLs[i].lsTabs[j].lsFiles.length; k ++) 
                {
                    addLineToIncludesFile(magoGroupsLs[i].lsTabs[j].lsFiles[k].name)
                    dataToAppendMago += '[INCLUDE ' + finalSourceDirectory + '/Mago/' + magoGroupsLs[i].group + '/' + magoGroupsLs[i].lsTabs[j].tab + '/' + magoGroupsLs[i].lsTabs[j].lsFiles[k].name + ']\n'
                }
            }

            if(magoGroupsLs[i].genericTabsLs.length > 0)
               dataToAppendMago += '\n\n#####GENERIC FILES#####\n\n'
            for(let j = 0; j < magoGroupsLs[i].genericTabsLs.length; j ++) 
            {
                dataToAppendMago += '[INCLUDE ' + finalSourceDirectory + '/Mago/' + magoGroupsLs[i].group + '/' + magoGroupsLs[i].genericTabsLs[j] + ']\n' 
                addLineToIncludesFile(magoGroupsLs[i].genericTabsLs[j])

                var content = fs.readFileSync(finalSourceDirectory + '/Mago/' + magoGroupsLs[i].group + '/' + magoGroupsLs[i].genericTabsLs[j], 'utf-8');
                var theGroupOutputFolder = 'Mago_' + magoGroupsLs[i].group
                var regex = new RegExp(`\\[H4 ${theGroupOutputFolder}`, 'i'); 
                var newContent = content.replace(regex, `[H2 ${theGroupOutputFolder}`);                
                fs.writeFileSync(finalSourceDirectory + '/Mago/' + magoGroupsLs[i].group + '/' + magoGroupsLs[i].genericTabsLs[j], newContent, 'utf-8');
            }
            try 
            {
                fs.appendFileSync(finalSourceDirectory + '/Mago/' + magoGroupsLs[i].group + '/' + magoGroupsLs[i].group + '.sam', dataToAppendMago, () => {});
            }
            catch (err) 
            {
                console.error(err)
            }
        }

        for(let i = 0; i < magoGeneralFiles.length; i ++)
        {
            dataToAppend += '[INCLUDE source/Mago/' +  magoGeneralFiles[i] + ']\n'
            addLineToIncludesFile(magoGeneralFiles[i])
                            
            var content = fs.readFileSync(finalSourceDirectory + '/Mago/' + magoGeneralFiles[i], 'utf-8');
            var theGroupOutputFolder = 'Mago'
            var regex = new RegExp(`\\[H4 ${theGroupOutputFolder}`, 'i'); 
            var newContent = content.replace(regex, `[H1 ${theGroupOutputFolder}`);    
            fs.writeFileSync(finalSourceDirectory + '/Mago/' + magoGeneralFiles[i], newContent, 'utf-8');
        }

        dataToAppend += '[INCLUDE source/TB_Framework/TB_Framework.sam]\n'
        addLineToIncludesFile('TB_Framework')

        var FrameworkMainContent = startOfContent +
                                   '[H1 TB_Framework ] TB_Framework\n' + 
                                   (options.italian ? ('Queste pagine contengono informazioni dettagliate sugli elementi presenti nella sezione TB_FRAMEWORK\n')  : ('These pages provide detailed information on the features contained in the TB_Framework section.\n' ))
                                   
        fs.writeFileSync(finalSourceDirectory + '/TB_Framework/TB_Framework.sam' , FrameworkMainContent, err => 
        {
            if (err) 
            console.error(err)
        })

        var frameworkGroups = fs.readdirSync(finalSourceDirectory + '/TB_Framework',{ withFileTypes: true });
        var frameworkGroupsLs = []
        var frameworkGeneralFiles = []

        for(let i = 0; i < frameworkGroups.length; i ++) 
        {      
            if(!frameworkGroups[i].isDirectory()) 
            {
                if(frameworkGroups[i].name != 'TB_Framework.sam')
                   frameworkGeneralFiles.push(magoGroups[i].name)
                continue; 
            }

            var frameworkContent = startOfContent;
            frameworkContent     += '[H2 ' + frameworkGroups[i].name + '] ' + frameworkGroups[i].name + '\n' + 
                                    (options.italian ? ('Queste pagine contengono informazioni dettagliate sugli elementi presenti nel menu ' +  frameworkGroups[i].name + '.\n')  : ('These pages provide detailed information on the features contained in the ' +  frameworkGroups[i].name + ' menu.\n'))
                   
            fs.writeFileSync(finalSourceDirectory + '/TB_Framework/' + frameworkGroups[i].name + '/' + frameworkGroups[i].name + '.sam' , frameworkContent, err => 
            {
                if (err) 
                console.error(err)
            })

            fs.appendFileSync(finalSourceDirectory + '/TB_Framework/TB_Framework.sam' , '[INCLUDE ' +  finalSourceDirectory + '/TB_Framework/' + frameworkGroups[i].name + '/' + frameworkGroups[i].name + '.sam]\n' , err => 
            {
                if (err) 
                console.error(err)
            })

            addLineToIncludesFile(frameworkGroups[i].name)

            var allTabs  = []
            allTabs      = fs.readdirSync(finalSourceDirectory + '/TB_Framework/' + frameworkGroups[i].name, { withFileTypes: true });
            allTabsFinal = []
            var genericTabs = []

            for(let j = 0; j < allTabs.length; j ++) 
            {
                if(allTabs[j].isDirectory()) 
                {
                    var allElements = fs.readdirSync(finalSourceDirectory + '/TB_Framework/' + frameworkGroups[i].name + '/' + allTabs[j].name, { withFileTypes: true });     
                    allTabsFinal.push({ tab : allTabs[j].name, lsFiles : allElements})
                }
                else 
                {
                    if(allTabs[j].name != (frameworkGroups[i].name + '.sam'))
                       genericTabs.push(allTabs[j].name)
                }
            }
            frameworkGroupsLs.push({ group : frameworkGroups[i].name, lsTabs : allTabsFinal, genericTabsLs : genericTabs })
        }

        for(let i = 0; i < frameworkGroupsLs.length; i ++) 
        {
            var dataToAppendFramework = '';
        
            for(let j = 0; j < frameworkGroupsLs[i].lsTabs.length; j ++) 
            {
                if(frameworkGroupsLs[i].lsTabs[j].tab != COMMON_FOLDER)
                    dataToAppendFramework += '\n[H3 INDEX] ' + frameworkGroupsLs[i].lsTabs[j].tab + '\n'

                for(let k = 0; k < frameworkGroupsLs[i].lsTabs[j].lsFiles.length; k ++) 
                {
                    addLineToIncludesFile(frameworkGroupsLs[i].lsTabs[j].lsFiles[k].name)
                    dataToAppendFramework += '[INCLUDE ' + finalSourceDirectory + '/TB_Framework/' + frameworkGroupsLs[i].group + '/' + frameworkGroupsLs[i].lsTabs[j].tab + '/' + frameworkGroupsLs[i].lsTabs[j].lsFiles[k].name + ']\n'
                }
            }

            if(frameworkGroupsLs[i].genericTabsLs.length > 0)
                dataToAppendFramework += '\n\n#####GENERIC FILES#####\n\n'
            for(let j = 0; j < frameworkGroupsLs[i].genericTabsLs.length; j ++) 
            {
                dataToAppendFramework += '[INCLUDE ' + finalSourceDirectory + '/TB_Framework/' + frameworkGroupsLs[i].group + '/' + frameworkGroupsLs[i].genericTabsLs[j] + ']\n' 
                addLineToIncludesFile(frameworkGroupsLs[i].genericTabsLs[j])
            }
            try 
            {
                fs.appendFileSync(finalSourceDirectory + '/TB_Framework/' + frameworkGroupsLs[i].group + '/' + frameworkGroupsLs[i].group + '.sam', dataToAppendFramework, () => {});
            }
            catch (err) 
            {
                console.error(err)
            }
        }

        for(let i = 0; i < frameworkGeneralFiles.length; i ++)
        {
            dataToAppend += '[INCLUDE source/TB_Framework/' +  frameworkGeneralFiles[i] + ']\n'
                            
            var content = fs.readFileSync(finalSourceDirectory + '/TB_Framework/' + frameworkGeneralFiles[i], 'utf-8');
            var theGroupOutputFolder = 'TB_Framework'
            var regex = new RegExp(`\\[H4 ${theGroupOutputFolder}`, 'i'); 
            var newContent = content.replace(regex, `[H2 ${theGroupOutputFolder}`);   
            fs.writeFileSync(finalSourceDirectory + '/TB_Framework/' + frameworkGeneralFiles[i], newContent, 'utf-8');
        }

        dataToAppend += '[INCLUDE source/TB_Studio/TB_Studio.sam]\n'
        addLineToIncludesFile('TB_Studio')

        var StudioMainContent = startOfContent +
                                '[H1 TB_Studio ] TB_Studio\n' + 
                                (options.italian ? ('Queste pagine contengono informazioni dettagliate sugli elementi presenti nella sezione TB_Studio\n')  : ('These pages provide detailed information on the features contained in the TB_Studio section.\n' ))


        fs.writeFileSync(finalSourceDirectory + '/TB_Studio/TB_Studio.sam' , StudioMainContent, err => 
        {
            if (err) 
            console.error(err)
        })

        var studioGroups = fs.readdirSync(finalSourceDirectory + '/TB_Studio',{ withFileTypes: true });
        var studioGroupsLs = []
        var studioGeneralFiles = []

        const indexOfBusiness = studioGroups.findIndex(obj => obj.name === 'BusinessObjects');
        if (indexOfBusiness != -1) 
            studioGroups.splice(indexOfBusiness, 1);

        fs.appendFileSync(finalSourceDirectory + '/TB_Studio/TB_Studio.sam' , '[INCLUDE ' +  finalSourceDirectory + '/TB_Studio/BusinessObjects/BusinessObjects.sam]\n' , err => 
        {
            if (err) 
            console.error(err)
        })

        addLineToIncludesFile('BusinessObjects')

        for(let i = 0; i < studioGroups.length; i ++) 
        {      
            if(!studioGroups[i].isDirectory()) 
            {
                if(studioGroups[i].name != 'TB_Studio.sam')
                   studioGeneralFiles.push(magoGroups[i].name)
                continue; 
            }

            var studioContent = startOfContent;
            studioContent     += '[H2 ' + studioGroups[i].name + ' ] ' + studioGroups[i].name + '\n' + 
                                 (options.italian ? ('Queste pagine contengono informazioni dettagliate sugli elementi presenti nel menu ' +  studioGroups[i].name + '.\n')  : ('These pages provide detailed information on the features contained in the ' +  studioGroups[i].name + ' menu.\n'))

            fs.writeFileSync(finalSourceDirectory + '/TB_Studio/' + studioGroups[i].name + '/' + studioGroups[i].name + '.sam' , studioContent, err => 
            {
                if (err) 
                console.error(err)
            })

            addLineToIncludesFile(studioGroups[i].name)

            fs.appendFileSync(finalSourceDirectory + '/TB_Studio/TB_Studio.sam' , '[INCLUDE ' +  finalSourceDirectory + '/TB_Studio/' + studioGroups[i].name + '/' + studioGroups[i].name + '.sam]\n' , err => 
            {
                if (err) 
                console.error(err)
            })

            var allTabs  = []
            allTabs      = fs.readdirSync(finalSourceDirectory + '/TB_Studio/' + studioGroups[i].name, { withFileTypes: true });
            allTabsFinal = []
            var genericTabs = []

            for(let j = 0; j < allTabs.length; j ++) 
            {
                if(allTabs[j].isDirectory()) 
                {
                    var allElements = fs.readdirSync(finalSourceDirectory + '/TB_Studio/' + studioGroups[i].name + '/' + allTabs[j].name, { withFileTypes: true });     
                    allTabsFinal.push({ tab : allTabs[j].name, lsFiles : allElements})
                }
                else 
                {
                    if(allTabs[j].name != (studioGroups[i].name + '.sam'))
                       genericTabs.push(allTabs[j].name)
                }
            }
            studioGroupsLs.push({ group : studioGroups[i].name, lsTabs : allTabsFinal, genericTabsLs : genericTabs })
        }

        for(let i = 0; i < studioGroupsLs.length; i ++) 
        {
            var dataToAppendStudio = '';
        
            for(let j = 0; j < studioGroupsLs[i].lsTabs.length; j ++) 
            {
                if(studioGroupsLs[i].lsTabs[j].tab != COMMON_FOLDER)
                    dataToAppendStudio += '\n[H3 INDEX] ' + studioGroupsLs[i].lsTabs[j].tab + '\n'

                for(let k = 0; k < studioGroupsLs[i].lsTabs[j].lsFiles.length; k ++) 
                {
                    addLineToIncludesFile(studioGroupsLs[i].lsTabs[j].lsFiles[k].name)
                    dataToAppendStudio += '[INCLUDE ' + finalSourceDirectory + '/TB_Studio/' + studioGroupsLs[i].group + '/' + studioGroupsLs[i].lsTabs[j].tab + '/' + studioGroupsLs[i].lsTabs[j].lsFiles[k].name + ']\n'
                }
            }

            if(studioGroupsLs[i].genericTabsLs.length > 0)
                dataToAppendStudio += '\n\n#####GENERIC FILES#####\n\n'
            for(let j = 0; j < studioGroupsLs[i].genericTabsLs.length; j ++) 
            {
                dataToAppendStudio += '[INCLUDE ' + finalSourceDirectory + '/TB_Studio/' + studioGroupsLs[i].group + '/' + studioGroupsLs[i].genericTabsLs[j] + ']\n' 
                addLineToIncludesFile(studioGroupsLs[i].genericTabsLs[j])
            }
            try 
            {
                fs.appendFileSync(finalSourceDirectory + '/TB_Studio/' + studioGroupsLs[i].group + '/' + studioGroupsLs[i].group + '.sam', dataToAppendStudio, () => {});
            }
            catch (err) 
            {
                console.error(err)
            }
        }

        for(let i = 0; i < studioGeneralFiles.length; i ++)
        {
            dataToAppend += '[INCLUDE source/TB_Studio/' +  studioGeneralFiles[i] + ']\n'
                            
            var content = fs.readFileSync(finalSourceDirectory + '/TB_Studio/' + studioGeneralFiles[i], 'utf-8');
            var theGroupOutputFolder = 'TB_Studio'
            var regex = new RegExp(`\\[H4 ${theGroupOutputFolder}`, 'i'); 
            var newContent = content.replace(regex, `[H2 ${theGroupOutputFolder}`); 
            fs.writeFileSync(finalSourceDirectory + '/TB_Studio/' + studioGeneralFiles[i], newContent, 'utf-8');
        }

        dataToAppend += '[INCLUDE source/'+ NO_FOLDER +'/' + NO_FOLDER + '.sam]\n'
        addLineToIncludesFile(NO_FOLDER)

        var noFolderMainContent = startOfContent +
                                  '[H1 ' + NO_FOLDER + '] ' + NO_FOLDER + '\n' +                                   
                                  (options.italian ? ('Queste pagine contengono informazioni dettagliate sugli elementi presenti nella sezione ' + NO_FOLDER + '\n')  : ('These pages provide detailed information on the features contained in the ' + NO_FOLDER + ' section.\n' ))

        fs.writeFileSync(finalSourceDirectory + '/' + NO_FOLDER + '/' + NO_FOLDER + '.sam' , noFolderMainContent, err => 
        {
            if (err) 
            console.error(err)
        })

        var noFolderFiles = fs.readdirSync(finalSourceDirectory + '/' + NO_FOLDER,{ withFileTypes: true });

        for(let i = 0; i < noFolderFiles.length; i ++)
        {
            if(noFolderFiles[i].name != (NO_FOLDER + '.sam'))
            {
                addLineToIncludesFile(noFolderFiles[i].name)
                fs.appendFileSync(finalSourceDirectory + '/' + NO_FOLDER + '/' + NO_FOLDER + '.sam' , '[INCLUDE ' +  finalSourceDirectory + '/' + NO_FOLDER + '/' + noFolderFiles[i].name + ']\n' , err => 
                {
                    if (err) 
                    console.error(err)
                })
            }
        }

        /*Careful, with this edit the no folder elements are visible but they create structure problems when included in other files because of the level of the H

        for(let i = 0; i < noFolderFiles.length; i ++)
        {     
            if(noFolderFiles[i].name == (NO_FOLDER + '.sam')) continue;

            var content = fs.readFileSync(finalSourceDirectory + '/' + NO_FOLDER + '/' + noFolderFiles[i].name, 'utf-8');
            var newContent = content.replace(/\[H4 __NO_FOLDER/i,"[H2 __NO_FOLDER")
            fs.writeFileSync(finalSourceDirectory + '/' + NO_FOLDER + '/' + noFolderFiles[i].name, newContent, 'utf-8');
        }*/

        dataToAppend += '[H1 NOINDEX pages/404_not_found] ' + (options.italian ? 'PAGINA NON TROVATA\n' : 'PAGE NOT FOUND\n') +
                        '[IMG ' + finalSourceDirectory + '/__MAIN_IMAGES/404_image.png]\n' +
                        '[LINK MagoCloud ' + (options.italian ? 'Clicca qui per tornare alla homepage!' : 'Click here to get back to homepage!') + ']\n\n' + 
                        '[STYLE custom_home]'

        try 
        {
            fs.appendFileSync(mainDirectory + '/MagoCloud.sam', dataToAppend, function () {});
        } 
        catch (err) 
        {
            console.error(err)
        }
    } 
    catch (err) 
    {
        console.error(err)
    }
}

async function cleanEmptyFoldersRecursively(folder) 
{
    var isDir = fs.statSync(folder).isDirectory();
    if (!isDir) 
        return;

    var files = fs.readdirSync(folder);
    if (files.length > 0) 
    {
        files.forEach(function(file) 
        {
            var fullPath = pathModule.join(folder, file);
            cleanEmptyFoldersRecursively(fullPath);
        });

        files = fs.readdirSync(folder);
    }

    if (files.length == 0) 
    {
        fs.rmdirSync(folder);
        return;
    }
}

async function PrepareOutputGeneration()
{
    try 
    {
         console.log(chalk.hex('#FFFF00').bold('Cleaning old files...'))

         var data = fs.readFileSync(mainDirectory + '/MagoCloud.sam', 'utf-8');
         fs.unlinkSync(mainDirectory + '/MagoCloud.sam')

         data = data.split(options.italian ? "Questo è l'help completo per %%MAGO%% !" : "This is the complete help for %%MAGO%% !")
            
         data[0] += options.italian ? "Questo è l'help completo per %%MAGO%% !" : "This is the complete help for %%MAGO%% !"

         fs.writeFileSync(mainDirectory + '/MagoCloud.sam', data[0] + '\n\n');

         if(fs.existsSync(sourceDirectory + '/' + htmlLogFileName))
            reorderLogFile(sourceDirectory + '/' + htmlLogFileName)

         if(fs.existsSync(sourceDirectory + '/' + emptyLogFileName))
            reorderLogFile(sourceDirectory + '/' + emptyLogFileName)

         if(fs.existsSync(sourceDirectory + '/' + oldMarkupLogFileName))
            fs.unlinkSync(sourceDirectory + '/' + oldMarkupLogFileName);

         if(fs.existsSync(sourceDirectory + '/' + includeFileName))
            fs.unlinkSync(sourceDirectory + '/' + includeFileName);

         if(fs.existsSync(sourceDirectory + '/' + referencedIncludes))
            fs.unlinkSync(sourceDirectory + '/' + referencedIncludes);

         if(fs.existsSync(sourceDirectory + '/' + linkFileName))
            fs.unlinkSync(sourceDirectory + '/' + linkFileName);

         if(fs.existsSync(sourceDirectory + '/' + missinglinkFileName))
            fs.unlinkSync(sourceDirectory + '/' + missinglinkFileName);

         if(fs.existsSync(sourceDirectory + '/' + imageFileName))
            fs.unlinkSync(sourceDirectory + '/' + imageFileName);
         
         await deleteFiles(finalSourceDirectory);
         await deleteFiles(mainDirectory + '/output');
         
         var namespaces_dictionary = await readAndParseFile(`${sourceDirectory}/namespace_name_dictionary.json`);    
         console.log(chalk.hex('#BFFF00').bold('Replacing include blocks...'))
         await replaceIncludeImageAndLinkBlock(sourceDirectory,namespaces_dictionary)

         await cleanEmptyFoldersRecursively(sourceDirectory)

         console.log(chalk.hex('#7FFF00').bold('Moving files to final source directory...'))

         fs.cpSync(sourceDirectory, finalSourceDirectory, { recursive: true }, ()=> {});

         await checkOldBlock(finalSourceDirectory)

         console.log(chalk.hex('#3FFF00').bold('Edit group files and create chapter structure...'))
         await editGroupsFilesAndCreateChaptersStructure()

         reorderLogFile(finalSourceDirectory + '/' + oldMarkupLogFileName)
         reorderLogFile(finalSourceDirectory + '/' + includeFileName)
         reorderLogFile(finalSourceDirectory + '/' + referencedIncludes)
         reorderLogFile(finalSourceDirectory + '/' + linkFileName)
         reorderLogFile(finalSourceDirectory + '/' + imageFileName)
         reorderLogFile(finalSourceDirectory + '/' + missinglinkFileName)
         deleteDuplicatesFromFile(finalSourceDirectory + '/' + includeFileName)
         deleteDuplicatesFromFile(finalSourceDirectory + '/' + referencedIncludes)
         deleteDuplicatesFromFile(finalSourceDirectory + '/' + linkFileName)
         deleteDuplicatesFromFile(finalSourceDirectory + '/' + imageFileName)
         deleteDuplicatesFromFile(finalSourceDirectory + '/' + missinglinkFileName)

         console.log(chalk.hex('#00FF3F').bold('...PHASE 2 COMPLETED!'))
         console.log(chalk.hidden(''))
         if (!options.noSpawn) 
        {
           const scriptPath = pathModule.resolve(__dirname, `${options.root}/help_conversion/convert_images.js`);
           const { spawn } = require('child_process');
           spawn('node', [scriptPath, "--root", options.root, "--dbconfig", options.dbconfig, "--businessObjectsSourceFolder", options.businessObjectsSourceFolder], {stdio: 'inherit', shell: true})
        }
      } 
    catch(err) 
    {
         console.error(err);
    }
}

PrepareOutputGeneration()