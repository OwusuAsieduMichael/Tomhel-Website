/**
 * Tomhel Educational Complex — Website Forms Backend
 *
 * Deploy as Web App (Execute as: Me, Access: Anyone).
 * Set Script Properties: SPREADSHEET_ID, HEADMASTER_EMAIL, API_SECRET (optional).
 */

var SHEET_NAMES = {
  admissions: "Admissions",
  messages: "Messages",
  visitRequest: "VisitRequests",
};

var SCHOOL_NAME = "Tomhel Educational Complex";

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty("SPREADSHEET_ID"),
    headmasterEmail: props.getProperty("HEADMASTER_EMAIL") || "tomhelschool@yahoo.com",
    apiSecret: props.getProperty("API_SECRET") || "",
  };
}

function doGet() {
  return jsonResponse_({
    success: true,
    message: "Tomhel Forms API is running.",
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ success: false, message: "Missing request body." });
    }

    var payload = JSON.parse(e.postData.contents);
    var config = getConfig_();

    if (config.apiSecret && payload.secret !== config.apiSecret) {
      return jsonResponse_({ success: false, message: "Unauthorized." });
    }

    if (!config.spreadsheetId) {
      return jsonResponse_({ success: false, message: "Spreadsheet is not configured." });
    }

    var endpoint = payload.endpoint;

    if (endpoint === "admissions") {
      return submitAdmission_(payload, config);
    }
    if (endpoint === "messages") {
      return submitMessage_(payload, config);
    }
    if (endpoint === "visit-request") {
      return submitVisitRequest_(payload, config);
    }

    return jsonResponse_({ success: false, message: "Invalid endpoint." });
  } catch (error) {
    return jsonResponse_({
      success: false,
      message: error && error.message ? error.message : "Server error.",
    });
  }
}

function submitAdmission_(payload, config) {
  validateAdmission_(payload);

  var timestamp = new Date();
  var applicationId = generateApplicationId_(timestamp);
  var sheet = getSheet_(config.spreadsheetId, SHEET_NAMES.admissions);

  sheet.appendRow([
    timestamp,
    applicationId,
    payload.studentName,
    payload.dateOfBirth,
    payload.gender,
    payload.classApplyingFor,
    payload.parentName,
    payload.phone,
    payload.email,
    payload.address,
    payload.previousSchool || "",
    payload.notes || "",
  ]);

  var formattedDate = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd MMM yyyy, HH:mm");

  GmailApp.sendEmail(
    config.headmasterEmail,
    "New Admission Application Received",
    [
      "A new admission application has been submitted via the Tomhel website.",
      "",
      "Application ID: " + applicationId,
      "Student Name: " + payload.studentName,
      "Date of Birth: " + payload.dateOfBirth,
      "Gender: " + payload.gender,
      "Class Applied For: " + payload.classApplyingFor,
      "Parent / Guardian: " + payload.parentName,
      "Phone: " + payload.phone,
      "Email: " + payload.email,
      "Address: " + payload.address,
      "Previous School: " + (payload.previousSchool || "N/A"),
      "Notes: " + (payload.notes || "N/A"),
      "",
      "Submitted: " + formattedDate,
    ].join("\n")
  );

  GmailApp.sendEmail(
    payload.email,
    SCHOOL_NAME + " Admission Application Received",
    [
      "Dear " + payload.parentName + ",",
      "",
      "Thank you for applying to " + SCHOOL_NAME + ".",
      "",
      "We have received the admission application for " + payload.studentName + ".",
      "",
      "Application ID: " + applicationId,
      "Submission Date: " + formattedDate,
      "",
      "Our admissions team will review your application and contact you shortly.",
      "",
      "Press On to Higher Grounds.",
      SCHOOL_NAME,
    ].join("\n")
  );

  return jsonResponse_({
    success: true,
    message: "Application received.",
    applicationId: applicationId,
  });
}

function submitMessage_(payload, config) {
  validateMessage_(payload);

  var timestamp = new Date();
  var sheet = getSheet_(config.spreadsheetId, SHEET_NAMES.messages);

  sheet.appendRow([
    timestamp,
    payload.name,
    payload.email,
    payload.phone,
    payload.subject,
    payload.message,
  ]);

  var formattedDate = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd MMM yyyy, HH:mm");

  GmailApp.sendEmail(
    config.headmasterEmail,
    "New Contact Message — " + payload.subject,
    [
      "A new message was submitted via the Tomhel website contact form.",
      "",
      "Name: " + payload.name,
      "Email: " + payload.email,
      "Phone: " + payload.phone,
      "Subject: " + payload.subject,
      "",
      "Message:",
      payload.message,
      "",
      "Submitted: " + formattedDate,
    ].join("\n")
  );

  GmailApp.sendEmail(
    payload.email,
    "We received your message — " + SCHOOL_NAME,
    [
      "Dear " + payload.name + ",",
      "",
      "Thank you for contacting " + SCHOOL_NAME + ".",
      "",
      "We have received your message regarding \"" + payload.subject + "\" and will respond within 1 to 2 business days.",
      "",
      "Submitted: " + formattedDate,
      "",
      SCHOOL_NAME,
    ].join("\n")
  );

  return jsonResponse_({ success: true, message: "Message received." });
}

