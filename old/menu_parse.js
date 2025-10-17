'use strict';
const fs      = require('fs');
const xml2js  = require('xml2js');
const path    = require('path');
const options = require("./commonOptions");
const parser  = new xml2js.Parser();

function cleanTextForDirName(text) 
{
    var modifiedText = text.replace(/[^a-zA-Z0-9\s]/g, "_");
    var finalText = modifiedText.replace(/\s+/g, "_");
    finalText = finalText.replace("_", "");
    return finalText;
}

function assignRootFolderForApplication(text) 
{
    if (text == "Mago4")                 return "Mago";
    if (text == "TaskBuilder Studio")    return "TB_Studio";
    if (text == "TaskBuilder Framework") return "TB_Framework";

    return cleanTextForDirName(text);
}

function searchRecursiveFileByName (dir, pattern) 
{
    var results = [];
  
    fs.readdirSync(dir).forEach(function (dirInner)
    {
      dirInner = path.resolve(dir, dirInner);
  
      var stat = fs.statSync(dirInner);
  
      if (stat.isDirectory()) 
          results = results.concat(searchRecursiveFileByName(dirInner, pattern));
  
      if (stat.isFile() && dirInner.endsWith(pattern)) 
          results.push(dirInner);
    });  

    return results;
};

function create_locations(filename, location, objectList) 
{
    objectList.forEach(function(object)
    {
        if(object != undefined && object.Object[0] != undefined)
        {
            var namespace = object.Object[0];
            var title = (object.Title != undefined && object.Title[0] != undefined && object.Title[0]._ != undefined) ?
                            object.Title[0]._ :
                            "";
            menu_locations.push({
                                menuFilename: filename,
                                source: namespace,
                                coordinates : 
                                {
                                    application: location.application,
                                    group: location.group,
                                    tab: location.tab,
                                    tile: location.tile,
                                    title: title
                                },
                                destination: 
                                {
                                    root: location.root,
                                    folder: location.folder,
                                    subfolder: location.subfolder,
                                    h0: location.h0,
                                    h1: location.h1,
                                    h2: location.h2,
                                    h3: location.h3
                                }                
                           })
        }
    })
}

var menuFiles = searchRecursiveFileByName(options.folder,'.menu')

var menu_locations = [];

async function ScanMenuFiles() 
{
    try 
    {
        for(let i = 0; i < menuFiles.length; i ++) 
        {
            var data = fs.readFileSync(menuFiles[i]);
            var filename = menuFiles[i];
            parser.parseString(data, function(err, menu)  
            {
                if(err) return console.error(err);
    
                menu.AppMenu.Application.forEach((app) => 
                {
                    if(app.$ == undefined || app.$.name == undefined) 
                    {
                        console.error(`missing name of Application in ${menuFiles[i]}`);
                        return; // continue forEach loop
                    }

                    var location = { application : app.$.name };
                    location.h0 = (app.Title != undefined && app.Title[0] != undefined && app.Title[0]._ != undefined) ? app.Title[0]._ : "";
                    location.root = assignRootFolderForApplication(location.h0);

                    if(app.Group == undefined) 
                    {
                        console.error(`missing Group in ${menuFiles[i]}`);
                        return; // continue forEach loop
                    }

                    app.Group.forEach((grp) => {
                        if(grp.$ == undefined || grp.$.name == undefined) 
                        {
                            console.error(`missing name of Group in ${menuFiles[i]}`);
                            return; // continue forEach loop
                        }

                        location.group = grp.$.name;
                        location.h1 = (grp.Title != undefined && grp.Title[0] != undefined && grp.Title[0]._ != undefined) ? grp.Title[0]._ : "";
                        location.folder = cleanTextForDirName(location.h1)

                        if(grp.Menu == undefined) 
                        {
                            console.error(`missing Menu of Group ${location.group} in ${menuFiles[i]}`);
                            return; // continue forEach loop
                        }

                        grp.Menu.forEach((mnuTab) => 
                        {
                            if(mnuTab.$ == undefined || mnuTab.$.name == undefined) 
                            {
                                console.error(`missing name of Menu in Group ${location.group}, file ${menuFiles[i]}`);
                                return; // continue forEach loop
                            }

                            location.tab = mnuTab.$.name;
                            location.h2 = (mnuTab.Title != undefined  && mnuTab.Title[0] != undefined && mnuTab.Title[0]._ != undefined) ? mnuTab.Title[0]._ : "";
                            location.subfolder = cleanTextForDirName(location.h2)

                            if(mnuTab.Menu == undefined) 
                            {
                                console.error(`missing sub-Menu in Menu ${location.Tab} of Group ${location.group} in ${menuFiles[i]}`);
                                return; // continue forEach loop
                            }

                            mnuTab.Menu.forEach((mnuTile) => 
                            {
                                if(mnuTile.$ == undefined || mnuTile.$.name == undefined) 
                                {
                                    console.error(`missing name of sub-Menu in Menu ${location.Tab} of Group ${location.group}, file ${menuFiles[i]}`);
                                    return; // continue forEach loop
                                }

                                location.tile = mnuTile.$.name;
                                location.h3 = (mnuTile.Title != undefined && mnuTile.Title[0] != undefined && mnuTile.Title[0]._ != undefined) ? mnuTile.Title[0]._ : "";

                                if (mnuTile.Document !== undefined)
                                    create_locations(filename, location, mnuTile.Document);
                                if (mnuTile.Batch !== undefined)
                                    create_locations(filename, location, mnuTile.Batch);                      
                                if (mnuTile.Function !== undefined)
                                    create_locations(filename, location, mnuTile.Function);
                                if (mnuTile.Report !== undefined)
                                    create_locations(filename, location, mnuTile.Report);
                            });
                        });
                    })
                });
        
                return true;
            });
        }
    } 
    catch(err) 
    {
        console.error(err)
        console.error(menuFiles[i])
        parser.parseString(data, function(err, menu) 
        {
            console.error(menu)
        })
    }
}

