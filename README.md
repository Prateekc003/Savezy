# Savezy project summary

Savezy is a small, single-page voucher marketplace built mainly in index.html, with Firebase services handled in firebase-auth.js.

Browse vouchers: Home and Explore show approved offers, with search, category, expiry, and offer-type filters.

Sell vouchers: Sellers can submit eligible transferable vouchers. Submissions are validated and sent for admin review.

Accounts: Firebase Authentication supports registration, login, logout, and password reset.

Requests and saved offers: Users can request vouchers and save offers. These workflows are currently stored in the browser rather than persisted to Firestore.

Admin review: Admins are identified by an admins/{uid} Firestore document and can approve or reject pending listings. Public listings and admin review data use live Firestore subscriptions.

Payments: Savezy does not process payments; buyers and sellers coordinate separately.

Prototype content: The home page includes sample deals. The README contains only the project title.
