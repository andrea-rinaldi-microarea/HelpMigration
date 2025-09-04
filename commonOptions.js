const commandLineArgs = require('command-line-args');
const optionDefinitions = [
                              { name: 'root', type: String, defaultValue: "C:/HelpCenter" },
                              { name: 'businessObjectsSourceFolder', type: String, defaultValue: "C:/helpgensource" },
                              { name: 'superSamFolder', type: String, defaultValue: "C:/Program Files/Zucchetti Supersam/supersam.exe" },
                              { name: 'folder', type: String, defaultValue: "C:/MagoDevelop/Standard/Applications/ERP" },
                              { name: 'dbconfig', type: String},
                              { name: 'link', type: Boolean },
                              { name: 'whitelist', alias: 'w', type: Boolean },
                              { name: 'blacklist', alias: 'b', type: Boolean },
                              { name: 'output', type: String },
                              { name: 'noSpawn', type: Boolean, defaultValue: false },
                              { name: 'italian', type: Boolean, defaultValue: true }
                          ];
const options  = commandLineArgs(optionDefinitions);
module.exports = options;