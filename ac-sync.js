const fs = require('fs'),
  https = require('https'),
  http = require('http'),
  path = require('path'),
  chokidar = require('chokidar'),
  pd = require('pretty-data').pd,
  dateformat = require('dateformat'),
  consoleColors = require('./utils/consoleColors'),
  ACC = require('ac-connector'),
  ACCLogManager = ACC.ACCLogManager,
  xtkQueryDef = ACC.xtkQueryDef,
  xtkSession = ACC.xtkSession;
const fsPromises = fs.promises;
const userFileMappingName = getUserHome() + path.sep + ".ac-connector" + path.sep + "ACSyncFileMapping.json";

var fileMapping = require("./conf/fileMapping");

/*User file mapping handling*/
var userFileMapping;
try{

  userFileMapping =  require( userFileMappingName );
  fileMapping = fileMapping.concat( userFileMapping );
}
catch( e )
  {
    //If the user file mapping JSON doesn't exist, we try to create it (empty)
    fsPromises.writeFile( userFileMappingName , JSON.stringify([]) )
    .catch( (e) => {
      console.log('Error while creating user mapping file : ' + userFileMappingName);
      console.log( e );
    });
  }


function ACSync( options ){
  this.options = options || {};
  this.enableLog = false;
  this.watcherByDirectory = {};

  if (!fs.existsSync( ACSync.backupDir )) {
    fs.mkdirSync( ACSync.backupDir )
  }

  if( this.options.connectionName )
    {
      this.accLogin = ACCLogManager.getLogin( this.options.connectionName );
      this.connection = ACCLogManager.getConnection( this.options.connectionName, true );
      this.longinPromise = this.accLogin.getLoginPromise();
      this.longinPromise.catch( e => { console.log('Error while login : ', e.response && e.response.body ? e.response.body : "") } );
    }
  if( this.options.enableLog )
    this.enableLog = options.enableLog;
}

ACSync.backupDir = ACCLogManager.configPath + path.sep + "ACSyncBackup" + path.sep ;

ACSync.prototype.log = function( message )
   {
    if(this.enableLog)
      console.log( message );
   }


ACSync.fileMapByExtension = {};
ACSync.fileMapByFetch = {};
fileMapping.forEach( (map) => {
  map.fetch = map.schema;
  if( map.specificKey )
    map.fetch += "[" + map.specificKey + "]";
  if( "xml" == map.fileExtension )
    map.isXML = true;

  if( map.fileExtension )
      ACSync.fileMapByExtension[ map.fileExtension ] = map;
  ACSync.fileMapByFetch[ map.fetch ] = map;

});

/*Fetch part**/
ACSync.getACFetch = function( fetchString ){
  var fetchNameReg = "\\" + path.sep + "([^\\" + path.sep + "]*$)";
  var fetchRequest = "";
  var fetchName = "";
  var fetchDirReg = "([^=]*)\\" + path.sep + "[^\\" + path.sep + "]*$";
  var fetchDir = "";
  var schemaPkReg = "([^=]*)=(.*)";
  var schemaName = "";
  var primaryKey = "";
  var specificKeyReg = "([^\\[]*)\\[([^\\]]*)\\]$";
  var specificKey = "";
  var noDirFetchString = fetchString;
  //NS:NAME management
  var primaryName = "";
  var primaryNS = "";
  var primaryNSReg = "([^:]*):(.*)";

  if( fetchString.match(fetchNameReg) && fetchString.match(fetchNameReg).length > 1 )
    fetchRequest = fetchString.match(fetchNameReg)[1];
  else
    fetchRequest = fetchString;
  if( fetchString.match(fetchDirReg) && fetchString.match(fetchDirReg).length > 1 )
    {
      fetchDir = fetchString.match(fetchDirReg)[1];
      noDirFetchString = fetchString.replace( fetchDir +  path.sep , "" );
    }
  if( noDirFetchString.match(schemaPkReg) && noDirFetchString.match(schemaPkReg).length > 2 )
    {
      schemaName = noDirFetchString.match(schemaPkReg)[1];
      primaryKey = noDirFetchString.match(schemaPkReg)[2];
      fetchName = schemaName;
      testPK = primaryKey;
      if( testPK.match( specificKeyReg ) && testPK.match( specificKeyReg ).length > 2 )
        {
          primaryKey = testPK.match( specificKeyReg )[1];
          specificKey = testPK.match( specificKeyReg )[2];
          fetchName += `[${specificKey}]`
        }
    }
    primaryName = primaryKey;
    if( primaryKey.match(primaryNSReg) && primaryKey.match(primaryNSReg).length > 2 )
      {
        primaryName = primaryKey.match(primaryNSReg)[2];
        primaryNS = primaryKey.match(primaryNSReg)[1];
      }

  return {
    fetchRequest : fetchRequest,
    fetchName : fetchName,
    schema : schemaName,
    primaryKey : primaryKey,
    specificKey : specificKey,
    directory:fetchDir,
    fileName : primaryKey.replace(/:/,'_'),
    primaryName,
    primaryNS
  };

};

