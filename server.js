const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// JWT secret key (in production, use environment variable)
const JWT_SECRET = 'pavilion_auto_secret_key_2025';

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

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Basic root route handler
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  } else {
    res.json({ message: 'Pavilion Auto API Server is running', status: 'OK' });
  }
});

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
    
    // Initialize users table with default admin user
    initializeUsersTable();
    
    // Initialize buyers table
    initializeBuyersTable();
    
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

// Initialize users table and create default admin user
function initializeUsersTable() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'readonly',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
      return;
    }
    
    // Check if we need to add role column to existing table
    db.all("PRAGMA table_info(users)", [], (err, columns) => {
      if (err) {
        console.error('Error checking table structure:', err.message);
        return;
      }
      
      const hasRoleColumn = columns.some(col => col.name === 'role');
      if (!hasRoleColumn) {
        db.run('ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT "readonly"', (err) => {
          if (err) {
            console.error('Error adding role column:', err.message);
          } else {
            console.log('Role column added to users table');
            // Update existing admin user to have admin role
            db.run('UPDATE users SET role = "admin" WHERE username = "admin"', (err) => {
              if (err) {
                console.error('Error updating admin role:', err.message);
              }
            });
          }
        });
      }
    });
    
    // Check if admin user exists
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
      if (err) {
        console.error('Error checking for admin user:', err.message);
        return;
      }
      
      if (!row) {
        // Create default admin user
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hashedPassword, 'admin'], (err) => {
          if (err) {
            console.error('Error creating admin user:', err.message);
          } else {
            console.log('Default admin user created (username: admin, password: admin123, role: admin)');
          }
        });
      } else if (!row.role) {
        // Update existing admin user to have admin role
        db.run('UPDATE users SET role = ? WHERE username = ?', ['admin', 'admin'], (err) => {
          if (err) {
            console.error('Error updating admin role:', err.message);
          } else {
            console.log('Admin user role updated to admin');
          }
        });
      }
    });
    
    // Check if readonly user exists, if not create one
    db.get('SELECT * FROM users WHERE username = ?', ['readonly'], (err, row) => {
      if (err) {
        console.error('Error checking for readonly user:', err.message);
        return;
      }
      
      if (!row) {
        // Create default readonly user
        const hashedPassword = bcrypt.hashSync('readonly123', 10);
        db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['readonly', hashedPassword, 'readonly'], (err) => {
          if (err) {
            console.error('Error creating readonly user:', err.message);
          } else {
            console.log('Default readonly user created (username: readonly, password: readonly123, role: readonly)');
          }
        });
      }
    });
  });
}

// Initialize buyers table
function initializeBuyersTable() {
  const createBuyersTable = `
    CREATE TABLE IF NOT EXISTS buyers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createBuyersTable, (err) => {
    if (err) {
      console.error('Error creating buyers table:', err.message);
      return;
    }
    console.log('Buyers table initialized successfully');
  });
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// =========================
// AUTHENTICATION ROUTES
// =========================

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Find user in database
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error('Database error during login:', err.message);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      username: user.username,
      role: user.role
    });
  });
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user
  });
});

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT id, username, role, status, created_at FROM users', [], (err, users) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
    
    res.json(users);
  });
});

// Create new user (admin only)
app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role, status } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  // Insert new user
  const query = 'INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, ?)';
  db.run(query, [username, hashedPassword, role || 'read_only', status || 'active'], function(err) {
    if (err) {
      console.error('Error creating user:', err.message);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      return res.status(500).json({ message: 'Failed to create user' });
    }
    
    res.status(201).json({
      id: this.lastID,
      username,
      role: role || 'read_only',
      status: status || 'active'
    });
  });
});

// Update user (admin only)
app.put('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.id;
  const { role, status } = req.body;
  
  if (userId === '1') {
    return res.status(403).json({ message: 'Cannot modify the primary admin user' });
  }
  
  const query = 'UPDATE users SET role = ?, status = ? WHERE id = ?';
  db.run(query, [role, status, userId], function(err) {
    if (err) {
      console.error('Error updating user:', err.message);
      return res.status(500).json({ message: 'Failed to update user' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User updated successfully' });
  });
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  if (userId === '1') {
    return res.status(403).json({ message: 'Cannot delete the primary admin user' });
  }
  
  const query = 'DELETE FROM users WHERE id = ?';
  db.run(query, [userId], function(err) {
    if (err) {
      console.error('Error deleting user:', err.message);
      return res.status(500).json({ message: 'Failed to delete user' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  });
});

// Get a single user by ID (admin only)
app.get('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.get('SELECT id, username, role, status, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ message: 'Failed to fetch user' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  });
});

// Change password (users can change their own password, admins can change any password)
app.post('/api/users/:id/change-password', authenticateToken, (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;
  
  // Only allow admin to change other users' passwords without current password
  // Regular users can only change their own password and must provide current password
  if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
    return res.status(403).json({ message: 'Unauthorized to change this user\'s password' });
  }
  
  // Get the user from the database
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ message: 'Failed to fetch user' });
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If not admin, verify current password
    if (req.user.role !== 'admin') {
      if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }
    
    // Hash the new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Update the password
    const query = 'UPDATE users SET password = ? WHERE id = ?';
    db.run(query, [hashedPassword, userId], function(err) {
      if (err) {
        console.error('Error updating password:', err.message);
        return res.status(500).json({ message: 'Failed to update password' });
      }
      
      res.json({ message: 'Password updated successfully' });
    });
  });
});

// Get sellers with aggregate data
app.get('/api/sellers-with-totals', (req, res) => {
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
app.post('/api/vehicles', authenticateToken, requireAdmin, (req, res) => {
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
    chassis_no, vehicle_type, year, colour, mileage, etd, eta, vessel_name, grade, options,
    cif_value_jpy, cif_value_lkr, duty, bank_charges, import_charges, clearing, transport, other, repair,
    total_cost, sold, profit, seller_id, lc_amount, bank_transfer_amount
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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

// General vehicles endpoint
app.get('/api/vehicles', (req, res) => {
  const query = 'SELECT v.*, s.name as seller_name FROM vehicles v LEFT JOIN sellers s ON v.seller_id = s.id ORDER BY v.id DESC';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching vehicle records:', err.message);
      return res.status(500).json({ error: 'Error fetching vehicle records' });
    }
    res.status(200).json(rows);
  });
});

// Get vehicle summary with payment details
app.get('/api/vehicles/summary-with-payments', (req, res) => {
  const query = `
    SELECT v.*, s.name as seller_name
    FROM vehicles v
    LEFT JOIN sellers s ON v.seller_id = s.id
    ORDER BY v.id DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching vehicle summary with payments:', err.message);
      return res.status(500).json({ error: 'Error fetching vehicle summary with payments' });
    }
    
    // For each vehicle, get payment totals with separate queries
    const processVehicles = async () => {
      const results = await Promise.all(rows.map(vehicle => {
        return new Promise((resolve) => {
          // Get bank transfer total
          const btQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM BankTransfers WHERE vehicle_id = ?';
          db.get(btQuery, [vehicle.id], (err, btResult) => {
            if (err) {
              console.error('Error getting bank transfer total:', err);
              btResult = { total: 0 };
            }
            
            // Get LC total
            const lcQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM LCRecords WHERE vehicle_id = ?';
            db.get(lcQuery, [vehicle.id], (err, lcResult) => {
              if (err) {
                console.error('Error getting LC total:', err);
                lcResult = { total: 0 };
              }
              
              // Get invoice information for this vehicle
              const invoiceQuery = `
                SELECT i.id as invoice_id, i.status as invoice_status, 
                       i.paid_lc_amount, i.paid_bt_amount, 
                       i.total_lc_amount, i.total_bt_amount
                FROM Invoices i 
                JOIN InvoiceVehicles iv ON i.id = iv.invoice_id 
                WHERE iv.vehicle_id = ?
              `;
              db.get(invoiceQuery, [vehicle.id], (err, invoiceResult) => {
                if (err) {
                  console.error('Error getting invoice info:', err);
                  invoiceResult = null;
                }
                
                const lcAmount = Number(vehicle.lc_amount) || 0;
                const btAmount = Number(vehicle.bank_transfer_amount) || 0;
                
                // Calculate paid amounts including both direct payments and invoice payments
                let lcPaid = Number(lcResult.total) || 0;
                let btPaid = Number(btResult.total) || 0;
                
                // If we have invoice payments, add them to the totals
                if (invoiceResult) {
                  lcPaid += Number(invoiceResult.paid_lc_amount) || 0;
                  btPaid += Number(invoiceResult.paid_bt_amount) || 0;
                }
              
              let lc_completed = false;
              let bt_completed = false;
              let payment_status = 'pending';
              
              // Format numbers to 2 decimal places to avoid precision issues
              const lcAmountRounded = parseFloat(lcAmount.toFixed(2));
              const btAmountRounded = parseFloat(btAmount.toFixed(2));
              const lcPaidRounded = parseFloat(lcPaid.toFixed(2));
              const btPaidRounded = parseFloat(btPaid.toFixed(2));
              
              // Check LC completion - use rounded values to avoid floating point comparison issues
              if (lcAmountRounded > 0) {
                lc_completed = lcPaidRounded >= lcAmountRounded;
              } else {
                lc_completed = true; // No LC required
              }
              
              // Check Bank Transfer completion - use rounded values to avoid floating point comparison issues
              if (btAmountRounded > 0) {
                bt_completed = btPaidRounded >= btAmountRounded;
              } else {
                bt_completed = true; // No bank transfer required
              }
              
              // Determine overall payment status
              if (lc_completed && bt_completed) {
                payment_status = 'completed';
              } else if (lcPaid > 0 || btPaid > 0) {
                payment_status = 'partial';
              }
              
              resolve({
                ...vehicle,
                vehicle_id: vehicle.id,
                total_lc_paid: lcPaid,
                total_bank_transfer_paid: btPaid,
                lc_completed,
                bt_completed,
                payment_status,
                invoice_id: invoiceResult ? invoiceResult.invoice_id : null,
                invoice_status: invoiceResult ? invoiceResult.invoice_status : null
              });
            });
          });
        });
        });
      }));
      
      res.status(200).json(results);
    };
    
    processVehicles().catch(err => {
      console.error('Error processing vehicles:', err);
      res.status(500).json({ error: 'Error processing vehicles' });
    });
  });
});

