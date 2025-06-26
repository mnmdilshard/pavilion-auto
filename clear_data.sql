-- Script to delete all data from tables while preserving table structure
-- Updated on 24 June 2025

-- Make sure foreign key constraints are respected
PRAGMA foreign_keys = OFF;

-- Delete data from all tables
DELETE FROM vehicle_sale_payments;
DELETE FROM profit_distribution;
DELETE FROM vehicle_investments;
DELETE FROM buyer_payments;
DELETE FROM vehicle_sales;
DELETE FROM buyers;
DELETE FROM investors;
DELETE FROM InvoicePayments;
DELETE FROM InvoiceVehicles;
DELETE FROM Invoices;
DELETE FROM LCRecords;
DELETE FROM BankTransfers;
DELETE FROM LC;
DELETE FROM vehicles_sellers;
DELETE FROM vehicles;
DELETE FROM sellers;
DELETE FROM users;

-- Reset all SQLite auto-increment counters
UPDATE sqlite_sequence SET seq = 0;

-- Turn foreign key constraints back on
PRAGMA foreign_keys = ON;

-- Vacuum the database to reclaim space
VACUUM;

-- Report completion
SELECT 'All data has been deleted from all tables. Database reset complete.' as message;

-- To execute this script, run the following command in your terminal:
-- sqlite3 database.db < clear_data.sql
