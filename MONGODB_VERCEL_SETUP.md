# CineBook MongoDB + Vercel Setup

## 1. Add MongoDB variables in Vercel

In your Vercel project, go to **Settings > Environment Variables** and add:

```text
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
MONGODB_DB=cinebook
MONGODB_COLLECTION=app_state
```

`MONGODB_COLLECTION` is optional and is now only used as a legacy fallback for older single-document data.

## 2. Deploy

Push these project files to GitHub and redeploy from Vercel.

Vercel will install the `mongodb` dependency from `package.json` and expose the API at:

```text
/api/state
```

## 3. Override MongoDB with your browser data

After deployment:

1. Open the deployed CineBook site in the browser that has your local CineBook data.
2. Log in as admin.
3. Go to **Settings**.
4. Click **Sync to MongoDB**.

That button overwrites the organized CineBook collections in MongoDB with the current browser data.

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

The old `app_state` collection can stay in MongoDB as backup data. New syncs use the organized collections above.

If your needed data exists in a different browser origin, open `local-storage-migration.html` in that same browser, set the API URL to your deployed `/api/state`, and click **Move Local Storage to MongoDB**.

## Notes

- The app still uses `localStorage` as a fast browser cache.
- On page load, it pulls the latest MongoDB state into `localStorage`.
- When CineBook data changes, it syncs the updated state back to MongoDB.