ACSync.getFecthStringFromFile = function( fileName ){
  var currentReadFileResolve, currentReadFileReject;
  var readPromise = new Promise( (resolve, reject ) => {currentReadFileResolve = resolve; currentReadFileReject = reject;});
  var acFile = ACSync.getACSyncFile( fileName );
  var primaryKey = acFile.internalName;
        if(acFile.extension.toLowerCase() != "xml")
          {
            var mapping = ACSync.fileMapByExtension[acFile.extension];
            if( mapping.primaryKey.indexOf(':') != -1 )
              primaryKey = primaryKey.replace(/_/,':')
            var acString = mapping.schema + "=" + primaryKey + ( mapping.specificKey ? `[${mapping.specificKey}]` : '');
            currentReadFileResolve(acString);
          }
        else
          fsPromises.readFile( fileName ).then( data => {
            var fileContent = data.toString();
            var schema = "";
            if( fileContent.match(/xtkschema="([^"]*)"/) && fileContent.match(/xtkschema="([^"]*)"/).length > 1 )
              schema = fileContent.match(/xtkschema="([^"]*)"/)[1];
            var acString = schema + "=" + primaryKey;
            currentReadFileResolve(acString);
          }).catch( error => {
            currentReadFileReject( error );
          })
  return readPromise;
}



//the fetch argument must be a string respenting the 'fetch' command : shcema=primaryKey. Ex : nms:delivery=DM00001, xtk:srcSchema=nms:recipient
//the fecthes definition must be declared on the Mapping File (conf/fileMapping.json)
ACSync.prototype.fetch = function( fetch , options ){
  var currentFetchResolve, currentFetchReject;
  var fetchPromise = new Promise( (resolve, reject ) => {currentFetchResolve = resolve; currentFetchReject = reject;});
  var acFetch = ACSync.getACFetch( fetch );
  this.log(` acFetch : ${consoleColors.BgWhite + consoleColors.FgBlack}${JSON.stringify(acFetch)} ${consoleColors.Reset}`);
  var mapping = ACSync.fileMapByFetch[ acFetch.fetchName ] ;
  if( !mapping )
    {
      currentFetchReject(`Can't find mapping for ${fetch}`);
      return fetchPromise;
    }
  var fetchQueryDef = new xtkQueryDef({ accLogin : this.accLogin, outputFormat : mapping.isXML ? 'raw' : null });
  var querySelector = mapping.querySelector;
  if( options && options.extraQuerySelector )
    querySelector += options.extraQuerySelector;
  var queryCondition = mapping.queryCondition.replace(/\$\{primaryKey\}/gi, acFetch.primaryKey)
                       .replace(/\$\{name\}/gi, acFetch.primaryName)
                       .replace(/\$\{nameSpace\}/gi, acFetch.primaryNS);
  var query = `
  <queryDef startPath="/" schema="${mapping.schema}" operation="get">
    <select>
      ${querySelector}
    </select>
    <where>
      ${queryCondition}
    </where>
  </queryDef>`;
  this.log(`-------** ${consoleColors.BgGreen + consoleColors.white} Try to get ${mapping.label} of ${acFetch.primaryKey} (${acFetch.fetchRequest}) ${consoleColors.Reset} **-------`);
  this.log(` Query def : ${consoleColors.BgWhite + consoleColors.FgBlack}${query} ${consoleColors.Reset}`);
  //Execute Fetch only when login done (need login token etc.)
   this.longinPromise.then( ( connection ) => {
        fetchQueryDef.ExecuteQuery( query ).then((result) => {
            var responseStructure = mapping.responseStructure;
            var resultContent;
            if( mapping.isXML )
              resultContent = pd.xml(result.match( "(" + responseStructure + ")" )[1]).replace(/\n\s*<!\[CDATA/g,"<![CDATA").replace(/\]\]>\n\s*/g,"]]>");
            else
              resultContent = ACSync.browseJSStructure( result, responseStructure );

            if(!resultContent)
              currentFetchReject( `Error while searching ${acFetch.fetchRequest} : not found` );
            if( mapping.contentFilter )
              {
                this.log(`mapping.contentFilter.constructor = ${mapping.contentFilter.constructor}`);
                if( mapping.contentFilter.constructor != Array )
                  mapping.contentFilter = [mapping.contentFilter];
                mapping.contentFilter.forEach( filter => {
                  this.log(`filter !!! ${filter}`);
                  resultContent = resultContent.replace( new RegExp(filter,"gm"), "" );
                });
              }

            var fullFileName = (acFetch.directory != "" ? (acFetch.directory + path.sep) : "" )+ acFetch.fileName;
            fullFileName += ( ! fullFileName.match( mapping.fileExtension + "$" ) ) ? "." + mapping.fileExtension : "";
            this.log(`${consoleColors.BgGreen + consoleColors.white}Got ${acFetch.primaryKey} content, Writing ${fullFileName}${consoleColors.Reset}`);
            fs.writeFile(fullFileName,
                      resultContent,
                      (result, error ) => {
                        if(error)
                          currentFetchReject( error );
                        else
                          currentFetchResolve( fullFileName , resultContent);
                      });
            })
            .catch( e => { console.log(`${consoleColors.FG9}${e}${consoleColors.Reset}`); });
          }
    ).catch( (e) => { console.log( e )} );

  return fetchPromise;
}
ACSync.browseJSStructure = function(response, responseStructure){
  var currObject = response;
  try{
    responseStructure.split('.').forEach( currLevel => {
      currObject = currObject[ currLevel ];
    });
    return currObject;
  }
  catch(e){
    console.log('Error while browsing response datas : ' , e );
    return null;
  }
}
//Same as fetch, but with multiple element separate by comma (ex : nms:delivery=DM0001,DM00002,DM00003)
ACSync.prototype.fetchCollection = function( fetch ){
  var collectionReg = "([^=]*)=(.*)";
  var match = fetch.match( collectionReg );
  var promises = new Array();
  if( match )
    {
      var schema = match[1];
      var keys = match[2];
      keys.split(',').forEach( key => {
        promises.push( this.fetch(schema + "=" + key ) );
      });
    }
  return Promise.all(promises);
}

