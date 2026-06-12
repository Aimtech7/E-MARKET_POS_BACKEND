# E-MARKET POS SYSTEM - COMPREHENSIVE PROJECT DOCUMENTATION

> [!IMPORTANT]
> This document serves as the master blueprint for the E-Market POS system, containing architectural, technical, business, and deployment details. It is intended for senior software architects, investors, and development teams.

---

## 1. Project Overview

**Project Name:** E-Market POS System
**Purpose:** A robust, high-performance Point of Sale (POS) and retail management application designed to handle checkout operations, inventory tracking, analytics, and business reporting for retail environments.
**Target Users:** Retail stores, supermarkets, electronic shops, and multi-branch retail franchises.
**Problems Solved:**
- Eliminates manual checkout errors through a streamlined, keyboard-accessible interface.
- Prevents stockouts with real-time inventory tracking and low-stock alerts.
- Provides business owners with actionable financial analytics and predictive insights.
- Integrates multiple payment gateways (Cash, Card, M-Pesa, Paystack) into a single ledger.
**Key Features:** Desktop application packaging (offline-capable frontend with local backend), rich analytics dashboard, automated webhooks for mobile money (M-Pesa), robust audit trailing, and receipt generation.

---

## 2. System Architecture

The system follows a modern decoupled architecture packaged as a desktop application using Electron.

**Frontend Architecture:**
Built on React.js (v18) using Redux for state management. The UI is built using modular React components and styled with localized CSS modules. It uses `recharts` for rich analytics dashboards.

**Backend Architecture:**
A robust REST API built with Node.js and Express.js. It runs on a local instance (Port 5500) packaged inside the desktop application, effectively allowing the POS to operate locally while communicating with cloud services for payments.

**Database Design:**
MongoDB using Mongoose ODM. The database schema relies heavily on relational `ObjectId` references to tie Transactions, Users, Products, and Payment Logs together for seamless querying.

**API Architecture:**
RESTful JSON API with versionless routes (e.g., `/api/cart`, `/api/payment`). Routes are secured using JWT bearer tokens and rate-limited.

**Desktop Application Architecture:**
The app is wrapped in Electron. The backend Express server (`server.js`) is booted as a child process when the Electron `main.js` process starts. The React frontend is compiled into a static `client-build` folder which is served by the Electron browser window. 

**Deployment & Docker Architecture:**
Currently deployed via Electron-builder to target Windows (NSIS `.exe` and `.msi`). For cloud deployments, a Docker container can be spun up using the standard Node.js image to host the Express API and a remote MongoDB Atlas cluster.

---

## 3. Technology Stack

- **Programming Languages:** TypeScript (Frontend), JavaScript (Backend).
- **Frameworks:** React v18, Express.js v4, Electron.
- **Libraries:** Redux Toolkit, Formik & Yup (form validation), Recharts (Analytics), Axios (HTTP requests).
- **Database Technologies:** MongoDB v5.7, Mongoose ODM.
- **Payment Integrations:** Safaricom M-Pesa (Daraja API for STK Push), Paystack (Checkout links & webhooks).
- **Receipt Printing Technologies:** `html2canvas`, `jspdf`, `react-to-print`, and backend PDFKit/bwip-js (barcode generation).
- **Authentication Technologies:** JSON Web Tokens (JWT), bcryptjs for password hashing.

---

## 4. Feature Inventory

### Implemented Features
- **Sales Management:** Cart management, dynamic discount and tax calculations.
- **Inventory Management:** CRUD operations for Products.
- **Stock Control:** Low stock alerts, inventory movement tracking.
- **Product Categories & Units:** Custom categories and Unit of Measure (UOM) configurations.
- **Barcode Support:** Barcode scanning and backend barcode generation via bwip-js.
- **Receipt Generation:** Thermal printer support, PDF export, printable modal UI.
- **Customer Management:** Customer ledgers, credit sales (Debt tracking).
- **Supplier & Purchase Orders:** Managing suppliers and generating POs.
- **Expenses Management:** Logging store expenses.
- **Daily Reports & P&L:** Gross and net profit calculations.
- **User Roles & Permissions:** Admin vs. Cashier access control.
- **Dashboard Analytics:** Revenue trends, pie charts, product distributions.
- **Audit Logs:** Tracking all user actions via IP and endpoint metadata.
- **Payment Integrations:** M-Pesa STK Push and Paystack.

