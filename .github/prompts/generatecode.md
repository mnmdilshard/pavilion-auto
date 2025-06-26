# Pavilion Auto Application Development Prompt

I'm developing "Pavilion Auto", a vehicle import management application that tracks the complete lifecycle of importing vehicles from Japan to Sri Lanka. To ensure effective assistance without public code errors, I'd like guidance on implementing specific components of this project.

## Project Overview
Pavilion Auto will manage:
- Vehicle details throughout their import lifecycle
- Seller/vendor relationships and payment tracking
- LC (Letter of Credit) documentation and status
- Bank transfers and deposits
- Investor management and profit sharing
- Import taxes and additional charges
- Comprehensive reporting and dashboards

## Tech Stack
- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express.js
- **Database**: SQLite (local setup)


## Current Focus Area
For this specific request, I need guidance on:

[SELECT ONE SPECIFIC AREA]
1. **Database Schema Design**: Specifically for the [specific table] table
2. **Project Structure**: Recommended folder organization for [backend/frontend]
4. **API Design**: RESTful endpoint patterns for [specific module]
5. **React Component Architecture**: For [specific feature] module
6. **Business Logic Implementation**: Approach for [specific calculation/function]
7. **State Management**: Patterns for [specific data flow]

## Request Type
Please provide:
- Architecture recommendations
- Design patterns
- Implementation concepts
- Best practices
- Sample structure (not complete implementations)

I'm looking for guidance on patterns and approaches rather than complete code implementations to avoid public code errors while building this application incrementally.

---

### 🛠️ **Prompt to Build “Pavilion Auto” – Vehicle Import & Sales Management App**

---

**🚘 Project Title**: **Pavilion Auto**

**🎯 Purpose**:
Build a **web-based application** to manage the full lifecycle of **importing vehicles from Japan to Sri Lanka**. The app should handle vehicle details, LC/bank payments, seller relationships, import taxes, investor tracking, and profit/loss reporting.

---

### 🔍 **Core Modules & Functional Requirements**

---

#### 🚗 1. Vehicle Management

Track each imported vehicle’s complete lifecycle.

**Fields**:

* Chassis No
* Vehicle Type (e.g., Prado, Roomy)
* Year, Colour, Mileage
* CIF Value (JPY and LKR)
* Payment Method: LC / Bank Transfer
* Payment Breakdown
* Import Charges (clearing, duty, transport, etc.)
* Vessel Details (ETD, ETA, Vessel Name)
* Seller Info
* Final Selling Price (if sold)
* Buyer Info (if sold)
* Status: In Transit / Cleared / Sold
  ✅ **Auto-calculate**: Total Cost, Profit/Loss

---

#### 🧾 2. Seller / Vendor Management

Track vehicle suppliers and payment history.

**Fields**:

* Seller Name
* Contact Info
* List of Vehicles Supplied
* Payment Mode per Vehicle
* Outstanding Balances

---

#### 💳 3. LC (Letter of Credit) Tracking

Manage and assign LC-based payments.

**Fields**:

* LC No, Bank Name
* Linked Vehicles
* LC Amount
* Opening & Closing Date
* Remaining Balance
* Currency (JPY or LKR)

---

#### 💰 4. Bank Transfer / Deposit Tracker

Record direct bank deposits.

**Fields**:

* Deposit ID
* Chassis No
* Amount, Date
* Mode (CEFT, TT, etc.)
* Currency & Bank Name
* Total Deposits per Vehicle

---

#### 👤 5. Investor Management

Track investments and distribute profit shares.

**Fields**:

* Investor Name, Contact
* Investment Amount
* Linked Vehicles or LC
* Profit Returned
* Payment History

---

#### 📦 6. Import Tax & Other Charges

Capture additional costs for each vehicle.

**Charge Types**:

* Customs Duty, Clearing Charges, Transport
* Bank Charges, Repairs, Miscellaneous

✅ **Auto-calculate**:

* Total Import Cost
* Profit/Loss vs. Selling Price

---

#### 📈 7. Reporting & Dashboards

**Reports**:

* Profit/Loss Summary
* LC vs Bank Transfer Analysis
* Vehicle Status Overview
* Seller & Investor Performance
* Payment History / Dues
* Cost Calculators (real-time)

---

### 🧱 **Tech Stack**

---

**Frontend**:

* React.js (with Tailwind CSS for UI)
* Axios for API integration
* Reusable Components (forms, tables, modals)

**Backend**:

* Node.js with Express.js
* REST APIs to serve the frontend
* JWT or session-based authentication
* Role-based access (Admin, Staff, Investor)

**Database**:

* **SQLite (local)**
  Ideal for a small, local setup with zero configuration. Use `sqlite3` or `better-sqlite3` package in Node.js.
  Schema includes tables for:

  * `vehicles`
  * `sellers`
  * `lcs`
  * `deposits`
  * `investors`
  * `charges`
  * `users`

---

### 🔄 Sample Workflow

1. Add a new Vehicle
2. Attach LC/Bank Payment
3. Add CIF & Import Charges
4. Auto-calculate Total Cost & Profit
5. Track Sale & Buyer Info
6. View Investor Share
7. Generate Reports & Export (CSV/PDF optional)

---

### 🧩 Optional Features

* CSV import (for legacy Excel data)
* Email alerts (due payments, LC expiry)
* Downloadable reports (PDF, CSV)
* Investor-only dashboard view

---

### 📎 Deliverables You Can Request

* ✅ SQLite DB schema (`schema.sql`)
* ✅ Node.js backend boilerplate
* ✅ React.js frontend starter (with Tailwind)
* ✅ Postman Collection for testing APIs
* ✅ Basic UI wireframes

---
