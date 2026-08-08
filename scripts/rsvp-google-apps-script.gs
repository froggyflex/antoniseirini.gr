const SPREADSHEET_ID_PROPERTY = "WEDDING_SPREADSHEET_ID";
const PHOTO_FOLDER_ID_PROPERTY = "WEDDING_PHOTO_FOLDER_ID";
const GUESTS_SHEET_NAME = "Guests";
const HISTORY_SHEET_NAME = "RSVP History";
const WISHES_SHEET_NAME = "Wishes";
const PHOTOS_SHEET_NAME = "Photos";
const DASHBOARD_SHEET_NAME = "Dashboard";
const PHOTO_FOLDER_NAME = "Antonis & Eirini - Wedding Photo Uploads";
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MIN_DRIVE_FREE_BYTES = 1024 * 1024 * 1024;

const STATUS_ATTENDING = "Θα παρευρεθούν";
const STATUS_DECLINED = "Δεν θα παρευρεθούν";

const GUEST_HEADERS = [
  "Guest ID",
  "Name / family",
  "Normalized name",
  "Attendance",
  "Ceremony",
  "Reception",
  "Adults",
  "Children",
  "Total guests",
  "Notes / preferences",
  "First response",
  "Last updated",
  "Update count",
  "Last source",
  "Review",
];

const HISTORY_HEADERS = [
  "Received at",
  "Guest ID",
  "Name / family",
  "Attendance",
  "Ceremony",
  "Reception",
  "Adults",
  "Children",
  "Total guests",
  "Notes / preferences",
  "Update type",
  "Client submitted at",
  "Source",
];

const WISH_HEADERS = [
  "Received at",
  "Name",
  "Normalized name",
  "Wish",
  "RSVP match",
  "Match confidence",
  "Previous wishes",
  "Source",
];

const PHOTO_HEADERS = [
  "Received at",
  "Uploader",
  "Original file name",
  "Stored file name",
  "File type",
  "Size MB",
  "Drive link",
  "File ID",
  "RSVP match",
  "Match confidence",
  "Source",
];

const COLORS = {
  sage: "#6f7968",
  sageLight: "#dfe8da",
  ivory: "#f8f6ef",
  coralLight: "#f3dfd8",
  goldLight: "#f4ead2",
  lavenderLight: "#e8e2ef",
  ink: "#35372f",
  white: "#ffffff",
};

function doGet() {
  return jsonResponse({
    ok: true,
    service: "Antonis & Eirini wedding responses",
  });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Wedding Manager")
    .addItem("Refresh dashboard", "refreshWeddingDashboard")
    .addSeparator()
    .addItem("Open guest register", "openGuestRegister")
    .addItem("Open wishes", "openWishesRegister")
    .addItem("Open photos", "openPhotoRegister")
    .addItem("Open RSVP history", "openRsvpHistory")
    .addToUi();
}

function refreshWeddingDashboard() {
  const workbook = getWorkbook();
  const guests = ensureTableSheet(workbook, GUESTS_SHEET_NAME, GUEST_HEADERS);
  const history = ensureTableSheet(workbook, HISTORY_SHEET_NAME, HISTORY_HEADERS);
  const wishes = ensureTableSheet(workbook, WISHES_SHEET_NAME, WISH_HEADERS);
  const photos = ensureTableSheet(workbook, PHOTOS_SHEET_NAME, PHOTO_HEADERS);
  const dashboard = ensureSheet(workbook, DASHBOARD_SHEET_NAME);
  buildDashboard(dashboard, guests, wishes, history, photos);
  workbook.setActiveSheet(dashboard);
  SpreadsheetApp.flush();
}

function openGuestRegister() {
  openWeddingSheet(GUESTS_SHEET_NAME);
}

function openWishesRegister() {
  openWeddingSheet(WISHES_SHEET_NAME);
}

function openRsvpHistory() {
  openWeddingSheet(HISTORY_SHEET_NAME);
}

function openPhotoRegister() {
  openWeddingSheet(PHOTOS_SHEET_NAME);
}

