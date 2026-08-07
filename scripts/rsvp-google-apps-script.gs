const SHEET_NAME = "RSVP";
const WISHES_SHEET_NAME = "Wishes";

function doPost(e) {
  const data = e.parameter || {};
  const isWish = data.type === "wish";
  const sheet = getSheet(isWish ? WISHES_SHEET_NAME : SHEET_NAME, isWish);

  if (isWish) {
    sheet.appendRow([
      new Date(),
      data.name || "",
      data.message || "",
      data.submittedAt || "",
      data.source || "",
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  const values = {
    "Received at": new Date(),
    "Name": data.name || "",
    "Email": "",
    "Attendance": data.attendance || "",
    "Adult menus": data.adultMenus || "0",
    "Kid menus": data.kidMenus || "0",
    "Total guests": data.totalGuests || "0",
    "Message": data.message || "",
    "Submitted at": data.submittedAt || "",
    "Source": data.source || "",
  };

  sheet.appendRow(headers.map((header) => values[header] ?? ""));

  return ContentService.createTextOutput(
    JSON.stringify({ ok: true }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function getSheet(sheetName, isWish) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(isWish
      ? ["Received at", "Name", "Wish", "Submitted at", "Source"]
      : [
          "Received at",
          "Name",
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
