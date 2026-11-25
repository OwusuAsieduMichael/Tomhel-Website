/**
 * Tomhel BECE Prep — data backend (Google Sheets).
 *
 * A small, generic table store. Each sheet tab is a table: row 1 holds the column names,
 * every row below is one record, and every cell is plain text. All business rules
 * (logins, permissions, validation, password hashing) live in the Next.js server, which is
 * the only caller. Passwords never reach this script, only their hashes.
 *
 * Deploy as Web App (Execute as: Me, Access: Anyone). Requests must carry API_SECRET.
 * Script Properties: SPREADSHEET_ID, API_SECRET (required, 32+ characters).
 *
 * Requests (POST JSON, all include "secret"):
 *   { action: "read",  tables: ["Users", ...] }        -> { success, tables: { Users: [[header...], [row...], ...] } }
 *   { action: "write", ops: [ ... ] }                  -> { success }
 *   { action: "setup", schema: { Users: ["id", ...] } } -> { success, created: [...], addedColumns: {...} }
 *   { action: "putFile", name, mimeType, data: base64 } -> { success, id }   (question pictures, private Drive folder)
 *   { action: "getFile", id }                           -> { success, mimeType, data: base64 }
 *
 * Optional Script Property: FILES_FOLDER_ID (otherwise a "Tomhel BECE Prep Files" folder is created
 * next to the spreadsheet the first time a picture is saved).
 *
 * Write ops (applied together under a lock; if any op is invalid, nothing is written):
 *   { op: "insert", table, rows: [{ col: "text" }], unique: ["loginId"] }
 *   { op: "update", table, id, set: { col: "text" } }
 *   { op: "delete", table, ids: ["..."] }
 *
 * The functions ending in "Pure_" use no Google services, so the website's test suite and
 * local demo mode run this exact file in Node.
 */

var LOCK_WAIT_MS = 20000;

// ---------------------------------------------------------------------------
// Web app entry points
// ---------------------------------------------------------------------------

function doGet() {
  return json_({ success: true, message: "Tomhel BECE Prep data API is running." });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json_({ success: false, message: "Missing request body." });
    var payload = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty("API_SECRET") || "";
    var spreadsheetId = props.getProperty("SPREADSHEET_ID");

    // Unlike the public forms script, a secret is mandatory: this sheet holds student accounts.
    if (secret.length < 32) return json_({ success: false, message: "API_SECRET is not configured (32+ characters)." });
    if (!constantTimeEqualPure_(String(payload.secret || ""), secret)) return json_({ success: false, message: "Unauthorized." });
    if (!spreadsheetId) return json_({ success: false, message: "SPREADSHEET_ID is not configured." });

    var ss = SpreadsheetApp.openById(spreadsheetId);
    if (payload.action === "read") return json_({ success: true, tables: readTables_(ss, payload.tables || []) });
    if (payload.action === "write") return json_(writeOps_(ss, payload.ops || []));
    if (payload.action === "setup") return json_(setup_(ss, payload.schema || {}));
    if (payload.action === "putFile") return json_(putFile_(props, spreadsheetId, payload));
    if (payload.action === "getFile") return json_(getFile_(props, spreadsheetId, payload.id));
    return json_({ success: false, message: "Unknown action." });
  } catch (error) {
    return json_({ success: false, message: error && error.message ? error.message : "Server error." });
  }
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Sheets I/O
// ---------------------------------------------------------------------------

function sheetOrThrow_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" not found. Run the setup step.');
  return sheet;
}

/** Whole tab as text, header first. Display values keep IDs like "0012" exactly as typed. */
function readSheet_(ss, name) {
  var sheet = sheetOrThrow_(ss, name);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol === 0) return [[]];
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

function readTables_(ss, names) {
  var out = {};
  for (var i = 0; i < names.length; i++) out[names[i]] = readSheet_(ss, names[i]);
  return out;
}

/** A leading apostrophe stops Sheets treating text as a formula (e.g. a name typed as "=HYPERLINK(...)"). */
function protectCellPure_(value) {
  var s = String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function writeSheet_(ss, name, data) {
  var sheet = sheetOrThrow_(ss, name);
  var width = data[0].length;
  var oldRows = sheet.getLastRow();
  var body = data.map(function (row) {
    return row.map(protectCellPure_);
  });
  var range = sheet.getRange(1, 1, body.length, width);
  range.setNumberFormat("@");
  range.setValues(body);
  if (oldRows > body.length) sheet.getRange(body.length + 1, 1, oldRows - body.length, width).clearContent();
}

function writeOps_(ss, ops) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    var names = touchedTablesPure_(ops);
    var data = readTables_(ss, names);
    var changed = applyOpsPure_(data, ops); // throws before anything is written
    for (var i = 0; i < changed.length; i++) writeSheet_(ss, changed[i], data[changed[i]]);
    SpreadsheetApp.flush();
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function setup_(ss, schema) {
  var created = [];
  var addedColumns = {};
  var names = Object.keys(schema);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var columns = schema[name];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      created.push(name);
    }
    var lastCol = sheet.getLastColumn();
    var header = lastCol ? sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0] : [];
    var missing = columns.filter(function (c) {
      return header.indexOf(c) === -1;
    });
    if (missing.length) {
      sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
      addedColumns[name] = missing;
    }
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold");
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).setNumberFormat("@");
  }
  return { success: true, created: created, addedColumns: addedColumns };
}

