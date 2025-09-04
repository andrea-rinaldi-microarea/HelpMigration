const fs      = require('fs');
const sql     = require('mssql');
const options = require("./commonOptions");

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

const whiteList = require('./whitelist.json');

function isWhitelisted(page) 
{
    for (i = 0; i < whiteList.length; i++) {
        if(page.match(new RegExp(`${whiteList[i]}`,"i")))
           return true;
    }
    return false;
}

const blackList = require('./blacklist.json');

function isBlacklisted(page) 
{
    for (i = 0; i < blackList.length; i++) 
    {
        if(page.match(new RegExp(`${blackList[i]}`,"i")))
           return true;
    }
    return false;
}

sql.connect(config)
.then(pool => 
{
  var request = new sql.Request(pool); 
  var query = `SELECT [Page],
                      [Title],
                      [Content]
                FROM [dbo].[PageContent]
             ORDER BY Page`;
  return request.query(query);
})
.then(result => 
{
    result.recordset.forEach(helpPage => 
    {
        if(options.whitelist != null) 
        {
            if(isWhitelisted(helpPage.Page) && !isBlacklisted(helpPage.Page))
            {
                if(options.link != null)
                   console.log(`https://mymago.zucchetti.com/MagoHelpCenter/Default.aspx?Page=${helpPage.Page}`);
                else console.log(helpPage.Page);  
            }
        }
        else if(options.blacklist != null) 
        {
            if(!(isWhitelisted(helpPage.Page) && !isBlacklisted(helpPage.Page)))
            {
                if(options.link != null)
                   console.log(`https://mymago.zucchetti.com/MagoHelpCenter/Default.aspx?Page=${helpPage.Page}`);
                else console.log(helpPage.Page);  
            }      
        }
    });
});