/*** Pushing part **/
ACSync.prototype.push = function( file ){
var currentPushResolve, currentPushReject;
var pushPromise = new Promise( (resolve, reject ) => {currentPushResolve = resolve; currentPushReject = reject;});
//BYPASS BACKUP STEP ?
if( this.options.byPassBackup )
  this._realPush( file );

else{
//BACKUP BEFORE PUSHING
  var backupFecthStringPromise = ACSync.getFecthStringFromFile( file );
  backupFecthStringPromise.then(
    fecthString => {
      fecthString = ACSync.backupDir + fecthString;
      var backupPromise = this.fetch( fecthString )
        //then pushing
        backupPromise.then(
          (filename, content) => {
            var extReg = new RegExp("\\.([^\\" + path.sep + "]*$)");
            this.log(consoleColors.FG58 + consoleColors.BG227 + "Backup : " + filename.replace( extReg , (match,s1) =>{ return "_" + dateformat(new Date(), "dd_mm_yyyy-hhMMss") + "." + s1}) + consoleColors.Reset)
              fsPromises.rename(filename, filename.replace( extReg , (match,s1) =>{ return "_" + dateformat(new Date(), "dd_mm_yyyy-hhMMss") + "." + s1}))
                .then( () => {
                  this._realPush( file )
                    .then(
                      ( file ) => {
                        currentPushResolve( file );
                      })
                    .catch( (e) => { currentPushReject( e ) } );
                });
            }
        )
        .catch( (e) => {
          console.log(consoleColors.FG58 + consoleColors.BG227 + "Backup Failed : " +  e + consoleColors.Reset);
          this._realPush( file )
            .then(
              ( file ) => {
                currentPushResolve( file );
              })
            .catch( (e) => { currentPushReject( e ) } );
        });
      }
    )
  }
  return pushPromise;
};

