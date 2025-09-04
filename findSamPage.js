const express               = require('express');
const fs                    = require('fs');
const path                  = require('path');
const cors                  = require('cors'); 
const options               = require("./commonOptions");
const app                   = express();
const PORT                  = 3000;
const mainDirectory         = `${options.root}/help_test/`
const dictionaries_location = 'source/namespace_name_dictionary.json'
const notFoundPage          = '404_not_found.html'
const enDictionary          = require(mainDirectory + 'en/' + dictionaries_location);
const itDictionary          = require(mainDirectory + 'it/' + dictionaries_location);
const itParameter           = 'it'
const enParameter           = 'en'

function getHtmlPageObject(namespace,language)
{
    if(language == itParameter)
    {
        var objIt = itDictionary.find(obj => { return obj.namespace == namespace })
    
        if(objIt) 
           return { "filename" : objIt.filename, "language" : "it" }
    }

    var objEn = enDictionary.find(item => item.namespace == namespace);
    
    if(objEn) 
        return { "filename" : objEn.filename, "language" : "en" }
    
    return undefined
}

app.use(cors());

app.get('/getHelp', (req, res) => {
    const { namespace, language } = req.query;

    if(!namespace) 
        return res.status(400).send('Namespace query parameter is required.');
    if(!language)
        return res.status(400).send('Language query parameter is required.');
    if(language != itParameter && language != enParameter)
        return res.status(400).send('Language query parameter must be "en" or "it".');

    var pageObject = getHtmlPageObject(namespace,language)

    if(!pageObject)
    {
        const fileUrl = `file://${path.join(mainDirectory, language, 'output', 'index.html').replace(/\\/g, '/') + '?page=' + `magocloud/pages/${notFoundPage}`}`;
        res.json({ url: fileUrl });
    }
    else 
    {
        const filePath = path.join(mainDirectory, pageObject.language, 'output', 'magocloud', 'pages', `${pageObject.filename}.html`);

        var finalPageName = '';

        if(!fs.existsSync(filePath)) 
            finalPageName = `magocloud/pages/${notFoundPage}`;
        else 
            finalPageName = `magocloud/pages/${pageObject.filename}.html`;
        
        const fileUrl = `file://${path.join(mainDirectory, pageObject.language, 'output', 'index.html').replace(/\\/g, '/') + '?page=' + finalPageName}`;
        res.json({ url: fileUrl });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
