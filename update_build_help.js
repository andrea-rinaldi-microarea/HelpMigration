const fs                    = require('fs')
const pathModule            = require('path')
const options               = require("./commonOptions")
const mainDirectory         = `${options.root}/help_test/${options.italian ? 'it' : 'en'}`
const finalOutputDirectory  = mainDirectory + '/output'
const finalSourceDirectory  = mainDirectory + '/source'
const newDictionaryFilename = "post_conversion_dictionary.json"
const superSamFolder        = `"${options.superSamFolder}"`
const { exec }              = require('child_process')
const { spawn }             = require('child_process');
var dictionaryList          = []

async function deleteFiles(directory) 
{
    try 
    { 
        const files = fs.readdirSync(directory);

        for (let file of files) 
        {
            const filePath = `${directory}/${file}`;

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

function buildHelp()
{
    try 
    {         
        console.log('Building the prjsam...') 
        
        const source = `${options.root}/help_test/${(options.italian ? 'it' : 'en')}/MagoCloud-HelpCenter.prjsam`
        const output = `${options.root}/help_test/${(options.italian ? 'it' : 'en')}/output`
        const child  =  spawn('build_help_center.bat', [superSamFolder,source,output], {stdio: 'inherit', shell: true})

        child.on('error', (error) => 
        {
          console.error(`Error building the prjsam: ${error.message}`);
        });

        child.on('close', (code) => 
        {
          console.log('')
          console.log('...PROJECT GENERATED SUCCESSFULLY!')  
          console.log('')

          const img_files = fs.readdirSync(options.root + '/mago-styles');
          img_files.forEach(file => 
          {
              let ext = pathModule.extname(file);
              if (ext.toLowerCase() === '.png') 
              {
                  const sourceFile = pathModule.join(options.root + '/mago-styles', file);
                  const destFile   = pathModule.join(output + '/magocloud/images', file);
                  fs.copyFileSync(sourceFile, destFile);
              }
          });

          const cssFileName = output + '/resources/mago-help-custom.css'
          const cssContent  = fs.readFileSync(cssFileName, 'utf-8');
          const newContent  = cssContent.replaceAll("/HelpCenter/mago-styles/","../magocloud/images/")
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
}

function getRedirectPath(text) 
{
    const redirectPattern = /\[REDIRECT[\s\S]*?\]/;  
    let match = text.match(redirectPattern);

    if (match) 
    {
        let parts = match[0].split(' ');  
        return parts[1].split('/')[1];
    }

    return null;
}
  
async function createDictionary(directory) 
{
    try 
    { 
        fs.readdirSync(directory, { withFileTypes: true }).forEach(dirent => 
        {
            const path = `${directory}/${dirent.name}`;
            if (dirent.isDirectory()) 
                createDictionary(path)
            else if (dirent.isFile() && path.endsWith('.sam') && !path.includes('BusinessObjects')) 
            {    
                const content = fs.readFileSync(path, 'utf-8');
                if(content.includes('[REDIRECT'))
                {
                    const theNamespace = getRedirectPath(content)
                    if(theNamespace != null)
                    {
                        const theFilename   = pathModule.basename(path);
                        let outputFolder    = path.split('source/')[1];
                        outputFolder        = outputFolder.split('/')
                        outputFolder        = outputFolder.slice(0,outputFolder.length - 1)
                        outputFolder.length = 3;
                        
                        if(outputFolder[1] == undefined)
                           outputFolder = outputFolder[0]
                        else 
                        {
                           if(outputFolder[2] == undefined)
                              outputFolder = outputFolder[0] + '_' + outputFolder[1]
                           else outputFolder = outputFolder.join('_');
                        }
                         
                        dictionaryList.push({"namespace" : theNamespace, "filename" : theFilename.replace('.sam',''), "outputFolder" : outputFolder})
                    }
                }   
            }
        })

        fs.writeFileSync(pathModule.join(finalSourceDirectory,newDictionaryFilename), JSON.stringify(dictionaryList,{},2));
    }
    catch(err)
    {
        console.error(err)
    }
}

console.log('Clearing the output folder...')  
console.log('')

deleteFiles(mainDirectory + '/output').then(()=>
{
    console.log('Creating dictionary for API...')  
    console.log('')

    createDictionary(finalSourceDirectory).then(()=>
    {
        buildHelp()
    })
})