function submitVisitRequest_(payload, config) {
  validateVisitRequest_(payload);

  var timestamp = new Date();
  var sheet = getSheet_(config.spreadsheetId, SHEET_NAMES.visitRequest);

  sheet.appendRow([
    timestamp,
    payload.name,
    payload.email,
    payload.phone,
    payload.visitDate,
    payload.visitorsCount,
    payload.message || "",
  ]);

  var formattedDate = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd MMM yyyy, HH:mm");

  GmailApp.sendEmail(
    config.headmasterEmail,
    "New School Visit Request",
    [
      "A new campus visit request was submitted via the Tomhel website.",
      "",
      "Parent / Visitor: " + payload.name,
      "Email: " + payload.email,
      "Phone: " + payload.phone,
      "Preferred Visit Date: " + payload.visitDate,
      "Number of Visitors: " + payload.visitorsCount,
      "Message: " + (payload.message || "N/A"),
      "",
      "Submitted: " + formattedDate,
    ].join("\n")
  );

  GmailApp.sendEmail(
    payload.email,
    "Visit Request Received — " + SCHOOL_NAME,
    [
      "Dear " + payload.name + ",",
      "",
      "Thank you for requesting a visit to " + SCHOOL_NAME + ".",
      "",
      "Preferred Date: " + payload.visitDate,
      "Visitors: " + payload.visitorsCount,
      "",
      "Our team will confirm your visit shortly.",
      "",
      "Submitted: " + formattedDate,
      "",
      SCHOOL_NAME,
    ].join("\n")
  );

  return jsonResponse_({ success: true, message: "Visit request received." });
}

function validateAdmission_(payload) {
  requireFields_(payload, [
    "studentName",
    "dateOfBirth",
    "gender",
    "classApplyingFor",
    "parentName",
    "phone",
    "email",
    "address",
  ]);
  requireEmail_(payload.email);
}

function validateMessage_(payload) {
  requireFields_(payload, ["name", "email", "phone", "subject", "message"]);
  requireEmail_(payload.email);
}

function validateVisitRequest_(payload) {
  requireFields_(payload, ["name", "email", "phone", "visitDate", "visitorsCount"]);
  requireEmail_(payload.email);
}

function requireFields_(payload, fields) {
  for (var i = 0; i < fields.length; i++) {
    var key = fields[i];
    if (!payload[key] || String(payload[key]).trim() === "") {
      throw new Error("Missing required field: " + key);
    }
  }
}

function requireEmail_(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    throw new Error("Invalid email address.");
  }
}

function generateApplicationId_(date) {
  var datePart = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyyMMdd");
  var randomPart = Math.floor(1000 + Math.random() * 9000);
  return "TOMHEL-" + datePart + "-" + randomPart;
}

function getSheet_(spreadsheetId, sheetName) {
  var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Sheet not found: " + sheetName);
  }
  return sheet;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Run once after creating the spreadsheet to set up column headers.
 */
function setupSheets() {
  var config = getConfig_();
  if (!config.spreadsheetId) {
    throw new Error("Set SPREADSHEET_ID in Script Properties first.");
  }

  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  setupSheetHeaders_(spreadsheet, SHEET_NAMES.admissions, [
    "Timestamp",
    "Application ID",
    "Student Name",
    "DOB",
    "Gender",
    "Class",
    "Parent Name",
    "Phone",
    "Email",
    "Address",
    "Previous School",
    "Notes",
  ]);
  setupSheetHeaders_(spreadsheet, SHEET_NAMES.messages, [
    "Timestamp",
    "Name",
    "Email",
    "Phone",
    "Subject",
    "Message",
  ]);
  setupSheetHeaders_(spreadsheet, SHEET_NAMES.visitRequest, [
    "Timestamp",
    "Name",
    "Email",
    "Phone",
    "Visit Date",
    "Visitors Count",
    "Message",
  ]);
}

function setupSheetHeaders_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
}
