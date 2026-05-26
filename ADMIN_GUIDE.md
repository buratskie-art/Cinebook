# CineBook Admin Panel - Complete Setup Guide

## Overview
A secure, self-contained admin panel has been implemented for CineBook, allowing administrators to manage all platform content and operations without modifying code.

---

## 🔐 Admin Authentication

### Access the Admin Panel
1. Navigate to the main CineBook homepage
2. Click **Login**
3. Enter the admin credentials in the normal CineBook login form
4. The system will redirect the admin account to `admin-dashboard.html`

### Default Credentials (Demo)
- **Username:** `admin`
- **Password:** `admin123`

**⚠️ Security Note:** For production, implement:
- Server-side authentication with bcrypt password hashing
- Session tokens instead of localStorage
- HTTPS enforcement
- Rate limiting on login attempts
- Admin account management interface

---

## 📊 Admin Dashboard Features

### 1. **Dashboard Overview**
- **Real-time Statistics:**
  - Total Movies in system
  - Total Theaters configured
  - Total Bookings made by users
  - Total Revenue from all transactions

### 2. **🎥 Movies Management**

#### Add Movie
- Fill in movie details:
  - **Title** (required)
  - **Year** of release
  - **Genre** (required, comma-separated for multiple)
  - **Duration** (minutes)
  - **Synopsis** (optional)
  - **Poster URL** (full HTTP/HTTPS URL or path)
- Click "Add Movie" to save
- Movies appear immediately in the system

#### Edit Movie
- Click "Edit" on any movie row
- Form auto-fills with current data
- Make changes and add (old version auto-deletes)

#### Delete Movie
- Click "Delete" on any movie row
- Confirm deletion

**Note:** Showtimes linked to deleted movies will become orphaned

### 3. **🏛️ Theaters Management**

#### Create Theater
- **Theater Name:** Give it a unique name (e.g., "Screen 1", "Theater A")
- **Total Seats:** Configure seat count (default 40)
- **Seat Price:** Set ticket price in ₱ (default ₱200)

#### Monitor Availability
- View current available seats in each theater
- Availability decreases as users make bookings

#### Delete Theater
- Remove theaters when no longer needed
- Linked showtimes become invalid

### 4. **🕐 Showtimes Management**

#### Create Showtime
- **Movie:** Select from dropdown (requires movies in system)
- **Theater:** Select from dropdown (requires theaters in system)
- **Date:** Pick the showtime date
- **Time:** Set the show time

#### Schedule Management
- View all scheduled showtimes in a table
- Delete showtimes as needed
- Each showtime is independent; canceling one doesn't affect others

### 5. **🎟️ Bookings Monitoring**

#### Track User Reservations
- **Booking ID:** Unique identifier for each booking
- **Customer:** Username of person who booked
- **Movie:** Which movie was booked
- **Seats:** Exact seat numbers selected (e.g., 1, 2, 5, 10)
- **Date:** When booking was made
- **Status:** Current booking status (confirmed, pending, cancelled)

#### Manage Bookings
- Click "Cancel" to cancel any user booking
- Cancellation immediately refunds and releases seats
- Deleted bookings can be viewed in payment history

### 6. **💳 Payments Monitoring**

#### Track Revenue
- **Payment ID:** Unique transaction identifier
- **Movie:** Which movie was paid for
- **Amount:** Transaction amount in ₱
- **Method:** Payment method used (Cash, Card, etc.)
- **Date:** When payment was processed
- **Status:** Payment status (completed, pending, failed)

#### Revenue Analysis
- View all transactions in one place
- Track payment trends over time
- Identify popular movies by revenue

### 7. **⚙️ Settings**

#### Platform Configuration
- Set platform name
- Configure default ticket price
- (More settings can be added as needed)

#### Data Management
- **Export Data:** Download complete system data as JSON file
  - Includes all movies, theaters, showtimes, bookings, payments
  - Useful for backups or data migration
- **Reset All Data:** Dangerous operation that clears entire system
  - Requires double confirmation
  - Irreversible - use only when necessary

---

## 🗂️ Data Structure

### Storage Locations (localStorage)
All admin data is stored in the browser's localStorage with these keys:

| Data Type | Storage Key | Example |
|-----------|------------|---------|
| Movies | `cinebook:admin:movies` | Array of movie objects |
| Theaters | `cinebook:admin:theaters` | Array of theater objects |
| Showtimes | `cinebook:admin:showtimes` | Array of showtime objects |
| User Bookings | `cinebook:reservations` | Array of booking objects |
| Payments | `cinebook:payments` | Array of payment objects |

### Movie Object Structure
```json
{
  "id": 1234567890,
  "title": "Sample Movie",
  "year": 2026,
  "genre": "Action, Drama",
  "duration": 120,
  "synopsis": "An awesome movie about...",
  "poster": "https://example.com/poster.jpg"
}
```

### Theater Object Structure
```json
{
  "id": 1234567890,
  "name": "Screen 1",
  "totalSeats": 40,
  "seatPrice": 200,
  "availableSeats": 32
}
```

### Booking Object Structure
```json
{
  "id": 1234567890,
  "movie": "Movie Title",
  "seats": [1, 2, 3, 5, 6],
  "price": 1000,
  "date": "5/5/2026, 2:30:45 PM",
  "status": "confirmed"
}
```

---

## 🔄 Workflow Integration

### How Admin Content Flows to Users

1. **Admin adds a movie** → Stored in `cinebook:admin:movies`
2. **User visits homepage** → App checks for admin movies first
3. **User sees admin movies** instead of default database movies
4. **User filters/searches** → Filters apply to admin-managed content
5. **User books tickets** → Booking saves to `cinebook:reservations`
6. **Admin monitors bookings** → Sees all real user reservations

### Session Management
- Admin login creates a session with key: `cinebook:admin:loggedIn`
- Session persists until admin clicks "Logout"
- Session includes login timestamp for audit purposes
- Admins viewing admin-dashboard.html are required to have valid session

---

## ✅ Best Practices

### Data Entry
- Always test movie links after entering poster URLs
- Use consistent genre naming (e.g., "Action" vs "action")
- Schedule showtimes at least a few hours in advance
- Monitor available seats; add new theaters before reaching capacity

### Maintenance
- Regularly export data as backup
- Review bookings during peak hours for issues
- Remove old showtimes that have passed
- Maintain accurate theater capacity numbers

### Security (Future Enhancements)
- Never share admin login credentials
- Use strong passwords (production)
- Implement two-factor authentication
- Add audit logs for all admin actions
- Separate super-admin and content-admin roles

---

## 🐛 Troubleshooting

### Issue: Login fails
- **Solution:** Verify username is "admin" and password is "admin123" (case-sensitive)

### Issue: Movies not appearing
- **Solution:** Check that movies are added through admin panel. Database defaults only show if no admin movies exist.

### Issue: Showtimes dropdown empty
- **Solution:** Add movies and theaters first before creating showtimes

### Issue: Bookings showing 0
- **Solution:** Users must login, select seats, and confirm booking for entries to appear

### Issue: Data lost after refresh
- **Solution:** Check browser localStorage hasn't been cleared. Use Export function for backups.

---

## 📱 Mobile Responsiveness
The admin panel is fully responsive and works on:
- Desktop (full layout with sidebar)
- Tablets (sidebar collapses/hidden)
- Mobile phones (stacked layout, full-width forms)

---

## 🚀 Future Enhancements

Potential additions to the admin panel:
1. **Multi-user Admin:** Different roles (super-admin, content-admin, support)
2. **Advanced Reports:** Generate PDF reports, export statistics
3. **Calendar View:** Visualize showtimes on calendar
4. **Seat Map Editor:** Visually configure theater layouts
5. **Email Notifications:** Send confirmations to users
6. **Real Payment Gateway:** Stripe, PayPal, or GCash integration
7. **Promotional System:** Manage discounts and special offers
8. **Analytics Dashboard:** Detailed analytics with charts
9. **User Management:** Admin can create/manage user accounts
10. **Audit Logs:** Complete history of all admin actions

---

## 📞 Support
For issues or feature requests, contact the development team with:
- Screenshots of the issue
- Steps to reproduce
- Browser/device information
- Admin panel version (current: 1.0 - Basic)

---

**Last Updated:** May 5, 2026  
**Admin Panel Version:** 1.0 (Basic Implementation)  
**Status:** ✅ Fully Functional