// ---------------------------------------------------------------------------
// Files (question pictures). Kept in one private Drive folder; never shared.
// The website fetches them with the secret and shows them only to logged-in users.
// ---------------------------------------------------------------------------

var FILES_FOLDER_NAME = "Tomhel BECE Prep Files";
var MAX_FILE_BYTES = 5 * 1024 * 1024;

/** The folder that holds the spreadsheet (pictures live next to it). */
function sheetParent_(spreadsheetId) {
  var parents = DriveApp.getFileById(spreadsheetId).getParents();
  return parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
}

/**
 * The files folder: FILES_FOLDER_ID if set, otherwise found or created next to the spreadsheet.
 * Created under a lock: several uploads arriving at once must not each make their own folder.
 */
function filesFolder_(props, spreadsheetId) {
  var id = props.getProperty("FILES_FOLDER_ID");
  if (id) return DriveApp.getFolderById(id);
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  try {
    id = props.getProperty("FILES_FOLDER_ID");
    if (id) return DriveApp.getFolderById(id);
    var parent = sheetParent_(spreadsheetId);
    var existing = parent.getFoldersByName(FILES_FOLDER_NAME);
    var folder = existing.hasNext() ? existing.next() : parent.createFolder(FILES_FOLDER_NAME);
    props.setProperty("FILES_FOLDER_ID", folder.getId());
    return folder;
  } finally {
    lock.releaseLock();
  }
}

/**
 * A picture folder of this portal: the files folder, or another folder of the same name next to the
 * spreadsheet (left over from uploads that raced before the lock above existed).
 */
function isPictureFolder_(folder, filesFolderId, sheetParentId) {
  if (folder.getId() === filesFolderId) return true;
  if (folder.getName() !== FILES_FOLDER_NAME) return false;
  var up = folder.getParents();
  while (up.hasNext()) if (up.next().getId() === sheetParentId) return true;
  return false;
}

function putFile_(props, spreadsheetId, payload) {
  if (!/^image\/(png|jpeg|gif|webp)$/.test(String(payload.mimeType || ""))) return { success: false, message: "Only PNG, JPEG, GIF or WebP pictures." };
  var bytes = Utilities.base64Decode(String(payload.data || ""));
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) return { success: false, message: "Pictures must be under 5 MB." };
  var name = String(payload.name || "picture").replace(/[^\w.\-]/g, "_").slice(0, 100);
  var file = filesFolder_(props, spreadsheetId).createFile(Utilities.newBlob(bytes, payload.mimeType, name));
  return { success: true, id: file.getId() };
}

