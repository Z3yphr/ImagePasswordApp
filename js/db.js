/**
 * Database operations for the Image Password App
 * Uses SQLite for persistent storage
 */

// Import the SQLite module
const sqlite3 = {
  verbose: function () {
    return this;
  },
  Database: function (filename, mode, callback) {
    // This is a placeholder for the actual SQLite implementation
    // We'll implement this with actual SQLite in the Node.js version
    console.log(`Opening database: ${filename}`);

    // Create a mock database object
    const db = {
      run: function (sql, params, callback) {
        console.log(`Executing SQL: ${sql}`);
        console.log(`With params: ${JSON.stringify(params)}`);

        // Store the query in localStorage for debugging
        const queries = JSON.parse(localStorage.getItem('sqlQueries') || '[]');
        queries.push({ sql, params });
        localStorage.setItem('sqlQueries', JSON.stringify(queries));

        // In the browser version, we'll simulate database operations with localStorage
        if (callback && typeof callback === 'function') {
          setTimeout(() => callback(null), 10); // Simulate async
        }
        return this;
      },
      all: function (sql, params, callback) {
        console.log(`Executing query: ${sql}`);
        console.log(`With params: ${JSON.stringify(params)}`);

        // Store the query in localStorage for debugging
        const queries = JSON.parse(localStorage.getItem('sqlQueries') || '[]');
        queries.push({ sql, params });
        localStorage.setItem('sqlQueries', JSON.stringify(queries));

        // Extract data from localStorage based on the query
        let results = [];

        // Very simple query parser for the demo
        if (sql.includes('SELECT * FROM accounts')) {
          // Get accounts from localStorage
          const accounts = JSON.parse(localStorage.getItem('imagePasswordAccounts') || '[]');
          results = accounts;
        }

        if (callback && typeof callback === 'function') {
          setTimeout(() => callback(null, results), 10); // Simulate async
        }
        return this;
      },
      get: function (sql, params, callback) {
        console.log(`Executing get query: ${sql}`);
        console.log(`With params: ${JSON.stringify(params)}`);

        // Store the query in localStorage for debugging
        const queries = JSON.parse(localStorage.getItem('sqlQueries') || '[]');
        queries.push({ sql, params });
        localStorage.setItem('sqlQueries', JSON.stringify(queries));

        // Extract data from localStorage based on the query
        let result = null;

        // Very simple query parser for the demo
        if (sql.includes('SELECT * FROM accounts WHERE id =')) {
          // Get accounts from localStorage
          const accounts = JSON.parse(localStorage.getItem('imagePasswordAccounts') || '[]');
          result = accounts.find(account => account.id === params);
        }

        if (callback && typeof callback === 'function') {
          setTimeout(() => callback(null, result), 10); // Simulate async
        }
        return this;
      },
      close: function (callback) {
        console.log('Closing database');
        if (callback && typeof callback === 'function') {
          setTimeout(() => callback(null), 10); // Simulate async
        }
      }
    };

    // Call the callback if provided
    if (callback && typeof callback === 'function') {
      setTimeout(() => callback(null), 10); // Simulate async
    }

    return db;
  }
};

class DatabaseManager {
  constructor() {
    this.db = null;
    this.initDatabase();
  }

  /**
   * Initialize the database and create tables if they don't exist
   */
  initDatabase() {
    // Open the database (or create it if it doesn't exist)
    this.db = new sqlite3.verbose().Database('./data/passwords.db', (err) => {
      if (err) {
        console.error('Error opening database', err);
        return;
      }

      console.log('Connected to the SQLite database.');

      // Create accounts table if it doesn't exist
      const createAccountsTable = `
              CREATE TABLE IF NOT EXISTS accounts (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  username TEXT NOT NULL,
                  password TEXT NOT NULL,
                  notes TEXT,
                  createdAt TEXT NOT NULL
              )
          `;

      this.db.run(createAccountsTable, [], (err) => {
        if (err) {
          console.error('Error creating accounts table', err);
        } else {
          console.log('Accounts table ready');

          // If we're in browser mode, check if we need to migrate data from localStorage
          this.migrateFromLocalStorage();
        }
      });
    });
  }

  /**
   * Migrate data from localStorage to SQLite if needed
   * This is useful for users who are upgrading from the localStorage version
   */
  migrateFromLocalStorage() {
    const savedAccounts = localStorage.getItem('imagePasswordAccounts');
    if (savedAccounts) {
      try {
        const accounts = JSON.parse(savedAccounts);

        // Check if we've already migrated
        const migrationFlag = localStorage.getItem('migrationComplete');
        if (!migrationFlag && accounts.length > 0) {
          console.log('Migrating accounts from localStorage to SQLite...');

          // Import each account to the database
          accounts.forEach(account => {
            this.addAccount(
              account.id,
              account.name,
              account.username,
              account.password,
              account.notes,
              account.createdAt
            );
          });

          // Set migration flag
          localStorage.setItem('migrationComplete', 'true');
          console.log('Migration complete!');
        }
      } catch (error) {
        console.error('Error migrating from localStorage:', error);
      }
    }
  }

  /**
   * Get all accounts from the database
   * @returns {Promise<Array>} Array of account objects
   */
  getAllAccounts() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM accounts', [], (err, rows) => {
        if (err) {
          console.error('Error getting accounts', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get a specific account by ID
   * @param {string} id - The account ID
   * @returns {Promise<Object|null>} The account object or null if not found
   */
  getAccount(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM accounts WHERE id = ?', id, (err, row) => {
        if (err) {
          console.error('Error getting account', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Add a new account to the database
   * @param {string} id - Unique ID for the account
   * @param {string} name - Account name
   * @param {string} username - Username for the account
   * @param {string} password - Image hash password
   * @param {string} notes - Optional notes
   * @param {string} createdAt - Creation timestamp
   * @returns {Promise<void>}
   */
  addAccount(id, name, username, password, notes, createdAt) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO accounts (id, name, username, password, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, username, password, notes || '', createdAt || new Date().toISOString()],
        function (err) {
          if (err) {
            console.error('Error adding account', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Update an existing account
   * @param {string} id - Account ID to update
   * @param {Object} data - Data to update (name, username, password, notes)
   * @returns {Promise<void>}
   */
  updateAccount(id, data) {
    return new Promise((resolve, reject) => {
      const { name, username, password, notes } = data;

      this.db.run(
        'UPDATE accounts SET name = ?, username = ?, password = ?, notes = ? WHERE id = ?',
        [name, username, password, notes || '', id],
        function (err) {
          if (err) {
            console.error('Error updating account', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * Delete an account from the database
   * @param {string} id - Account ID to delete
   * @returns {Promise<void>}
   */
  deleteAccount(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM accounts WHERE id = ?', id, function (err) {
        if (err) {
          console.error('Error deleting account', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Close the database connection
   */
  closeDatabase() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

// Export the DatabaseManager class
export default DatabaseManager;