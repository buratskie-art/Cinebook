# CineBook MongoDB + Vercel Setup

## 1. Add MongoDB variables in Vercel

In your Vercel project, go to **Settings > Environment Variables** and add:

```text
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
MONGODB_DB=cinebook
```

`MONGODB_COLLECTION` is no longer needed. The API stores data in separate collections.

## 2. Deploy

Push these project files to GitHub and redeploy from Vercel.

Vercel will install the `mongodb` dependency from `package.json` and expose the API at:

```text
/api/state
```

The project also has separate API folders for each data group:

```text
api/movies/index.js              -> /api/movies
api/theaters/index.js            -> /api/theaters
api/showtimes/index.js           -> /api/showtimes
api/reservations/index.js        -> /api/reservations
api/payments/index.js            -> /api/payments
api/payment-submissions/index.js -> /api/payment-submissions
api/email-log/index.js           -> /api/email-log
api/users/index.js               -> /api/users
api/preferences/index.js         -> /api/preferences
api/local-storage/index.js       -> /api/local-storage
api/init-db/index.js             -> /api/init-db
```

Each endpoint maps to its own MongoDB collection, so the project files and database data are separated by purpose.

## 3. Automatic MongoDB Updates

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
