-- Create investors table
CREATE TABLE IF NOT EXISTS investors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_info TEXT,
    email TEXT,
    notes TEXT
);

-- Create vehicle_investments table to track investments per vehicle
CREATE TABLE IF NOT EXISTS vehicle_investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    investor_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    investment_date DATE NOT NULL,
    notes TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    FOREIGN KEY (investor_id) REFERENCES investors (id)
);
