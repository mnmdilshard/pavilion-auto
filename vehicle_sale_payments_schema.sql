-- Create vehicle_sale_payments table for tracking buyer payments
CREATE TABLE IF NOT EXISTS vehicle_sale_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    amount_lkr REAL NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL,
    reference_no TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES vehicle_sales(id) ON DELETE CASCADE
);
