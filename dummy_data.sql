-- Insert dummy records into sellers table
INSERT INTO sellers (name, contact_info, outstanding_balance) VALUES
('Seller A', 'sellerA@example.com', '1000'),
('Seller B', 'sellerB@example.com', '2000'),
('Seller C', 'sellerC@example.com', '1500');

-- Insert dummy records into vehicles table
INSERT INTO vehicles (chassis_no, vehicle_type, year, colour, mileage, etd, eta, vessel_name, grade, options, consignee, cif_value_jpy, cif_value_lkr, duty, bank_charges, import_charges, clearing, transport, other, repair, total_cost, sold, sale_price, profit, seller_id, lc_amount, bank_transfer_amount, vehicle_status) VALUES
('ABC123', 'Sedan', '2023', 'Red', 10000, '2023-05-01', '2023-05-15', 'Vessel A', 'Grade A', 'Option A', 'Consignee A', 5000, 7500, 100, 50, 200, 150, 100, 50, 300, 8500, 'No', 0, 0, 1, 2500, 2500, 'Purchased'),
('DEF456', 'SUV', '2022', 'Blue', 20000, '2023-06-01', '2023-06-15', 'Vessel B', 'Grade B', 'Option B', 'Consignee B', 6000, 9000, 150, 75, 250, 200, 150, 75, 400, 10200, 'Yes', 12000, 1800, 2, 3000, 3000, 'Sold'),
('GHI789', 'Truck', '2021', 'Green', 30000, '2023-07-01', '2023-07-15', 'Vessel C', 'Grade C', 'Option C', 'Consignee C', 7000, 10500, 200, 100, 300, 250, 200, 100, 500, 11950, 'Pending', 0, 0, 3, 3500, 3500, 'In-Transit');

-- Insert dummy records into LC table
INSERT INTO LC (vehicleId, lcAmount, bankTransferAmount) VALUES
(1, 2500, 2500),
(2, 3000, 3000),
(3, 3500, 3500);

-- Insert dummy records into BankTransfers table
INSERT INTO BankTransfers (vehicle_id, seller_id, amount, date, transfer_mode) VALUES
(1, 1, 2500, '2023-05-10', 'Wire Transfer'),
(2, 2, 3000, '2023-06-10', 'Wire Transfer'),
(3, 3, 3500, '2023-07-10', 'Wire Transfer');

-- Insert dummy records into LCRecords table
INSERT INTO LCRecords (vehicle_id, seller_id, amount, date, transfer_mode) VALUES
(1, 1, 2500, '2023-05-10', 'LC Transfer'),
(2, 2, 3000, '2023-06-10', 'LC Transfer'),
(3, 3, 3500, '2023-07-10', 'LC Transfer');