function openWeddingSheet(name) {
  const workbook = getWorkbook();
  const sheet = workbook.getSheetByName(name);
  if (sheet) workbook.setActiveSheet(sheet);
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
    const data = getRequestData(e);
    const workbook = getWorkbook();

    if (data.type === "wish") {
      return jsonResponse(processWish(workbook, data));
    }

    if (data.type === "photo") {
      return jsonResponse(processPhoto(workbook, data));
    }

    return jsonResponse(processRsvp(workbook, data));
  } catch (error) {
    console.error(error);
    return jsonResponse({
      ok: false,
      message: error && error.message
        ? String(error.message)
        : "The response could not be saved.",
    });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function getRequestData(e) {
  const postData = e && e.postData;
  if (postData && /^(text\/plain|application\/json)/i.test(postData.type || "")) {
    try {
      return JSON.parse(postData.contents || "{}");
    } catch (error) {
      throw new Error("The request body is not valid JSON.");
    }
  }
  return (e && e.parameter) || {};
}

function setupWeddingWorkbook() {
  const workbook = SpreadsheetApp.getActiveSpreadsheet();
  if (!workbook) {
    throw new Error("Open Apps Script from the wedding Google Sheet before running setup.");
  }

  PropertiesService.getScriptProperties().setProperty(
    SPREADSHEET_ID_PROPERTY,
    workbook.getId(),
  );

  const guests = ensureTableSheet(workbook, GUESTS_SHEET_NAME, GUEST_HEADERS);
  const history = ensureTableSheet(workbook, HISTORY_SHEET_NAME, HISTORY_HEADERS);
  const wishes = ensureTableSheet(workbook, WISHES_SHEET_NAME, WISH_HEADERS);
  const photos = ensureTableSheet(workbook, PHOTOS_SHEET_NAME, PHOTO_HEADERS);
  const dashboard = ensureSheet(workbook, DASHBOARD_SHEET_NAME);

  ensurePhotoFolder();

  formatGuestsSheet(guests);
  formatHistorySheet(history);
  formatWishesSheet(wishes);
  formatPhotosSheet(photos);
  buildDashboard(dashboard, guests, wishes, history, photos);

  workbook.setActiveSheet(dashboard);
  SpreadsheetApp.flush();
  return workbook.getUrl();
}

function processRsvp(workbook, data) {
  const name = cleanText(data.name, 160);
  if (!name) throw new Error("A guest or family name is required.");

  const normalizedName = normalizeName(name);
  const attendance = data.attendance === "attending"
    ? STATUS_ATTENDING
    : STATUS_DECLINED;
  const adults = attendance === STATUS_ATTENDING ? clampCount(data.adultMenus) : 0;
  const children = attendance === STATUS_ATTENDING ? clampCount(data.kidMenus) : 0;
  const totalGuests = adults + children;
  const ceremony = attendance === STATUS_ATTENDING && data.ceremonyAttendance === "true"
    ? "Yes"
    : "No";
  const reception = attendance === STATUS_ATTENDING && data.receptionAttendance === "true"
    ? "Yes"
    : "No";

  if (attendance === STATUS_ATTENDING && totalGuests < 1) {
    throw new Error("At least one adult or child is required for attending guests.");
  }

  if (attendance === STATUS_ATTENDING && ceremony === "No" && reception === "No") {
    throw new Error("Attending guests must select the ceremony, reception, or both.");
  }

  const guests = ensureTableSheet(workbook, GUESTS_SHEET_NAME, GUEST_HEADERS);
  const history = ensureTableSheet(workbook, HISTORY_SHEET_NAME, HISTORY_HEADERS);
  const now = new Date();
  const existingRow = findRowByValue(guests, "Normalized name", normalizedName);
  const existingRecord = existingRow ? getRecord(guests, existingRow) : null;
  const guestId = existingRecord
    ? existingRecord["Guest ID"]
    : createGuestId(normalizedName);
  const updateCount = existingRecord
    ? Number(existingRecord["Update count"] || 1) + 1
    : 1;
  const notes = cleanText(data.message, 1000);

  const guestRecord = {
    "Guest ID": guestId,
    "Name / family": name,
    "Normalized name": normalizedName,
    "Attendance": attendance,
    "Ceremony": ceremony,
    "Reception": reception,
    "Adults": adults,
    "Children": children,
    "Total guests": totalGuests,
    "Notes / preferences": notes,
    "First response": existingRecord ? existingRecord["First response"] : now,
    "Last updated": now,
    "Update count": updateCount,
    "Last source": cleanText(data.source, 500),
    "Review": updateCount > 1 ? "Updated response" : "",
  };

  if (existingRow) {
    writeRecord(guests, existingRow, guestRecord);
  } else {
    appendRecord(guests, guestRecord);
  }

  appendRecord(history, {
    "Received at": now,
    "Guest ID": guestId,
    "Name / family": name,
    "Attendance": attendance,
    "Ceremony": ceremony,
    "Reception": reception,
    "Adults": adults,
    "Children": children,
    "Total guests": totalGuests,
    "Notes / preferences": notes,
    "Update type": existingRow ? "Updated existing guest" : "New guest",
    "Client submitted at": cleanText(data.submittedAt, 80),
    "Source": cleanText(data.source, 500),
  });

  SpreadsheetApp.flush();
  return {
    ok: true,
    guestId,
    updatedExisting: Boolean(existingRow),
  };
}

function processWish(workbook, data) {
  const name = cleanText(data.name, 160);
  const wish = cleanText(data.message, 1000);
  if (!name || !wish) throw new Error("A name and wish are required.");

  const normalizedName = normalizeName(name);
  const guests = ensureTableSheet(workbook, GUESTS_SHEET_NAME, GUEST_HEADERS);
  const wishes = ensureTableSheet(workbook, WISHES_SHEET_NAME, WISH_HEADERS);
  const matches = findPotentialGuestMatches(guests, normalizedName);
  const previousWishCount = countRowsByValue(wishes, "Normalized name", normalizedName);
  let confidence = "No match";
  let matchLabel = "No RSVP match found";

  if (matches.exact.length) {
    confidence = "Exact";
    matchLabel = `Likely same guest/family: ${matches.exact.join(", ")}`;
  } else if (matches.possible.length) {
    confidence = "Possible";
    matchLabel = `Possible guest/family: ${matches.possible.join(", ")}`;
  }

  appendRecord(wishes, {
    "Received at": new Date(),
    "Name": name,
    "Normalized name": normalizedName,
    "Wish": wish,
    "RSVP match": matchLabel,
    "Match confidence": confidence,
    "Previous wishes": previousWishCount,
    "Source": cleanText(data.source, 500),
  });

  SpreadsheetApp.flush();
  return {
    ok: true,
    possibleMatch: confidence !== "No match",
    matchConfidence: confidence,
    previousWishCount,
  };
}

function processPhoto(workbook, data) {
  const uploader = cleanText(data.name, 160);
  const originalName = sanitizePhotoFileName(data.fileName);
  const mimeType = normalizePhotoMimeType(data.mimeType, originalName);
  const declaredSize = Math.floor(Number(data.fileSize) || 0);
  const encodedData = String(data.fileData || "").replace(/^data:[^;]+;base64,/, "");

  if (!uploader) throw new Error("An uploader name is required.");
  if (!originalName || !encodedData) throw new Error("Photo data is missing.");
  if (!isAllowedPhotoType(mimeType, originalName)) {
    throw new Error("This image type is not supported.");
  }
  if (declaredSize < 1 || declaredSize > MAX_PHOTO_BYTES) {
    throw new Error("The photo exceeds the 8 MB file limit.");
  }

  const bytes = Utilities.base64Decode(encodedData);
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) {
    throw new Error("The decoded photo exceeds the 8 MB file limit.");
  }

  ensureDriveHasSpace(bytes.length);

  const now = new Date();
  const folder = ensurePhotoFolder();
  const storedName = createStoredPhotoName(uploader, originalName, now);
  const blob = Utilities.newBlob(bytes, mimeType, storedName);
  const file = folder.createFile(blob);
  file.setDescription(`Wedding photo uploaded by ${uploader} on ${now.toISOString()}`);

  const guests = ensureTableSheet(workbook, GUESTS_SHEET_NAME, GUEST_HEADERS);
  const photos = ensureTableSheet(workbook, PHOTOS_SHEET_NAME, PHOTO_HEADERS);
  const matches = findPotentialGuestMatches(guests, normalizeName(uploader));
  let confidence = "No match";
  let matchLabel = "No RSVP match found";

  if (matches.exact.length) {
    confidence = "Exact";
    matchLabel = `Likely same guest/family: ${matches.exact.join(", ")}`;
  } else if (matches.possible.length) {
    confidence = "Possible";
    matchLabel = `Possible guest/family: ${matches.possible.join(", ")}`;
  }

  appendRecord(photos, {
    "Received at": now,
    "Uploader": uploader,
    "Original file name": originalName,
    "Stored file name": storedName,
    "File type": mimeType,
    "Size MB": bytes.length / 1024 / 1024,
    "Drive link": file.getUrl(),
    "File ID": file.getId(),
    "RSVP match": matchLabel,
    "Match confidence": confidence,
    "Source": cleanText(data.source, 500),
  });

  SpreadsheetApp.flush();
  return {
    ok: true,
    fileId: file.getId(),
    fileName: originalName,
  };
}

