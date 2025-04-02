/**
 * Server for Image Password App
 * Provides API endpoints for SQLite database operations
 * Uses HTTPS for secure communication
 */
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// SSL/TLS options
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// Initialize SQLite database
const db = new sqlite3.Database('./data/passwords.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');

    // Create accounts table if it doesn't exist
    db.run(`
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                notes TEXT,
                type TEXT DEFAULT 'uploaded',
                rawSeed TEXT DEFAULT NULL,
                createdAt TEXT NOT NULL
            )
        `, (err) => {
      if (err) {
        console.error('Error creating accounts table', err);
      } else {
        console.log('Accounts table ready');
      }
    });
  }
});

// API Routes

// Get all accounts
app.get('/api/accounts', (req, res) => {
  db.all('SELECT * FROM accounts', [], (err, rows) => {
    if (err) {
      console.error('Error getting accounts', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get a specific account
app.get('/api/accounts/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM accounts WHERE id = ?', id, (err, row) => {
    if (err) {
      console.error('Error getting account', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(row);
  });
});

// Add a new account
app.post('/api/accounts', (req, res) => {
  const { id, name, username, password, notes, type, rawSeed, createdAt } = req.body;

  // Validate required fields
  if (!id || !name || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    'INSERT INTO accounts (id, name, username, password, notes, type, rawSeed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, username, password, notes || '', type || 'uploaded', rawSeed, createdAt || new Date().toISOString()],
    function (err) {
      if (err) {
        console.error('Error adding account', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.status(201).json({ message: 'Account added successfully', id });
    }
  );
});

// Update an account
app.put('/api/accounts/:id', (req, res) => {
  const { id } = req.params;
  const { name, username, password, notes } = req.body;

  // Validate required fields
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(
    'UPDATE accounts SET name = ?, username = ?, password = ?, notes = ? WHERE id = ?',
    [name, username, password, notes || '', id],
    function (err) {
      if (err) {
        console.error('Error updating account', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({ message: 'Account updated successfully' });
    }
  );
});

// Delete an account
app.delete('/api/accounts/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM accounts WHERE id = ?', id, function (err) {
    if (err) {
      console.error('Error deleting account', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account deleted successfully' });
  });
});

// Create HTTPS server
const httpsServer = https.createServer(httpsOptions, app);

// Start the HTTPS server
httpsServer.listen(PORT, () => {
  console.log(`HTTPS Server running on https://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});