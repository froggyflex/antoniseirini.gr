const SHEET_NAME = "RSVP";

function doPost(e) {
  const sheet = getSheet();
  const data = e.parameter || {};

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.email || "",
    data.attendance || "",
    data.adultMenus || "0",
    data.kidMenus || "0",
    data.totalGuests || "0",
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
      "Attendance",
      "Adult menus",
      "Kid menus",
      "Total guests",
      "Message",
      "Submitted at",
      "Source",
    ]);
  }

  return sheet;
}
