# CineBook Submission Notes

## Project Overview

CineBook is a movie ticket reservation website with user registration, email OTP verification, movie browsing, theater and showtime selection, interactive seat reservation, payment proof submission, and an admin dashboard for managing movies, showtimes, reservations, payments, and email logs.

## Folder Structure

```text
CineBook/
|-- api/                  Serverless API routes for MongoDB and Resend
|   |-- _lib/             Shared API helpers and database connection
|   |-- email/            Email sending endpoint
|   `-- init-db/          MongoDB collection initialization endpoint
|-- assets/               Website image assets
|-- *.html                Website pages and routes
|-- script.js             Main client-side website and admin logic
|-- style.css             Main website styling
|-- database.js           Seed data placeholder
|-- cinebook-data-sync.js MongoDB/localStorage synchronization
|-- package.json          Node/Vercel dependencies and scripts
|-- vercel.json           Vercel API rewrite configuration
|-- .env.example          Safe placeholder environment variables
`-- README.md             Setup and deployment instructions
```

## Main Implemented Features

- Homepage movie display with featured banner
- Movie search and genre filtering
- User registration with email OTP verification
- Login, logout, dashboard, and profile display
- Movie details, theater selection, showtime selection, and seat selection
- Reservation creation and reservation details modal
- Payment proof submission workflow
- Admin dashboard for movies, theaters, showtimes, bookings, payments, and email logs
- Admin payment approval/rejection with seat locking
- MongoDB data synchronization
- Resend email integration
- Responsive layout for desktop and mobile

## Environment Variables

Real secrets are not included in this repository. Use `.env.example` as the template:

```text
MONGODB_URI=...
MONGODB_DB=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
```

## Verification

Run this command before submission:

```bash
npm run check
```
