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
