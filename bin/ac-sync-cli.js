const
  chokidar = require('chokidar'),
  keypress = require('keypress'),
  arg = require('arg'),
  ACSync = require('../ac-sync'),
  ccol = require('../utils/consoleColors');


const acSyncHelp = `
Usage : ${ccol.BG2 + ccol.FG15}ACSync${ccol.Reset} ${ccol.BG160 + ccol.FG15}-c connection_name${ccol.Reset} [-f fetchString]
               [-p fileName] [-w] [-d]


`;
function parseArgumentsIntoOptions(rawArgs) {
 const args = arg(
   {
     '--fetch': String,
     '--fetchCollection': String,
     '--push': String,
     '--pushall': Boolean,
     '--watch' : Boolean,
     '--connection' : String,
     '--directory' : String,
     '--pattern' : String,
     '--help' : Boolean,
     '-f': '--fetch',
     '-p': '--push',
     '-pa': '--pushall',
     '-c' : '--connection',
     '-w' : '--watch',
     '-d' : '--directory',
     '-p' : '--pattern',
     '-h' : '--help'
     //TOOD : add enableLogs and byPassBackup options
   },
   {
     argv: rawArgs.slice(2),
   }
 );
 return {
   fetch: args['--fetch'] || false,
   fetchCollection: args['--fetchCollection'] || false,
   push: args['--push'] || false,
   pushall: args['--pushall'] || false,
   watch: args['--watch'] || false,
   connection: args['--connection'] || false,
   directory: args['--directory'] || false,
   pattern: args['--pattern'] || false,
   help: args['--help'] || false,
 };
}

function displayHelp(){
  console.log(acSyncHelp);
}


function acSyncCli(args) {
  try{
   let options = parseArgumentsIntoOptions(args);
   //console.log(options);
   if( options.help )
    displayHelp();
   if( !options.connection)
    throw 'Error : connection is missing. Please use --connection|-c connection_name';

    if( options.fetch || options.fetchCollection ||options.push || options.pushall || options.watch )
    {
      var acSync = new ACSync({connectionName : options.connection, enableLog : false, byPassBackup : false});
      if( options.fetch )
        options.fetch.split(";").forEach( f => {
          acSync.fetch( f );
        });

      if( options.fetchCollection )
        options.fetchCollection.split(";").forEach( f => {
          acSync.fetchCollection( f );
        });

      if( options.push )
        options.push.split(";").forEach( p => {
          acSync.push( p );
        });
      //TODO : push all, watch (with directory options to get)
    }
  }
  catch( e ){
    console.log(`${ccol.FG9}${e}${ccol.Reset}`);
  }
}

module.exports = acSyncCli;