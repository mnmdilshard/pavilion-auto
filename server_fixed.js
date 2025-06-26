const express = require('express');
const app = express();
const PORT = 3001;

// CORS middleware
const cors = require('cors');

// Enable CORS for all routes
app.use(cors());

// Middleware for parsing JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// SQLite database setup
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Initialize SQLite database
const dbFile = path.join(__dirname, 'database.db');
const schemaFile = path.join(__dirname, 'schema.sql');
let db;

function connectToDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        reject(err);
      } else {
        console.log('Connected to SQLite database.');
        resolve(db);
      }
    });
  });
}

// Connect to database immediately
connectToDatabase()
  .then(() => {
    console.log('Database connection established successfully');
    
    // Test query
    db.get('SELECT COUNT(*) as count FROM sellers', [], (err, row) => {
      if (err) {
        console.error('Error testing database:', err.message);
      } else {
        console.log('Number of sellers in database:', row.count);
      }
    });
  })
  .catch(err => {
    console.error('Failed to connect to database:', err.message);
  });

// Basic route
app.get('/', (req, res) => {
  res.send('Welcome to Pavilion Auto Backend!');
});

// Sellers outstanding route
app.get('/sellers/outstanding', (req, res) => {
  console.log('GET /sellers/outstanding - started');
  
  const query = `
    WITH Totals AS (
      SELECT 
        v.seller_id,
        SUM(v.lc_amount) as total_lc,
        SUM(v.bank_transfer_amount) as total_bt
      FROM vehicles v
      GROUP BY v.seller_id
    ),
    Payments AS (
      SELECT 
        s.id as seller_id,
        SUM(CASE WHEN lr.amount IS NOT NULL THEN lr.amount ELSE 0 END) as paid_lc,
        SUM(CASE WHEN bt.amount IS NOT NULL THEN bt.amount ELSE 0 END) as paid_bt
      FROM sellers s
      LEFT JOIN LCRecords lr ON s.id = lr.seller_id
      LEFT JOIN BankTransfers bt ON s.id = bt.seller_id
      GROUP BY s.id
    )
    SELECT 
      s.*,
      COALESCE(t.total_lc, 0) as total_lc,
      COALESCE(t.total_bt, 0) as total_bt,
      COALESCE(p.paid_lc, 0) as paid_lc,
      COALESCE(p.paid_bt, 0) as paid_bt,
      COALESCE(t.total_lc, 0) - COALESCE(p.paid_lc, 0) as outstanding_lc,
      COALESCE(t.total_bt, 0) - COALESCE(p.paid_bt, 0) as outstanding_bank_transfer
    FROM sellers s
    LEFT JOIN Totals t ON s.id = t.seller_id
    LEFT JOIN Payments p ON s.id = p.seller_id
  `;

  db.all(query, [], function(err, rows) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No sellers found' });
    }
    console.log('Found sellers:', rows.length);
    return res.json(rows);
  });
});

// Vehicles API routes