### Planned/Missing Features (Roadmap)
- Multi-branch support with centralized cloud synchronization.
- Offline mode with IndexedDB queuing for cloud-synced setups.
- Real-time notification web-sockets.
- Employee shift tracking and payroll integrations.

---

## 5. Payment System

The POS supports a hybrid payment system managing both manual and automated API payments.

**Current Payment Methods:** Cash, Card (Manual entry), M-Pesa (Automated), Paystack (Automated).

**M-Pesa Integration Design:**
1. Cashier triggers "Prompt Customer" -> hits `/payments/mpesa/stkpush`.
2. Backend authenticates with Safaricom, formats the phone number (2547...), and issues an STK push.
3. System creates a `PaymentLog` marked as `PENDING`.
4. Safaricom sends a callback webhook to `/payments/mpesa/webhook`.
5. Webhook verifies data, updates `PaymentLog` and associated `Transaction` to `COMPLETED` or `FAILED`.

**Paystack Integration Design:**
1. Cashier enters customer email -> hits `/payments/paystack/initialize`.
2. Backend creates a transaction on Paystack and returns a payment URL.
3. Customer completes payment on their device.
4. Paystack fires a webhook to `/payments/paystack/webhook`.
5. Webhook validates the HMAC SHA-512 signature using `PAYSTACK_SECRET_KEY` and fulfills the database transaction.

**Transaction Workflow:**
Cart checkout initializes an `Invoice` and `Receipt`. Payment data is attached to the final `Transaction` payload specifying `paymentProvider`, `externalReference`, and `paymentStatus`. 

---

## 6. Database Documentation

The system operates on MongoDB. Key Collections:

- `Users`: Stores credentials, roles (admin boolean).
- `Products`: Stores item details, price, cost, stock, barcode, `category`, `uom`.
- `Transactions`: Maps to completed sales, records total, tax, discount. Linked to `Payments`.
- `PaymentLogs`: Stores webhooks, provider payloads, and references (`externalReference`).
- `Customers` & `DebtTransactions`: Tracks customer credit and balance settlements.
- `AuditLogs`: Records `userId`, `action`, `timestamp`, `ip`, `method`.

**Indexing Strategy:**
- Text indexes on Product `name` and `barcode` for rapid scanning.
- Compound indexes on Transactions by `date` and `paymentStatus` for fast daily reporting.
- Unique index on `PaymentLog.externalReference` to prevent double-logging webhooks.

---

## 7. API Documentation

**Base URL:** `http://localhost:5500` (Local) / Cloud Domain.

**Key Endpoints:**
- `POST /user/login`: Issues JWT.
- `GET /products`: Fetches all inventory.
- `POST /cart/checkout`: Converts a cart to an invoice and deducts stock.
- `POST /payments/mpesa/stkpush`: Takes `{ phoneNumber, amount, transactionId }`. Returns 200 OK.
- `POST /payments/mpesa/webhook`: Receives Safaricom callback payload.
- `GET /analytics/today`: Returns `{ revenue, orders, averageSale, profit }`.

**Authentication Methods:** 
Bearer token inside the `Authorization` header (`Authorization: barear <token>`).

**Error Handling:** 
Standardized JSON responses: `{ status: false, message: "Error description" }`. 400 for Bad Request, 401/403 for Auth, 500 for Internal.

---

## 8. Desktop Application

**Packaging Technology:**
Built utilizing `electron-builder`.

**How the .exe/.msi is built:**
1. React code is compiled to static assets (`npm run build`).
2. Express backend and Electron main process are bundled.
3. The `pack` command (`electron-builder --dir`) compiles the binary.
4. The `dist` command packages it into an NSIS setup executable and an MSI installer.

**Dependencies:**
- Node.js environment embedded in Electron.
- Local MongoDB instance required for the offline-first setup, OR a `.env` configured to target a remote MongoDB Atlas URI.

---

## 9. Security Review

