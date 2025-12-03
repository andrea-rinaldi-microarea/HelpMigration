const fs                = require('fs');
const path              = require('path');
const sql               = require('mssql')
const options           = require("./commonOptions");
const bawl              = require("./BnWList/BnWList");
const chalk             = require ('chalk');
const convert           = require("./convertPage");   

const workingFolder             = path.join(__dirname, "working");
const emptyLogFileName          = "empty_pages.txt"
const whitelistedLogFileName    = "whitelisted_pages.txt"
const blacklistedLogFileName    = "blacklisted_pages.txt"
const processedLogFileName      = "processed_pages.txt"
const extractedLogFileName      = "extracted_pages.txt"
const discardedLogFileName      = "discarded_pages.txt"
const statisticsLogFileName     = "statistics.txt"
const imagesFileName            = "images.json"

if (options.root == "") 
{
    console.log("'root' parameter required");
    process.exit();
}

const outputFolder  = path.join(options.root, options.language)

var statistics = 
{
    extracted   : 0,
    whitelisted : 0,
    blacklisted : 0,
    empty       : 0,
    discarded   : 0,
    processed   : 0
}

var config = 
{
  user: 'sa',
  password: 'Microarea.',
  server: 'RINAND-NB',
  database: 'MicroareaWiki',
  trustServerCertificate: true
};

var images = [];

if(options.dbconfig != null) 
{
   if(fs.existsSync(options.dbconfig))
      config = JSON.parse(fs.readFileSync(options.dbconfig, 'utf8'));
}

function fsCleanup(str)
{
    try {
        return str.replace(/[^A-Z0-9-]+/ig, "_");
    } catch (error) {
        throw(error)        
    }
}

var adjustedNS = require("./adjustedNS.json");

function adjustProductFolder(folder)
{
    if (folder.toLowerCase() == "m4")   return "ERP";
    if (folder.toLowerCase() == "erp")  return "ERP";

    return folder;
}

function adjustModuleFolder(folder)
{
    return folder;
}

function adjustNS(pageName)
{
    for(let n = 0; n < adjustedNS.length; n++) 
    {
        if (pageName.match(new RegExp(`${adjustedNS[n].match}`,"i"))) 
            return pageName.replace(new RegExp(`${adjustedNS[n].replace.original}`,"i"), adjustedNS[n].replace.adjusted);
    }

    return pageName;
}

function getModuleFolder(pageName)
{
    var ns = pageName.split('-');

    if (ns.length > 2)
        return path.join(fsCleanup(adjustProductFolder(ns[1])), fsCleanup(adjustModuleFolder(ns[2])));
    else if (ns.length > 1)
        return fsCleanup(adjustProductFolder(ns[1]));
    else
        return "";
}

function logPage(logFileName, pageName) 
{
    fs.appendFileSync(path.join(workingFolder, logFileName), pageName + '\n', (err) => {
         if (err) throw err; 
    });
}

function cleanLog(logFileName)
{
    if(fs.existsSync(path.join(workingFolder, logFileName)))
       fs.unlinkSync(path.join(workingFolder, logFileName));
}

async function convertPages() 
{
    console.log(chalk.hidden(''))
    console.log(chalk.bold.white.inverse("== HELP MIGRATION =="));                                                                       
    console.log(chalk.hidden(''))
    console.log(chalk.bold.white.inverse("Language: " + options.language));
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
    // "WHERE [Page] = 'RefGuide-M4-CustomersSuppliers-Documents-Customers(it-IT)'" +
               ' ORDER BY Page';
    // "WHERE [Page] = 'Table-ERP-Accounting-Dbl-MA_AccTemplatesTaxDetail'" +
      return request.query(query);
    })
    .then(result => 
    {
        console.log(`scanning ${result.recordset.length} pages ...`)
        for(let i = 0; i < result.recordset.length; i ++) 
        {
            var helpPage = result.recordset[i];

            logPage(extractedLogFileName, helpPage.Page);
            statistics.extracted++;

            if (!bawl.isWhitelisted(helpPage.Page))
            {
                logPage(discardedLogFileName, helpPage.Page);
                statistics.discarded++;
                continue;
            }
            else
            {
                logPage(whitelistedLogFileName, helpPage.Page);
                statistics.whitelisted++;
            }

            if (bawl.isBlacklisted(helpPage.Page))
            {
                logPage(blacklistedLogFileName, helpPage.Page);
                statistics.blacklisted++;
                logPage(discardedLogFileName, helpPage.Page);
                statistics.discarded++;
                continue;
            }

            if(helpPage.Content.trim() == '')
            {
                logPage(emptyLogFileName, helpPage.Page);
                statistics.empty++
                logPage(discardedLogFileName, helpPage.Page);
                statistics.discarded++;
                continue;
            }

            helpPageName = helpPage.Page.replace(`(${options.language})`,'').replaceAll(' ',''); 

            // helpPageName = adjustNS(helpPageName);

            var destinationFolder = path.join(outputFolder, getModuleFolder(helpPageName));
            var filename = fsCleanup(helpPageName) + ".sam";

            try 
            {
                fs.mkdirSync(destinationFolder,{recursive: true});
                var content = convert.convertPage(helpPage, (imagePath) => {
                    if (!images.includes(imagePath)) {
                        images.push(imagePath)
                        // logPage(imagesFileName, imagePath);
                    }
                });
                fs.writeFileSync(path.join(destinationFolder, filename), content, ()=>{});
            } 
            catch (err) 
            {
                console.error(`Error exporting help page ${helpPageName}:`, err);
            }

            statistics.processed++;
            logPage(processedLogFileName, helpPage.Page);
        }
    })
    .catch(err => 
    {
      console.error(err);
    })
    .finally( () =>
    {
        var statistics_txt = JSON.stringify(statistics,{},2);
        logPage(statisticsLogFileName, statistics_txt);
        var images_json = JSON.stringify(images,{},2);
        logPage(imagesFileName, images_json);
        console.log(chalk.hex('#FF7F00').bold('Disconnecting from database...'))
        console.log(chalk.hex('#FFBF00').bold('...PHASE 1 COMPLETED!'))
        console.log(chalk.hidden(''))
        console.log(statistics_txt)
        console.log('Finalizing ...');
    });
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

async function getAndConvertAssets()
{
    await deleteFiles(outputFolder);

    fs.mkdirSync(outputFolder,{recursive: true});
    
    cleanLog(emptyLogFileName);
    cleanLog(whitelistedLogFileName);
    cleanLog(blacklistedLogFileName);
    cleanLog(processedLogFileName);
    cleanLog(extractedLogFileName);
    cleanLog(discardedLogFileName);
    cleanLog(statisticsLogFileName);
    cleanLog(imagesFileName);

    await convertPages(); 
}

getAndConvertAssets();
