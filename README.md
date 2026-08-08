# Antonis & Eirini Wedding Invitation

Static wedding invitation site for Antonis and Eirini, dated 27 September 2026 in Rhodes, Greece.

## Files

- `index.html` contains the page sections and RSVP form.
- `styles.css` contains the visual system, responsive layout, and animation styling.
- `script.js` contains the RSVP, wishes, gift, photo preview, and invitation interactions.
- `assets/wedding-invitation-template.jpg` is the real invitation artwork used by the hero.
- `assets/wedding-invitation-back.png` is the reverse-side artwork rendered from the supplied PDF.
- `assets/popup-texture.jpg` is the textured background used by RSVP popups.
- `scripts/rsvp-google-apps-script.gs` is a ready-to-paste Google Sheets receiver.

## Google Sheets Guest Management

The recommended backend is the supplied Google Apps Script receiver. It turns a private Google Sheet owned by the wedding Gmail account into the source of truth for RSVPs and wishes.

The workbook contains:

- `Dashboard`: live operational totals.
- `Guests`: one current row per guest or family, including attendance, ceremony/reception choices, adult and child counts, notes, and update history indicators.
- `RSVP History`: an immutable record of every original and changed reply.
- `Wishes`: wishes with exact/possible guest-name matches and repeat-wish warnings.

Follow [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) to create and deploy the workbook receiver. Once deployed, set:

```js
rsvpEndpoint: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
```

Until the endpoint is configured, submitted RSVPs are not sent anywhere. The browser console will show a preview payload for testing.

## Wishes Setup

The wishes form can use the same Google Apps Script URL as RSVP. Leave `wishesEndpoint` empty to fall back to `rsvpEndpoint`, or provide a separate endpoint:

```js
wishesEndpoint: "https://your-endpoint-here"
```

The supplied Apps Script creates and formats the `Wishes` sheet automatically. The website does not reveal match information to guests; those review flags are only visible in the private workbook.

## Gift Setup

The configured IBAN is stored in `script.js`:

```js
giftIban: "GR0602601630000860201065201"
```

The website displays the IBAN with a copy button. Guest email addresses are not collected by the RSVP form.

## Photo Upload Setup

Photo uploads use the same Google Apps Script endpoint as RSVPs and wishes. The setup function creates a private Google Drive folder named `Antonis & Eirini - Wedding Photo Uploads` and a `Photos` management tab.

Each upload is limited to 8 MB and the website sends up to 12 images sequentially per submission. Supported formats are JPG, PNG, WEBP, HEIC, and HEIF. The `Photos` tab records the uploader, original filename, file size, Drive link, timestamp, and RSVP-name match.

The folder is private by default. Do not make it public; guests upload through the web app and do not need Drive access. Google Drive storage is shared with the owning Gmail account, so available space should be checked before the wedding. Uploads stop before they consume the final 1 GB of the account's storage.

## Local Preview

Open `index.html` directly in a browser. No installation or build step is required.
