## Admin User Management
- Implemented full CRUD for users.
- Admin can reset passwords, disable accounts, and modify roles.
- Added full name, email, and phone to user profiles.

## Stock Management Improvements
- Separated inventory modifications into Add, Remove, and Adjust actions.
- Required a descriptive reason for each manual stock change.
- Ledger now properly highlights Add and Remove actions differently and displays the Author.

## Product Management Improvements
- Added full support for Cost Price, Selling Price, and Profit Margin.
- Implemented Soft Deletion via Product Archiving (Archive/Restore toggles).
- Preserves invoice and reporting integrity while keeping the active product list clean.

## Supplier Management
- Added Supplier Management with full CRUD capabilities.
- Allows setting Supplier Name, Contact, Email, Phone, and Address.

## Purchase Order Management
- Create Purchase Orders with multiple items.
- Track PO status (Draft, Ordered, Received, Cancelled).
- Automatically update inventory stock upon receiving PO items.

## Settings Management
- Centrally manage Store Profile (Name, Address, Phone, Email).
- Centrally configure Financial parameters like Default Tax Rate and Currency Symbol.
- Configurable receipt footers.

## Audit & Reporting
- Centralized System Audit Logs tracking all mutating requests (POST, PUT, DELETE).
- Detailed records including Timestamp, User, HTTP Method, URL, IP Address, and JSON Payload.
- Interactive UI for Audit Logs (/audit).
- Comprehensive Business Reports generation (Sales, Profit, Inventory snapshots).
- Interactive recharts data visualization for Sales & Profit Trends over the last 7 days.

