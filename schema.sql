-- Drop the existing vehicles table if it exists
DROP TABLE IF EXISTS vehicles;

-- Recreate the vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chassis_no TEXT NOT NULL,
    vehicle_type TEXT,
    year TEXT,
    colour TEXT,
    mileage INTEGER,
    etd DATE,
    eta DATE,
    vessel_name TEXT,
    grade TEXT,
    options TEXT,
    consignee TEXT,
    cif_value_jpy REAL,
    cif_value_lkr REAL,
    duty REAL,
    bank_charges REAL,
    import_charges REAL,
    clearing REAL,
    transport REAL,
    other REAL,
    repair REAL,
    total_cost REAL,
    sold TEXT,
    sale_price REAL,
    profit REAL,
    seller_id INTEGER,
    lc_amount REAL,
    bank_transfer_amount REAL,
    vehicle_status TEXT DEFAULT 'Purchased',
    FOREIGN KEY (seller_id) REFERENCES sellers (id)
);

-- Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_info TEXT,
    outstanding_balance TEXT
);

-- Create LC table
CREATE TABLE IF NOT EXISTS LC (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicleId INTEGER NOT NULL,
    lcAmount REAL NOT NULL,
    bankTransferAmount REAL NOT NULL,
    FOREIGN KEY (vehicleId) REFERENCES vehicles (id)
);

-- Create BankTransfers table
CREATE TABLE IF NOT EXISTS BankTransfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date DATE NOT NULL,
    transfer_mode TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    FOREIGN KEY (seller_id) REFERENCES sellers (id)
);

-- Create LCRecords table
CREATE TABLE IF NOT EXISTS LCRecords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    seller_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date DATE NOT NULL,
    transfer_mode TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    FOREIGN KEY (seller_id) REFERENCES sellers (id)
);

-- Create Invoices table
CREATE TABLE IF NOT EXISTS Invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER NOT NULL,
    total_amount REAL NOT NULL,
    total_lc_amount REAL NOT NULL,
    total_bt_amount REAL NOT NULL,
    paid_lc_amount REAL DEFAULT 0,
    paid_bt_amount REAL DEFAULT 0,
    remaining_lc_amount REAL NOT NULL,
    remaining_bt_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers (id)
);

-- Create InvoiceVehicles table (junction table for invoice-vehicle relationship)
CREATE TABLE IF NOT EXISTS InvoiceVehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    vehicle_id INTEGER NOT NULL,
    lc_amount REAL NOT NULL,
    bt_amount REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES Invoices (id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
);

-- Create InvoicePayments table
CREATE TABLE IF NOT EXISTS InvoicePayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    amount_jpy REAL NOT NULL,
    amount_lkr REAL DEFAULT 0,
    date DATE NOT NULL,
    transfer_mode TEXT NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('LC', 'BT')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES Invoices (id) ON DELETE CASCADE
);

-- Create buyers table
CREATE TABLE IF NOT EXISTS buyers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    nic TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicle_sales table
CREATE TABLE IF NOT EXISTS vehicle_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    sale_price_lkr REAL NOT NULL,
    paid_amount_lkr REAL DEFAULT 0,
    remaining_amount_lkr REAL NOT NULL,
    sale_date DATE NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'completed')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    FOREIGN KEY (buyer_id) REFERENCES buyers (id)
);

-- Create buyer_payments table
CREATE TABLE IF NOT EXISTS buyer_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    amount_lkr REAL NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    reference_no TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES vehicle_sales (id)
);