function ensurePhotoFolder() {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(PHOTO_FOLDER_ID_PROPERTY);

  if (storedId) {
    try {
      return DriveApp.getFolderById(storedId);
    } catch (error) {
      console.warn("Stored wedding photo folder was not available; creating a new one.");
    }
  }

  const existing = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  const folder = existing.hasNext()
    ? existing.next()
    : DriveApp.createFolder(PHOTO_FOLDER_NAME);
  properties.setProperty(PHOTO_FOLDER_ID_PROPERTY, folder.getId());
  return folder;
}

function ensureDriveHasSpace(photoBytes) {
  const storageLimit = DriveApp.getStorageLimit();
  if (!storageLimit || storageLimit < 0) return;

  const storageUsed = DriveApp.getStorageUsed();
  if (storageUsed + photoBytes + MIN_DRIVE_FREE_BYTES > storageLimit) {
    throw new Error("The wedding Google Drive does not have enough free storage.");
  }
}

function sanitizePhotoFileName(value) {
  return cleanText(value, 180)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/^[.-]+/, "")
    .trim();
}

function normalizePhotoMimeType(value, fileName) {
  const mimeType = cleanText(value, 80).toLowerCase();
  if (mimeType.startsWith("image/")) return mimeType;

  const extension = String(fileName).split(".").pop().toLowerCase();
  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
  };
  return mimeTypes[extension] || "";
}

