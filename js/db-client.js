/**
 * Database client for the Image Password App
 * Communicates with the server API for database operations
 * Updated to use HTTPS
 */

class DatabaseClient {
  constructor() {
    this.apiUrl = 'https://localhost:3000/api';
  }

  /**
   * Get all accounts from the database
   * @returns {Promise<Array>} Array of account objects
   */
  async getAllAccounts() {
    try {
      const response = await fetch(`${this.apiUrl}/accounts`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch accounts');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching accounts:', error);

      // If server is unavailable, fallback to localStorage
      this.fallbackToLocalStorage('Error connecting to server. Using local storage as fallback.');

      // Get accounts from localStorage
      const savedAccounts = localStorage.getItem('imagePasswordAccounts');
      if (savedAccounts) {
        return JSON.parse(savedAccounts);
      }

      return [];
    }
  }

  /**
   * Get a specific account by ID
   * @param {string} id - The account ID
   * @returns {Promise<Object|null>} The account object or null if not found
   */
  async getAccount(id) {
    try {
      const response = await fetch(`${this.apiUrl}/accounts/${id}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch account');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching account:', error);

      // Fallback to localStorage
      this.fallbackToLocalStorage('Error connecting to server. Using local storage as fallback.');

      // Get accounts from localStorage
      const savedAccounts = localStorage.getItem('imagePasswordAccounts');
      if (savedAccounts) {
        const accounts = JSON.parse(savedAccounts);
        return accounts.find(account => account.id === id) || null;
      }

      return null;
    }
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
  async addAccount(id, name, username, password, notes, createdAt) {
    const accountData = {
      id,
      name,
      username,
      password,
      notes: notes || '',
      createdAt: createdAt || new Date().toISOString()
    };

    try {
      const response = await fetch(`${this.apiUrl}/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(accountData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add account');
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding account:', error);

      // Fallback to localStorage
      this.fallbackToLocalStorage('Error connecting to server. Saving to local storage as fallback.');

      // Add to localStorage
      const savedAccounts = localStorage.getItem('imagePasswordAccounts');
      let accounts = [];

      if (savedAccounts) {
        accounts = JSON.parse(savedAccounts);
      }

      accounts.push(accountData);
      localStorage.setItem('imagePasswordAccounts', JSON.stringify(accounts));

      return { message: 'Account added to local storage', id };
    }
  }

  /**
   * Update an existing account
   * @param {string} id - Account ID to update
   * @param {Object} data - Data to update (name, username, password, notes)
   * @returns {Promise<void>}
   */
  async updateAccount(id, data) {
    try {
      const response = await fetch(`${this.apiUrl}/accounts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating account:', error);

      // Fallback to localStorage
      this.fallbackToLocalStorage('Error connecting to server. Updating in local storage as fallback.');

      // Update in localStorage
      const savedAccounts = localStorage.getItem('imagePasswordAccounts');
      if (savedAccounts) {
        let accounts = JSON.parse(savedAccounts);
        const index = accounts.findIndex(account => account.id === id);

        if (index !== -1) {
          accounts[index] = { ...accounts[index], ...data };
          localStorage.setItem('imagePasswordAccounts', JSON.stringify(accounts));
          return { message: 'Account updated in local storage' };
        } else {
          throw new Error('Account not found in local storage');
        }
      } else {
        throw new Error('No accounts found in local storage');
      }
    }
  }

  /**
   * Delete an account from the database
   * @param {string} id - Account ID to delete
   * @returns {Promise<void>}
   */
  async deleteAccount(id) {
    try {
      const response = await fetch(`${this.apiUrl}/accounts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete account');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting account:', error);

      // Fallback to localStorage
      this.fallbackToLocalStorage('Error connecting to server. Deleting from local storage as fallback.');

      // Delete from localStorage
      const savedAccounts = localStorage.getItem('imagePasswordAccounts');
      if (savedAccounts) {
        let accounts = JSON.parse(savedAccounts);
        accounts = accounts.filter(account => account.id !== id);
        localStorage.setItem('imagePasswordAccounts', JSON.stringify(accounts));
        return { message: 'Account deleted from local storage' };
      } else {
        throw new Error('No accounts found in local storage');
      }
    }
  }

  /**
   * Display a fallback notification to the user
   * @param {string} message - The message to display
   */
  fallbackToLocalStorage(message) {
    // Check if the fallback message has already been shown
    const fallbackShown = sessionStorage.getItem('fallbackMessageShown');
    if (!fallbackShown) {
      const alertElement = document.getElementById('alert-message');
      if (alertElement) {
        alertElement.textContent = message;
        alertElement.className = 'alert alert-warning';
        alertElement.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
          alertElement.style.display = 'none';
        }, 5000);
      }

      // Set the flag to avoid showing the message multiple times
      sessionStorage.setItem('fallbackMessageShown', 'true');
    }
  }
}

export default DatabaseClient;