# Antonis & Eirini Wedding Invitation

Static wedding invitation site for Antonis and Eirini, dated 27 September 2026 in Rhodes, Greece.

## Files

- `index.html` contains the page sections and RSVP form.
- `styles.css` contains the visual system, responsive layout, and animation styling.
- `script.js` contains the RSVP submission logic and decorative animation setup.
- `assets/rhodes-hero.png` is the generated hero artwork used by the site.
- `scripts/rsvp-google-apps-script.gs` is a ready-to-paste Google Sheets receiver.

## RSVP Setup

The form is ready, but it needs a destination before real guest replies are saved. In `script.js`, set:

```js
rsvpEndpoint: "https://your-endpoint-here"
```

Practical options:

1. Formspree: easiest setup. Create a form at `formspree.io`, copy the endpoint URL, and paste it into `rsvpEndpoint`. Replies can be emailed to you and exported.
2. Google Apps Script + Google Sheets: best if you want replies in a spreadsheet you own. Create a Google Sheet, open Extensions > Apps Script, paste `scripts/rsvp-google-apps-script.gs`, deploy it as a web app, and paste the deployed web app URL into `rsvpEndpoint`.
3. Custom backend: best if you later want admin pages, authentication, SMS/WhatsApp reminders, or stricter validation.

Until the endpoint is configured, submitted RSVPs are not sent anywhere. The browser console will show a preview payload for testing.

For the Google Apps Script deployment, use:

- Execute as: `Me`
- Who has access: `Anyone`

The site sends a simple form-encoded payload so the same RSVP flow works with Formspree and Google Apps Script.

## Local Preview

Open `index.html` directly in a browser. No installation or build step is required.