function isAllowedPhotoType(mimeType, fileName) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const allowedExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(fileName);
  return allowedMimeTypes.includes(mimeType) && allowedExtension;
}

function createStoredPhotoName(uploader, originalName, date) {
  const extensionMatch = originalName.match(/\.[a-z0-9]+$/i);
  const extension = extensionMatch ? extensionMatch[0].toLowerCase() : "";
  const baseName = originalName.slice(0, extension ? -extension.length : undefined)
    .replace(/[^a-zA-Z0-9\u0370-\u03ff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "photo";
  const uploaderLabel = normalizeName(uploader)
    .replace(/\s+/g, "-")
    .slice(0, 50) || "guest";
  const timestamp = Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "yyyyMMdd-HHmmss",
  );
  const suffix = Utilities.getUuid().slice(0, 8);
  return `${timestamp}_${uploaderLabel}_${baseName}_${suffix}${extension}`;
}

function getWorkbook() {
  const storedId = PropertiesService.getScriptProperties().getProperty(
    SPREADSHEET_ID_PROPERTY,
  );
  if (storedId) return SpreadsheetApp.openById(storedId);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error("Run setupWeddingWorkbook before deploying the web app.");
  }
  return active;
}

function ensureSheet(workbook, name) {
  return workbook.getSheetByName(name) || workbook.insertSheet(name);
}

function ensureTableSheet(workbook, name, expectedHeaders) {
  const sheet = ensureSheet(workbook, name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    return sheet;
  }

  const headers = getHeaders(sheet);
  expectedHeaders.forEach((header) => {
    if (!headers.includes(header)) {
      headers.push(header);
      sheet.getRange(1, headers.length).setValue(header);
    }
  });
  return sheet;
}

function getHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  return sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map((header) => String(header).trim());
}

function getHeaderIndex(sheet, header) {
  return getHeaders(sheet).indexOf(header) + 1;
}

function appendRecord(sheet, record) {
  const headers = getHeaders(sheet);
  sheet.appendRow(headers.map((header) => record[header] ?? ""));
  return sheet.getLastRow();
}

function writeRecord(sheet, rowNumber, record) {
  const headers = getHeaders(sheet);
  const existing = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const values = headers.map((header, index) =>
    Object.prototype.hasOwnProperty.call(record, header)
      ? record[header]
      : existing[index],
  );
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
}

function getRecord(sheet, rowNumber) {
  const headers = getHeaders(sheet);
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  return headers.reduce((record, header, index) => {
    record[header] = values[index];
    return record;
  }, {});
}

function findRowByValue(sheet, header, value) {
  const column = getHeaderIndex(sheet, header);
  if (!column || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, column, sheet.getLastRow() - 1, 1).getValues();
  const matchIndex = values.findIndex((row) => String(row[0]) === String(value));
  return matchIndex < 0 ? 0 : matchIndex + 2;
}

function countRowsByValue(sheet, header, value) {
  const column = getHeaderIndex(sheet, header);
  if (!column || sheet.getLastRow() < 2) return 0;
  return sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .getValues()
    .filter((row) => String(row[0]) === String(value)).length;
}

function findPotentialGuestMatches(guestSheet, normalizedName) {
  if (guestSheet.getLastRow() < 2) return { exact: [], possible: [] };
  const nameColumn = getHeaderIndex(guestSheet, "Name / family");
  const normalizedColumn = getHeaderIndex(guestSheet, "Normalized name");
  const rowCount = guestSheet.getLastRow() - 1;
  const names = guestSheet.getRange(2, nameColumn, rowCount, 1).getDisplayValues();
  const normalizedNames = guestSheet
    .getRange(2, normalizedColumn, rowCount, 1)
    .getDisplayValues();
  const exact = [];
  const possible = [];

  normalizedNames.forEach((row, index) => {
    const candidate = row[0];
    const displayName = names[index][0];
    if (!candidate || !displayName) return;

    if (candidate === normalizedName) {
      exact.push(displayName);
    } else if (namesPossiblyMatch(candidate, normalizedName)) {
      possible.push(displayName);
    }
  });

  return {
    exact: exact.slice(0, 3),
    possible: possible.slice(0, 3),
  };
}

function namesPossiblyMatch(left, right) {
  const leftTokens = significantNameTokens(left);
  const rightTokens = significantNameTokens(right);
  if (!leftTokens.length || !rightTokens.length) return false;

  return leftTokens.some((leftToken) =>
    rightTokens.some((rightToken) => {
      if (leftToken === rightToken && leftToken.length >= 5) return true;
      return commonPrefixLength(leftToken, rightToken) >= 6;
    }),
  );
}

function significantNameTokens(value) {
  return value
    .split(" ")
    .filter((token) => token.length >= 5)
    .filter((token) => !["οικογενεια", "family"].includes(token));
}