// Create a new vehicle
app.post('/vehicles', (req, res) => {
  const {
    chassis_no,
    vehicle_type,
    year,
    colour,
    mileage,
    etd,
    eta,
    vessel_name,
    grade,
    options,
    consignee,
    cif_value_jpy,
    cif_value_lkr,
    duty,
    bank_charges,
    import_charges,
    clearing,
    transport,
    other,
    repair,
    total_cost,
    sold,
    profit,
    seller_id,
    lc_amount,
    bank_transfer_amount,
  } = req.body;

  const query = `INSERT INTO vehicles (
    chassis_no, vehicle_type, year, colour, mileage, etd, eta, vessel_name, grade, options, consignee,
    cif_value_jpy, cif_value_lkr, duty, bank_charges, import_charges, clearing, transport, other, repair,
    total_cost, sold, profit, seller_id, lc_amount, bank_transfer_amount
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(
    query,
    [
      chassis_no,
      vehicle_type,
      year,
      colour,
      mileage,
      etd,
      eta,
      vessel_name,
      grade,
      options,
      consignee,
      cif_value_jpy,
      cif_value_lkr,
      duty,
      bank_charges,
      import_charges,
      clearing,
      transport,
      other,
      repair,
      total_cost,
      sold,
      profit,
      seller_id,
      lc_amount,
      bank_transfer_amount
    ],
    function (err) {
      if (err) {
        console.error('Error creating vehicle record:', err.message);
        res.status(500).send('Error creating vehicle record');
      } else {
        res.status(201).send({ id: this.lastID });
      }
    }
  );
});

// Get all vehicles
app.get('/vehicles', (req, res) => {
  const query = 'SELECT id, chassis_no, vehicle_type, year, colour, mileage, etd, eta, vessel_name, grade, options, consignee, cif_value_jpy, cif_value_lkr, duty, bank_charges, import_charges, clearing, transport, other, repair, total_cost, sold, sale_price, profit, seller_id, lc_amount, bank_transfer_amount, vehicle_status FROM vehicles';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching vehicle records:', err.message);
      res.status(500).send('Error fetching vehicle records');
    } else {
      res.status(200).send(rows);
    }
  });
});

// Get a specific vehicle by ID
app.get('/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT id, chassis_no, vehicle_type, year, colour, mileage, etd, eta, vessel_name, grade, options, consignee, cif_value_jpy, cif_value_lkr, duty, bank_charges, import_charges, clearing, transport, other, repair, total_cost, sold, sale_price, profit, seller_id, lc_amount, bank_transfer_amount FROM vehicles WHERE id = ?';
  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Vehicle not found' });
    } else {
      res.json(row);
    }
  });
});

// Update a vehicle by ID
app.put('/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const {
    chassis_no,
    vehicle_type,
    year,
    colour,
    mileage,
    etd,
    eta,
    vessel_name,
    grade,
    options,
    consignee,
    cif_value_jpy,
    cif_value_lkr,
    duty,
    bank_charges,
    import_charges,
    clearing,
    transport,
    other,
    repair,
    total_cost,
    sold,
    profit,
    seller_id,
    lc_amount,
    bank_transfer_amount,
    vehicle_status,
  } = req.body;

  const query = `UPDATE vehicles SET 
    chassis_no = ?, vehicle_type = ?, year = ?, colour = ?, mileage = ?, 
    etd = ?, eta = ?, vessel_name = ?, grade = ?, options = ?, consignee = ?,
    cif_value_jpy = ?, cif_value_lkr = ?, duty = ?, bank_charges = ?, 
    import_charges = ?, clearing = ?, transport = ?, other = ?, repair = ?,
    total_cost = ?, sold = ?, profit = ?, seller_id = ?, lc_amount = ?, bank_transfer_amount = ?, vehicle_status = ?
    WHERE id = ?`;

  db.run(
    query,
    [
      chassis_no,
      vehicle_type,
      year,
      colour,
      mileage,
      etd,
      eta,
      vessel_name,
      grade,
      options,
      consignee,
      cif_value_jpy,
      cif_value_lkr,
      duty,
      bank_charges,
      import_charges,
      clearing,
      transport,
      other,
      repair,
      total_cost,
      sold,
      profit,
      seller_id,
      lc_amount,
      bank_transfer_amount,
      vehicle_status,
      id
    ],
    function (err) {
      if (err) {
        console.error('Error updating vehicle record:', err.message);
        res.status(500).send('Error updating vehicle record');
      } else if (this.changes === 0) {
        res.status(404).send('Vehicle not found');
      } else {
        res.status(200).send('Vehicle updated successfully');
      }
    }
  );
});

// Delete a vehicle by ID
app.delete('/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM vehicles WHERE id = ?';
  db.run(query, [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// Sellers API routes

// Add a new seller
app.post('/sellers', (req, res) => {
  const { name, contact_info, outstanding_balance } = req.body;
  const query = 'INSERT INTO sellers (name, contact_info, outstanding_balance) VALUES (?, ?, ?)';
  db.run(query, [name, contact_info, outstanding_balance || 0], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

// Update the seller list API to include outstanding amount
app.get('/sellers', (req, res) => {
  const query = 'SELECT id, name, contact_info, outstanding_balance FROM sellers';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get a seller by ID (with vehicles supplied)
app.get('/sellers/:id', (req, res) => {
  const { id } = req.params;
  const sellerQuery = 'SELECT * FROM sellers WHERE id = ?';
  const vehiclesQuery = `
    SELECT v.* FROM vehicles v
    JOIN vehicles_sellers vs ON v.id = vs.vehicle_id
    WHERE vs.seller_id = ?
  `;

  db.get(sellerQuery, [id], (err, seller) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!seller) {
      res.status(404).json({ error: 'Seller not found' });
    } else {
      db.all(vehiclesQuery, [id], (err, vehicles) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({ ...seller, vehicles });
        }
      });
    }
  });
});

// Update seller details
app.put('/sellers/:id', (req, res) => {
  const { id } = req.params;
  const { name, contact_info, outstanding_balance } = req.body;
  const query = 'UPDATE sellers SET name = ?, contact_info = ?, outstanding_balance = ? WHERE id = ?';
  db.run(query, [name, contact_info, outstanding_balance, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Seller not found' });
    } else {
      res.json({ updated: this.changes });
    }
  });
});

// Delete a seller
app.delete('/sellers/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM sellers WHERE id = ?';
  db.run(query, [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Seller not found' });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// LC API routes

// Create a new LC record
app.post('/lc', (req, res) => {
  const { vehicleId, lcAmount, bankTransferAmount } = req.body;
  const query = `INSERT INTO LC (vehicleId, lcAmount, bankTransferAmount) VALUES (?, ?, ?)`;

  db.run(query, [vehicleId, lcAmount, bankTransferAmount], function (err) {
    if (err) {
      console.error('Error creating LC record:', err.message);
      res.status(500).send('Error creating LC record');
    } else {
      res.status(201).send({ id: this.lastID });
    }
  });
});

// Get all LC records
app.get('/lc', (req, res) => {
  const query = `SELECT * FROM LC`;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get an LC record by ID
app.get('/lc/:id', (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM LC WHERE id = ?`;

  db.get(query, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'LC record not found' });
    } else {
      res.json(row);
    }
  });
});

// Update an LC record by ID
app.put('/lc/:id', (req, res) => {
  const { id } = req.params;
  const { vehicleId, lcAmount, bankTransferAmount } = req.body;
  const query = `UPDATE LC SET vehicleId = ?, lcAmount = ?, bankTransferAmount = ? WHERE id = ?`;

  db.run(query, [vehicleId, lcAmount, bankTransferAmount, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'LC record not found' });
    } else {
      res.json({ updated: this.changes });
    }
  });
});

