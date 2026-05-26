# CineBook

CineBook is a static movie booking site with Vercel serverless API routes for MongoDB data storage and Resend email delivery.

## Main Features

- Featured movie homepage with search and genre filtering
- User registration with email OTP verification
- Login, logout, and user dashboard
- Movie details, theater selection, showtime selection, and interactive seat booking
- Reservation details and payment proof submission
- Admin dashboard for movies, theaters, showtimes, bookings, payment reviews, and email logs
- MongoDB data synchronization
- Resend email integration
- Responsive layout for desktop and mobile

## Requirements

- Node.js 18 or newer
- GitHub account
- MongoDB Atlas database
- Vercel account
- Resend account

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Fill in your own account values in `.env.local`:

```text
MONGODB_URI=...
MONGODB_DB=cinebook
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

4. Run the Vercel dev server:

```bash
npm run dev
```

5. Check the JavaScript files for syntax errors:

```bash
npm run check
```

## Project Structure

```text
api/                  Vercel serverless API routes
api/_lib/             Shared API/database helpers
assets/               Website image assets
*.html                Website pages
script.js             Main client-side and admin logic
style.css             Main styling
database.js           Seed data placeholder
cinebook-data-sync.js LocalStorage and MongoDB synchronization
vercel.json           Vercel route rewrites
.env.example          Placeholder environment variables
SUBMISSION_NOTES.md   Summary prepared for project submission
```

## Vercel Environment Variables

Add these in Vercel under **Project Settings > Environment Variables**:

```text
MONGODB_URI
MONGODB_DB
RESEND_API_KEY
RESEND_FROM_EMAIL
```

Use `onboarding@resend.dev` only for testing. For production email, verify a sending domain in Resend and use a verified sender address.

## API Routes

- `/api/state`
- `/api/init-db`
- `/api/email`
- `/api/movies`
- `/api/theaters`
- `/api/showtimes`
- `/api/reservations`
- `/api/payments`
- `/api/payment-submissions`
- `/api/email-log`
- `/api/users`
- `/api/preferences`
- `/api/local-storage`

After deploying, open this once to create the MongoDB collections:

```text
https://your-vercel-domain.vercel.app/api/init-db
```

## Upload To GitHub

This folder is already a Git repository. Check the connected GitHub repository:

```bash
git remote -v
```

If the remote is correct, commit and push:

```bash
git add .
git commit -m "Prepare CineBook for deployment"
git push -u origin main
```

Do not commit `.env`, `.env.local`, `.vercel`, or `node_modules`.
