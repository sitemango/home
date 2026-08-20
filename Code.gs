/**
 * SITE MANGO — Google Sheets backend
 * -----------------------------------
 * Paste this whole file into your Google Apps Script project
 * (Extensions → Apps Script), then deploy it as a Web App.
 * See GOOGLE_SHEETS.md for the full walkthrough.
 */

var SHEET_NAME = 'Responses'; // name of the tab where rows are appended

function doGet(e) {
  return sendJson({ ok: true, message: 'Site Mango form endpoint is live.' });
}

/** Handle the front-end POST and append a row. */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    var data = JSON.parse(raw);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Optional: create a header row on first run.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Budget', 'Message']);
    }

    sheet.appendRow([
      new Date(),
      String(data.name || ''),
      String(data.email || ''),
      String(data.budget || ''),
      String(data.message || '')
    ]);

    return sendJson({ ok: true, message: 'Row added.' });
  } catch (err) {
    return sendJson({ ok: false, message: String(err) });
  }
}

/** Return a JSON response with a CORS-friendly redirect (needed for fetch). */
function sendJson(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