// Delete an LC record by ID
app.delete('/lc/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM LC WHERE id = ?`;

  db.run(query, [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'LC record not found' });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// LC Payment API routes

// Create a new LC payment record
app.post('/lc-records', (req, res) => {
  const { vehicle_id, seller_id, amount, date, transfer_mode } = req.body;
  const query = `INSERT INTO LCRecords (vehicle_id, seller_id, amount, date, transfer_mode) VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [vehicle_id, seller_id, amount, date, transfer_mode], function (err) {
    if (err) {
      console.error('Error creating LC payment record:', err.message);
      res.status(500).send('Error creating LC payment record');
    } else {
      res.status(201).send({ id: this.lastID });
    }
  });
});

// Get all LC payment records for a vehicle
app.get('/lc-records/:vehicle_id', (req, res) => {
  const { vehicle_id } = req.params;
  const query = `SELECT * FROM LCRecords WHERE vehicle_id = ?`;

  db.all(query, [vehicle_id], (err, rows) => {
    if (err) {
      console.error('Error fetching bank transfer records:', err.message);
      res.status(500).send('Error fetching bank transfer records');
    } else {
      res.status(200).send(rows);
    }
  });
});

// Get all LC payment records for a seller
app.get('/seller-lc-records/:seller_id', (req, res) => {
  const { seller_id } = req.params;
  const query = `
    SELECT lr.*, v.chassis_no, v.vehicle_type, v.year, v.colour, v.mileage, v.etd, v.eta, v.vessel_name, v.grade, v.options, v.consignee
    FROM LCRecords lr
    JOIN vehicles v ON lr.vehicle_id = v.id
    WHERE lr.seller_id = ?
  `;

  db.all(query, [seller_id], (err, rows) => {
    if (err) {
      console.error('Error fetching LC records for seller:', err.message);
      res.status(500).send('Error fetching LC records for seller');
    } else {
      res.status(200).send(rows);
    }
  });
});

// Bank Transfer API routes

// Create a new bank transfer record
app.post('/bank-transfers', (req, res) => {
  const { vehicle_id, seller_id, amount, date, transfer_mode } = req.body;
  const query = `INSERT INTO BankTransfers (vehicle_id, seller_id, amount, date, transfer_mode) VALUES (?, ?, ?, ?, ?)`;

  db.run(query, [vehicle_id, seller_id, amount, date, transfer_mode], function (err) {
    if (err) {
      console.error('Error creating bank transfer record:', err.message);
      res.status(500).send('Error creating bank transfer record');
    } else {
      res.status(201).send({ id: this.lastID });
    }
  });
});

// Get all bank transfer records for a vehicle
app.get('/bank-transfers/:vehicle_id', (req, res) => {
  const { vehicle_id } = req.params;
  const query = `SELECT * FROM BankTransfers WHERE vehicle_id = ?`;

  db.all(query, [vehicle_id], (err, rows) => {
    if (err) {
      console.error('Error fetching bank transfer records:', err.message);
      res.status(500).send('Error fetching bank transfer records');
    } else {
      res.status(200).send(rows);
    }
  });
});

// Calculate remaining bank transfer amount for a vehicle
app.get('/bank-transfers/remaining/:vehicle_id', (req, res) => {
  const { vehicle_id } = req.params;
  const query = `SELECT bank_transfer_amount - COALESCE(SUM(amount), 0) AS remaining FROM vehicles LEFT JOIN BankTransfers ON vehicles.id = BankTransfers.vehicle_id WHERE vehicles.id = ?`;

  db.get(query, [vehicle_id], (err, row) => {
    if (err) {
      console.error('Error calculating remaining bank transfer amount:', err.message);
      res.status(500).send('Error calculating remaining bank transfer amount');
    } else {
      res.status(200).send(row);
    }
  });
});

// Calculate remaining LC amount for a vehicle
app.get('/lc-records/remaining/:vehicle_id', (req, res) => {
  const { vehicle_id } = req.params;
  const query = `SELECT lc_amount - COALESCE(SUM(amount), 0) AS remaining FROM vehicles LEFT JOIN LCRecords ON vehicles.id = LCRecords.vehicle_id WHERE vehicles.id = ?`;

  db.get(query, [vehicle_id], (err, row) => {
    if (err) {
      console.error('Error calculating remaining LC amount:', err.message);
      res.status(500).send('Error calculating remaining LC amount');
    } else {
      res.status(200).send(row);
    }
  });
});

// Test route with simple response
app.get('/test', (req, res) => {
  console.log('GET /test - Test response');
  res.json([{test: true}]);
});

// Simple seller route
app.get('/sellers/outstanding', (req, res) => {
  console.log('GET /sellers/outstanding - started');
  db.all('SELECT * FROM sellers', [], function(err, rows) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log('Query result:', rows);
    return res.json(rows);
  });
});

// Sellers outstanding route
app.get('/sellers/outstanding', (req, res) => {
  console.log('GET /sellers/outstanding');
  
  // First get all sellers
  db.all('SELECT id, name, contact_info, outstanding_balance FROM sellers', [], (err, sellers) => {
    if (err) {
      console.error('Error fetching sellers:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    // Use a counter to track when all processing is complete
    let processedCount = 0;
    const results = [];
    
    // If no sellers, return empty array
    if (sellers.length === 0) {
      return res.json([]);
    }
    
    // Process each seller
    sellers.forEach(seller => {
      const sellerId = seller.id;
      const sellerData = {
        id: sellerId,
        name: seller.name,
        contact_info: seller.contact_info,
        outstanding_balance: seller.outstanding_balance,
        total_lc: 0,
        total_bt: 0,
        paid_lc: 0,
        paid_bt: 0,
        outstanding_lc: 0,
        outstanding_bank_transfer: 0
      };
      
      // Step 1: Calculate total LC and BT from vehicles
      db.all('SELECT lc_amount, bank_transfer_amount FROM vehicles WHERE seller_id = ?', [sellerId], (err, vehicles) => {
        if (err) {
          console.error(`Error fetching vehicles for seller ${sellerId}:`, err);
        } else if (vehicles && vehicles.length > 0) {
          vehicles.forEach(vehicle => {
            sellerData.total_lc += Number(vehicle.lc_amount || 0);
            sellerData.total_bt += Number(vehicle.bank_transfer_amount || 0);
          });
        }
        
        // Step 2: Calculate LC payments
        db.all('SELECT amount FROM LCRecords WHERE seller_id = ?', [sellerId], (err, lcPayments) => {
          if (err) {
            console.error(`Error fetching LC payments for seller ${sellerId}:`, err);
          } else if (lcPayments && lcPayments.length > 0) {
            lcPayments.forEach(payment => {
              sellerData.paid_lc += Number(payment.amount || 0);
            });
          }
          
          // Step 3: Calculate BT payments
          db.all('SELECT amount FROM BankTransfers WHERE seller_id = ?', [sellerId], (err, btPayments) => {
            if (err) {
              console.error(`Error fetching BT payments for seller ${sellerId}:`, err);
            } else if (btPayments && btPayments.length > 0) {
              btPayments.forEach(payment => {
                sellerData.paid_bt += Number(payment.amount || 0);
              });
            }
            
            // Calculate outstanding amounts
            sellerData.outstanding_lc = sellerData.total_lc - sellerData.paid_lc;
            sellerData.outstanding_bank_transfer = sellerData.total_bt - sellerData.paid_bt;
            
            // Log for debugging seller ID 8
            if (sellerId === 8) {
              console.log('Seller 8 calculations:');
              console.log('- Total LC:', sellerData.total_lc);
              console.log('- Paid LC:', sellerData.paid_lc);
              console.log('- Outstanding LC:', sellerData.outstanding_lc);
              console.log('- Total BT:', sellerData.total_bt);
              console.log('- Paid BT:', sellerData.paid_bt);
              console.log('- Outstanding BT:', sellerData.outstanding_bank_transfer);
            }
            
            // Add to results array
            results.push(sellerData);
            
            // Check if all sellers are processed
            processedCount++;
            if (processedCount === sellers.length) {
              res.json(results);
            }
          });
        });
      });
    });
  });
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    if (!rows || rows.length === 0) {
      res.status(404).json({ error: "No sellers found" });
      return;
    }
    console.log('Found sellers:', rows.length);
    res.json(rows);
  });
});

// Get vehicles for a seller with payment details
app.get('/sellers/:id/vehicles', (req, res) => {
  const sellerId = req.params.id;
  
  const query = `
    SELECT 
      v.*,
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM LCRecords
        WHERE vehicle_id = v.id
      ) as lc_paid_amount,
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM BankTransfers
        WHERE vehicle_id = v.id
      ) as bank_transfer_paid_amount
    FROM vehicles v
    WHERE v.seller_id = ?
    ORDER BY v.id DESC
  `;
  
  db.all(query, [sellerId], (err, vehicles) => {
    if (err) {
      console.error('Error fetching vehicles:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    // Calculate payment status for each vehicle
    const vehiclesWithStatus = vehicles.map(vehicle => ({
      ...vehicle,
      lc_status: vehicle.lc_paid_amount >= vehicle.lc_amount ? 'paid' :
                 vehicle.lc_paid_amount > 0 ? 'partial' : 'pending',
      bank_transfer_status: vehicle.bank_transfer_paid_amount >= vehicle.bank_transfer_amount ? 'paid' :
                           vehicle.bank_transfer_paid_amount > 0 ? 'partial' : 'pending'
    }));

    res.json(vehiclesWithStatus);
  });
});

// Vehicle summary API route
app.get('/api/vehicle-summary', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN vehicle_status = 'Purchased' THEN 1 ELSE 0 END) AS purchased,
      SUM(CASE WHEN vehicle_status = 'Shipped' THEN 1 ELSE 0 END) AS shipped,
      SUM(CASE WHEN vehicle_status = 'Landed' THEN 1 ELSE 0 END) AS landed,
      SUM(CASE WHEN vehicle_status = 'Delivered' THEN 1 ELSE 0 END) AS delivered,
      SUM(CASE WHEN vehicle_status = 'Sold' THEN 1 ELSE 0 END) AS sold
    FROM vehicles;
  `;

  db.get(query, (err, row) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch vehicle summary' });
    } else {
      res.json(row);
    }
  });
});