function adjustDestination(location) 
{
    for (let l = 0; l < menu_locations.length; l++) 
    {
        const loc = menu_locations[l];
        // if missing folder, look for a group with the same name
        if  (
                location.destination.folder === "" &&   
                loc.coordinates.group == location.coordinates.group &&
                loc.destination.folder != ""
            ) 
        {
                location.destination.folder = loc.destination.folder;
                location.destination.h1 = loc.destination.h1;
        }
        // if missing subfolder, look for a group and a tab with the same name
        if  (
                location.destination.subfolder === "" &&
                loc.coordinates.group == location.coordinates. group &&
                loc.coordinates.tab == location.coordinates.tab && 
                loc.destination.subfolder != ""
            ) 
        {
                location.destination.subfolder = loc.destination.subfolder;
                location.destination.h2 = loc.destination.h2;
        }
        // if missing h3, look for a group, a tab and a tile with the same name
        if  (
                location.destination.h3 === "" &&
                loc.coordinates.group == location.coordinates.group &&
                loc.coordinates.tab == location.coordinates.tab && 
                loc.coordinates.tile == location.coordinates.tile &&
                loc.destination.h3 != ""
            ) 
        {
                location.destination.h3 = loc.destination.h3;
        }

        // if no destination elements are missing, search is complete 
        if  (
                location.destination.folder != "" &&
                location.destination.subfolder != "" &&
                location.destination.h3 != ""
            ) 
            return;
    }
    console.error(`missing destination element: ${JSON.stringify(location,{},2)}`);
} 

// some errors in the .menu file are generating wrong locations
// - Logistcs -> Logistics
// - Parametersand_Services - > Preferences or Services
// - Tables / General -> Retail / Tables
function fixMenuErrors(location) 
{
    if (location.destination.folder === "Logistcs") {
        location.destination.folder = "Logistics";
        location.destination.h1 = "Logistics";
    }

    if (location.destination.folder === "Parametersand_Services" && location.coordinates.group === "ERP.Services") {
        location.destination.folder = "Services";
        location.destination.h1 = "Services";
    }

    if (location.destination.folder === "Parametersand_Services" && location.coordinates.group === "ERP.Preferences") {
        location.destination.folder = "Preferences";
        location.destination.h1 = "Preferences";
    }

    if (location.destination.folder === "Tables" && location.coordinates.group === "ERP.Retail") {
        location.destination.subfolder = location.destination.folder;
        location.destination.folder = "Retail";
        location.destination.h2 = location.destination.h1;
        location.destination.h1 = "Retail";
    }
}

async function menu_parse() 
{
    await ScanMenuFiles();

    for (let l = 0; l < menu_locations.length; l++) 
    {
        const location = menu_locations[l];
        if (location.destination.folder === "" || location.destination.subfolder === "" || location.destination.h3 === "")
            adjustDestination(location);
        fixMenuErrors(location);
    }

    if (options.output != undefined ) 
        fs.writeFileSync(options.output, JSON.stringify(menu_locations,{},2));
    else console.log(JSON.stringify(menu_locations,{},2));
}

menu_parse();