function getFile_(props, spreadsheetId, id) {
  var folder = filesFolder_(props, spreadsheetId);
  var sheetParentId = sheetParent_(spreadsheetId).getId();
  var file = DriveApp.getFileById(String(id || ""));
  // Only files in the portal's own picture folders: the secret must not open anything else in this Drive.
  var parents = file.getParents();
  var home = null;
  while (parents.hasNext()) {
    var p = parents.next();
    if (isPictureFolder_(p, folder.getId(), sheetParentId)) home = p;
  }
  if (!home) return { success: false, message: "Not found." };
  // A picture in a leftover folder moves into the files folder, so the leftovers empty out over time.
  if (home.getId() !== folder.getId()) file.moveTo(folder);
  var blob = file.getBlob();
  return { success: true, mimeType: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

/**
 * Run once from the Apps Script editor (select it, then Run) to move every picture from leftover
 * "Tomhel BECE Prep Files" folders into the files folder and remove the empty leftovers.
 * Pictures also move on their own the first time each is shown, so this is optional.
 */
function mergePictureFolders() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty("SPREADSHEET_ID");
  var folder = filesFolder_(props, spreadsheetId);
  var others = sheetParent_(spreadsheetId).getFoldersByName(FILES_FOLDER_NAME);
  var moved = 0;
  while (others.hasNext()) {
    var other = others.next();
    if (other.getId() === folder.getId()) continue;
    var files = other.getFiles();
    while (files.hasNext()) {
      files.next().moveTo(folder);
      moved++;
    }
    if (!other.getFiles().hasNext() && !other.getFolders().hasNext()) other.setTrashed(true);
  }
  Logger.log("Moved " + moved + " pictures into " + FILES_FOLDER_NAME + ".");
}

// ---------------------------------------------------------------------------
// Pure logic (no Google services). Tested from the website repo.
// ---------------------------------------------------------------------------

function constantTimeEqualPure_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function touchedTablesPure_(ops) {
  var seen = {};
  var out = [];
  for (var i = 0; i < ops.length; i++) {
    if (!seen[ops[i].table]) {
      seen[ops[i].table] = true;
      out.push(ops[i].table);
    }
  }
  return out;
}

/**
 * Applies ops to in-memory tables ({ name: [[header], [row], ...] }) in order.
 * Validates every op as it goes and throws on the first problem, so callers only persist on success.
 * Returns the names of tables that changed.
 */
function applyOpsPure_(data, ops) {
  var changed = {};
  // Lookups built once per table and column, and kept up to date as rows are added. Without them each update
  // scanned the whole tab, so approving a subject (1,000+ questions of 8,000+) took millions of comparisons.
  var rowById = {}; // table -> { id: row index }
  var taken = {}; // table + "|" + column -> { UPPERCASED value: true }
  function idIndex(name, table, idCol) {
    if (!rowById[name]) {
      rowById[name] = {};
      for (var k = 1; k < table.length; k++) rowById[name][table[k][idCol]] = k;
    }
    return rowById[name];
  }
  function valuesIn(name, table, col) {
    var key = name + "|" + col;
    if (!taken[key]) {
      taken[key] = {};
      for (var k = 1; k < table.length; k++) taken[key][String(table[k][col]).toUpperCase()] = true;
    }
    return taken[key];
  }
  function forget(name) {
    delete rowById[name];
    for (var key in taken) if (key.indexOf(name + "|") === 0) delete taken[key];
  }

  for (var i = 0; i < ops.length; i++) {
    var op = ops[i];
    var table = data[op.table];
    if (!table) throw new Error("Unknown table " + op.table + ".");
    var header = table[0];
    var idCol = header.indexOf("id");
    if (idCol === -1) throw new Error("Table " + op.table + " has no id column. Run the setup step.");

    if (op.op === "insert") {
      var unique = op.unique || [];
      for (var u = 0; u < unique.length; u++) {
        if (header.indexOf(unique[u]) === -1) throw new Error("Table " + op.table + " has no column " + unique[u] + ".");
      }
      for (var r = 0; r < op.rows.length; r++) {
        var rec = op.rows[r];
        if (!rec.id) throw new Error("Every new row needs an id.");
        var checks = ["id"].concat(unique);
        for (var c = 0; c < checks.length; c++) {
          var value = String(rec[checks[c]] == null ? "" : rec[checks[c]]);
          if (valuesIn(op.table, table, header.indexOf(checks[c]))[value.toUpperCase()]) {
            throw new Error("DUPLICATE:" + op.table + "." + checks[c] + ":" + value);
          }
        }
        var row = [];
        for (var h = 0; h < header.length; h++) row.push(rec[header[h]] == null ? "" : String(rec[header[h]]));
        for (var key in rec) {
          if (header.indexOf(key) === -1) throw new Error("Table " + op.table + " has no column " + key + ". Run the setup step.");
        }
        table.push(row);
        // Keep the lookups in step with the new row (only the ones already built).
        if (rowById[op.table]) rowById[op.table][row[idCol]] = table.length - 1;
        for (var h2 = 0; h2 < header.length; h2++) {
          var built = taken[op.table + "|" + h2];
          if (built) built[String(row[h2]).toUpperCase()] = true;
        }
      }
    } else if (op.op === "update") {
      var k2 = idIndex(op.table, table, idCol)[op.id];
      if (k2 === undefined) throw new Error("NOT_FOUND:" + op.table + ":" + op.id);
      for (var key2 in op.set) {
        var col2 = header.indexOf(key2);
        if (col2 === -1) throw new Error("Table " + op.table + " has no column " + key2 + ". Run the setup step.");
        if (key2 === "id") throw new Error("Row ids can't be changed.");
        var old = String(table[k2][col2]).toUpperCase();
        table[k2][col2] = op.set[key2] == null ? "" : String(op.set[key2]);
        // A changed value frees the old one and takes the new one for later unique checks.
        if (old !== String(table[k2][col2]).toUpperCase()) delete taken[op.table + "|" + col2];
      }
    } else if (op.op === "delete") {
      var ids = {};
      for (var d = 0; d < op.ids.length; d++) ids[op.ids[d]] = true;
      data[op.table] = [header].concat(
        table.slice(1).filter(function (row) {
          return !ids[row[idCol]];
        }),
      );
      forget(op.table);
    } else {
      throw new Error("Unknown op " + op.op + ".");
    }
    changed[op.table] = true;
  }
  return Object.keys(changed);
}