// Debug endpoint for seller 8
app.get('/debug/seller/8', (req, res) => {
  console.log('Debug endpoint for seller 8');
  
  const debugData = {};
  
  // Get vehicles data
  db.all('SELECT id, chassis_no, lc_amount, bank_transfer_amount FROM vehicles WHERE seller_id = 8', [], (err, vehicles) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    debugData.vehicles = vehicles;
    
    // Calculate total LC and BT amounts
    let totalLc = 0;
    let totalBt = 0;
    vehicles.forEach(v => {
      totalLc += Number(v.lc_amount || 0);
      totalBt += Number(v.bank_transfer_amount || 0);
    });
    
    debugData.total_lc = totalLc;
    debugData.total_bt = totalBt;
    
    // Get LC payments
    db.all('SELECT id, vehicle_id, amount FROM LCRecords WHERE seller_id = 8', [], (err, lcPayments) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      debugData.lc_payments = lcPayments;
      
      // Calculate total LC payments
      let paidLc = 0;
      lcPayments.forEach(p => {
        paidLc += Number(p.amount || 0);
      });
      
      debugData.paid_lc = paidLc;
      debugData.outstanding_lc = totalLc - paidLc;
      
      // Get bank transfer payments
      db.all('SELECT id, vehicle_id, amount FROM BankTransfers WHERE seller_id = 8', [], (err, btPayments) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        debugData.bt_payments = btPayments;
        
        // Calculate total bank transfer payments
        let paidBt = 0;
        btPayments.forEach(p => {
          paidBt += Number(p.amount || 0);
        });
        
        debugData.paid_bt = paidBt;
        debugData.outstanding_bt = totalBt - paidBt;
        
        // Send the complete debug data
        res.json({
          seller_id: 8,
          raw_data: debugData,
          summary: {
            total_lc: totalLc,
            paid_lc: paidLc,
            outstanding_lc: totalLc - paidLc,
            total_bt: totalBt,
            paid_bt: paidBt,
            outstanding_bt: totalBt - paidBt
          }
        });
      });
    });
  });
});

