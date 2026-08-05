# Antonis & Eirini Wedding Invitation

Static wedding invitation site for Antonis and Eirini, dated 27 September 2026 in Rhodes, Greece.

## Files

- `index.html` contains the page sections and RSVP form.
- `styles.css` contains the visual system, responsive layout, and animation styling.
- `script.js` contains the RSVP modal logic, photo preview logic, and decorative animation setup.
- `assets/wedding-invitation-template.jpg` is the real invitation artwork used by the hero.
- `scripts/rsvp-google-apps-script.gs` is a ready-to-paste Google Sheets receiver.

## RSVP Setup

The RSVP modal is ready, but it needs a destination before real guest replies are saved. In `script.js`, set:

```js
rsvpEndpoint: "https://your-endpoint-here"
```

The RSVP payload stores:

- name
- optional email
- attendance: `attending` or `declined`
- adult menu count
- kid menu count
- total guests
- optional note
- submission date and source page

Practical options:

1. Formspree: easiest setup. Create a form at `formspree.io`, copy the endpoint URL, and paste it into `rsvpEndpoint`. Replies can be emailed to you and exported.
2. Google Apps Script + Google Sheets: best if you want replies in a spreadsheet you own. Create a Google Sheet, open Extensions > Apps Script, paste `scripts/rsvp-google-apps-script.gs`, deploy it as a web app, and paste the deployed web app URL into `rsvpEndpoint`.
3. Custom backend: best if you later want admin pages, authentication, SMS/WhatsApp reminders, or stricter validation.

Until the endpoint is configured, submitted RSVPs are not sent anywhere. The browser console will show a preview payload for testing.

For the Google Apps Script deployment, use:

- Execute as: `Me`
- Who has access: `Anyone`

The site sends a simple form-encoded payload so the same RSVP flow works with Formspree and Google Apps Script.

You do not need guest emails to register RSVPs in a Google Sheet. Add guest email only if you want confirmation emails or follow-up messages. If you want notification emails to yourself, Formspree handles that by default; Google Apps Script can also send you an email with `MailApp.sendEmail`.

## Photo Upload Setup

The photo section previews selected images now, but real uploads require storage. In `script.js`, set:

```js
photoUploadEndpoint: "https://your-upload-endpoint-here"
```

Recommended storage options:

1. Uploadcare: easiest guest upload widget/storage service.
2. Cloudinary: good image storage and transformations.
3. Supabase Storage: good if you want your own storage bucket and database.
4. Custom backend: best for approval workflows and private galleries.

Do not rely on the static website itself for storage. Guest photos need an external account or backend with enough storage quota.

## Local Preview

Open `index.html` directly in a browser. No installation or build step is required.
