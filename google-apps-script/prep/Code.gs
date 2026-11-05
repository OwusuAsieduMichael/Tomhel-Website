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
          var col = header.indexOf(checks[c]);
          var value = String(rec[checks[c]] == null ? "" : rec[checks[c]]);
          for (var k = 1; k < table.length; k++) {
            if (String(table[k][col]).toUpperCase() === value.toUpperCase()) {
              throw new Error("DUPLICATE:" + op.table + "." + checks[c] + ":" + value);
            }
          }
        }
        var row = [];
        for (var h = 0; h < header.length; h++) row.push(rec[header[h]] == null ? "" : String(rec[header[h]]));
        for (var key in rec) {
          if (header.indexOf(key) === -1) throw new Error("Table " + op.table + " has no column " + key + ". Run the setup step.");
        }
        table.push(row);
      }
    } else if (op.op === "update") {
      var found = false;
      for (var k2 = 1; k2 < table.length; k2++) {
        if (table[k2][idCol] === op.id) {
          for (var key2 in op.set) {
            var col2 = header.indexOf(key2);
            if (col2 === -1) throw new Error("Table " + op.table + " has no column " + key2 + ". Run the setup step.");
            if (key2 === "id") throw new Error("Row ids can't be changed.");
            table[k2][col2] = op.set[key2] == null ? "" : String(op.set[key2]);
          }
          found = true;
          break;
        }
      }
      if (!found) throw new Error("NOT_FOUND:" + op.table + ":" + op.id);
    } else if (op.op === "delete") {
      var ids = {};
      for (var d = 0; d < op.ids.length; d++) ids[op.ids[d]] = true;
      data[op.table] = [header].concat(
        table.slice(1).filter(function (row) {
          return !ids[row[idCol]];
        }),
      );
    } else {
      throw new Error("Unknown op " + op.op + ".");
    }
    changed[op.table] = true;
  }
  return Object.keys(changed);
}