// Hardcoded sellers data endpoint
// New reliable implementation for seller outstanding calculation
app.get('/api/sellers-reliable', (req, res) => {
  // First get all sellers
  db.all('SELECT id, name, contact_info, outstanding_balance FROM sellers', [], (err, sellers) => {
    if (err) {
      console.error('Error fetching sellers:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    // Process one seller at a time to avoid asynchronous issues
    const processNextSeller = (index, results) => {
      // If we've processed all sellers, return the results
      if (index >= sellers.length) {
        return res.json(results);
      }
      
      const seller = sellers[index];
      const sellerId = seller.id;
      
      // Use direct SQL aggregation in one query for better reliability
      const vehicleTotalsQuery = `
        SELECT 
          COALESCE(SUM(lc_amount), 0) as total_lc,
          COALESCE(SUM(bank_transfer_amount), 0) as total_bt
        FROM vehicles
        WHERE seller_id = ?
      `;
      
      db.get(vehicleTotalsQuery, [sellerId], (err, vehicleTotals) => {
        if (err) {
          console.error(`Error calculating vehicle totals for seller ${sellerId}:`, err);
          // Continue with next seller even if there's an error
          processNextSeller(index + 1, [...results, {
            ...seller,
            total_lc: 0,
            total_bt: 0,
            paid_lc: 0,
            paid_bt: 0,
            outstanding_lc: 0,
            outstanding_bank_transfer: 0
          }]);
          return;
        }
        
        // Get LC payment totals
        const lcPaymentsQuery = `
          SELECT COALESCE(SUM(amount), 0) as paid_lc
          FROM LCRecords
          WHERE seller_id = ?
        `;
        
        db.get(lcPaymentsQuery, [sellerId], (err, lcPayments) => {
          if (err) {
            console.error(`Error calculating LC payments for seller ${sellerId}:`, err);
            lcPayments = { paid_lc: 0 };
          }
          
          // Get Bank Transfer payment totals
          const btPaymentsQuery = `
            SELECT COALESCE(SUM(amount), 0) as paid_bt
            FROM BankTransfers
            WHERE seller_id = ?
          `;
          
          db.get(btPaymentsQuery, [sellerId], (err, btPayments) => {
            if (err) {
              console.error(`Error calculating BT payments for seller ${sellerId}:`, err);
              btPayments = { paid_bt: 0 };
            }
            
            // Ensure we get proper numbers for calculation
            const totalLc = Number(vehicleTotals.total_lc || 0);
            const totalBt = Number(vehicleTotals.total_bt || 0);
            const paidLc = Number(lcPayments.paid_lc || 0);
            const paidBt = Number(btPayments.paid_bt || 0);
            
            // Calculate outstanding amounts
            const outstandingLc = Math.round((totalLc - paidLc) * 100) / 100; // Round to 2 decimal places
            const outstandingBt = Math.round((totalBt - paidBt) * 100) / 100;
            
            // Add this seller's data to results
            const sellerData = {
              ...seller,
              total_lc: totalLc,
              total_bt: totalBt,
              paid_lc: paidLc,
              paid_bt: paidBt,
              outstanding_lc: outstandingLc,
              outstanding_bank_transfer: outstandingBt
            };
            
            // Log for debugging
            console.log(`Seller ${sellerId} calculation:`, {
              totalLc,
              totalBt,
              paidLc,
              paidBt,
              outstandingLc,
              outstandingBt
            });
            
            // Process next seller
            processNextSeller(index + 1, [...results, sellerData]);
          });
        });
      });
    };
    
    // Start processing with the first seller
    processNextSeller(0, []);
  });
});

// ----------------------
// Investment Tracking API
// ----------------------

// Initialize the investment tables
function initializeInvestmentTables() {
  console.log('Initializing investment tables...');
  const investmentSchemaFile = path.join(__dirname, 'investment_schema.sql');
  
  try {
    const schemaSQL = fs.readFileSync(investmentSchemaFile, 'utf8');
    db.exec(schemaSQL, (err) => {
      if (err) {
        console.error('Error initializing investment tables:', err.message);
      } else {
        console.log('Investment tables initialized successfully');
      }
    });
  } catch (err) {
    console.error('Error reading investment schema file:', err.message);
  }
}

// Initialize profit distribution tables
function initializeProfitDistributionTables() {
  console.log('Initializing profit distribution tables...');
  const profitSchemaFile = path.join(__dirname, 'profit_distribution_schema.sql');
  
  try {
    const schemaSQL = fs.readFileSync(profitSchemaFile, 'utf8');
    db.exec(schemaSQL, (err) => {
      if (err) {
        console.error('Error initializing profit distribution tables:', err.message);
      } else {
        console.log('Profit distribution tables initialized successfully');
      }
    });
  } catch (err) {
    console.error('Error reading profit distribution schema file:', err.message);
  }
}

// Call the function to initialize the investment tables
initializeInvestmentTables();

// Call the function to initialize the profit distribution tables
initializeProfitDistributionTables();

// --- Investor API Endpoints ---

// Get all investors
app.get('/api/investors', (req, res) => {
  const query = 'SELECT * FROM investors ORDER BY name';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching investors:', err.message);
      return res.status(500).json({ error: 'Failed to fetch investors' });
    }
    
    res.json(rows);
  });
});

