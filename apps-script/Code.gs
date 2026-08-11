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
const DASHBOARD_SHEET_NAME = "Dashboard";

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

  return "https://lh3.googleusercontent.com/d/" + file.getId();
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
 * Creates (or rebuilds) the Dashboard sheet: a monthly total table grouped by
 * currency, a category breakdown table filtered to one currency at a time
 * (never sums different currencies together), and a pie chart built from that
 * category breakdown. Safe to run again later to refresh the chart/layout.
 */
function setupDashboard() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DASHBOARD_SHEET_NAME);
  }
  sheet.getCharts().forEach(function (chart) {
    sheet.removeChart(chart);
  });
  sheet.clear();

  sheet.getRange("A1").setValue("Smart Receipt - Dashboard").setFontSize(16).setFontWeight("bold");

  // Hidden helper columns: pre-clean Receipts data so QUERY never chokes on rows
  // with a blank/text Date cell (Receipts.Date is not always a real Date value).
  const helperRows = Math.max(getOrCreateReceiptsSheet().getLastRow(), 2);
  sheet.getRange("J1:L1").setValues([["Month", "Currency", "Total"]]);
  sheet
    .getRange("J2")
    .setFormula(
      "=ARRAYFORMULA(IF(ISNUMBER(Receipts!B2:B" + helperRows + "); TEXT(Receipts!B2:B" + helperRows + "; \"YYYY-MM\"); \"\"))"
    );
  sheet.getRange("K2").setFormula("=ARRAYFORMULA(Receipts!F2:F" + helperRows + ")");
  sheet.getRange("L2").setFormula("=ARRAYFORMULA(Receipts!E2:E" + helperRows + ")");
  sheet.hideColumns(10, 3); // J:L

  // Monthly total, grouped by currency so different currencies are never summed together.
  sheet.getRange("A3").setValue("Monthly Total by Currency").setFontWeight("bold");
  sheet
    .getRange("A4")
    .setFormula(
      "=QUERY(J2:L" + helperRows + "; \"select J, K, sum(L) where J <> '' group by J, K order by J desc label J 'Month', K 'Currency', sum(L) 'Total'\"; 0)"
    );

  // Category breakdown, filtered to a single currency (see the note about not mixing currencies).
  sheet.getRange("E3").setValue("Category Breakdown").setFontWeight("bold");
  sheet.getRange("E4").setValue("Currency filter:");
  sheet.getRange("F4").setValue("TRY").setFontWeight("bold").setBackground("#fbe7dc");
  sheet
    .getRange("E6")
    .setFormula(
      "=QUERY(Receipts!A2:K; \"select D, sum(E) where F = '\"&F4&\"' and D is not null group by D order by sum(E) desc label D 'Category', sum(E) 'Total'\"; 0)"
    );

  sheet.autoResizeColumns(1, 7);
  SpreadsheetApp.flush();

  const categoryRegion = sheet.getRange("E6").getDataRegion(SpreadsheetApp.Dimension.ROWS);
  if (categoryRegion.getNumRows() > 1) {
    const chart = sheet
      .newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(categoryRegion)
      .setPosition(20, 1, 0, 0)
      .setOption("title", "Category Breakdown")
      .setOption("pieSliceText", "percentage")
      .build();
    sheet.insertChart(chart);
  }

  Logger.log("Dashboard set up.");
}

/**
 * One-off maintenance function: rewrites any existing Receipt Image URL cells
 * from the old "drive.google.com/uc?id=" format (blocked by Chrome's ORB when
 * embedded as <img>) to the "lh3.googleusercontent.com/d/" format used going
 * forward. Run manually once from the Apps Script editor if older rows exist.
 */
function fixImageUrls() {
  const sheet = getOrCreateReceiptsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const urlColumn = SHEET_HEADERS.indexOf("Receipt Image URL") + 1;
  const range = sheet.getRange(2, urlColumn, lastRow - 1, 1);
  const values = range.getValues();

  const fixed = values.map(function (row) {
    const url = row[0];
    const match = typeof url === "string" && url.match(/drive\.google\.com\/uc\?id=([^&]+)/);
    return [match ? "https://lh3.googleusercontent.com/d/" + match[1] : url];
  });

  range.setValues(fixed);
  Logger.log("Fixed " + fixed.filter(function (r, i) { return r[0] !== values[i][0]; }).length + " image URL(s).");
}

/**
 * One-off maintenance function: removes sample/test rows (from testReceipt()
 * and earlier manual API testing) so the sheet only holds real receipts.
 */
function cleanupTestData() {
  const sheet = getOrCreateReceiptsSheet();
  const testMerchants = ["Migros", "Starbucks", "Test Market"];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const merchants = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let removed = 0;

  for (let i = merchants.length - 1; i >= 0; i--) {
    if (testMerchants.indexOf(merchants[i][0]) !== -1) {
      sheet.deleteRow(i + 2);
      removed++;
    }
  }

  Logger.log("Removed " + removed + " test row(s).");
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
