const
  keypress = require('keypress'),
  arg = require('arg'),
  path = require('path'),
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
     '--log' : Boolean,
     '-f': '--fetch',
     '-p': '--push',
     '-pa': '--pushall',
     '-c' : '--connection',
     '-w' : '--watch',
     '-d' : '--directory',
     '-h' : '--help',
     '-l' : '--log'
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
   log: args['--log'] || false,
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


   var directory = process.cwd();
   if( options.directory )
      directory = options.directory;

   if( options.fetch || options.fetchCollection || options.push || options.pushall || options.watch )
    {
      var acSync = new ACSync({connectionName : options.connection, enableLog : options.log , byPassBackup : false});

      if( options.fetch )
        options.fetch.split(";").forEach( f => {
          acSync.fetch( f );
        });

      if( options.fetchCollection )
        options.fetchCollection.split(";").forEach( f => {
          acSync.fetchCollection( f );
        });

      if( options.push )
        {
          console.log("pushing ", options.push);
          options.push.split(";").forEach( p => {
                  acSync.push( p );
                });
        }
      //TODO : push all, watch (with directory options to get)
      if( options.watch )
        {
          var watcher = acSync.addWatcher( directory );
          watcher.on('ready', () => { initKeypressListener( acSync, directory ) } );
        }
    }
  }
  catch( e ){
    console.log(`${ccol.FG9}${e}${ccol.Reset}`);
  }
}

function initKeypressListener( acSync, directory ){
  keypress(process.stdin);
  console.log("Press Any Key Top Stop Watching")
  process.stdin.on('keypress', function ( ch, key) {
      //console.log('got "keypress"', key);
      /*
      if (key && key.ctrl && key.name == 'c') {
        process.stdin.pause();
      }
      */
      process.stdin.pause();
      acSync.removeWatcher( directory );
    });
  process.stdin.setRawMode(true);
  process.stdin.resume();
}

module.exports = acSyncCli;