const path = require('path');

var ACSync = require('./ac-sync');
var test = new ACSync({connectionName : "DEV", enableLog : true, byPassBackup : false});
var secondFetch = test.fetch('nms:delivery=example_file'+path.sep+'mail');
var firstFetch = test.fetch('nms:delivery=example_file'+path.sep+'billing[html]');
Promise.all([firstFetch,secondFetch]).catch(
( error ) => {
  console.log('Error :', error );
  }
);