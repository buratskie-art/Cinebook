# Payment System - End-to-End Testing Guide

## Overview
This guide provides step-by-step instructions to test the complete payment workflow in CineBook, from user booking through admin payment approval.

---

## Pre-Testing Setup

### 1. Clear Browser Data (Fresh Start)
```javascript
// Run in browser console to clear test data
localStorage.clear();
```

### 2. Expected Initial State
- No bookings
- No payment submissions
- No emails logged

---

## Test Scenario: Complete Payment Workflow

### Phase 1: User Registration & Login
1. Navigate to `index.html`
2. Click "Sign Up" button
3. Register with test credentials:
   - Email: `testuser@example.com`
   - Password: `test123`
4. Click "Login"
5. Login with credentials
   - **Expected:** Redirected to main page showing movies

---

### Phase 2: Movie Selection & Seat Booking
1. Click on any movie (e.g., "The Shawshank Redemption")
   - **Expected:** Movie details page opens
2. Select 2-3 seats (click on yellow seats)
   - **Expected:** Selected seats highlight in yellow
   - **Verify:** Seat numbers appear in "Selected Seats" list
3. Click "Confirm Booking"
   - **Expected:** Popup shows selected seats and total price
4. Click "Confirm"
   - **Expected:**
     - Seats turn red (locked pending payment)
     - Selected seats cleared
     - Popup shows pending booking message
     - Redirected to payment submission page

### Phase 3: Payment Proof Submission
1. On payment-submit.html page:
   - **Expected:** Page shows pending booking details
   - **Verify:** Booking ID, Movie name, Amount displayed
   
2. Select the pending booking from dropdown
   - **Expected:** Booking details populate

3. Fill out payment form:
   - GCash Reference: `GCash123456789`
   - Sender Name: `Test User`

4. Upload proof file:
   - Click "Choose File"
   - Select any image/PDF from your computer
   - **Expected:** Filename appears

5. Click "Submit Proof"
   - **Expected:**
     - Success message appears
     - Data saved to localStorage
     - Page clears

### Phase 4: Admin Dashboard - Review Payment

1. Navigate to `admin-login.html`

2. Login with admin credentials:
   - Username: `admin`
   - Password: `admin123`
   - **Expected:** Admin dashboard opens

3. Navigate to "💰 Payment Review" tab
   - **Expected:** 
     - Payment Review table displays
     - Pending submissions visible with ⏳ status

4. In Payment Review table, verify columns:
   - ✓ Submission ID
   - ✓ Customer Info (Name & GCash Ref)
   - ✓ Booking ID
   - ✓ Proof File (Filename)
   - ✓ Submitted (Timestamp)
   - ✓ Status (⏳ Pending)
   - ✓ Actions (Review button)

5. Click "Review" button on submission
   - **Expected:** Modal opens showing:
     - Booking Details (ID, Movie, Amount)
     - Payment Proof (Image preview or PDF filename)
     - ✓ Approve Payment button
     - ✗ Reject Payment button
     - Close button

### Phase 5A: Approve Payment (Happy Path)

1. In Review modal, click "✓ Approve Payment"
   - **Expected:** Confirmation dialog appears

2. Click OK to confirm
   - **Expected:**
     - Success message: "✓ Payment approved! Booking confirmed."
     - Modal closes
     - Payment Review table refreshes

3. Verify updated status in Payment Review table:
   - Status changed to ✓ Approved
   - Timestamp shows approval time

4. Verify booking is confirmed:
   - Navigate to user Dashboard (user account)
   - **Expected:** Booking appears as "Confirmed" (not pending)

### Phase 5B: Reject Payment (Alternative Path)

1. From Payment Review table, click "Review" on pending submission

2. Click "✗ Reject Payment"
   - **Expected:** Prompt asks for rejection reason

3. Enter reason: `Invalid reference number format`
   - Click OK
   - **Expected:**
     - Success message: "✗ Payment rejected! User notified."
     - Modal closes
     - Table refreshes

4. Verify rejection details:
   - Status changed to ✗ Rejected
   - Rejection reason visible on hover or details view

5. Verify booking is cancelled:
   - Seats should be released back to available (no longer red)
   - User can select and rebook

---

## Test Scenario: Email Notification Tracking

### Phase 1: Email Log Access
1. In Admin Dashboard, click "📧 Email Log" tab
   - **Expected:** Email Log table displays

2. Verify table structure:
   - ✓ Email ID
   - ✓ Recipient (demo email format)
   - ✓ Subject
   - ✓ Sent At (Timestamp)
   - ✓ Status
   - ✓ Actions (View button)

### Phase 2: View Email Content
1. Click "View" button on any email
   - **Expected:** Modal opens with:
     - Email metadata (To, Subject, Sent time)
     - Full email body text
     - GCash payment instructions
     - Booking reference details
     - Close button

2. Verify email content includes:
   - GCash account/number to send payment to
   - Amount to send
   - Reference number format
   - Booking ID
   - Movie details
   - Submission deadline (30 minutes from booking)

3. Close modal
   - **Expected:** Email Log table still visible

---

## Test Scenario: Seat State Transitions

### Verify Seat States Throughout Workflow

**State 1: Initial (Available)**
- Click on any movie
- All seats show as white/available
- Can click to select