// Get a specific investor
app.get('/api/investors/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM investors WHERE id = ?';
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Error fetching investor:', err.message);
      return res.status(500).json({ error: 'Failed to fetch investor' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Investor not found' });
    }
    
    res.json(row);
  });
});

// Create a new investor
app.post('/api/investors', (req, res) => {
  const { name, contact_info, email, notes } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Investor name is required' });
  }
  
  const query = `
    INSERT INTO investors (name, contact_info, email, notes)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(query, [name, contact_info, email, notes], function(err) {
    if (err) {
      console.error('Error creating investor:', err.message);
      return res.status(500).json({ error: 'Failed to create investor' });
    }
    
    res.status(201).json({
      id: this.lastID,
      name,
      contact_info,
      email,
      notes
    });
  });
});

// Update an investor
app.put('/api/investors/:id', (req, res) => {
  const { id } = req.params;
  const { name, contact_info, email, notes } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Investor name is required' });
  }
  
  const query = `
    UPDATE investors
    SET name = ?, contact_info = ?, email = ?, notes = ?
    WHERE id = ?
  `;
  
  db.run(query, [name, contact_info, email, notes, id], function(err) {
    if (err) {
      console.error('Error updating investor:', err.message);
      return res.status(500).json({ error: 'Failed to update investor' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Investor not found' });
    }
    
    res.json({
      id: parseInt(id),
      name,
      contact_info,
      email,
      notes
    });
  });
});

// Delete an investor
app.delete('/api/investors/:id', (req, res) => {
  const { id } = req.params;
  
  // First check if the investor has any investments
  db.get('SELECT COUNT(*) as count FROM vehicle_investments WHERE investor_id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error checking investor investments:', err.message);
      return res.status(500).json({ error: 'Failed to check investor investments' });
    }
    
    if (result.count > 0) {
      // Investor has investments, delete them first
      db.run('DELETE FROM vehicle_investments WHERE investor_id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting investor investments:', err.message);
          return res.status(500).json({ error: 'Failed to delete investor investments' });
        }
        
        // Now delete the investor
        deleteInvestor();
      });
    } else {
      // No investments, directly delete the investor
      deleteInvestor();
    }
  });
  
  function deleteInvestor() {
    db.run('DELETE FROM investors WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting investor:', err.message);
        return res.status(500).json({ error: 'Failed to delete investor' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Investor not found' });
      }
      
      res.status(200).json({ message: 'Investor deleted successfully' });
    });
  }
});

// --- Vehicle Investment API Endpoints ---

// Get all investments
app.get('/api/investments', (req, res) => {
  const query = `
    SELECT vi.*, i.name as investor_name, v.chassis_no 
    FROM vehicle_investments vi
    JOIN investors i ON vi.investor_id = i.id
    JOIN vehicles v ON vi.vehicle_id = v.id
    ORDER BY vi.investment_date DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching investments:', err.message);
      return res.status(500).json({ error: 'Failed to fetch investments' });
    }
    
    res.json(rows);
  });
});

// Get investments for a specific vehicle
app.get('/api/investments/vehicle/:vehicleId', (req, res) => {
  const { vehicleId } = req.params;
  const query = `
    SELECT vi.*, i.name as investor_name
    FROM vehicle_investments vi
    JOIN investors i ON vi.investor_id = i.id
    WHERE vi.vehicle_id = ?
    ORDER BY vi.investment_date DESC
  `;
  
  db.all(query, [vehicleId], (err, rows) => {
    if (err) {
      console.error('Error fetching vehicle investments:', err.message);
      return res.status(500).json({ error: 'Failed to fetch vehicle investments' });
    }
    
    res.json(rows);
  });
});

// Get investments for a specific investor
app.get('/api/investments/investor/:investorId', (req, res) => {
  const { investorId } = req.params;
  const query = `
    SELECT vi.*, v.chassis_no, v.vehicle_type, v.year
    FROM vehicle_investments vi
    JOIN vehicles v ON vi.vehicle_id = v.id
    WHERE vi.investor_id = ?
    ORDER BY vi.investment_date DESC
  `;
  
  db.all(query, [investorId], (err, rows) => {
    if (err) {
      console.error('Error fetching investor investments:', err.message);
      return res.status(500).json({ error: 'Failed to fetch investor investments' });
    }
    
    res.json(rows);
  });
});