- **Authentication:** JWT tokens ensure stateless API security. Passwords hashed using `bcryptjs`.
- **Payment Security:** Paystack webhooks are cryptographically verified via HMAC SHA-512. M-Pesa uses short-lived OAuth tokens.
- **Authorization:** Middleware checks `req.user.admin` for destructive actions.
- **Data Protection:** `express-mongo-sanitize` prevents NoSQL injection attacks. `helmet` protects HTTP headers. `express-rate-limit` prevents brute-force login attempts.
- **Audit Logging:** Every mutating request logs the user, IP, and payload to the `AuditLog` collection.

---

## 10. Deployment Plan

- **Local Deployment:** Install the `.exe` or `.msi` on the Windows machine. Requires MongoDB to be running locally on the default port.
- **Cloud/VPS Deployment:** 
  1. Provision an Ubuntu VPS.
  2. Install Node.js & PM2.
  3. Clone the repo, setup `.env` (Atlas DB, Payment Keys).
  4. Build React and serve static files through Express.
  5. Proxy traffic through Nginx with SSL via Let's Encrypt.
- **CI/CD Pipeline:** Configured via GitHub Actions (`.github/workflows/release.yml`) which triggers `electron-builder` and creates a GitHub Release containing the Windows installers.

---

## 11. Missing Features (Production Readiness)

To be considered a true "Tier 1" Enterprise POS, the following are missing:
1. **Hardware Integration APIs:** Direct USB/Serial communication for thermal printers and cash drawers (currently relies on browser print dialogs).
2. **Cloud Sync/Multi-tenant Engine:** A robust synchronization protocol between local offline databases and the master cloud database.
3. **Refund/Returns Engine:** A dedicated UI and stock-reversal logic for processing partial or full returns.
4. **Shift Management:** Opening/closing cash drawer balances to track cashier discrepancies.

---

## 12. Production Readiness Assessment

- **Completion Percentage:** 85% for Single-store usage. 40% for Multi-tenant Franchise usage.
- **Critical Blockers:** The local desktop app requires a local MongoDB instance to be installed by the user manually, which is bad UX. A self-contained SQLite or NeDB alternative should be used for the offline client, syncing to MongoDB in the cloud.
- **Recommended Roadmap:**
  1. Containerize the database or switch to a local file-based DB for Electron.
  2. Implement hardware serial port plugins for thermal printers.
  3. Deploy the backend to AWS/GCP to serve as a centralized hub.

---

## 13. Business Plan

**Target Market:** Small to Medium Enterprises (SMEs), retail chains, pharmacies, and supermarkets in emerging markets (hence M-Pesa integration).
**Pricing Strategy:**
- **SaaS Model:** $30/month per terminal (Includes Cloud Sync, Updates, and Analytics).
- **One-time License:** $500 perpetual license (Offline only, no cloud backups).
- **Revenue Projections:** Capturing 500 stores on the SaaS model generates $15,000 Monthly Recurring Revenue (MRR).

---

## 14. Source Code Analysis

**Project Structure:**
- `/model`: Mongoose schemas.
- `/routes` & `/controller`: API logic and request handling.
- `/services`: 3rd party logic (M-Pesa, Paystack).
- `/src`: React frontend (Pages, Components, Context).
- `server.js`: Express entry point.
- `main.js`: Electron entry point.

**Code Quality Review:**
- The codebase is modular and well-structured.
- Frontend uses TypeScript, though there are areas where `any` types are overused.
- **Refactoring Recommendations:** Move all inline API URLs (`http://localhost:5500`) to a centralized `axios` instance relying on `process.env.REACT_APP_API_URL` to facilitate cloud deployments.

---

## 15. Final Executive Summary

The E-Market POS is a highly capable, modern retail management system. Its hybrid Electron architecture offers the snappy performance of a desktop application with the power of modern web technologies. The recent successful integration of **M-Pesa** and **Paystack** makes it immediately viable for the African tech ecosystem.

**Strengths:** Modern tech stack, rich analytics, automated payment gateways, automated CI/CD builds.
**Weaknesses:** Local MongoDB dependency creates friction for non-technical users installing the `.exe`. Hardcoded localhost URLs prevent immediate cloud deployment without minor refactors.
**Opportunities:** Transitioning to a SaaS multi-tenant architecture with offline-first synchronization could disrupt legacy POS providers.
**Next Steps:** Refactor hardcoded API endpoints, implement a lightweight local database for the client, and deploy the master database to the cloud.
