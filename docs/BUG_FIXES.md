# EMMARKET POS — Bug Fixes Log

## Build-Critical Bugs Fixed

### BUG-001: Backend Crash — Cannot find module '../model/Inventory'
- **Root Cause**: `analytics-controller.js` and `refund-controller.js` imported `require("../model/Inventory")` but the actual model file is named `InventoryMovement.js`.
- **Fix Applied**: Changed both imports to `require("../model/InventoryMovement")`.
- **Files Modified**: `controller/analytics-controller.js`, `controller/refund-controller.js`
- **Severity**: CRITICAL — Backend would not start at all.

### BUG-002: Frontend — ReceiptPreviewModal import escapes src/
- **Root Cause**: `ReceiptPreviewModal/index.tsx` used `../../../context/Theme/useTheme` (3 levels up) but the component lives at `src/Components/ReceiptPreviewModal/` which is only 2 levels deep from `src/`. Create React App rejects imports outside `src/`.
- **Fix Applied**: Changed import to `../../context/Theme/useTheme`.
- **Files Modified**: `src/Components/ReceiptPreviewModal/index.tsx`
- **Severity**: CRITICAL — Frontend would not compile.

### BUG-003: Frontend — ReprintReceiptButton passes `title` prop to Button
- **Root Cause**: `ReprintReceiptButton` used `<Button title="Reprint" />` but the `Button` component interface does not include a `title` prop. Button uses `children` for its text content.
- **Fix Applied**: Changed from self-closing `<Button title={...} />` to `<Button>{text}</Button>` using children.
- **Files Modified**: `src/Components/ReprintReceiptButton/index.tsx`
- **Severity**: CRITICAL — TypeScript compilation error.

### BUG-004: Frontend — Button variant="success" not in union type
- **Root Cause**: `BackupPage` and `ReportsPage` used `variant="success"` but `Button` only supported `primary | secondary | warning | error`.
- **Fix Applied**: Extended the `Button` component's `variant` union type to include `"success"` and added corresponding green (`#2ecc71`) background color handling.
- **Files Modified**: `src/Components/Button/index.tsx`
- **Severity**: CRITICAL — TypeScript compilation error.

### BUG-005: Frontend — Input component missing `disabled` prop
- **Root Cause**: `ClosurePage` used `<Input disabled />` but the `Input` component interface did not declare a `disabled` prop. Also, `onChange` was required but `disabled` inputs don't need it.
- **Fix Applied**: Added `disabled?: boolean` and `readOnly?: boolean` to the `Input` interface. Made `onChange` optional (`onChange?: ChangeEventHandler`). Passed both attributes through to the native `<input>` element.
- **Files Modified**: `src/Components/Input/index.tsx`
- **Severity**: CRITICAL — TypeScript compilation error.