ACSync.prototype._realPush = function( file ){
  var currentRealPushResolve, currentRealPushReject;
  var realPushPromise = new Promise( (resolve, reject ) => {currentRealPushResolve = resolve; currentRealPushReject = reject;});
  var acFile = ACSync.getACSyncFile( file );
  var mapping = ACSync.fileMapByExtension[acFile.extension];
    if( !mapping )
    {
      currentRealPushReject(`Can't find mapping for ${file}`);
      return realPushPromise;
    }
  //fs.readFile( file, (err, data) => {
    fsPromises.readFile(file)
    .then( ( data ) => {
        //console.log( data.toString() );
        var xmlContent;
        //BUG : all $ must be double to avoid unespected replacement (like $', $&, $1)
        var dataStr = data.toString().replace(/\$/gm,'$$$');
        if(acFile.extension.toLowerCase() != "xml")
          {
            xmlContent = mapping.xmlStructure.replace(/\$\{internalName\}/g, acFile.internalName)
                                             .replace(/\$\{xmlName\}/g, acFile.xmlName)
                                             .replace(/\$\{nameSpace\}/g, acFile.nameSpace)
                                             .replace(/\$\{content\}/m, dataStr);
          }
        else
          xmlContent = data.toString();      
      this.log(`${consoleColors.BgWhite + consoleColors.FgBlack + consoleColors.FG43 + consoleColors.BG54}Push ${mapping.label}  '${acFile.internalName}' from ${file} ${consoleColors.Reset}`);
      this.log(`${consoleColors.BgWhite + consoleColors.FgBlack + consoleColors.FG43 + consoleColors.BG54}${xmlContent} ${consoleColors.Reset}`);

        var pushSession = new xtkSession({ accLogin : this.accLogin });
        pushSession.Write( xmlContent )
                        .then( ( result ) => {
                          this.log(`${consoleColors.BG43 + consoleColors.FG54}${acFile.internalName} pushed from ${file}${consoleColors.Reset}`);
                          this.log(`${consoleColors.BG43 + consoleColors.FG54}${acFile.internalName} ${JSON.stringify(result)}${consoleColors.Reset}`);
                          currentRealPushResolve(file);
                        } )
                        .catch( (e) => { /*console.log( e ); */currentRealPushReject( e );} );
      }
  )
.catch( (err) => {
  currentPushReject( err );
  });
  return realPushPromise;
}

/*Return an object that reprensents the content to push*/
ACSync.getACSyncFile = function( filePath ){
  var extensionReg = "\\.([^\\" + path.sep + "]*$)";
  var fileExtension = "";
  var fileNameReg = "\\" + path.sep + "*([^\\" + path.sep + "]*$)";
  var fileName = "";
  var internalNameReg = "([^\.]*)";
  var internalName = "";
  if( filePath.match(extensionReg) && filePath.match(extensionReg).length > 1 )
    fileExtension = filePath.match(extensionReg)[1];
  if( filePath.match(fileNameReg) && filePath.match(fileNameReg).length > 1 )
    fileName = filePath.match(fileNameReg)[1];
  if( fileName.match(internalNameReg) && fileName.match(internalNameReg).length > 1 )
    internalName = fileName.match(internalNameReg)[1];

  var namePos = fileName.indexOf("_") + 1;
  var nameLength = fileName.length - fileExtension.length - namePos - 1;
  var xmlName = fileName.substr( namePos , nameLength );
  var nameSpace = fileName.substr(0, fileName.indexOf("_") );
  //forceExtension management
  //For object like xtk:sql, xtk:javascript, the fileMapping define a "forceExtension", because Campaign conventionally use the extension in the name
  // SQL Object usually name .sql, javascript .js etc.
  var mapping = ACSync.fileMapByExtension[fileExtension];
  if( mapping.forceExtension )
  {
    if( ! internalName.match( '.' + mapping.fileExtension + '$'))
    {
      internalName += `.${mapping.fileExtension}`;
    }
    if( ! xmlName.match( '.' + mapping.fileExtension + '$'))
    {
      xmlName += `.${mapping.fileExtension}`;
    }
  }

  return {
    extension : fileExtension,
    fileName : fileName,
    xmlName : xmlName,
    nameSpace : nameSpace,
    internalName : internalName //tout le nom sans l'extension (.html, .txt etc.), sauf si forceExtension est définit dans le mapping
  };
};


ACSync.prototype.addWatcher = function( directory, options ){
  directory = directory.replace(/\\/g,'/');
  depth = 0;
  if( options && options.subDir )
    depth = null;
  if( !this.watcherByDirectory[ directory ] )
  {
    var watcher = chokidar.watch( directory, { depth: depth, persistent: true} );
    watcher.on('error', error => console.log(`Watcher error: ${error}`));
    watcher.on('change', (path, event) => {
      console.log('Modification detected, send content : ' + path);
      this.push( path ).catch( (e) => { this.log( e ) ;});
    });
    watcher.on('ready', () => {
      watcher.on('add', (path, event) => {
        //console.log(event, path);
        console.log('New file detected : ' + path);
        this.push( path ).catch( (e) => { this.log( e ) ;});
      });
    })
    this.watcherByDirectory[ directory ] = watcher;
    return watcher;
  }
}
ACSync.prototype.removeWatcher = function( directory ){
  directory = directory.replace(/\\/g,'/');
  if( this.watcherByDirectory[ directory ] )
  {
    this.watcherByDirectory[ directory ].close();
  }
}

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

module.exports = ACSync;
