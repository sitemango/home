# Connecting the contact form to Google Sheets

The contact form in **Site Mango** submits to a Google Apps Script Web App, which
appends each submission as a new row in a Google Sheet. This needs no paid server —
the Google Apps Script URL **is** the backend.

## 1. Create the Sheet

1. Go to <https://sheets.new> and create a new spreadsheet.
2. Name it something like **Site Mango — Enquiries**.
3. Rename the first tab to `Responses` (or change `SHEET_NAME` in the script).

## 2. Add the Apps Script

1. In the spreadsheet, open **Extensions → Apps Script**.
2. Delete the boilerplate and paste the contents of **[backend/Code.gs](backend/Code.gs)**.
3. Click **Save** (give the project a name, e.g. *Site Mango Form*).

## 3. Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Choose type **Web app**.
3. **Execute as:** *Me*
4. **Who has access:** *Anyone* (this is required so the public site can POST).
5. Click **Deploy** and **authorize** the script (allow the requested permissions).
6. Copy the **Web app URL** — it looks like:
   `https://script.google.com/macros/s/AKfycb.../exec`

## 4. Point the site at it

Open **main.js** and find this line near the bottom of the file:

```js
const SHEETS_URL = '';
```

Paste your Web App URL inside the quotes:

```js
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

## 5. Test

Submit the form. A new row (Timestamp, Name, Email, Budget, Message) should appear
in the `Responses` tab. That's it.

> **Note:** The form uses `mode: 'no-cors'`, so the browser receives an opaque
> response and can't read the body. Success/failure is therefore inferred from
> whether the request was sent — the user-facing confirmation text handles this
> gracefully. If you want real success/failure JSON back from the browser, run the
> site from a matching HTTPS origin and drop `mode: 'no-cors'`.

## Running without a backend

If `SHEETS_URL` is left empty, the site runs in a **demo mode**: it validates the
form and logs the payload to the browser console instead of sending it, so the page
never breaks while you're still setting things up.