// Create a new investment
app.post('/api/investments', (req, res) => {
  const { vehicle_id, investor_id, amount, investment_date, notes } = req.body;
  
  if (!vehicle_id || !investor_id || !amount) {
    return res.status(400).json({ error: 'Vehicle ID, investor ID, and amount are required' });
  }
  
  const query = `
    INSERT INTO vehicle_investments (vehicle_id, investor_id, amount, investment_date, notes)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  db.run(query, [vehicle_id, investor_id, amount, investment_date, notes], function(err) {
    if (err) {
      console.error('Error creating investment:', err.message);
      return res.status(500).json({ error: 'Failed to create investment' });
    }
    
    res.status(201).json({
      id: this.lastID,
      vehicle_id,
      investor_id,
      amount,
      investment_date,
      notes
    });
  });
});

// Update an investment
app.put('/api/investments/:id', (req, res) => {
  const { id } = req.params;
  const { amount, investment_date, notes } = req.body;
  
  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }
  
  const query = `
    UPDATE vehicle_investments
    SET amount = ?, investment_date = ?, notes = ?
    WHERE id = ?
  `;
  
  db.run(query, [amount, investment_date, notes, id], function(err) {
    if (err) {
      console.error('Error updating investment:', err.message);
      return res.status(500).json({ error: 'Failed to update investment' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    res.json({
      id: parseInt(id),
      amount,
      investment_date,
      notes
    });
  });
});

// Delete an investment
app.delete('/api/investments/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM vehicle_investments WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting investment:', err.message);
      return res.status(500).json({ error: 'Failed to delete investment' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Investment not found' });
    }
    
    res.status(200).json({ message: 'Investment deleted successfully' });
  });
});

// --- Investment Summary API Endpoints ---

// Get investment summary for a specific investor
app.get('/api/investments/summary/investor/:investorId', (req, res) => {
  const { investorId } = req.params;
  const query = `
    SELECT 
      investor_id,
      SUM(amount) as total_amount,
      COUNT(DISTINCT vehicle_id) as total_vehicles
    FROM vehicle_investments
    WHERE investor_id = ?
    GROUP BY investor_id
  `;
  
  db.get(query, [investorId], (err, row) => {
    if (err) {
      console.error('Error fetching investor investment summary:', err.message);
      return res.status(500).json({ error: 'Failed to fetch investor investment summary' });
    }
    
    if (!row) {
      return res.json({
        investor_id: parseInt(investorId),
        total_amount: 0,
        total_vehicles: 0
      });
    }
    
    res.json(row);
  });
});

// Get investment summary for all vehicles and investors
app.get('/api/investments/summary', (req, res) => {
  // Get total investment amount
  db.get('SELECT SUM(amount) as total_investment FROM vehicle_investments', [], (err, totalRow) => {
    if (err) {
      console.error('Error fetching total investment:', err.message);
      return res.status(500).json({ error: 'Failed to fetch investment summary' });
    }
    
    // Get count of vehicles with investments
    db.get('SELECT COUNT(DISTINCT vehicle_id) as vehicles_with_investments FROM vehicle_investments', [], (err, vehiclesRow) => {
      if (err) {
        console.error('Error fetching vehicles count:', err.message);
        return res.status(500).json({ error: 'Failed to fetch investment summary' });
      }
      
      // Get per-vehicle summary
      db.all(`
        SELECT 
          v.id,
          v.chassis_no,
          v.vehicle_type,
          v.year,
          SUM(vi.amount) as total_investment,
          COUNT(DISTINCT vi.investor_id) as investor_count,
          CASE WHEN COUNT(vi.id) > 0 THEN 1 ELSE 0 END as has_investments
        FROM vehicles v
        LEFT JOIN vehicle_investments vi ON v.id = vi.vehicle_id
        GROUP BY v.id
      `, [], (err, vehicleDetails) => {
        if (err) {
          console.error('Error fetching vehicle details:', err.message);
          return res.status(500).json({ error: 'Failed to fetch investment summary' });
        }
        
        // Format the response
        const vehiclesMap = {};
        vehicleDetails.forEach(vehicle => {
          vehiclesMap[vehicle.id] = {
            chassis_no: vehicle.chassis_no,
            vehicle_type: vehicle.vehicle_type,
            year: vehicle.year,
            total_investment: vehicle.total_investment || 0,
            investor_count: vehicle.investor_count || 0,
            has_investments: vehicle.has_investments === 1
          };
        });
        
        res.json({
          total_investment: totalRow.total_investment || 0,
          vehicles_with_investments: vehiclesRow.vehicles_with_investments || 0,
          vehicles: vehiclesMap
        });
      });
    });
  });
});

// ----------------------
// Profit Distribution API
// ----------------------

// Calculate and distribute profit when a vehicle is sold
app.post('/api/profit-distribution/calculate/:vehicleId', (req, res) => {
  const vehicleId = req.params.vehicleId;
  console.log(`Profit distribution calculation requested for vehicle ID: ${vehicleId}`);
  
  // First check if there are any investments for this vehicle
  db.get('SELECT COUNT(*) as count FROM vehicle_investments WHERE vehicle_id = ?', [vehicleId], (err, investmentCount) => {
    if (err) {
      console.error('Error checking investments:', err.message);
      return res.status(500).json({ error: 'Failed to check investments' });
    }
    
    console.log('Investment count:', investmentCount);
    
    if (!investmentCount || investmentCount.count === 0) {
      return res.status(400).json({ error: 'No investments found for this vehicle. Add investments before distributing profit.' });
    }
    
    // Then, get vehicle details to check if it's sold and has profit
    db.get('SELECT id, profit, sold, vehicle_status FROM vehicles WHERE id = ?', [vehicleId], (err, vehicle) => {
      console.log('Vehicle data:', vehicle);
    if (err) {
      console.error('Error fetching vehicle:', err.message);
      return res.status(500).json({ error: 'Failed to fetch vehicle details' });
    }
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Check if either the 'sold' field is 'Yes' or the vehicle_status is 'Sold'
    if (vehicle.sold !== 'Yes' && vehicle.vehicle_status !== 'Sold') {
      return res.status(400).json({ error: 'Vehicle is not marked as sold' });
    }
    
    if (!vehicle.profit || parseFloat(vehicle.profit) <= 0) {
      return res.status(400).json({ error: 'Vehicle does not have any profit to distribute' });
    }
    
    const profit = parseFloat(vehicle.profit);
    
    // Check if profit has already been distributed for this vehicle
    db.get('SELECT COUNT(*) as count FROM profit_distribution WHERE vehicle_id = ?', [vehicleId], (err, result) => {
      if (err) {
        console.error('Error checking existing profit distributions:', err.message);
        return res.status(500).json({ error: 'Failed to check existing profit distributions' });
      }
      
      if (result.count > 0) {
        return res.status(400).json({ error: 'Profit has already been distributed for this vehicle' });
      }
      
      // Get all investments for this vehicle to calculate percentages
      db.all('SELECT * FROM vehicle_investments WHERE vehicle_id = ?', [vehicleId], (err, investments) => {
        if (err) {
          console.error('Error fetching investments:', err.message);
          return res.status(500).json({ error: 'Failed to fetch investments' });
        }
        
        if (investments.length === 0) {
          return res.status(400).json({ error: 'No investments found for this vehicle' });
        }
        
        // Calculate total investment amount
        const totalInvestment = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        
        if (totalInvestment <= 0) {
          return res.status(400).json({ error: 'Invalid total investment amount' });
        }
        
        // Calculate distribution for each investor
        const distributions = investments.map(inv => {
          const percentage = (parseFloat(inv.amount) / totalInvestment) * 100;
          const amount = (percentage / 100) * profit;
          
          return {
            vehicle_id: vehicleId,
            investor_id: inv.investor_id,
            amount: amount,
            percentage: percentage,
            distribution_date: new Date().toISOString().split('T')[0],
            notes: `Profit distribution for vehicle ${vehicleId}`
          };
        });
        
        // Calculate total profit distributed
        const totalProfitDistributed = distributions.reduce((sum, dist) => sum + dist.amount, 0);
        
        // Begin transaction to insert all distributions
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          const stmt = db.prepare(`
            INSERT INTO profit_distribution 
            (vehicle_id, investor_id, amount, percentage, distribution_date, notes) 
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          let hasError = false;
          // Log distribution data for debugging
          console.log('Distributions to create:', distributions);
        
          distributions.forEach(dist => {
            stmt.run([
              dist.vehicle_id,
              dist.investor_id,
              dist.amount,
              dist.percentage,
              dist.distribution_date,
              dist.notes
            ], function(err) {
              if (err) {
                console.error('Error inserting profit distribution:', err.message);
                hasError = true;
              } else {
                console.log(`Created profit distribution for investor ${dist.investor_id}, amount: ${dist.amount}`);
              }
            });
          });
          
          stmt.finalize();
          
          if (hasError) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create profit distributions' });
          }
          
          db.run('COMMIT', function(err) {
            if (err) {
              console.error('Error committing transaction:', err.message);
              return res.status(500).json({ error: 'Failed to commit profit distributions' });
            }
            
            res.json({
              success: true,
              message: 'Profit distributions created successfully',
              distributionsCount: distributions.length,
              totalDistributed: totalProfitDistributed
            });
          });
        });
      });
    });
  });
});

