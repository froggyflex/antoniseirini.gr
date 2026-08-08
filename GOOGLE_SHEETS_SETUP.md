# Google Sheets Guest Register Setup

The supplied backend keeps the Google Sheet owned by the wedding Gmail account as the source of truth. No guest email addresses are collected, and no email-sending service is required.

## 1. Create the workbook

1. Sign in to the wedding Gmail account.
2. Create a blank Google Sheet named `Antonis & Eirini - Guest Management`.
3. In the Sheet, open **Extensions > Apps Script**.
4. Delete the sample code in `Code.gs`.
5. Paste the complete contents of `scripts/rsvp-google-apps-script.gs` into `Code.gs` and save.

## 2. Prepare the tabs

1. In the function selector at the top of Apps Script, choose `setupWeddingWorkbook`.
2. Select **Run**.
3. Approve the permissions using the wedding Gmail account.
4. Return to the Google Sheet. It will now contain:

- `Dashboard`: live totals for responses, people, ceremony, reception, adults, children, changes, and wishes.
- `Guests`: one current row for each guest or family. A repeat response with the same normalized name updates this row.
- `RSVP History`: every submission, including earlier answers that were later changed.
- `Wishes`: every wish, with exact/possible RSVP-name matches and repeat-wish warnings.
- `Photos`: every uploaded image with uploader details, size, RSVP-name match, and a private Drive link.

The setup also creates a private Drive folder named `Antonis & Eirini - Wedding Photo Uploads` in the wedding account.

Keep the spreadsheet private. It only needs to be shared with people who should manage the wedding list.

## 3. Deploy the receiver

1. In Apps Script, select **Deploy > New deployment**.
2. Choose **Web app**.
3. Set **Execute as** to `Me`.
4. Set **Who has access** to `Anyone` so guests are not asked to sign in.
5. Select **Deploy** and approve the authorization if prompted.
6. Copy the deployed URL ending in `/exec`. Do not use the `/dev` test URL.

## 4. Connect the website

Send the `/exec` URL to the website developer, or place it in `script.js`:

```js
const CONFIG = {
  rsvpEndpoint: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec",
  wishesEndpoint: "",
  // ...
};
```

Leaving `wishesEndpoint` empty sends wishes to the same workbook.

## 5. Verify the flow

Submit these tests from the website:

1. One attending response with adults and children.
2. One declined response.
3. The first name again with changed numbers. `Guests` should update and `RSVP History` should retain both submissions.
4. A wish using the same name. `Wishes` should show an exact match.
5. A wish using a similar family name. It should show a possible match for review.
6. One small test photo. Confirm that it appears in the `Photos` tab and the private Drive folder.

After future backend code changes, use **Deploy > Manage deployments > Edit**, select **New version**, and redeploy. The existing `/exec` URL can remain in the website.

The workbook also includes a **Wedding Manager** menu. Use **Refresh dashboard** after changing dashboard code or if you want to rebuild the visual layout. Refreshing the dashboard does not delete guest, history, wish, or photo records.

Adding Drive uploads introduces a new Google Drive permission. Run `setupWeddingWorkbook` once after installing this version and approve the additional permission. Then create a **new web-app deployment version** so the public `/exec` endpoint receives the photo-upload code. The `/exec` URL remains the same.
