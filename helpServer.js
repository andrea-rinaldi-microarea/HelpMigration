const express               = require('express');
const validator             = require('validator');
const path                  = require('path');
const rateLimit             = require('express-rate-limit');
const app                   = express();
const fs                    = require('fs');
const cors                  = require('cors'); 
const PORT                  = 3000;
const options               = require("./commonOptions");
const mainDirectory         = `${options.root}/help_test/`
const dictionaries_location = 'source/post_conversion_dictionary.json'//'source/namespace_name_dictionary.json'
const notFoundPage          = '404_not_found.html'
const enDictionary          = require(mainDirectory + 'en/' + dictionaries_location);
const itDictionary          = require(mainDirectory + 'it/' + dictionaries_location);
const itParameter           = 'it'
const enParameter           = 'en'
const outputDirEn           = mainDirectory + "en/output";
const outputDirIt           = mainDirectory + "it/output"

// limit each IP to 100 requests per 5 minutes
const limiter = rateLimit(
{
    windowMs: 5 * 60 * 1000,
    max: 100, 
});

app.use('/findHelp', limiter);
app.use(express.static(path.join(__dirname, 'images')));
app.use('/en_help', express.static(outputDirEn));
app.use('/it_help', express.static(outputDirIt));
app.use(cors());

app.get('/', (req, res) => 
{
    res.redirect(`/en_help`);
});

app.get('/en_help', (req, res) => 
{
    res.sendFile(path.join(outputDirEn, 'index.html'));
});

app.get('/it_help', (req, res) => 
{
    res.sendFile(path.join(outputDirIt, 'index.html'));
});

app.get('/error', (req, res) => 
{
    res.sendFile(path.join(__dirname, 'error.html'));
});

function getHtmlPageObjectWithFallback(namespace, language) 
{
    var fallbackDone = false;

    function findInNamespace(namespaceParts, dictionary) 
    {
        if (namespaceParts.length === 0) return undefined;
        
        let currentNamespace = namespaceParts.join('-');
        let result = dictionary.find(obj => obj.namespace === currentNamespace);
        
        if (result) 
        {
            if(namespaceOriginalLength != namespaceParts.length)
               fallbackDone = true;

            return result;
        }
        
        namespaceParts.pop();
        return findInNamespace(namespaceParts, dictionary);
    }

    let namespaceParts = namespace.split('-');
    let namespaceOriginalLength = namespaceParts.length;

    if (language === itParameter) 
    {
        let resultIt = findInNamespace([...namespaceParts], itDictionary); 
        if (resultIt) 
        {
            return {
                "filename": resultIt.filename,
                "language": "it",
                "outputFolder": resultIt.outputFolder,
                "fallback" : fallbackDone
            };
        }
    }
    
    let resultEn = findInNamespace([...namespaceParts], enDictionary);
    if (resultEn) 
    {
        return {
            "filename": resultEn.filename,
            "language": "en",
            "outputFolder": resultEn.outputFolder,
            "fallback" : fallbackDone
        };
    }

    return undefined; 
}

app.get('/findHelp', (req, res) => 
{
    try 
    {
        var { namespace, language } = req.query;

        if (!namespace || typeof namespace !== 'string') 
            return res.status(400).redirect(`/error?error=namespace`);
    
        if (!language) 
            return res.status(400).redirect(`/error?error=language`);
        
        if (language != enParameter && language != itParameter) 
            return res.status(400).redirect(`/error?error=invalidLanguage`);
    
        var pageObject = getHtmlPageObjectWithFallback(namespace,language)
    
        if(!pageObject)
            res.redirect(`/${language}_help/?page=magocloud/pages/${notFoundPage}`);
        else 
        {
            const filePath = path.join(mainDirectory, pageObject.language, 'output', 'magocloud', pageObject.outputFolder, `${pageObject.filename}.html`);
    
            var finalPageName = '';
    
            if(!fs.existsSync(filePath)) 
                finalPageName = `magocloud/pages/${notFoundPage}`;
            else 
                finalPageName = `magocloud/${pageObject.outputFolder}/${pageObject.filename}.html${pageObject.fallback ? '&fallback=true' : ''}`;
                    
            res.redirect(`/${pageObject.language}_help/?page=${finalPageName}`);
        }
    }
    catch(err) 
    {
        return res.status(500).redirect(`/error?error=server`);
    }
});

app.listen(PORT, () => 
{
    console.log(`Help Server is listening on port ${PORT}`);
});