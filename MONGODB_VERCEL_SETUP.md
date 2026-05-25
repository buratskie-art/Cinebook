# CineBook MongoDB + Vercel Setup

## 1. Add MongoDB variables in Vercel

In your Vercel project, go to **Settings > Environment Variables** and add:

```text
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
MONGODB_DB=cinebook
```

`MONGODB_COLLECTION` is no longer needed. The API stores data in separate collections.

## 2. Add Resend Email Variables

For automatic booking and payment emails, add these Vercel environment variables too:

```text
RESEND_API_KEY=<your-new-resend-api-key>
RESEND_FROM_EMAIL=CineBook <onboarding@resend.dev>
```

Use `onboarding@resend.dev` only for testing. For production, verify your own domain in Resend and change `RESEND_FROM_EMAIL` to a verified sender such as `CineBook <noreply@yourdomain.com>`.

## 3. Deploy

Push these project files to GitHub and redeploy from Vercel.

Vercel will install the `mongodb` and `resend` dependencies from `package.json` and expose the API at:

```text
/api/state
/api/email
```

The project also has separate API folders for each data group:

```text
api/data.js?resource=movies              -> /api/movies
api/data.js?resource=theaters            -> /api/theaters
api/data.js?resource=showtimes           -> /api/showtimes
api/data.js?resource=reservations        -> /api/reservations
api/data.js?resource=payments            -> /api/payments
api/data.js?resource=payment-submissions -> /api/payment-submissions
api/data.js?resource=email-log           -> /api/email-log
api/data.js?resource=users               -> /api/users
api/data.js?resource=preferences         -> /api/preferences
api/data.js?resource=local-storage       -> /api/local-storage
api/init-db/index.js             -> /api/init-db
```

The collection URLs are preserved with Vercel rewrites, but they now share one serverless function to stay within the Hobby plan function limit. Each endpoint still maps to its own MongoDB collection, so the database data remains separated by purpose.

## 4. Automatic MongoDB Updates

After deployment, the browser sync script automatically sends CineBook data changes to MongoDB. You do not need a manual sync button.

Open the deployed CineBook site in the browser that has your local CineBook data. On page load and whenever CineBook local data changes, the app sends the data to the organized MongoDB collections.

The API writes data into these collections:

```text
movies
theaters
showtimes
reservations
payments
payment_submissions
email_log
users
preferences
local_storage
app_metadata
```

After redeploying, open this URL once to force-create every MongoDB collection:

```text
https://your-site.vercel.app/api/init-db
```

The old compiled `app_state` collection is only used for one-time migration. When the API sees legacy `app_state` data, it moves that data into the organized collections and removes the legacy collection.

If your needed data exists in a different browser origin, open `local-storage-migration.html` in that same browser, set the API URL to your deployed `/api/state`, and click **Move Local Storage to MongoDB**.

## Notes

- The app still uses `localStorage` as a fast browser cache.
- On page load, it pulls the latest MongoDB state into `localStorage`.
- When CineBook data changes, it syncs the updated state back to MongoDB.