// Get vehicle sales status summary
app.get('/api/vehicles/sales-status', (req, res) => {
  const query = `
    SELECT 
      vs.vehicle_id,
      vs.sale_price_lkr,
      vs.paid_amount_lkr,
      vs.remaining_amount_lkr,
      vs.payment_status,
      vs.sale_date,
      b.name as buyer_name,
      b.email as buyer_email,
      b.phone as buyer_phone
    FROM vehicle_sales vs
    JOIN buyers b ON vs.buyer_id = b.id
    ORDER BY vs.vehicle_id
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching vehicle sales status:', err.message);
      return res.status(500).json({ error: 'Error fetching vehicle sales status' });
    }
    res.status(200).json(rows);
  });
});

// Get a specific vehicle by ID
app.get('/api/vehicles/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT id, chassis_no, vehicle_type, year, colour, mileage, etd, eta, vessel_name, grade, options, cif_value_jpy, cif_value_lkr, duty, bank_charges, import_charges, clearing, transport, other, repair, total_cost, sold, sale_price, profit, seller_id, lc_amount, bank_transfer_amount FROM vehicles WHERE id = ?';
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
app.put('/api/vehicles/:id', authenticateToken, requireAdmin, (req, res) => {
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
    sale_price,
    profit,
    seller_id,
    lc_amount,
    bank_transfer_amount,
    vehicle_status,
    buyer_id,
  } = req.body;

  const query = `UPDATE vehicles SET 
    chassis_no = ?, vehicle_type = ?, year = ?, colour = ?, mileage = ?, 
    etd = ?, eta = ?, vessel_name = ?, grade = ?, options = ?, 
    cif_value_jpy = ?, cif_value_lkr = ?, duty = ?, bank_charges = ?, 
    import_charges = ?, clearing = ?, transport = ?, other = ?, repair = ?,
    total_cost = ?, sold = ?, sale_price = ?, profit = ?, seller_id = ?, lc_amount = ?, bank_transfer_amount = ?, vehicle_status = ?, buyer_id = ?
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
      sale_price,
      profit,
      seller_id,
      lc_amount,
      bank_transfer_amount,
      vehicle_status,
      buyer_id || null,
      id
    ],
    function (err) {
      if (err) {
        console.error('Error updating vehicle record:', err.message);
        res.status(500).send('Error updating vehicle record');
      } else if (this.changes === 0) {
        res.status(404).send('Vehicle not found');
      } else {
        // Check if we should create a vehicle sale record
        if ((vehicle_status === 'Reserved' || vehicle_status === 'Sold') && buyer_id) {
          // First check if a sale record already exists for this vehicle
          db.get('SELECT id FROM vehicle_sales WHERE vehicle_id = ?', [id], (err, existingSale) => {
            if (err) {
              console.error('Error checking existing vehicle sales:', err.message);
              // Still return success for the vehicle update
              return res.status(200).send('Vehicle updated successfully, but failed to check existing sales');
            }
            
            // If there's no existing sale record, create one
            if (!existingSale) {
              // Calculate remaining amount
              const salePrice = parseFloat(sale_price) || 0;
              const saleDate = new Date().toISOString().split('T')[0]; // Use today's date
              
              const insertQuery = `
                INSERT INTO vehicle_sales (
                  vehicle_id, buyer_id, sale_price_lkr, 
                  paid_amount_lkr, remaining_amount_lkr, sale_date, payment_status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `;
              
              db.run(
                insertQuery, 
                [
                  id, 
                  buyer_id, 
                  salePrice,
                  0, // Initial paid amount is 0
                  salePrice, // Initial remaining amount is the full sale price
                  saleDate,
                  'pending', // Initial payment status is pending
                  `Auto-created when vehicle status changed to ${vehicle_status}`
                ],
                function(saleErr) {
                  if (saleErr) {
                    console.error('Error creating vehicle sale record:', saleErr.message);
                    res.status(200).send('Vehicle updated successfully, but failed to create sales record');
                  } else {
                    console.log(`Auto-created vehicle sale record for vehicle ${id} sold to buyer ${buyer_id}`);
                    res.status(200).send('Vehicle updated successfully and sales record created');
                  }
                }
              );
            } else {
              // Sale record already exists
              res.status(200).send('Vehicle updated successfully (sales record already exists)');
            }
          });
        } else {
          res.status(200).send('Vehicle updated successfully');
        }
      }
    }
  );
});

