# ac-sync
Synchronisation utility for Adobe Campaign
Previously NeoSync.
The code of NeoSync was so horrific that I decided to start from scratch a new version, based on ac-connector.

To come up : CLI Synchronisation utility between local files and Neolane / Adobe Campaign
Right now : js module that allows to synchronise Adobe Campaign Classic object with local files. 
By this way, you can simplify the versioning your sources

In French :

Prochainement : Utilitaire en ligne de commande de synchronisation entre fichier locaux et Neolane
Pour le moment : bibliothèque permettant la synchro entre des object Adobe Campaign CLassic et des fichier locaux.

## Before starting

First of all, just keep in mind that this nodejs utility wasn't expected to be shared. If interested, be my guest, but :
1) not a very good experience of project distribution and repository, so the package.json and other things are very incomplete
2) I rewrite it all recently, so it should nbe incomplete comparing NeoSync, but very much stable. I work with Promises instead of making pyramid of doom, the code is a little more readable now.

## Getting Started

First copy the NeoSync Folder from 'To_User_Folder' inot your user folder (~/ in Unix like OS, c:\Users\yourname or something like that).
Then, configure the neoSync.conf file with server url, name and password (ok, it sucks but IE password used by the Neolane Console are not readable. If you have a better idea, let me know) => new features for multi config to come

### Prerequisites

having Nodejs >= 10 installed


### Installing

Be sure to have run the configuration of ac-connector to have at least one connection configured in your system.
=> https://github.com/cedricrey/ac-connector


## Use
###ACSync class
See (and try) example.js script
```
var ACSync = require('ac-sync');
var test = new ACSync({connectionName : "YOUR_ACCONNECTION_NAME"});
//Fetching a File from server
//'nms:delivery=MY_DELIVERY_INTERNALNAME' is called a fetch string. It's a command to tell ac-sync to get something on the server
//It must be like "schemaname=logickey"
test.fetch('nms:delivery=MY_DELIVERY_INTERNALNAME');
test.fetch('xtk:javascript=nms:campaign.js');
//You can 'add' a directory before the logic name to put the file on a specific directory
test.fetch('xtk:javascript=C:\\User\\me\\javascript\\nms:campaign.js');

//Pushing a file to the server
//The string must be a file. relative or absolute name
test.push('MY_DELIVERY_INTERNALNAME.xml');
```


###CLI
THE CLI IS NOT READY, BUT THIS HOW IT WILL SHORTLY WORK (like NeoSync used to)
Main command is (will be)
```
ACSync -[w,f,p,pa] options
```

### Fetch source
```
ACSync -f namespace:schema=logicKey[;namespace:schema=logicKey]
ACSync -fetch namespace:schema=logicKey[;namespace:schema=logicKey]
*new* ACSync -fetchCollection namespace:schema=logicKey[,logicKey]
```



Getting the deliveries with internalName 'TOTO' and 'TATA' :
```
ACSync -f nms:delivery=TOTO;nms:delivery=TATA
ACSync -fetchCollection nms:delivery=TOTO,TATA
```
This command will create the TOTO.xml and TATA.xml files on the current local directory

Avaiblale fetch :

| Fetch | Key | Result |
| -------------: |:---------------- | :----- |
| xtk:javascript | ns:name  |  ns_name.js file (src file) |
| xtk:jst | ns:name  |  ns_name.jst file |
| xtk:jssp | ns:name  |  ns_name.jssp file |
| xtk:workflow | internalName  |  internalName.xml file (the wofklow as XML) |
| xtk:form | ns:name  |  ns_name.xml file | |
| xtk:srcSchema | ns:name  |  ns_name.xml file |
| nms:delivery | internalName  |  internalName.xml file |
| nms:includeView | internalName  |  internalName.xml file |
| ncm:content | internalName  |  internalName.xml file |
| nms:delivery | internalName[html]  |  internalName.html file containing only the html source of the delivery |
| nms:delivery | internalName[txt]  |  internalName.txt file containing only the text source of the delivery |
| nms:includeView | internalName[html]  |  internalName.iview.html file containing only the html source of the include view |
| nms:includeView | internalName[txt]  |  internalName.iview.txt file containing only the text source of the include view |

This is set in the mapping and can be changed.

### Push source to the server
```
ACSync -p localfilename
ACSync -push localfilename
```
NeoSync wil recognize what to do with :
 - the extension of the file
 - the content of the file in case of XML file
```
ACSync -p TOTO.html
```
This command will push the HTML source of the delivery with 'TOTO' as internal name.

Attention please : if the parameter 'devMode' is set to 0 or undefined in the neoSync.conf of the user, only HTML and Text version of deliveries and includes views can be pushed to the server.
Other source will be ignored. This is a security if non developpers want to work with NeoSync (HTML integration, Marketing people etc.).
Also, if a push is done, NeoSync will make a backup of the current server source before pushing. The backup is in the "NeoSync/BACKUP" folder into the user folder (next to neoSync.conf)

### Push all source to the server
```
ACSync -pa
ACSync -pushall
```
Same as before, but for all the file into the current folder

### Watch the current folder and push when change detected
```
ACSync -w
ACSync -watch
```
NeoSync will push a file when a change is detected.
You can :
- change the directory with the '-d path/to/watch' option if you don't want watch the current directory
- specify a pattern for the files to push with '-pattern yourpattern'. For example, if you want to push only Javascript, NeoSync -w -pattern *.js`




###*new*
There is a mapping concept. Those mapping are set in the 'conf/fileMapping.json' file, that allows you to set your own mapping if needed, without need to change the code.


## Authors

* **Cédric Rey** - *Initial work* - [cedricrey](https://github.com/cedricrey)

