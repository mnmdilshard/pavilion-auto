-- Create a table to track profit distribution among investors for sold vehicles
CREATE TABLE IF NOT EXISTS profit_distribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_id INTEGER NOT NULL,
    investor_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    percentage REAL NOT NULL,
    distribution_date DATE NOT NULL,
    notes TEXT,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id),
    FOREIGN KEY (investor_id) REFERENCES investors (id)
);