// Delete a vehicle by ID
app.delete('/api/vehicles/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.post('/api/sellers', authenticateToken, requireAdmin, (req, res) => {
  const { name, contact_info } = req.body;
  const outstanding_balance = 0; // Default value when creating a new seller
  const query = 'INSERT INTO sellers (name, contact_info, outstanding_balance) VALUES (?, ?, ?)';
  db.run(query, [name, contact_info, outstanding_balance], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

// Update the seller list API to include outstanding amount
app.get('/api/sellers', (req, res) => {
  const query = 'SELECT id, name, contact_info, outstanding_balance FROM sellers';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching sellers:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a seller by ID (with vehicles supplied)
app.get('/api/sellers/:id', (req, res) => {
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
app.put('/api/sellers/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, contact_info } = req.body;
  const query = 'UPDATE sellers SET name = ?, contact_info = ? WHERE id = ?';
  db.run(query, [name, contact_info, id], function (err) {
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
app.delete('/api/sellers/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.post('/api/lc', authenticateToken, requireAdmin, (req, res) => {
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
app.get('/api/lc', (req, res) => {
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
app.get('/api/lc/:id', (req, res) => {
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
app.put('/api/lc/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.delete('/api/lc/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.post('/api/lc-records', authenticateToken, requireAdmin, (req, res) => {
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
app.get('/api/lc-records/:vehicle_id', (req, res) => {
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
app.get('/api/seller-lc-records/:seller_id', (req, res) => {
  const { seller_id } = req.params;
  const query = `
    SELECT lr.*, v.chassis_no, v.vehicle_type, v.year, v.colour, v.mileage, v.etd, v.eta, v.vessel_name, v.grade, v.options
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
app.post('/api/bank-transfers', authenticateToken, requireAdmin, (req, res) => {
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
app.get('/api/bank-transfers/:vehicle_id', (req, res) => {
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
app.get('/api/bank-transfers/remaining/:vehicle_id', (req, res) => {
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
app.get('/api/lc-records/remaining/:vehicle_id', (req, res) => {
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
app.get('/api/test', (req, res) => {
  console.log('GET /test - Test response');
  res.json([{test: true}]);
});

// Get vehicles for a seller with payment details
app.get('/api/sellers/:id/vehicles', (req, res) => {
  const sellerId = req.params.id;
  
  // Updated query to use invoice data instead of direct payment tables
  const query = `
    SELECT 
      v.*,
      i.id as invoice_id,
      i.created_at as invoice_date,
      iv.lc_amount as invoice_lc_amount,
      iv.bt_amount as invoice_bt_amount,
      COALESCE(i.paid_lc_amount, 0) as lc_paid_amount,
      COALESCE(i.paid_bt_amount, 0) as bank_transfer_paid_amount,
      
      /* For vehicles without invoices, return 0 for paid amounts */
      CASE WHEN i.id IS NULL THEN 0 ELSE COALESCE(i.paid_lc_amount, 0) END as lc_paid_amount,
      CASE WHEN i.id IS NULL THEN 0 ELSE COALESCE(i.paid_bt_amount, 0) END as bank_transfer_paid_amount,
      
      /* Calculate remaining amounts */
      CASE 
        WHEN i.id IS NULL THEN v.lc_amount
        ELSE COALESCE(iv.lc_amount, 0) - COALESCE(i.paid_lc_amount, 0)
      END as lc_remaining,
      
      CASE 
        WHEN i.id IS NULL THEN v.bank_transfer_amount
        ELSE COALESCE(iv.bt_amount, 0) - COALESCE(i.paid_bt_amount, 0)
      END as bank_transfer_remaining
    FROM vehicles v
    LEFT JOIN InvoiceVehicles iv ON v.id = iv.vehicle_id
    LEFT JOIN Invoices i ON iv.invoice_id = i.id
    WHERE v.seller_id = ?
    ORDER BY v.id DESC
  `;
  
  db.all(query, [sellerId], (err, vehicles) => {
    if (err) {
      console.error('Error fetching vehicles:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    // Calculate payment status for each vehicle based on invoice data
    const vehiclesWithStatus = vehicles.map(vehicle => {
      // Use the invoice amounts if available, otherwise fall back to vehicle amounts
      const lcAmount = vehicle.invoice_lc_amount || vehicle.lc_amount || 0;
      const btAmount = vehicle.invoice_bt_amount || vehicle.bank_transfer_amount || 0;
      const lcPaid = vehicle.lc_paid_amount || 0;
      const btPaid = vehicle.bank_transfer_paid_amount || 0;

      return {
        ...vehicle,
        lc_amount: lcAmount,
        bank_transfer_amount: btAmount,
        lc_paid_amount: lcPaid,
        bank_transfer_paid_amount: btPaid,
        lc_status: lcPaid >= lcAmount ? 'paid' :
                  lcPaid > 0 ? 'partial' : 'pending',
        bank_transfer_status: btPaid >= btAmount ? 'paid' :
                            btPaid > 0 ? 'partial' : 'pending'
      };
    });

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
      SUM(CASE WHEN vehicle_status = 'Reserved' THEN 1 ELSE 0 END) AS reserved,
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
app.get('/api/debug/seller/8', (req, res) => {
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
// New reliable implementation for seller outstanding calculation - using invoices data only
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
      
      // Get invoice totals for the seller
      const invoiceTotalsQuery = `
        SELECT 
          COALESCE(SUM(total_lc_amount), 0) as total_lc,
          COALESCE(SUM(total_bt_amount), 0) as total_bt,
          COALESCE(SUM(paid_lc_amount), 0) as paid_lc,
          COALESCE(SUM(paid_bt_amount), 0) as paid_bt
        FROM Invoices
        WHERE seller_id = ?
      `;
      
      db.get(invoiceTotalsQuery, [sellerId], (err, invoiceTotals) => {
        if (err) {
          console.error(`Error calculating invoice totals for seller ${sellerId}:`, err);
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
        
        // Ensure we get proper numbers for calculation
        const totalLc = Number(invoiceTotals.total_lc || 0);
        const totalBt = Number(invoiceTotals.total_bt || 0);
        const paidLc = Number(invoiceTotals.paid_lc || 0);
        const paidBt = Number(invoiceTotals.paid_bt || 0);
        
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
        console.log(`Seller ${sellerId} calculation from invoices:`, {
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
app.post('/api/investors', authenticateToken, requireAdmin, (req, res) => {
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
app.put('/api/investors/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.delete('/api/investors/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.post('/api/investments', authenticateToken, requireAdmin, (req, res) => {
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
app.put('/api/investments/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.delete('/api/investments/:id', authenticateToken, requireAdmin, (req, res) => {
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
app.post('/api/profit-distribution/calculate/:vehicleId', authenticateToken, requireAdmin, (req, res) => {
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
              db.run('ROLLBACK');
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

// Delete profit distributions for a specific vehicle (to allow recalculation)
app.delete('/api/profit-distribution/vehicle/:vehicleId', authenticateToken, requireAdmin, (req, res) => {
  const vehicleId = req.params.vehicleId;
  
  db.run('DELETE FROM profit_distribution WHERE vehicle_id = ?', [vehicleId], function(err) {
    if (err) {
      console.error('Error deleting profit distributions:', err.message);
      return res.status(500).json({ error: 'Failed to delete profit distributions' });
    }
    
    console.log(`Deleted ${this.changes} profit distribution records for vehicle ${vehicleId}`);
    res.json({ 
      message: 'Profit distributions deleted successfully',
      deletedCount: this.changes
    });
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
          vehicles_with_profit: vehicles.total_vehicles || 0,
          total_investors: investors.total_investors || 0
        });
      });
    });
  });
});

// Create a property to track vehicles with profit
app.get('/api/vehicles-with-profit', (req, res) => {
  db.get('SELECT COUNT(DISTINCT vehicle_id) as count FROM profit_distribution', [], (err, result) => {
    if (err) {
      console.error('Error counting vehicles with profit:', err.message);
      return res.status(500).json({ error: 'Failed to get count' });
    }
    
    res.json({
      vehicles_with_profit: result.count || 0
    });
  });
});

// ===== INVOICES API ENDPOINTS =====

// Get available vehicles for a seller (for invoice creation)
app.get('/api/invoices/available-vehicles/:sellerId', (req, res) => {
  const { sellerId } = req.params;
  
  const query = `
    SELECT 
      v.id,
      v.chassis_no,
      v.vehicle_type,
      v.year,
      v.colour,
      v.vehicle_status,
      v.lc_amount,
      v.bank_transfer_amount,
      v.total_cost,
      v.sale_price,
      v.profit,
      COALESCE(bt_paid.total_paid, 0) as bank_transfer_paid,
      COALESCE(lc_paid.total_paid, 0) as lc_paid,
      (v.lc_amount - COALESCE(lc_paid.total_paid, 0)) as lc_outstanding,
      (v.bank_transfer_amount - COALESCE(bt_paid.total_paid, 0)) as bank_transfer_outstanding
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_id, SUM(amount) as total_paid 
      FROM BankTransfers 
      GROUP BY vehicle_id
    ) bt_paid ON v.id = bt_paid.vehicle_id
    LEFT JOIN (
      SELECT vehicle_id, SUM(amount) as total_paid 
      FROM LCRecords 
      GROUP BY vehicle_id
    ) lc_paid ON v.id = lc_paid.vehicle_id
    LEFT JOIN (
      SELECT DISTINCT vehicle_id 
      FROM InvoiceVehicles
    ) iv ON v.id = iv.vehicle_id
    WHERE v.seller_id = ?
      AND iv.vehicle_id IS NULL
      AND (v.lc_amount > COALESCE(lc_paid.total_paid, 0) 
           OR v.bank_transfer_amount > COALESCE(bt_paid.total_paid, 0))
    ORDER BY v.id DESC
  `;
  
  db.all(query, [sellerId], (err, vehicles) => {
    if (err) {
      console.error('Error fetching available vehicles for seller:', err.message);
      return res.status(500).json({ error: 'Failed to fetch available vehicles' });
    }
    
    res.json(vehicles);
  });
});

// Get all invoices with seller and vehicle details
app.get('/api/invoices', (req, res) => {
  const query = `
    SELECT 
      i.*,
      s.name as seller_name,
      s.contact_info as seller_contact,
      GROUP_CONCAT(v.chassis_no) as vehicle_chassis_numbers,
      COUNT(iv.vehicle_id) as vehicle_count
    FROM Invoices i
    JOIN sellers s ON i.seller_id = s.id
    LEFT JOIN InvoiceVehicles iv ON i.id = iv.invoice_id
    LEFT JOIN vehicles v ON iv.vehicle_id = v.id
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching invoices:', err.message);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
    res.json(rows);
  });
});

// Get a specific invoice with full details
app.get('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  
  const invoiceQuery = `
    SELECT 
      i.*,
      s.name as seller_name,
      s.contact_info as seller_contact
    FROM Invoices i
    JOIN sellers s ON i.seller_id = s.id
    WHERE i.id = ?
  `;
  
  const vehiclesQuery = `
    SELECT 
      v.*,
      iv.lc_amount as invoice_lc_amount,
      iv.bt_amount as invoice_bt_amount
    FROM InvoiceVehicles iv
    JOIN vehicles v ON iv.vehicle_id = v.id
    WHERE iv.invoice_id = ?
  `;
  
  const paymentsQuery = `
    SELECT * FROM InvoicePayments 
    WHERE invoice_id = ? 
    ORDER BY date DESC
  `;
  
  db.get(invoiceQuery, [id], (err, invoice) => {
    if (err) {
      console.error('Error fetching invoice:', err.message);
      return res.status(500).json({ error: 'Failed to fetch invoice' });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    db.all(vehiclesQuery, [id], (err, vehicles) => {
      if (err) {
        console.error('Error fetching invoice vehicles:', err.message);
        return res.status(500).json({ error: 'Failed to fetch invoice vehicles' });
      }
      
      db.all(paymentsQuery, [id], (err, payments) => {
        if (err) {
          console.error('Error fetching invoice payments:', err.message);
          return res.status(500).json({ error: 'Failed to fetch invoice payments' });
        }
        
        res.json({
          ...invoice,
          vehicles,
          payments
        });
      });
    });
  });
});

// Create a new invoice
app.post('/api/invoices', authenticateToken, requireAdmin, (req, res) => {
  const { seller_id, vehicles } = req.body;
  
  if (!seller_id || !vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
    return res.status(400).json({ error: 'seller_id and vehicles array are required' });
  }
  
  // Validate that all vehicles have required fields
  for (const vehicle of vehicles) {
    if (!vehicle.id || (!vehicle.lc_amount && !vehicle.bt_amount)) {
      return res.status(400).json({ error: 'Each vehicle must have id and at least one of lc_amount or bt_amount' });
    }
  }
  
  // Check if the seller exists
  db.get('SELECT id, name FROM sellers WHERE id = ?', [seller_id], (err, seller) => {
    if (err) {
      console.error('Error checking seller:', err.message);
      return res.status(500).json({ error: 'Failed to check seller' });
    }
    
    if (!seller) {
      return res.status(400).json({ error: 'Seller not found' });
    }
    
    // Calculate total amounts
    let total_lc_amount = 0;
    let total_bt_amount = 0;
    
    vehicles.forEach(vehicle => {
      total_lc_amount += parseFloat(vehicle.lc_amount || 0);
      total_bt_amount += parseFloat(vehicle.bt_amount || 0);
    });
    
    const total_amount = total_lc_amount + total_bt_amount;
    const remaining_lc_amount = total_lc_amount;
    const remaining_bt_amount = total_bt_amount;
    
    // Create invoice
    const invoiceQuery = `
      INSERT INTO Invoices (
        seller_id, total_amount, total_lc_amount, total_bt_amount, 
        paid_lc_amount, paid_bt_amount, remaining_lc_amount, remaining_bt_amount, 
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(invoiceQuery, [
      seller_id, total_amount, total_lc_amount, total_bt_amount,
      0, 0, remaining_lc_amount, remaining_bt_amount,
      'pending', new Date().toISOString()
    ], function(err) {
      if (err) {
        console.error('Error creating invoice:', err.message);
        return res.status(500).json({ error: 'Failed to create invoice' });
      }
      
      const invoiceId = this.lastID;
      
      // Insert vehicle records into InvoiceVehicles table
      const vehicleInserts = vehicles.map(vehicle => {
        return new Promise((resolve, reject) => {
          const vehicleQuery = `
            INSERT INTO InvoiceVehicles (invoice_id, vehicle_id, lc_amount, bt_amount)
            VALUES (?, ?, ?, ?)
          `;
          
          db.run(vehicleQuery, [
            invoiceId, 
            vehicle.id, 
            parseFloat(vehicle.lc_amount || 0), 
            parseFloat(vehicle.bt_amount || 0)
          ], function(err) {
            if (err) {
              reject(err);
            } else {
              resolve(this.lastID);
            }
          });
        });
      });
      
      // Execute all vehicle inserts
      Promise.all(vehicleInserts)
        .then(() => {
          res.status(201).json({
            message: 'Invoice created successfully',
            invoiceId: invoiceId,
            seller_name: seller.name,
            total_amount: total_amount,
            vehicle_count: vehicles.length
          });
        })
        .catch((error) => {
          console.error('Error creating invoice vehicles:', error.message);
          // Clean up the invoice if vehicle inserts failed
          db.run('DELETE FROM Invoices WHERE id = ?', [invoiceId]);
          res.status(500).json({ error: 'Failed to create invoice vehicles' });
        });
    });
  });
});

// Update an invoice
app.put('/api/invoices/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { invoice_number, issue_date, due_date, amount, status, notes } = req.body;
  
  if (!invoice_number || !issue_date || !due_date || !amount) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  // Check if invoice number already exists for a different invoice
  db.get('SELECT id FROM invoices WHERE invoice_number = ? AND id != ?', [invoice_number, id], (err, existingInvoice) => {
    if (err) {
      console.error('Error checking invoice number:', err.message);
      return res.status(500).json({ error: 'Failed to check invoice number' });
    }
    
    if (existingInvoice) {
      return res.status(400).json({ error: 'Invoice number already exists' });
    }
    
    const query = 'UPDATE invoices SET invoice_number = ?, issue_date = ?, due_date = ?, amount = ?, status = ?, notes = ? WHERE id = ?';
    
    db.run(query, [invoice_number, issue_date, due_date, amount, status, notes, id], function(err) {
      if (err) {
        console.error('Error updating invoice:', err.message);
        return res.status(500).json({ error: 'Failed to update invoice' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json({ message: 'Invoice updated successfully' });
    });
  });
});

// Delete an invoice
app.delete('/api/invoices/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Check if there are payments related to this invoice
  db.get('SELECT COUNT(*) as count FROM payments WHERE invoice_id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error checking invoice payments:', err.message);
      return res.status(500).json({ error: 'Failed to check invoice payments' });
    }
    
    if (result && result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete invoice with existing payments' });
    }
    
    // Delete the invoice
    db.run('DELETE FROM invoices WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting invoice:', err.message);
        return res.status(500).json({ error: 'Failed to delete invoice' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json({ message: 'Invoice deleted successfully' });
    });
  });
});

// Get payments for an invoice
app.get('/api/invoices/:id/payments', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.all('SELECT * FROM payments WHERE invoice_id = ?', [id], (err, payments) => {
    if (err) {
      console.error('Error fetching invoice payments:', err.message);
      return res.status(500).json({ error: 'Failed to fetch invoice payments' });
    }
    
    res.json(payments);
  });
});

// Create a payment for an invoice
app.post('/api/invoices/:id/payments', authenticateToken, requireAdmin, (req, res) => {
  const invoiceId = req.params.id;
  const { amount_jpy, amount_lkr, date, transfer_mode, payment_type } = req.body;
  
  // Validate required fields
  if ((!amount_jpy && !amount_lkr) || !date || !transfer_mode || !payment_type) {
    return res.status(400).json({ 
      error: 'Required fields missing. Either amount_jpy or amount_lkr, date, transfer_mode, and payment_type are required' 
    });
  }
  
  // Validate payment_type
  if (payment_type !== 'LC' && payment_type !== 'BT') {
    return res.status(400).json({ error: 'payment_type must be either LC or BT' });
  }
  
  // Check if invoice exists
  db.get('SELECT id, total_amount, total_lc_amount, total_bt_amount, paid_lc_amount, paid_bt_amount, status FROM Invoices WHERE id = ?', [invoiceId], (err, invoice) => {
    if (err) {
      console.error('Error checking invoice:', err.message);
      return res.status(500).json({ error: 'Failed to check invoice' });
    }
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Insert payment into InvoicePayments
    const query = `
      INSERT INTO InvoicePayments (invoice_id, amount_jpy, amount_lkr, date, transfer_mode, payment_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [invoiceId, amount_jpy || 0, amount_lkr || 0, date, transfer_mode, payment_type], function(err) {
      if (err) {
        console.error('Error creating payment:', err.message);
        return res.status(500).json({ error: 'Failed to create payment' });
      }
      
      const paymentId = this.lastID;
      
      // Update invoice payment totals and status
      let updateQuery;
      let updateParams;
      let additionalAmount = 0;
      
      // Function to execute the update query (define outside to avoid errors)
      function executeUpdate() {
        db.run(updateQuery, updateParams, function(err) {
          if (err) {
            console.error('Error updating invoice payment amounts:', err.message);
            return res.status(500).json({ error: 'Payment created but failed to update invoice amounts' });
          }
          
          // Recalculate total paid and determine new status
          db.get(`
            SELECT 
              total_amount, 
              (paid_lc_amount + paid_bt_amount) as total_paid 
            FROM Invoices 
            WHERE id = ?
          `, [invoiceId], (err, result) => {
            if (err) {
              console.error('Error calculating total paid:', err.message);
              return res.status(500).json({ error: 'Payment created but failed to update invoice status' });
            }
            
            const totalPaid = result.total_paid || 0;
            const invoiceAmount = parseFloat(result.total_amount);
            let newStatus = 'pending';
            
            if (totalPaid >= invoiceAmount) {
              newStatus = 'paid';
            } else if (totalPaid > 0) {
              newStatus = 'partial';
            }
            
            db.run('UPDATE Invoices SET status = ? WHERE id = ?', [newStatus, invoiceId], function(err) {
              if (err) {
                console.error('Error updating invoice status:', err.message);
                return res.status(500).json({ error: 'Payment created but failed to update invoice status' });
              }
              
              res.status(201).json({
                message: 'Payment created successfully',
                paymentId: paymentId,
                invoiceStatus: newStatus
              });
            });
          });
        });
      }

      if (payment_type === 'LC') {
        additionalAmount = parseFloat(amount_jpy || 0);
        updateQuery = `
          UPDATE Invoices 
          SET paid_lc_amount = paid_lc_amount + ?, 
              remaining_lc_amount = remaining_lc_amount - ?
          WHERE id = ?
        `;
        updateParams = [additionalAmount, additionalAmount, invoiceId];
        executeUpdate();
      } else { // BT
        // For BT payments, we should use the correct amount (amount_jpy)
        // The issue was that the code wasn't properly calculating or updating the BT values
        additionalAmount = parseFloat(amount_jpy || 0);
        
        // First get the current remaining_bt_amount to ensure it's correctly updated
        db.get('SELECT remaining_bt_amount FROM Invoices WHERE id = ?', [invoiceId], (err, result) => {
          if (err) {
            console.error('Error fetching remaining BT amount:', err.message);
            return res.status(500).json({ error: 'Failed to check remaining BT amount' });
          }
          
          // Ensure we don't go below zero
          const currentRemaining = parseFloat(result.remaining_bt_amount);
          const newRemaining = Math.max(0, currentRemaining - additionalAmount);
          
          updateQuery = `
            UPDATE Invoices 
            SET paid_bt_amount = paid_bt_amount + ?, 
                remaining_bt_amount = ?
            WHERE id = ?
          `;
          updateParams = [additionalAmount, newRemaining, invoiceId];
          
          executeUpdate();
        });
      }
    });
  });
});

// Legacy endpoint for backward compatibility
app.get('/invoices', (req, res) => {
  // Simply redirect to the API endpoint
  const query = `
    SELECT 
      i.*,
      s.name as seller_name,
      s.contact_info as seller_contact,
      GROUP_CONCAT(v.chassis_no) as vehicle_chassis_numbers,
      COUNT(iv.vehicle_id) as vehicle_count
    FROM Invoices i
    JOIN sellers s ON i.seller_id = s.id
    LEFT JOIN InvoiceVehicles iv ON i.id = iv.invoice_id
    LEFT JOIN vehicles v ON iv.vehicle_id = v.id
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching invoices:', err.message);
      return res.status(500).json({ error: 'Failed to fetch invoices' });
    }
    res.json(rows);
  });
});

// --- Vehicle Sales API Endpoints ---

// Get all vehicle sales
app.get('/api/vehicle-sales', (req, res) => {
  const query = `
    SELECT 
      vs.*,
      b.name as buyer_name,
      b.email as buyer_email,
      b.phone as buyer_phone,
      v.chassis_no,
      v.vehicle_type,
      v.year,
      v.colour
    FROM vehicle_sales vs
    JOIN buyers b ON vs.buyer_id = b.id
    JOIN vehicles v ON vs.vehicle_id = v.id
    ORDER BY vs.sale_date DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching vehicle sales:', err.message);
      return res.status(500).json({ error: 'Failed to fetch vehicle sales' });
    }
    res.json(rows);
  });
});

// Get all buyers with purchase totals
app.get('/api/buyers', (req, res) => {
  // First get all buyers
  const buyersQuery = 'SELECT * FROM buyers';
  
  db.all(buyersQuery, [], (err, buyers) => {
    if (err) {
      console.error('Error fetching buyers:', err.message);
      return res.status(500).json({ error: 'Failed to fetch buyers' });
    }
    
    // Get purchase summaries from vehicle_sales table
    const salesQuery = `
      SELECT 
        buyer_id, 
        COUNT(*) as purchase_count, 
        SUM(sale_price_lkr) as total_value,
        SUM(remaining_amount_lkr) as pending_amount
      FROM vehicle_sales 
      GROUP BY buyer_id
    `;
    
    db.all(salesQuery, [], (err, salesSummaries) => {
      if (err) {
        console.error('Error fetching sales summaries:', err.message);
        return res.status(500).json({ error: 'Failed to fetch sales data' });
      }
      
      // Create a map of buyer ID to sales summary
      const buyerSummaryMap = {};
      salesSummaries.forEach(summary => {
        buyerSummaryMap[summary.buyer_id] = summary;
      });
      
      // Enrich buyer data with purchase information
      const enrichedBuyers = buyers.map(buyer => {
        const summary = buyerSummaryMap[buyer.id] || {
          purchase_count: 0,
          total_value: 0,
          pending_amount: 0
        };
        
        return {
          ...buyer,
          total_purchases: summary.purchase_count,
          total_purchase_value: summary.total_value,
          total_pending_amount: summary.pending_amount
        };
      });
      
      res.json(enrichedBuyers);
    });
  });
});

// Create a new buyer
app.post('/api/buyers', authenticateToken, requireAdmin, (req, res) => {
  const { name, email, phone, address, nic } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  
  const query = 'INSERT INTO buyers (name, email, phone, address, nic) VALUES (?, ?, ?, ?, ?)';
  db.run(query, [name, email, phone, address, nic], function (err) {
    if (err) {
      console.error('Error creating buyer:', err.message);
      res.status(500).json({ error: 'Failed to create buyer' });
    } else {
      res.status(201).json({ 
        id: this.lastID, 
        message: 'Buyer created successfully',
        buyer: {
          id: this.lastID,
          name,
          email,
          phone,
          address,
          nic
        }
      });
    }
  });
});

// Get a specific buyer by ID
app.get('/api/buyers/:id', (req, res) => {
  const { id } = req.params;
  
  // First get the buyer details
  const buyerQuery = 'SELECT * FROM buyers WHERE id = ?';
  db.get(buyerQuery, [id], (err, buyer) => {
    if (err) {
      console.error('Error fetching buyer:', err.message);
      return res.status(500).json({ error: 'Failed to fetch buyer details' });
    }
    
    if (!buyer) {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    
    // Get purchases/vehicles associated with this buyer with payment details
    const vehicleSalesQuery = `
      SELECT 
        vs.id,
        vs.vehicle_id,
        vs.sale_date,
        vs.sale_price_lkr,
        vs.paid_amount_lkr,
        vs.remaining_amount_lkr,
        vs.payment_status,
        v.chassis_no,
        v.vehicle_type,
        v.year,
        v.colour,
        v.seller_id,
        s.name as seller_name,
        (SELECT COUNT(*) FROM buyer_payments WHERE sale_id = vs.id) as payment_count
      FROM vehicle_sales vs
      LEFT JOIN vehicles v ON vs.vehicle_id = v.id
      LEFT JOIN sellers s ON v.seller_id = s.id
      WHERE vs.buyer_id = ?
      ORDER BY vs.sale_date DESC
    `;

    // Then check vehicles table for direct buyer_id assignment
    const vehiclesQuery = `
      SELECT 
        NULL as id, 
        v.id as vehicle_id,
        v.created_at as sale_date,
        v.sale_price as sale_price_lkr,
        0 as paid_amount_lkr,
        v.sale_price as remaining_amount_lkr,
        'pending' as payment_status,
        v.chassis_no,
        v.vehicle_type,
        v.year,
        v.colour,
        v.seller_id,
        s.name as seller_name,
        0 as payment_count
      FROM vehicles v
      LEFT JOIN sellers s ON v.seller_id = s.id
      WHERE v.buyer_id = ?
      ORDER BY v.created_at DESC
    `;
    
    // Get summary totals
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_purchases,
        SUM(sale_price_lkr) as total_purchase_value,
        SUM(remaining_amount_lkr) as total_pending_amount
      FROM vehicle_sales
      WHERE buyer_id = ?
    `;
    
    // First get summary data
    db.get(summaryQuery, [id], (err, summary) => {
      if (err) {
        console.error('Error fetching buyer summary:', err.message);
        summary = { total_purchases: 0, total_purchase_value: 0, total_pending_amount: 0 };
      }
      
      // Get purchases from vehicle_sales table
      db.all(vehicleSalesQuery, [id], (err, salesPurchases) => {
        if (err) {
          console.error('Error fetching buyer vehicle sales:', err.message);
          salesPurchases = [];
        }
        
        // Then get purchases from vehicles table
        db.all(vehiclesQuery, [id], (err, directPurchases) => {
          if (err) {
            console.error('Error fetching buyer direct purchases:', err.message);
            directPurchases = [];
          }
          
          // Combine both sources of purchases
          const allPurchases = [...salesPurchases, ...directPurchases];
          
          res.json({
            ...buyer,
            ...summary,
            purchases: allPurchases || []
          });
        });
      });
    });
  });
});

app.get('/api/buyers/:id/purchases', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT vs.*, v.make, v.model, v.year, v.color, v.chassis_number,
    s.name as seller_name, s.email as seller_email,
    i.id as invoice_id, i.invoice_number, i.amount as invoice_amount, i.status as invoice_status
    FROM vehicle_sales vs
    LEFT JOIN vehicles v ON vs.vehicle_id = v.id
    LEFT JOIN sellers s ON vs.seller_id = s.id
    LEFT JOIN invoices i ON vs.id = i.sale_id
    WHERE vs.buyer_id = ?
  `;
  
  db.all(query, [id], (err, purchases) => {
    if (err) {
      console.error('Error fetching buyer purchases:', err.message);
      return res.status(500).json({ error: 'Failed to fetch buyer purchases' });
    }
    
    res.json(purchases);
  });
});

// Create a new vehicle sale
app.post('/api/vehicle-sales', authenticateToken, requireAdmin, (req, res) => {
  const { vehicle_id, buyer_id, seller_id, sale_date, sale_price, notes } = req.body;
  
  if (!vehicle_id || !buyer_id || !seller_id || !sale_date || !sale_price) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  // First, check if the vehicle is already sold
  db.get('SELECT id FROM vehicle_sales WHERE vehicle_id = ?', [vehicle_id], (err, existingSale) => {
    if (err) {
      console.error('Error checking vehicle sale status:', err.message);
      return res.status(500).json({ error: 'Failed to check vehicle status' });
    }
    
    if (existingSale) {
      return res.status(400).json({ error: 'Vehicle is already sold' });
    }
    
    // Create sale if vehicle is not already sold
    const query = 'INSERT INTO vehicle_sales (vehicle_id, buyer_id, seller_id, sale_date, sale_price, notes) VALUES (?, ?, ?, ?, ?, ?)';
    
    db.run(query, [vehicle_id, buyer_id, seller_id, sale_date, sale_price, notes], function(err) {
      if (err) {
        console.error('Error creating vehicle sale:', err.message);
        return res.status(500).json({ error: 'Failed to create vehicle sale' });
      }
      
      // Update vehicle status to 'sold'
      db.run('UPDATE vehicles SET status = "sold" WHERE id = ?', [vehicle_id], function(err) {
        if (err) {
          console.error('Error updating vehicle status:', err.message);
          return res.status(500).json({ error: 'Sale created but failed to update vehicle status' });
        }
        
        res.status(201).json({
          message: 'Vehicle sale created successfully',
          saleId: this.lastID
        });
      });
    });
  });
});

// Update a vehicle sale
app.put('/api/vehicle-sales/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { buyer_id, seller_id, sale_date, sale_price, notes } = req.body;
  
  if (!buyer_id || !seller_id || !sale_date || !sale_price) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  const query = 'UPDATE vehicle_sales SET buyer_id = ?, seller_id = ?, sale_date = ?, sale_price = ?, notes = ? WHERE id = ?';
  
  db.run(query, [buyer_id, seller_id, sale_date, sale_price, notes, id], function(err) {
    if (err) {
      console.error('Error updating vehicle sale:', err.message);
      return res.status(500).json({ error: 'Failed to update vehicle sale' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Vehicle sale not found' });
    }
    
    res.json({ message: 'Vehicle sale updated successfully' });
  });
});

// Delete a vehicle sale
app.delete('/api/vehicle-sales/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  
  // Check if sale has any invoices
  db.get('SELECT COUNT(*) as count FROM invoices WHERE sale_id = ?', [id], (err, result) => {
    if (err) {
      console.error('Error checking sale invoices:', err.message);
      return res.status(500).json({ error: 'Failed to check sale invoices' });
    }
    
    if (result.count > 0) {
      return res.status(400).json({ error: 'Cannot delete sale with existing invoices' });
    }
    
    // Get vehicle id for status update
    db.get('SELECT vehicle_id FROM vehicle_sales WHERE id = ?', [id], (err, sale) => {
      if (err || !sale) {
        console.error('Error finding sale:', err?.message);
        return res.status(404).json({ error: 'Vehicle sale not found' });
      }
      
      const vehicleId = sale.vehicle_id;
      
      // Delete the sale
      db.run('DELETE FROM vehicle_sales WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting sale:', err.message);
          return res.status(500).json({ error: 'Failed to delete vehicle sale' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Vehicle sale not found' });
        }
        
        // Update vehicle status back to 'available'
        db.run('UPDATE vehicles SET status = "available" WHERE id = ?', [vehicleId], function(err) {
          if (err) {
            console.error('Error updating vehicle status:', err.message);
            return res.status(500).json({ error: 'Sale deleted but failed to update vehicle status' });
          }
          
          res.json({ message: 'Vehicle sale deleted successfully' });
        });
      });
    });
  });
});

// --- Payment Management Endpoints ---

// Get all payments for a vehicle sale
app.get('/api/vehicle-sales/:id/payments', (req, res) => {
  const { id } = req.params;
  
  // Check if the sale exists first
  db.get('SELECT id FROM vehicle_sales WHERE id = ?', [id], (err, sale) => {
    if (err) {
      console.error('Error finding vehicle sale:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!sale) {
      return res.status(404).json({ error: 'Vehicle sale not found' });
    }
    
    // Get all payments for this sale
    db.all('SELECT * FROM buyer_payments WHERE sale_id = ? ORDER BY payment_date DESC, id DESC', [id], (err, payments) => {
      if (err) {
        console.error('Error fetching payments:', err.message);
        return res.status(500).json({ error: 'Failed to fetch payments' });
      }
      
      res.json(payments || []);
    });
  });
});

// Create a payment for a vehicle sale
app.post('/api/vehicle-sales/:id/payments', (req, res) => {
  const { id } = req.params;
  const { amount_lkr, payment_date, payment_method, reference_no, notes } = req.body;
  
  // Validate required fields
  if (!amount_lkr || !payment_date || !payment_method) {
    return res.status(400).json({ error: 'Required fields missing' });
  }
  
  // Verify the vehicle sale exists and get current payment status
  db.get(
    'SELECT id, sale_price_lkr, paid_amount_lkr, remaining_amount_lkr FROM vehicle_sales WHERE id = ?', 
    [id], 
    (err, sale) => {
      if (err) {
        console.error('Error fetching vehicle sale:', err.message);
        return res.status(500).json({ error: 'Failed to fetch vehicle sale' });
      }
      
      if (!sale) {
        return res.status(404).json({ error: 'Vehicle sale not found' });
      }
      
      // Check if payment amount is valid
      const paymentAmount = parseFloat(amount_lkr);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ error: 'Payment amount must be greater than 0' });
      }
      
      if (paymentAmount > sale.remaining_amount_lkr) {
        return res.status(400).json({ error: 'Payment amount cannot exceed remaining balance' });
      }
      
      // Begin transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Insert payment record
        db.run(
          'INSERT INTO buyer_payments (sale_id, amount_lkr, payment_date, payment_method, reference_no, notes) VALUES (?, ?, ?, ?, ?, ?)',
          [id, paymentAmount, payment_date, payment_method, reference_no, notes],
          function(err) {
            if (err) {
              console.error('Error creating payment record:', err.message);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to create payment record' });
            }
            
            const paymentId = this.lastID;
            
            // Update vehicle sale with new paid and remaining amounts
            const newPaidAmount = sale.paid_amount_lkr + paymentAmount;
            const newRemainingAmount = sale.remaining_amount_lkr - paymentAmount;
            const paymentStatus = newRemainingAmount <= 0 ? 'completed' : newRemainingAmount < sale.sale_price_lkr ? 'partial' : 'pending';
            
            db.run(
              'UPDATE vehicle_sales SET paid_amount_lkr = ?, remaining_amount_lkr = ?, payment_status = ? WHERE id = ?',
              [newPaidAmount, newRemainingAmount, paymentStatus, id],
              function(err) {
                if (err) {
                  console.error('Error updating vehicle sale:', err.message);
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to update vehicle sale' });
                }
                
                // Commit transaction
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing transaction:', err.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to complete payment process' });
                  }
                  
                  res.status(201).json({
                    id: paymentId,
                    sale_id: id,
                    amount_lkr: paymentAmount,
                    payment_date,
                    payment_method,
                    reference_no,
                    notes,
                    created_at: new Date().toISOString()
                  });
                });
              }
            );
          }
        );
      });
    }
  );
});

// Delete a payment
app.delete('/api/payments/:id', (req, res) => {
  const { id } = req.params;
  
  // First get the payment details to know which sale to update
  db.get('SELECT id, sale_id, amount_lkr FROM buyer_payments WHERE id = ?', [id], (err, payment) => {
    if (err) {
      console.error('Error fetching payment:', err.message);
      return res.status(500).json({ error: 'Failed to fetch payment details' });
    }
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Get vehicle sale details
    db.get(
      'SELECT id, paid_amount_lkr, remaining_amount_lkr, sale_price_lkr FROM vehicle_sales WHERE id = ?', 
      [payment.sale_id], 
      (err, sale) => {
        if (err) {
          console.error('Error fetching vehicle sale:', err.message);
          return res.status(500).json({ error: 'Failed to fetch vehicle sale details' });
        }
        
        if (!sale) {
          return res.status(404).json({ error: 'Associated vehicle sale not found' });
        }
        
        // Begin transaction
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Delete the payment
          db.run('DELETE FROM buyer_payments WHERE id = ?', [id], function(err) {
            if (err) {
              console.error('Error deleting payment:', err.message);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to delete payment' });
            }
            
            if (this.changes === 0) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Payment not found or already deleted' });
            }
            
            // Update vehicle sale with adjusted paid and remaining amounts
            const newPaidAmount = Math.max(0, sale.paid_amount_lkr - payment.amount_lkr);
            const newRemainingAmount = sale.sale_price_lkr - newPaidAmount;
            const paymentStatus = newRemainingAmount <= 0 ? 'completed' : newRemainingAmount < sale.sale_price_lkr ? 'partial' : 'pending';
            
            db.run(
              'UPDATE vehicle_sales SET paid_amount_lkr = ?, remaining_amount_lkr = ?, payment_status = ? WHERE id = ?',
              [newPaidAmount, newRemainingAmount, paymentStatus, payment.sale_id],
              function(err) {
                if (err) {
                  console.error('Error updating vehicle sale:', err.message);
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to update vehicle sale' });
                }
                
                // Commit transaction
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing transaction:', err.message);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to complete payment deletion' });
                  }
                  
                  res.json({ message: 'Payment deleted successfully' });
                });
              }
            );
          });
        });
      }
    );
  });
});

// Catch-all handler: send back React's index.html file for any non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});