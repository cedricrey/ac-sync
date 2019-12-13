

# ACSync :rocket: 

Synchronisation utility for Adobe Campaign
Previously [NeoSync](https://github.com/cedricrey/NeoSync). Consider ACSync as NeoSync v2.0
The code of NeoSync was so horrific that I decided to start from scratch a new version, based on [ac-connector](https://github.com/cedricrey/ac-connector).

The CLI Synchronisation utility between local files and Neolane / Adobe Campaign is almost ready. You can now fetch and push files, but 'watch' and 'pushall' commands are not yet ready.
Also : js module that allows to synchronise Adobe Campaign Classic object with local files. 
By this way, you can simplify the versioning your sources

In French :

En cours : Utilitaire et ligne de commande pour synchronisation entre fichiers locaux et Neolane/ Adobe Campaign
Egalement : bibliothèque JS permettant la synchro entre des objets Adobe Campaign Classic et des fichiers locaux.

## Before starting

First of all, just keep in mind that this nodejs utility wasn't expected to be shared. If interested, be my guest, but :
1) not a very good experience of project distribution and repository, so the package.json and other things are very incomplete
2) I rewrote it all recently, so it should be incomplete comparing NeoSync, but much more stable. I run with Promises instead of making pyramid of doom, the code is a little more readable now.
3) I also use the API fs.promises, but with a NodeJS v10, I got some warning like 

> ExperimentalWarning: The fs.promises API is experimental

   I guess thoses warning won't appear if you use a newer NodeJS version, but if it does, **don't worry about it**. I'm sorry, this is not very gracefull. If you have any solution, let me know.

## Getting Started

### Prerequisites

having Nodejs >= 10 installed


### Installing

Be sure to have run the configuration of [ac-connector](https://www.npmjs.com/package/ac-connector) to have at least one connection configured in your system.
Then :

    npm install ac-sync

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
ACSync --fetch namespace:schema=logicKey[;namespace:schema=logicKey]
*new* ACSync --fetchCollection namespace:schema=logicKey[,logicKey]
```



Getting the deliveries with internalName 'TOTO' and 'TATA' :
```
ACSync -f nms:delivery=TOTO;nms:delivery=TATA
ACSync --fetchCollection nms:delivery=TOTO,TATA
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
ACSync --push localfilename
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

### Push all source to the server *(not yet implemented)*
```
ACSync -pa
ACSync --pushall
```
Same as before, but for all the file into the current folder

### Watch the current folder and push when change detected *(not yet implemented)*
```
ACSync -w
ACSync --watch
```
ACSync will push a file when a change is detected.
You can :
- change the directory with the '-d path/to/watch' option if you don't want watch the current directory
- specify a pattern for the files to push with '-pattern yourpattern'. For example, if you want to push only Javascript, NeoSync -w -pattern *.js`




### :new: File Mapping
There is a new mapping concept. With NeosSync, this mapping was hardcoded, difficult to maintain. But with ACSync everything changes (because I was fedup with this crappy code)
Those mapping are set on a separated 'conf/fileMapping.json' file.
If you want to set your own mapping, just add a JSON file named 'ACSyncFileMapping.json' on the "/.ac-connector" of your user directory *(=> something like C:\Users\yourname\ on Microsoft systems, /Users/yourname on MacOS, /home/yourname elsewhere. This "/.ac-connector" directory is created the first time you use [ac-connector](https://www.npmjs.com/package/ac-connector)*). 
This allows you to set your own mapping if needed, without need to change the code.
The mapping is an array of JSON object :

    {
    "name" : "uniqueName", => a unique name
    "label" : "Label", => a gracefull label
    "fileExtension" : "xml|js|whatyouwant", => the extension of the wrote local file. If XML, the file will be the image of the XML returned by a queryDef
    "schema" : "xtk:srcSchema", => the Adobe Campaign Schema name of your mapped object
    "primaryKey" : "@internalName|@namespace + ':' + @name|@name|@whatyouwant", => The primary key of your mapped obejct. If this is a multiple key, just string and concat them
    "specificKey" : null|"html"|"sms"|"whatyouwant", => For specific mapping, wich represent link between a part of the object and specific local file type (example : I set .html file for the html source of a delivery). This must be added in with bracket on a fetch => nms:delivery=DM12563[html]. If null, ignored
    
    //Fetch part (get content from Adobe Campaign)
    "querySelector" : "<node expr='data'/><node expr='@xtkschema'/>", => what you want to get in your file (if other than XML file, just take 1 element, for example : /content/source/html of nms:delivery, or /data of xtk:javascript)
    "queryCondition" : "<condition expr=\"@namespace + ':' + @name = '${primaryKey}'\"/>", => The query condition that match a unic element for you schema. You can (must) use the variable ${primaryKey}
    "responseStructure" : "jst.code"|"<delivery[\\s\\S]*<\/delivery>", => How to retrieve the content from the server to local file in a soap response of queryDef.Execute : for non-XML file, a JS path to get the file content. For XML file, a regular expression that represents what you want to keep in your local XML file (usualy "<schema[\\s\\S]*<\/schema>")
    
    //Push part (send content to Adobe Campaign)
    "xmlStructure" : "<delivery xtkschema='nms:delivery' internalName='${internalName}' _operation='update'><content><text><source><![CDATA[${content}]]></source></text></content></delivery>" => For non-XML mapping, that represent how to push the file content in a soap request of xtk:session.Write(). Available variable : ${nameSpace}, ${xmlName} (if your primary key has 2 keys and a ":" to join them, ${nameSpace} is the first part, ${xmlName} is the second part), ${internalName} ( = unique primary key ), ${content} (content of your local file)
    
    "responseStructure" : "<srcSchema[\\s\\S]*<\/srcSchema>"
    },

The better you can do is to take a look at the "conf/fileMapping.json" file.

## Authors

* **Cédric Rey** - *Initial work* - [cedricrey](https://github.com/cedricrey)

