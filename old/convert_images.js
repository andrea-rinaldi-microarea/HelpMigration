const fs                     = require('fs')
const sql                    = require('mssql')
const options                = require("./commonOptions")
const chalk                  = require('chalk')
const path                   = require('path')
const { exec }               = require('child_process')
const NO_FOLDER              = '__NO_FOLDER'
const mainDirectory          = `${options.root}/help_test/${(options.italian ? 'it' : 'en')}`
const finalSourceDirectory   = mainDirectory + '/source'
const finalOutputDirectory   = mainDirectory + '/output'
const MainImagesPath         = finalSourceDirectory + '/__MAIN_IMAGES'
const dictionaryFile         = finalSourceDirectory + '/namespace_name_dictionary.json'
const imageReferenceFile     = finalSourceDirectory + '/image_reference_list.txt'
const referencedIncludesFile = finalSourceDirectory + '/referenced_include_list.txt'
const superSamFolder         = `"${options.superSamFolder}"`
const not_found_img          = '404_image.png'
var LsPathImages             = []
var ignoreImagesAndIncludes  = false

var config = 
{
  user                   : 'sa',
  password               : 'Microarea.',
  server                 : 'MARTOM2-NB',
  database               : 'help_test',
  trustServerCertificate : true
}

if(options.dbconfig != null) 
{
    if(fs.existsSync(options.dbconfig))
       config = JSON.parse(fs.readFileSync(options.dbconfig, 'utf8'));
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

async function getImagesFromDb()  
{
    sql.connect(config)
    .then(pool => 
    {
      if(!ignoreImagesAndIncludes)
      {
        var request = new sql.Request(pool); 
        var query = `SELECT TOP (10000) [Location] AS Namespace, 
                                        [ImageContent] AS Content, 
                                        [ImageName] 
                       FROM [dbo].[Images] 
                   ORDER BY Location`;
        return request.query(query);
      }
    })
    .then(async result => 
    {
      var dictionary = await readAndParseFile(dictionaryFile);    

      if(!ignoreImagesAndIncludes)
      {
        for(let i = 0; i < result.recordsets[0].length; i ++) 
        {
            var dictionaryElement = null;

            result.recordsets[0][i].Namespace = result.recordsets[0][i].Namespace.replaceAll('\\','').replaceAll('(it-IT)','')

            if(result.recordsets[0][i].Namespace != '')
            {
              for(let j = 0; j < dictionary.length; j ++) 
              {           
                  if(result.recordsets[0][i].Namespace.toLowerCase() == dictionary[j].namespace.toLowerCase())
                  {
                      dictionaryElement = dictionary[j]; 
                      break;
                  }
              }
            }

            var buffer = Buffer.from(result.recordsets[0][i].Content, "hex")

            try 
            {
                if(dictionaryElement != null)
                {     
                   if(dictionaryElement.destination != undefined)
                   {
                     var theDirectory = '';

                     if(dictionaryElement.destination.root == NO_FOLDER)
                        theDirectory = finalSourceDirectory + '/' + dictionaryElement.destination.root + '/_images/';
                     else 
                     {
                        if(dictionaryElement.destination.subfolder != undefined)
                           theDirectory = finalSourceDirectory + '/' + dictionaryElement.destination.root + '/' + dictionaryElement.destination.folder + '/' + dictionaryElement.destination.subfolder + '/_images/';
                        else 
                        {
                          if(dictionaryElement.destination.folder != undefined)
                             theDirectory = finalSourceDirectory + '/' + dictionaryElement.destination.root + '/' + dictionaryElement.destination.folder + '/_images/';
                          else 
                             theDirectory = finalSourceDirectory + '/' + dictionaryElement.destination.root + '/_images/';
                        }
                     }

                     if(!fs.existsSync(theDirectory))
                        fs.mkdirSync(theDirectory, { recursive: true });

                     fs.writeFileSync(theDirectory + result.recordsets[0][i].ImageName, buffer)
                     LsPathImages.push(theDirectory + result.recordsets[0][i].ImageName)
                   }
                   else 
                   {
                       fs.writeFileSync(MainImagesPath + '/' + result.recordsets[0][i].ImageName, buffer)      
                       LsPathImages.push(MainImagesPath + '/' + result.recordsets[0][i].ImageName)
                   }
                }
                else 
                {
                  fs.writeFileSync(MainImagesPath + '/' + result.recordsets[0][i].ImageName, buffer) 
                  LsPathImages.push(MainImagesPath + '/' + result.recordsets[0][i].ImageName)
                } 
            }
            catch(err)
            {
              console.error(err)
            }          
        }
      }
    })
    .then(()=>
    {
      fs.cpSync(mainDirectory + '/' + not_found_img, MainImagesPath + '/' + not_found_img, { recursive: true }, ()=> {});

      console.log(chalk.hex('#00FF7F').bold('Cleaning not referenced files...'))
      cleaningNotReferencedIncludesAndImages()

      try 
      {         
          console.log(chalk.hex('#007FFF').bold('...PHASE 3 COMPLETED!'))
          console.log(chalk.hidden(''))
          console.log(chalk.hex('#3F00FF').bold('Building the prjsam...'))  
          console.log(chalk.hidden(''))
          
          const { spawn } = require('child_process');
          var source = `${options.root}/help_test/${(options.italian ? 'it' : 'en')}/MagoCloud-HelpCenter.prjsam`
          var output = `${options.root}/help_test/${(options.italian ? 'it' : 'en')}/output`
  
          const child =  spawn('build_help_center.bat', [superSamFolder,source,output], {stdio: 'inherit', shell: true})
  
          child.on('error', (error) => 
          {
            console.error(`Error building the prjsam: ${error.message}`);
          });
  
          child.on('close', (code) => 
          {
            console.log(chalk.hidden(''))
            console.log(chalk.hex('#8B00FF').bold('...PROJECT GENERATED SUCCESSFULLY!'))  
            console.log(chalk.hidden(''))
            console.log(chalk.bold.white.inverse("********************************************************************"));
            console.log(chalk.hidden(''))

            const img_files = fs.readdirSync(options.root + '/mago-styles');
            img_files.forEach(file => 
            {
                const ext = path.extname(file);
                if (ext.toLowerCase() === '.png') 
                {
                    const sourceFile = path.join(options.root + '/mago-styles', file);
                    const destFile = path.join(output + '/magocloud/images', file);
                    fs.copyFileSync(sourceFile, destFile);
                }
            });

            var cssFileName = output + '/resources/mago-help-custom.css'
            var cssContent = fs.readFileSync(cssFileName, 'utf-8');
            var newContent = cssContent.replaceAll("/HelpCenter/mago-styles/","../magocloud/images/")
            fs.writeFileSync(cssFileName, newContent, 'utf-8');

            fs.cpSync(options.root + '/help_conversion/images/it_flag.png', output + '/magocloud/images/it_flag.png', { recursive: true }, ()=> {});
            fs.cpSync(options.root + '/help_conversion/images/en_flag.png', output + '/magocloud/images/en_flag.png', { recursive: true }, ()=> {});

            exec(`${finalOutputDirectory}/index.html`, () => {})
          });
      }
      catch(err) 
      {
         console.error(err)
      }
    })
    .catch(err => 
    {
      console.error(err);
    });
}

function cleaningNotReferencedIncludesAndImages()
{
    if(!ignoreImagesAndIncludes)
    {
      var dataImages         = fs.readFileSync(imageReferenceFile, 'utf-8');
      var lsImagesReferences = dataImages.split('\n');

      var deletedImages = 0;

      for(let i = 0; i < LsPathImages.length; i ++)
      {
          var imageFound = false; 

          for(let j = 1; j < lsImagesReferences.length; j ++)
          {
              if(LsPathImages[i].includes(lsImagesReferences[j]))
              { 
                 imageFound = true; 
                 break; 
              }            
          }

          if(!imageFound)
          {
              try 
              {
                 fs.unlinkSync(LsPathImages[i]); 
                 deletedImages++
              }
              catch(err)
              {
                //console.error(err)
              }      
          }
      }
    
      var dataInclude = fs.readFileSync(referencedIncludesFile, 'utf-8');
      var lsIncludes  = dataInclude.split('\n');

      function cleaningNotReferencedIncludes(thePath, theList)
      {
        try 
        { 
          fs.readdirSync(thePath, { withFileTypes: true }).forEach(dirent => 
          {
              var path = `${thePath}/${dirent.name}`;
              if (dirent.isDirectory()) 
                  cleaningNotReferencedIncludes(path,theList)
              else if (dirent.isFile() && path.endsWith('.sam')) 
              {
                  var includeFound = false
                  for(let i = 1; i < theList.length; i ++)
                  {
                      if(path.includes(theList[i]))
                      { 
                        includeFound = true; 
                        break; 
                      }
                  }
        
                  if(!includeFound)
                  {
                      console.log('File not referenced : ' + path)
                      try 
                      {
                        fs.unlinkSync(path); 
                      }
                      catch(err)
                      {
                        console.error(err)
                      }      
                  }
              }
          })
        }
        catch(err)
        {
          console.error(err)
        }
      }

      cleaningNotReferencedIncludes(finalSourceDirectory,lsIncludes)
    }
}

async function getAndConvertImages()
{
  try 
  {
    fs.mkdirSync(MainImagesPath,{recursive: true});
  } 
  catch (err) 
  {
    console.error(err);
  }
  finally
  {
    console.log(chalk.hex('#00FF7F').bold('Downloading images from database...'))
    getImagesFromDb()
  }
}

getAndConvertImages()