const fs                = require('fs');
const path              = require('path');
const sql               = require('mssql')
const options           = require("./commonOptions");
const chalk             = require ('chalk');

const images = require(path.join(__dirname, "working","images.json"));


const outputFolder  = path.join(options.root, options.language, "__IMAGES");

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

function isToExport(imgNamespace) 
{
    for (i = 0; i < images.length; i++) {
        if(imgNamespace.toLowerCase() == images[i].toLowerCase())
           return true;
    }
    return false;
}

async function extractImages()  
{
    console.log(chalk.hidden(''))
    console.log(chalk.bold.white.inverse("== IMAGES MIGRATION =="));                                                                       
    console.log(chalk.hidden(''))
    console.log(chalk.bold.white.inverse("Language: " + options.language));
    console.log(chalk.hidden(''))
    console.log(chalk.hex('#FF0000').bold('Connecting to database...'))

    sql.connect(config)
    .then(pool => 
    {
        var request = new sql.Request(pool); 
        var query = `SELECT [Location], 
                            [ImageContent], 
                            [ImageName] 
                       FROM [dbo].[Images]`;
        return request.query(query);
    })
    .then(result => 
    {
        console.log(`extracting ${result.recordset.length} images ...`)
        for(let i = 0; i < result.recordset.length; i ++) 
        {
            var img = result.recordset[i];
            var subfolder = img.Location.slice(0, -1);
            var imgNamespace = (subfolder == "") ? img.ImageName : `${subfolder}/${img.ImageName}`;

            if (!isToExport(imgNamespace))
                continue;

            var destinationFolder = path.join(outputFolder,subfolder);

            var buffer = Buffer.from(img.ImageContent, "hex");

            try 
            {
                fs.mkdirSync(destinationFolder,{recursive: true});
                fs.writeFileSync(path.join(destinationFolder, img.ImageName), buffer);
            } 
            catch (err) 
            {
                console.error(`Error exporting image ${imgNamespace}:`, err);
            }
        }
    })
    .catch(err => 
    {
      console.error(err);
    })
    .finally( () =>
    {
        console.log(chalk.hex('#FF7F00').bold('Disconnecting from database...'))
        console.log(chalk.hex('#FFBF00').bold('...IMAGES EXPORT COMPLETED!'))
        console.log(chalk.hidden(''))
        console.log('Finalizing ...');
    })
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


async function getAndExtractImages()
{
    await deleteFiles(outputFolder);

    fs.mkdirSync(outputFolder,{recursive: true});

    await extractImages(); 
}

getAndExtractImages();
