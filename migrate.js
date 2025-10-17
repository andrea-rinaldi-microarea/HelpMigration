const fs                = require('fs');
const path              = require('path');
const sql               = require('mssql')
const options           = require("./commonOptions");
const bawl              = require("./BnWList/BnWList");
const chalk             = require ('chalk');

const workingFolder             = path.join(__dirname, "working");
const emptyLogFileName          = "empty_pages.txt"
const whitelistedLogFileName    = "whitelisted_pages.txt"
const blacklistedLogFileName    = "blacklisted_pages.txt"
const processedLogFileName      = "processed_pages.txt"

if (options.root == "") 
{
    console.log("'root' parameter required");
    process.exit();
}

const outputFolder  = path.join(options.root, options.language)

var statistics = 
{
    extracted         : 0,
    whitelisted       : 0,
    blacklisted       : 0,
    empty             : 0,
    processed         : 0
}

var config = 
{
  user: 'sa',
  password: 'Microarea.',
  server: 'RINAND-NB',
  database: 'MicroareaWiki',
  trustServerCertificate: true
};

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

function getModuleFolder(pageName)
{
    var ns = pageName.split('-');

    if (ns.length > 2)
        return path.join(fsCleanup(ns[1]), fsCleanup(ns[2]));
    else if (ns.length > 1)
        return fsCleanup(ns[1]);
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

function convertPage(helpPage)
{
    return  '[STYLE ../../../mago-styles/mago-help-custom.css]\n\n' +
            helpPage.Content;
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
               ' ORDER BY Page';
    // "WHERE [Page] = 'Table-ERP-Accounting-Dbl-MA_AccTemplatesTaxDetail'" +
      return request.query(query);
    })
    .then(result => 
    {
        console.log(`scanning ${result.recordset.length} pages ...`)
        for(let i = 0; i < result.recordset.length; i ++) 
        {
            statistics.extracted++;

            var helpPage = result.recordset[i];

            helpPage.Page = helpPage.Page.replace(`(${options.language})`,'').replaceAll(' ',''); 

            if (!bawl.isWhitelisted(helpPage.Page))
                continue;
            else
            {
                logPage(whitelistedLogFileName, helpPage.Page);
                statistics.whitelisted++;
            }

            if (bawl.isBlacklisted(helpPage.Page))
            {
                logPage(blacklistedLogFileName, helpPage.Page);
                statistics.blacklisted++;
                continue;
            }

            if(helpPage.Content.trim() == '')
            {
                statistics.empty++
                logPage(emptyLogFileName, helpPage.Page);
                continue;
            }

            var destinationFolder = path.join(outputFolder, getModuleFolder(helpPage.Page));
            var filename = fsCleanup(helpPage.Page) + ".sam";

            try 
            {
                fs.mkdirSync(destinationFolder,{recursive: true});
                var content = convertPage(helpPage);
                fs.writeFileSync(path.join(destinationFolder, filename), content, ()=>{});
            } 
            catch (err) 
            {
                console.error(`Error exporting help page ${helpPage.Page}:`, err);
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
        console.log(chalk.hex('#FF7F00').bold('Disconnecting from database...'))
        console.log(chalk.hex('#FFBF00').bold('...PHASE 1 COMPLETED!'))
        console.log(chalk.hidden(''))
        console.log(JSON.stringify(statistics,{},2))
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

    await convertPages(); 
}

getAndConvertAssets();
