# CineBook MongoDB + Vercel Setup

## 1. Add MongoDB variables in Vercel

In your Vercel project, go to **Settings > Environment Variables** and add:

```text
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority
MONGODB_DB=cinebook
MONGODB_COLLECTION=app_state
```

`MONGODB_COLLECTION` is optional. If you do not set it, the app uses `app_state`.

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

That button overwrites the CineBook document in MongoDB with the current browser data: movies, theaters, showtimes, reservations, payments, payment submissions, email logs, user info, and preferences.

## Notes

- The app still uses `localStorage` as a fast browser cache.
- On page load, it pulls the latest MongoDB state into `localStorage`.
- When CineBook data changes, it syncs the updated state back to MongoDB.
