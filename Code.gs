/**
 * Smart Receipt - Google Apps Script Automation
 *
 * Receives receipt data (JSON) via POST, saves receipt images to Drive,
 * and appends each receipt as a new row in the "Receipts" sheet.
 *
 * SETUP:
 * 1. Replace DRIVE_FOLDER_ID below with your own "Smart Receipt Uploads" folder ID.
 * 2. Save, then run testReceipt() once to grant permissions and verify it works.
 * 3. Deploy - New deployment - Web app (Execute as: Me, Who has access: Anyone).
 */

const DRIVE_FOLDER_ID = "1k4zWNKttVNduC4cvUoPQNKiGEWEKmC10";
const SHEET_NAME = "Receipts";

const SHEET_HEADERS = [
  "Merchant",
  "Date",
  "Time",
  "Category",
  "Total",
  "Currency",
  "Tax / VAT",
  "Bank Name",
  "Items",
  "Receipt Image URL",
  "Uploaded At",
];

/**
 * Entry point for POST requests from the Smart Receipt web app.
 * Accepts either:
 *   { "receipts": [ {...}, {...} ] }   - multiple receipts
 *   { ...single receipt fields... }    - a single receipt
 *   [ {...}, {...} ]                   - a bare array of receipts
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Request body is empty.");
    }

    const body = JSON.parse(e.postData.contents);
    const receipts = normalizeReceipts(body);

    if (receipts.length === 0) {
      throw new Error("No receipt data found in request body.");
    }

    const sheet = getOrCreateReceiptsSheet();
    const results = [];

    receipts.forEach(function (receipt, index) {
      try {
        const imageUrl = saveReceiptImage(receipt);
        appendReceiptRow(sheet, receipt, imageUrl);
        results.push({
          index: index,
          merchant: receipt.merchant || "",
          imageUrl: imageUrl || "",
          status: "success",
        });
      } catch (rowError) {
        results.push({
          index: index,
          merchant: receipt.merchant || "",
          status: "error",
          message: rowError.message,
        });
      }
    });

    const hasErrors = results.some(function (r) {
      return r.status === "error";
    });

    return jsonResponse({
      success: !hasErrors,
      count: results.length,
      results: results,
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Entry point for GET requests - returns all saved receipts as JSON so the
 * web app can show a history list. Newest receipts first.
 */
function doGet() {
  try {
    const sheet = getOrCreateReceiptsSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      return jsonResponse({ success: true, receipts: [] });
    }

    const values = sheet.getRange(2, 1, lastRow - 1, SHEET_HEADERS.length).getValues();
    const timeZone = Session.getScriptTimeZone();

    const receipts = values.map(function (row) {
      return {
        merchant: row[0],
        date: row[1] instanceof Date ? Utilities.formatDate(row[1], timeZone, "yyyy-MM-dd") : row[1],
        time: row[2] instanceof Date ? Utilities.formatDate(row[2], timeZone, "HH:mm") : row[2],
        category: row[3],
        total: row[4],
        currency: row[5],
        tax: row[6],
        bankName: row[7],
        items: row[8],
        imageUrl: row[9],
        uploadedAt: row[10] instanceof Date ? row[10].toISOString() : row[10],
      };
    });

    receipts.reverse();

    return jsonResponse({ success: true, receipts: receipts });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Normalizes the incoming request body into an array of receipt objects.
 */
function normalizeReceipts(body) {
  if (Array.isArray(body)) {
    return body;
  }
  if (body && Array.isArray(body.receipts)) {
    return body.receipts;
  }
  if (body && typeof body === "object") {
    return [body];
  }
  return [];
}

/**
 * Decodes a base64 receipt image (if present) and saves it to the Drive folder.
 * Returns the publicly viewable image URL, or "" if no image was provided.
 */
function saveReceiptImage(receipt) {
  const base64Data = receipt.imageBase64 || receipt.image || receipt.receiptImage;
  if (!base64Data) {
    return receipt.receiptImageUrl || "";
  }

  const match = base64Data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const rawBase64 = match ? match[2] : base64Data;

  const extension = mimeType.split("/")[1] || "jpg";
  const safeMerchant = (receipt.merchant || "receipt").replace(/[^a-zA-Z0-9]+/g, "_");
  const fileName = receipt.fileName || safeMerchant + "_" + new Date().getTime() + "." + extension;

  const blob = Utilities.newBlob(Utilities.base64Decode(rawBase64), mimeType, fileName);
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return "https://drive.google.com/uc?id=" + file.getId();
}

/**
 * Appends one receipt as a new row in the Receipts sheet.
 */
function appendReceiptRow(sheet, receipt, imageUrl) {
  const items = Array.isArray(receipt.items) ? receipt.items.join(", ") : receipt.items || "";

  sheet.appendRow([
    receipt.merchant || "",
    receipt.date || "",
    receipt.time || "",
    receipt.category || "",
    receipt.total != null ? receipt.total : "",
    receipt.currency || "",
    receipt.tax != null ? receipt.tax : "",
    receipt.bankName || "",
    items,
    imageUrl || "",
    new Date(),
  ]);
}

/**
 * Returns the Receipts sheet, creating it with headers if it doesn't exist yet.
 */
function getOrCreateReceiptsSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Wraps a JS object as a JSON ContentService response.
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Test function - run this from the Apps Script editor (Run -> testReceipt)
 * to grant permissions and verify the full flow end to end.
 * A 1x1 pixel PNG is used as a placeholder receipt image.
 */
function testReceipt() {
  const samplePng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        receipts: [
          {
            merchant: "Migros",
            date: "2026-08-06",
            time: "15:42",
            category: "Market",
            total: 842.5,
            currency: "TRY",
            tax: 76.59,
            bankName: "Garanti BBVA",
            items: ["Milk", "Bread", "Apples"],
            imageBase64: samplePng,
          },
          {
            merchant: "Starbucks",
            date: "2026-08-06",
            time: "11:23",
            category: "Food",
            total: 210.0,
            currency: "TRY",
            tax: 18.9,
            bankName: "Garanti BBVA",
            items: ["Caffe Latte", "Muffin"],
            imageBase64: samplePng,
          },
        ],
      }),
    },
  };

  const response = doPost(fakeEvent);
  Logger.log(response.getContent());
}
