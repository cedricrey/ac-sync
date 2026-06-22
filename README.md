# ac-sync

Synchronisation utility for Adobe Campaign Classic.

Fetch, push and watch local files against an Adobe Campaign Classic instance. Supports both the **CLI** and a **Node.js API**.

Built on top of [ac-connector](https://www.npmjs.com/package/ac-connector).

## Install

```bash
npm install -g ac-sync
```

## Prerequisites

Configure at least one connection using the ac-connector UI:

```bash
node node_modules/ac-connector/startUI.js
```

This opens `http://localhost:4545/` where you can add connections (ACC v7 user/password or ACC v8 IMS/OAuth2). See [ac-connector](https://www.npmjs.com/package/ac-connector) for full setup instructions.

---

## CLI

```bash
ac-sync -c <connectionName> [command] [options]
```

### Fetch — download from Campaign :arrow_lower_left:

```bash
ac-sync -c myConnection -f nms:delivery=MY_DELIVERY
ac-sync -c myConnection --fetch xtk:javascript=nms:campaign.js

# Multiple objects separated by semicolons
ac-sync -c myConnection -f nms:delivery=TOTO;nms:delivery=TATA

# Multiple objects of the same schema (comma-separated)
ac-sync -c myConnection --fetchCollection nms:delivery=TOTO,TATA

# Fetch to a specific directory
ac-sync -c myConnection -f xtk:javascript=/path/to/dir/nms:campaign.js
```

### Push — upload to Campaign :arrow_upper_right:

```bash
ac-sync -c myConnection -p localfile.xml
ac-sync -c myConnection --push localfile.html
```

ac-sync detects what to push from the file extension (and the XML content for `.xml` files). Before pushing, it automatically backs up the current server version to `~/.ac-connector/ACSyncBackup/`.

### Push all files in the current folder

```bash
ac-sync -c myConnection -pa
ac-sync -c myConnection --pushall
```

### Watch and auto-push on change :eyes:

```bash
ac-sync -c myConnection -w
ac-sync -c myConnection --watch

# Watch a specific directory
ac-sync -c myConnection -w -d /path/to/watch

# Only push files matching a pattern
ac-sync -c myConnection -w -pattern *.js
```

---

## Supported object types

| Fetch string | Key | Local file |
|---|---|---|
| `xtk:javascript` | `ns:name` | `ns_name.js` |
| `xtk:jst` | `ns:name` | `ns_name.jst` |
| `xtk:jssp` | `ns:name` | `ns_name.jssp` |
| `xtk:workflow` | `internalName` | `internalName.xml` |
| `xtk:form` | `ns:name` | `ns_name.xml` |
| `xtk:srcSchema` | `ns:name` | `ns_name.xml` |
| `nms:delivery` | `internalName` | `internalName.xml` |
| `nms:delivery[html]` | `internalName` | `internalName.html` (HTML source only) |
| `nms:delivery[txt]` | `internalName` | `internalName.txt` (text source only) |
| `nms:includeView` | `internalName` | `internalName.xml` |
| `nms:includeView[html]` | `internalName` | `internalName.iview.html` |
| `nms:includeView[txt]` | `internalName` | `internalName.iview.txt` |
| `ncm:content` | `internalName` | `internalName.xml` |

---

## Node.js API

```js
const ACSync = require('ac-sync');

(async () => {
  const sync = new ACSync({ connectionName: 'My Connection' });

  // Fetch a file from Campaign
  await sync.fetch('nms:delivery=MY_DELIVERY');
  await sync.fetch('xtk:javascript=nms:campaign.js');

  // Fetch to a specific directory
  await sync.fetch('xtk:javascript=/path/to/dir/nms:campaign.js');

  // Fetch multiple objects of the same schema
  await sync.fetchCollection('nms:delivery=TOTO,TATA');

  // Push a local file to Campaign (with automatic server-side backup)
  await sync.push('MY_DELIVERY.xml');

  // Watch a directory and auto-push on changes
  sync.addWatcher('/path/to/watch');
})();
```

---

## Custom file mapping

The built-in mappings are defined in `conf/fileMapping.json`. You can extend them without touching the package by creating `~/.ac-connector/ACSyncFileMapping.json` (the directory is created automatically by ac-connector on first use).

The file is an array of mapping objects:

```json
[
  {
    "name"            : "uniqueName",
    "label"           : "My Object Type",
    "fileExtension"   : "xml",
    "schema"          : "xtk:srcSchema",
    "primaryKey"      : "@namespace + ':' + @name",
    "forceExtension"  : false,
    "specificKey"     : null,

    "querySelector"   : "<node expr='data'/><node expr='@xtkschema'/>",
    "queryCondition"  : "<condition expr=\"@namespace + ':' + @name = '${primaryKey}'\"/>",
    "responseStructure": "<srcSchema[\\s\\S]*<\\/srcSchema>",
    "contentFilter"   : null,

    "xmlStructure"    : "<srcSchema xtkschema='xtk:srcSchema' namespace='${nameSpace}' name='${xmlName}' _operation='update'>${content}</srcSchema>"
  }
]
```

| Field | Description |
|---|---|
| `name` | Unique identifier for this mapping |
| `label` | Human-readable label |
| `fileExtension` | Local file extension (`js`, `xml`, `html`, etc.) |
| `schema` | Adobe Campaign schema name |
| `primaryKey` | XPath expression for the object's primary key |
| `forceExtension` | Set to `true` if the extension is part of the object name on the server (e.g. `nms:myScript.js`) |
| `specificKey` | For sub-object mappings (e.g. `html`, `txt`); used with bracket syntax (`nms:delivery=DM1[html]`) |
| `querySelector` | XPath nodes to select in the queryDef |
| `queryCondition` | QueryDef `<where>` condition; use `${primaryKey}`, `${name}`, `${nameSpace}` as variables |
| `responseStructure` | For non-XML: JS dot-path to reach the content in the SOAP response. For XML: regex matching the XML block to keep |
| `contentFilter` | String or array of regex patterns to strip from fetched content |
| `xmlStructure` | Template for the XML to push via `xtk:session#Write`; available variables: `${nameSpace}`, `${xmlName}`, `${internalName}`, `${content}` |

For reference, see the built-in `conf/fileMapping.json`.

---

## Author

**Cédric Rey** — [github.com/cedricrey](https://github.com/cedricrey)