**State 2: User Selects (Selected)**
- Click seat to select
- Seat turns yellow
- Seat appears in Selected Seats list

**State 3: Booking Created (Locked - Pending)**
- After confirming booking:
- Selected seats turn red (locked)
- Cannot click red seats
- **Verify:** Other users cannot select these seats

**State 4: Payment Approved (Confirmed)**
- After admin approves payment:
- Seats remain red (permanently locked)
- Booking marked as "Confirmed"
- **Verify:** Still locked for other users

**State 5: Payment Rejected (Released)**
- After admin rejects payment:
- Seats turn back to white (available)
- Can be selected by any user
- Booking marked as "payment_rejected"

**State 6: Auto-Expiration (Released)**
- After 30 minutes without payment submission:
- Seats automatically released
- Booking marked as "payment_expired"
- Seats turn back to white
- **Testing:** Difficult in live testing, check localStorage timestamps

---

## Data Validation Checklist

### localStorage Keys to Verify

```javascript
// Check in browser console:

// 1. User reservations
JSON.parse(localStorage.getItem('cinebook:reservations'))
// Should contain booking with:
// - id, userId, movie, seats, date, time, price
// - status: 'pending' or 'confirmed' or 'payment_rejected'

// 2. Payment submissions
JSON.parse(localStorage.getItem('cinebook:paymentSubmissions'))
// Should contain:
// - id, bookingId, senderName, referenceNumber
// - proofFile (base64 data), fileName
// - status: 'pending_review' or 'approved' or 'rejected'
// - submittedAt, approvedAt/rejectedAt timestamps

// 3. Email log
JSON.parse(localStorage.getItem('cinebook:emailLog'))
// Should contain:
// - id, to, subject, body
// - sentAt, status: 'sent'
// - bookingId reference
```

---

## Common Issues & Troubleshooting

### Issue 1: Seats Not Turning Red After Booking
**Symptoms:** Seats remain white instead of turning red
**Solution:**
- Check that booking was created: `JSON.parse(localStorage.getItem('cinebook:reservations'))`
- Verify booking has `status: 'pending'`
- Refresh page - seats should appear red

### Issue 2: Payment Review Tab Empty
**Symptoms:** Payment Review table shows "No payment submissions"
**Solution:**
- Check payment submissions exist: `JSON.parse(localStorage.getItem('cinebook:paymentSubmissions'))`
- Verify submission has `status: 'pending_review'`
- Reload admin dashboard
- Check browser console for JavaScript errors

### Issue 3: Approve/Reject Buttons Not Working
**Symptoms:** Clicking button doesn't trigger action
**Solution:**
- Open browser console (F12)
- Check for JavaScript errors
- Verify functions are exported: `window.approvePaymentSubmission` should exist
- Try refreshing page

### Issue 4: Email Log Empty
**Symptoms:** No emails show in Email Log tab
**Solution:**
- Verify an email was sent: `JSON.parse(localStorage.getItem('cinebook:emailLog'))`
- Check email was created during booking confirmation
- Verify `sendEmailNotification()` was called

### Issue 5: Seats Not Releasing After Rejection
**Symptoms:** Seats stay red after payment rejection
**Solution:**
- Verify booking status changed to 'payment_rejected'
- Refresh page - seats should appear white
- Check localStorage: booking status should be 'payment_rejected'

---

## Performance Notes

- **localStorage Limit:** ~5-10MB (sufficient for demo)
- **Seat Count:** 40 per theater (fixed for this demo)
- **Email Storage:** Each email ~0.5KB (hundreds storable)
- **Payment Submissions:** Each ~10-50KB (depends on file size)

---

## Success Criteria

All tests pass when:

✅ User can book seats and see them lock (red)
✅ Pending booking email is generated
✅ User can upload payment proof
✅ Admin can view payment submissions in dashboard
✅ Admin can approve payment (booking confirmed, seats permanently locked)
✅ Admin can reject payment (booking cancelled, seats released)
✅ Admin can view email log with full content
✅ Rejected bookings can be rebooked by users
✅ Payment data persists across page reloads
✅ All timestamps accurate and formatted correctly

---

## Additional Test Cases

### Test Case A: Multiple Bookings
1. Same user books different seats for same movie
2. Verify seats lock independently
3. Both bookings appear as pending

### Test Case B: Different Users, Same Movie
1. User A books seats 1-2
2. User B logs in, tries to book seats 1-2
3. Verify seats appear red for User B (locked by User A)
4. User B can book different seats (3-4)

### Test Case C: Payment Resubmission After Rejection
1. Payment rejected by admin
2. Seats released (white again)
3. User rebooks same/different seats
4. User resubmits payment proof
5. New payment submission appears in admin review

---

## Resources

- Payment Submission Handler: [script.js - submitPaymentProof](script.js#L1180)
- Admin Approval Handler: [script.js - approvePaymentSubmission](script.js#L1313)
- Admin Rejection Handler: [script.js - rejectPaymentSubmission](script.js#L1350)
- Email Notification: [script.js - sendEmailNotification](script.js#L460)
- Seat Rendering: [script.js - createSeats](script.js#L200)

---

Last Updated: 2024-12-20
Test Version: 1.0