// Get all profit distributions with vehicle and investor details
app.get('/api/profit-distributions', (req, res) => {
  db.all(`
    SELECT pd.*, v.chassis_no, i.name as investor_name
    FROM profit_distribution pd
    JOIN vehicles v ON pd.vehicle_id = v.id
    JOIN investors i ON pd.investor_id = i.id
  `, [], (err, distributions) => {
    if (err) {
      console.error('Error fetching profit distributions:', err.message);
      return res.status(500).json({ error: 'Failed to fetch profit distributions' });
    }
    
    res.json(distributions);
  });
});

// Get profit distributions for a specific vehicle
app.get('/api/profit-distribution/vehicle/:vehicleId', (req, res) => {
  const vehicleId = req.params.vehicleId;
  
  db.all(`
    SELECT pd.*, i.name as investor_name
    FROM profit_distribution pd
    JOIN investors i ON pd.investor_id = i.id
    WHERE pd.vehicle_id = ?
  `, [vehicleId], (err, distributions) => {
    if (err) {
      console.error('Error fetching profit distributions for vehicle:', err.message);
      return res.status(500).json({ error: 'Failed to fetch profit distributions' });
    }
    
    res.json(distributions);
  });
});

// Get profit distributions for a specific investor
app.get('/api/profit-distribution/investor/:investorId', (req, res) => {
  const investorId = req.params.investorId;
  
  db.all(`
    SELECT pd.*, v.chassis_no, v.vehicle_type, v.year
    FROM profit_distribution pd
    JOIN vehicles v ON pd.vehicle_id = v.id
    WHERE pd.investor_id = ?
  `, [investorId], (err, distributions) => {
    if (err) {
      console.error('Error fetching profit distributions for investor:', err.message);
      return res.status(500).json({ error: 'Failed to fetch profit distributions' });
    }
    
    // Calculate total profit for this investor
    let totalProfit = 0;
    distributions.forEach(dist => {
      totalProfit += parseFloat(dist.amount);
    });
    
    res.json({
      distributions: distributions,
      total_profit: totalProfit,
      total_vehicles: distributions.length
    });
  });
});

// Get profit distribution summary for dashboard
app.get('/api/profit-distribution/summary', (req, res) => {
  db.get('SELECT SUM(amount) as total_distributed FROM profit_distribution', [], (err, total) => {
    if (err) {
      console.error('Error calculating total profit distribution:', err.message);
      return res.status(500).json({ error: 'Failed to calculate summary' });
    }
    
    db.get('SELECT COUNT(DISTINCT vehicle_id) as total_vehicles FROM profit_distribution', [], (err, vehicles) => {
      if (err) {
        console.error('Error counting vehicles with distribution:', err.message);
        return res.status(500).json({ error: 'Failed to calculate summary' });
      }
      
      db.get('SELECT COUNT(DISTINCT investor_id) as total_investors FROM profit_distribution', [], (err, investors) => {
        if (err) {
          console.error('Error counting investors with distribution:', err.message);
          return res.status(500).json({ error: 'Failed to calculate summary' });
        }
        
        res.json({
          total_distributed: total.total_distributed || 0,
          total_vehicles: vehicles.total_vehicles || 0,
          total_investors: investors.total_investors || 0
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});