function commonPrefixLength(left, right) {
  const maximum = Math.min(left.length, right.length);
  let index = 0;
  while (index < maximum && left[index] === right[index]) index += 1;
  return index;
}

function normalizeName(value) {
  let normalized = cleanText(value, 160).toLowerCase();
  if (normalized.normalize) normalized = normalized.normalize("NFD");
  return normalized
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ς/g, "σ")
    .replace(/[^a-z0-9\u0370-\u03ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createGuestId(normalizedName) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalizedName,
    Utilities.Charset.UTF_8,
  );
  const hash = digest
    .slice(0, 6)
    .map((byte) => ((byte + 256) % 256).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `G-${hash}`;
}

function clampCount(value) {
  const number = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(number, 20));
}

function cleanText(value, maximumLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function formatGuestsSheet(sheet) {
  formatTableSheet(sheet, {
    "Guest ID": 120,
    "Name / family": 220,
    "Normalized name": 180,
    "Attendance": 170,
    "Ceremony": 100,
    "Reception": 100,
    "Adults": 80,
    "Children": 80,
    "Total guests": 100,
    "Notes / preferences": 300,
    "First response": 150,
    "Last updated": 150,
    "Update count": 100,
    "Last source": 220,
    "Review": 140,
  });

  hideHelperColumn(sheet, "Normalized name");
  setNumberFormat(sheet, ["Adults", "Children", "Total guests", "Update count"], "0");
  setNumberFormat(sheet, ["First response", "Last updated"], "dd/MM/yyyy HH:mm");

  const attendanceRange = dataColumnRange(sheet, "Attendance");
  const updateRange = dataColumnRange(sheet, "Update count");
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(STATUS_ATTENDING)
      .setBackground(COLORS.sageLight)
      .setRanges([attendanceRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(STATUS_DECLINED)
      .setBackground(COLORS.coralLight)
      .setRanges([attendanceRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(1)
      .setBackground(COLORS.goldLight)
      .setRanges([updateRange])
      .build(),
  ];
  sheet.setConditionalFormatRules(rules);

  const attendanceColumn = getHeaderIndex(sheet, "Attendance");
  const validation = SpreadsheetApp.newDataValidation()
    .requireValueInList([STATUS_ATTENDING, STATUS_DECLINED], true)
    .setAllowInvalid(false)
    .build();
  sheet
    .getRange(2, attendanceColumn, Math.max(sheet.getMaxRows() - 1, 1), 1)
    .setDataValidation(validation);
}

function formatHistorySheet(sheet) {
  formatTableSheet(sheet, {
    "Received at": 150,
    "Guest ID": 120,
    "Name / family": 220,
    "Attendance": 170,
    "Ceremony": 100,
    "Reception": 100,
    "Adults": 80,
    "Children": 80,
    "Total guests": 100,
    "Notes / preferences": 300,
    "Update type": 160,
    "Client submitted at": 180,
    "Source": 220,
  });
  setNumberFormat(sheet, ["Received at"], "dd/MM/yyyy HH:mm");
  setNumberFormat(sheet, ["Adults", "Children", "Total guests"], "0");
}

function formatWishesSheet(sheet) {
  formatTableSheet(sheet, {
    "Received at": 150,
    "Name": 220,
    "Normalized name": 180,
    "Wish": 420,
    "RSVP match": 300,
    "Match confidence": 130,
    "Previous wishes": 120,
    "Source": 220,
  });
  hideHelperColumn(sheet, "Normalized name");
  setNumberFormat(sheet, ["Received at"], "dd/MM/yyyy HH:mm");
  setNumberFormat(sheet, ["Previous wishes"], "0");

  const confidenceRange = dataColumnRange(sheet, "Match confidence");
  const previousRange = dataColumnRange(sheet, "Previous wishes");
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Exact")
      .setBackground(COLORS.sageLight)
      .setRanges([confidenceRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Possible")
      .setBackground(COLORS.goldLight)
      .setRanges([confidenceRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0)
      .setBackground(COLORS.lavenderLight)
      .setRanges([previousRange])
      .build(),
  ]);
}

function formatPhotosSheet(sheet) {
  formatTableSheet(sheet, {
    "Received at": 150,
    "Uploader": 220,
    "Original file name": 240,
    "Stored file name": 280,
    "File type": 120,
    "Size MB": 90,
    "Drive link": 170,
    "File ID": 180,
    "RSVP match": 300,
    "Match confidence": 130,
    "Source": 220,
  });
  setNumberFormat(sheet, ["Received at"], "dd/MM/yyyy HH:mm");
  setNumberFormat(sheet, ["Size MB"], "0.00");
  hideHelperColumn(sheet, "File ID");

  const confidenceRange = dataColumnRange(sheet, "Match confidence");
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Exact")
      .setBackground(COLORS.sageLight)
      .setRanges([confidenceRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Possible")
      .setBackground(COLORS.goldLight)
      .setRanges([confidenceRange])
      .build(),
  ]);
}

function formatTableSheet(sheet, widths) {
  const headers = getHeaders(sheet);
  sheet.setFrozenRows(1);
  sheet.setHiddenGridlines(true);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground(COLORS.sage)
    .setFontColor(COLORS.white)
    .setFontWeight("bold")
    .setWrap(true)
    .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 42);

  headers.forEach((header, index) => {
    sheet.setColumnWidth(index + 1, widths[header] || 140);
  });

  const filter = sheet.getFilter();
  if (filter) filter.remove();
  sheet
    .getRange(1, 1, sheet.getMaxRows(), headers.length)
    .createFilter();
}

function buildDashboard(sheet, guests, wishes, history, photos) {
  sheet.getCharts().forEach((chart) => sheet.removeChart(chart));
  sheet.clear();
  sheet.clearConditionalFormatRules();
  sheet.getRange("A1:N60").breakApart();
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(4);
  sheet.setTabColor(COLORS.sage);

  for (let column = 1; column <= 10; column += 1) {
    sheet.setColumnWidth(column, 104);
  }
  sheet.setColumnWidths(13, 2, 2);

  sheet.getRange("A1:J2").merge();
  sheet.getRange("A1").setValue("Antonis & Eirini");
  sheet.getRange("A1:J2")
    .setBackground(COLORS.sage)
    .setFontColor(COLORS.white)
    .setFontFamily("Georgia")
    .setFontSize(26)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.setRowHeights(1, 2, 34);

  sheet.getRange("A3:J3").merge();
  sheet.getRange("A3")
    .setValue("Guest management dashboard • Live wedding overview")
    .setBackground(COLORS.sage)
    .setFontColor(COLORS.goldLight)
    .setFontSize(10)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sheet.setRowHeight(3, 28);

  addDashboardLink(sheet, "A4:B4", "Guest register", guests);
  addDashboardLink(sheet, "C4:D4", "RSVP history", history);
  addDashboardLink(sheet, "E4:F4", "Wishes", wishes);
  addDashboardLink(sheet, "G4:H4", "Photos", photos);
  sheet.getRange("I4:J4").merge();
  sheet.getRange("I4").setFormula(
    `=IF(COUNTA(Guests!A2:A)=0,"No responses yet","Last response  •  "&TEXT(MAX(Guests!${columnToLetter(getHeaderIndex(guests, "Last updated"))}2:${columnToLetter(getHeaderIndex(guests, "Last updated"))}),"dd/mm/yyyy  hh:mm"))`,
  );
  styleDashboardNavigation(sheet.getRange("I4:J4"));
  sheet.setRowHeight(4, 34);

  const guestColumns = {
    name: columnToLetter(getHeaderIndex(guests, "Name / family")),
    attendance: columnToLetter(getHeaderIndex(guests, "Attendance")),
    ceremony: columnToLetter(getHeaderIndex(guests, "Ceremony")),
    reception: columnToLetter(getHeaderIndex(guests, "Reception")),
    adults: columnToLetter(getHeaderIndex(guests, "Adults")),
    children: columnToLetter(getHeaderIndex(guests, "Children")),
    total: columnToLetter(getHeaderIndex(guests, "Total guests")),
    notes: columnToLetter(getHeaderIndex(guests, "Notes / preferences")),
    lastUpdated: columnToLetter(getHeaderIndex(guests, "Last updated")),
    updateCount: columnToLetter(getHeaderIndex(guests, "Update count")),
  };
  const wishConfidence = columnToLetter(getHeaderIndex(wishes, "Match confidence"));
  const photoSize = columnToLetter(getHeaderIndex(photos, "Size MB"));

  const formulas = {
    records: "=COUNTA(Guests!A2:A)",
    attending: `=COUNTIF(Guests!${guestColumns.attendance}2:${guestColumns.attendance},"${STATUS_ATTENDING}")`,
    declined: `=COUNTIF(Guests!${guestColumns.attendance}2:${guestColumns.attendance},"${STATUS_DECLINED}")`,
    ceremony: `=SUMIF(Guests!${guestColumns.ceremony}2:${guestColumns.ceremony},"Yes",Guests!${guestColumns.total}2:${guestColumns.total})`,
    reception: `=SUMIF(Guests!${guestColumns.reception}2:${guestColumns.reception},"Yes",Guests!${guestColumns.total}2:${guestColumns.total})`,
    adults: `=SUM(Guests!${guestColumns.adults}2:${guestColumns.adults})`,
    children: `=SUM(Guests!${guestColumns.children}2:${guestColumns.children})`,
    total: `=SUM(Guests!${guestColumns.total}2:${guestColumns.total})`,
    notes: `=COUNTIF(Guests!${guestColumns.notes}2:${guestColumns.notes},"<>")`,
    updates: `=COUNTIF(Guests!${guestColumns.updateCount}2:${guestColumns.updateCount},">1")`,
    wishes: "=COUNTA(Wishes!A2:A)",
    wishReview: `=COUNTIF(Wishes!${wishConfidence}2:${wishConfidence},"Possible")`,
    photos: "=COUNTA(Photos!A2:A)",
    photoStorage: `=SUM(Photos!${photoSize}2:${photoSize})`,
  };

  addMetricCard(sheet, "A6:B6", "A7:B8", "TOTAL GUESTS", formulas.total, COLORS.sageLight);
  addMetricCard(sheet, "C6:D6", "C7:D8", "ADULT MENUS", formulas.adults, COLORS.goldLight);
  addMetricCard(sheet, "E6:F6", "E7:F8", "CHILD MENUS", formulas.children, COLORS.lavenderLight);
  addMetricCard(sheet, "G6:H6", "G7:H8", "ATTENDING PARTIES", formulas.attending, COLORS.sageLight);
  addMetricCard(sheet, "I6:J6", "I7:J8", "DECLINED PARTIES", formulas.declined, COLORS.coralLight);

  styleDashboardSection(sheet, "A10:F10", "EVENT PLAN");
  setDashboardSummaryRow(sheet, "A11:C11", "D11:F11", "Ceremony guests", formulas.ceremony);
  setDashboardSummaryRow(sheet, "A12:C12", "D12:F12", "Reception guests", formulas.reception);
  setDashboardSummaryRow(sheet, "A13:C13", "D13:F13", "Guest / family records", formulas.records);

  styleDashboardSection(sheet, "G10:J10", "FOLLOW-UP");
  setDashboardSummaryRow(sheet, "G11:I11", "J11", "Notes to review", formulas.notes);
  setDashboardSummaryRow(sheet, "G12:I12", "J12", "Updated responses", formulas.updates);
  setDashboardSummaryRow(sheet, "G13:I13", "J13", "Wish matches to review", formulas.wishReview);
  setDashboardSummaryRow(sheet, "G14:I14", "J14", "Wishes received", formulas.wishes);
  setDashboardSummaryRow(sheet, "G15:I15", "J15", "Photos received", formulas.photos);
  setDashboardSummaryRow(sheet, "G16:I16", "J16", "Photo storage", formulas.photoStorage);
  sheet.getRange("J16").setNumberFormat("0.00 \"MB\"");

  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThan(0)
      .setBackground(COLORS.goldLight)
      .setFontColor(COLORS.ink)
      .setRanges([sheet.getRange("J11:J13")])
      .build(),
  ]);

  const helperValues = [
    ["Attendance", "Parties"],
    ["Attending", ""],
    ["Declined", ""],
    ["", ""],
    ["Planning", "Guests"],
    ["Ceremony", ""],
    ["Reception", ""],
    ["Adults", ""],
    ["Children", ""],
  ];
  sheet.getRange(1, 13, helperValues.length, 2).setValues(helperValues);
  sheet.getRange("N2").setFormula(formulas.attending);
  sheet.getRange("N3").setFormula(formulas.declined);
  sheet.getRange("N6").setFormula(formulas.ceremony);
  sheet.getRange("N7").setFormula(formulas.reception);
  sheet.getRange("N8").setFormula(formulas.adults);
  sheet.getRange("N9").setFormula(formulas.children);
  sheet.getRange("M1:N9").setFontColor(COLORS.white).setBackground(COLORS.white);

  addDashboardCharts(sheet);

  styleDashboardSection(sheet, "A33:J33", "RECENT RSVP UPDATES");
  sheet.getRange("A34").setFormula(
    `=IFERROR(QUERY(Guests!A2:${guestColumns.lastUpdated},"select ${guestColumns.name},${guestColumns.attendance},${guestColumns.ceremony},${guestColumns.reception},${guestColumns.total},${guestColumns.lastUpdated} where ${guestColumns.name} is not null order by ${guestColumns.lastUpdated} desc limit 8 label ${guestColumns.name} 'Guest / family',${guestColumns.attendance} 'Attendance',${guestColumns.ceremony} 'Ceremony',${guestColumns.reception} 'Reception',${guestColumns.total} 'Guests',${guestColumns.lastUpdated} 'Last updated'",0),"")`,
  );
  sheet.getRange("A34:F42")
    .setBackground(COLORS.ivory)
    .setFontColor(COLORS.ink)
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.getRange("A34:F34")
    .setBackground(COLORS.goldLight)
    .setFontWeight("bold");
  sheet.getRange("F35:F42").setNumberFormat("dd/MM/yyyy HH:mm");
  sheet.setRowHeights(34, 9, 30);
  sheet.getRange("A1:J42").setFontFamily("Arial");
  sheet.getRange("A1:J2").setFontFamily("Georgia");
}

function addMetricCard(sheet, labelRange, valueRange, label, formula, background) {
  const labelCell = sheet.getRange(labelRange).merge();
  const valueCell = sheet.getRange(valueRange).merge();
  labelCell
    .setValue(label)
    .setBackground(background)
    .setFontColor(COLORS.ink)
    .setFontSize(9)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  valueCell
    .setFormula(formula)
    .setBackground(background)
    .setFontColor(COLORS.ink)
    .setFontSize(26)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");
  sheet.getRange(`${labelRange.split(":")[0]}:${valueRange.split(":")[1]}`)
    .setBorder(true, true, true, true, false, false, "#d7d3c7", SpreadsheetApp.BorderStyle.SOLID);
  sheet.setRowHeight(Number(labelRange.match(/\d+/)[0]), 26);
  sheet.setRowHeights(Number(valueRange.match(/\d+/)[0]), 2, 34);
}

function styleDashboardSection(sheet, rangeA1, title) {
  sheet.getRange(rangeA1)
    .merge()
    .setValue(title)
    .setBackground(COLORS.sage)
    .setFontColor(COLORS.white)
    .setFontSize(10)
    .setFontWeight("bold")
    .setHorizontalAlignment("left")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(Number(rangeA1.match(/\d+/)[0]), 30);
}

function setDashboardSummaryRow(sheet, labelRange, valueRange, label, formula) {
  sheet.getRange(labelRange)
    .merge()
    .setValue(label)
    .setBackground(COLORS.ivory)
    .setFontColor(COLORS.ink)
    .setFontWeight("bold")
    .setVerticalAlignment("middle");
  sheet.getRange(valueRange)
    .merge()
    .setFormula(formula)
    .setBackground(COLORS.ivory)
    .setFontColor(COLORS.ink)
    .setFontSize(15)
    .setFontWeight("bold")
    .setHorizontalAlignment("right")
    .setVerticalAlignment("middle");
  sheet.setRowHeight(Number(labelRange.match(/\d+/)[0]), 32);
}

function addDashboardLink(sheet, rangeA1, label, targetSheet) {
  const cell = sheet.getRange(rangeA1).merge();
  const link = SpreadsheetApp.newRichTextValue()
    .setText(label)
    .setLinkUrl(`${sheet.getParent().getUrl()}#gid=${targetSheet.getSheetId()}`)
    .build();
  cell.setRichTextValue(link);
  styleDashboardNavigation(cell);
}

function styleDashboardNavigation(range) {
  range
    .setBackground(COLORS.ivory)
    .setFontColor(COLORS.sage)
    .setFontSize(10)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(false, false, true, false, false, false, COLORS.goldLight, SpreadsheetApp.BorderStyle.SOLID_THICK);
}

function addDashboardCharts(sheet) {
  const attendanceChart = sheet.newChart()
    .setChartType(Charts.ChartType.PIE)
    .addRange(sheet.getRange("M1:N3"))
    .setNumHeaders(1)
    .setPosition(18, 1, 0, 0)
    .setOption("title", "Response status")
    .setOption("pieHole", 0.66)
    .setOption("legend", { position: "right", textStyle: { color: COLORS.ink, fontSize: 11 } })
    .setOption("colors", [COLORS.sage, "#d99a86"])
    .setOption("backgroundColor", COLORS.ivory)
    .setOption("chartArea", { left: 24, top: 50, width: "88%", height: "72%" })
    .setOption("width", 500)
    .setOption("height", 300)
    .build();

  const planningChart = sheet.newChart()
    .setChartType(Charts.ChartType.COLUMN)
    .addRange(sheet.getRange("M5:N9"))
    .setNumHeaders(1)
    .setPosition(18, 6, 0, 0)
    .setOption("title", "Event & menu planning")
    .setOption("legend", { position: "none" })
    .setOption("colors", [COLORS.sage])
    .setOption("backgroundColor", COLORS.ivory)
    .setOption("chartArea", { left: 48, top: 50, width: "82%", height: "68%" })
    .setOption("hAxis", { textStyle: { color: COLORS.ink, fontSize: 10 } })
    .setOption("vAxis", { minValue: 0, format: "0", textStyle: { color: COLORS.ink, fontSize: 10 } })
    .setOption("width", 500)
    .setOption("height", 300)
    .build();

  sheet.insertChart(attendanceChart);
  sheet.insertChart(planningChart);
}

function columnToLetter(column) {
  let value = column;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

function hideHelperColumn(sheet, header) {
  const column = getHeaderIndex(sheet, header);
  if (column) sheet.hideColumns(column);
}

function setNumberFormat(sheet, headers, format) {
  headers.forEach((header) => {
    const column = getHeaderIndex(sheet, header);
    if (column) {
      sheet
        .getRange(2, column, Math.max(sheet.getMaxRows() - 1, 1), 1)
        .setNumberFormat(format);
    }
  });
}

function dataColumnRange(sheet, header) {
  const column = getHeaderIndex(sheet, header);
  return sheet.getRange(2, column, Math.max(sheet.getMaxRows() - 1, 1), 1);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
