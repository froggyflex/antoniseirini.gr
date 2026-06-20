const SHEET_NAME = "RSVP";

function doPost(e) {
  const sheet = getSheet();
  const data = e.parameter || {};

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.email || "",
    data.guests || "",
    data.events || "",
    data.message || "",
    data.submittedAt || "",
    data.source || "",
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Received at",
      "Name",
      "Email",
      "Guests",
      "Events",
      "Message",
      "Submitted at",
      "Source",
    ]);
  }

  return sheet;
}
