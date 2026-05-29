# Authentication Documentation

## Issue Resolved
The frontend was displaying a `500` error during login attempts.

## Root Cause
- **Network Disconnection / Empty Database**: If the backend is unreachable or the database is entirely empty, the application returned a 500 error instead of a graceful user-facing error message (like "Authentication service unavailable" or "Invalid username or password").

## Fix Applied
1. **Frontend Fallback**: Added proper exception handling in the login promise chain (`src/Pages/AuthenticationPage/index.tsx`) to fall back to `503 Authentication service unavailable` when `err.response` is undefined.
2. **Backend Controller**: Refactored `user-controller.js` to log internal errors to the console, and return clean `401 Invalid username or password` for incorrect credentials, shielding internal logic.
3. **Demo Accounts Panel**: Appended a UI component to the frontend login page detailing the demo accounts. This is strictly guarded by `process.env.NODE_ENV === "development"`.

## Seeder Implementation
A startup seeder script (`seeds/default-users.js`) was created. Upon application boot, the server inspects the `User` document count. If `0`, it safely hashes and initializes the two critical demo accounts.

## Demo Accounts Created
- **Admin**: `admin` / `admin123`
- **Cashier**: `cashier` / `cashier123`

## Authentication Test Results
- ✅ Admin login (tested via UI/seeder)
- ✅ Cashier login (tested via UI/seeder)
- ✅ JWT generation and validation are fully functional.
- ✅ No 500 internal server errors remain when credentials fail.
