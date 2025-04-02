/**
 * Password Manager Application
 * Handles the UI and integration with the ImagePasswordSystem
 */

import ImagePasswordSystem from './image-password.js';
import DatabaseClient from './db-client.js';

class PasswordManager {
  constructor() {
    this.imagePasswordSystem = new ImagePasswordSystem();
    this.databaseClient = new DatabaseClient();
    this.accounts = [];

    // Initialize UI elements
    this.initUI();

    // Load accounts from database
    this.loadAccounts();
  }

  /**
   * Initialize UI elements and event listeners
   */
  initUI() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Register tab elements
    document.getElementById('register-image').addEventListener('change', e => this.previewImage(e.target.files[0]));
    document.getElementById('register-button').addEventListener('click', () => this.registerAccount());

    // Verify tab elements
    document.getElementById('account-selector').addEventListener('change', () => this.updateAccountSelection());
    document.getElementById('verify-button').addEventListener('click', () => this.verifyImage());

    // Add this line in the initUI() function to set up the event listener:
    document.getElementById('reset-verify-button').addEventListener('click', () => this.resetVerification());

    // Initialize lists
    this.updateAccountsList();
    this.updateAccountSelector();
  }

  /**
   * Switch between tabs
   * @param {string} tabId - The ID of the tab to switch to
   */
  switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
  }

  /**
   * Preview the selected image
   * @param {File} file - The image file to preview
   */
  previewImage(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('image-preview').src = e.target.result;
      document.getElementById('preview-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  /**
   * Register a new account with image password
   */
  async registerAccount() {
    const accountName = document.getElementById('account-name').value.trim();
    const username = document.getElementById('username').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const imageFile = document.getElementById('register-image').files[0];

    // Validate inputs
    if (!accountName) {
      this.showAlert('Please enter an account name', 'danger');
      return;
    }

    if (!username) {
      this.showAlert('Please enter a username', 'danger');
      return;
    }

    if (!imageFile) {
      this.showAlert('Please select an image', 'danger');
      return;
    }

    // Check if account already exists
    if (this.accounts.some(account => account.name === accountName)) {
      this.showAlert('An account with this name already exists', 'danger');
      return;
    }

    try {
      // Show loading indicator
      this.showAlert('Processing image...', 'info');

      // Generate password from image
      const hash = await this.imagePasswordSystem.generateImageHash(imageFile);
      const password = await this.imagePasswordSystem.generatePassword(hash);

      // Create new account object
      const newAccount = {
        id: Date.now().toString(),
        name: accountName,
        username: username,
        password: password,
        notes: notes,
        createdAt: new Date().toISOString()
      };

      // Add to database via client
      await this.databaseClient.addAccount(
        newAccount.id,
        newAccount.name,
        newAccount.username,
        newAccount.password,
        newAccount.notes,
        newAccount.createdAt
      );

      // Update local accounts array
      this.accounts.push(newAccount);

      // Update UI
      this.updateAccountsList();
      this.updateAccountSelector();

      // Clear form
      document.getElementById('account-name').value = '';
      document.getElementById('username').value = '';
      document.getElementById('notes').value = '';
      document.getElementById('register-image').value = '';
      document.getElementById('preview-container').style.display = 'none';

      this.showAlert('Account registered successfully!', 'success');
      this.switchTab('accounts');
    } catch (error) {
      this.showAlert(`Error: ${error.message}`, 'danger');
    }
  }

  /**
   * Verify image password for selected account
   */
  async verifyImage() {
    const accountId = document.getElementById('account-selector').value;
    const imageFile = document.getElementById('verify-image').files[0];

    // Validate inputs
    if (!accountId) {
      this.showAlert('Please select an account', 'danger');
      return;
    }

    if (!imageFile) {
      this.showAlert('Please select an image', 'danger');
      return;
    }

    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) {
      this.showAlert('Account not found', 'danger');
      return;
    }

    try {
      // Show loading indicator
      this.showAlert('Verifying image...', 'info');

      const isMatch = await this.imagePasswordSystem.verifyImagePassword(imageFile, account.password);

      if (isMatch) {
        document.getElementById('account-username').textContent = account.username;
        document.getElementById('account-notes').textContent = account.notes || 'None';
        document.getElementById('account-details').style.display = 'block';

        this.showAlert('Authentication successful!', 'success');
      } else {
        document.getElementById('account-details').style.display = 'none';
        this.showAlert('Authentication failed. The image does not match.', 'danger');
      }
    } catch (error) {
      this.showAlert(`Error: ${error.message}`, 'danger');
    }
  }

  /**
   * Delete an account
   * @param {string} accountId - The ID of the account to delete
   */
  async deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      // Delete from database via client
      await this.databaseClient.deleteAccount(accountId);

      // Update local accounts array
      this.accounts = this.accounts.filter(account => account.id !== accountId);

      // Update UI
      this.updateAccountsList();
      this.updateAccountSelector();

      this.showAlert('Account deleted successfully!', 'success');
    } catch (error) {
      this.showAlert(`Error deleting account: ${error.message}`, 'danger');
    }
  }

  /**
   * Update the accounts list in the UI
   */
  updateAccountsList() {
    const accountsList = document.getElementById('accounts-list');

    if (this.accounts.length === 0) {
      accountsList.innerHTML = '<p>No accounts found. Add one in the "Register New Image" tab.</p>';
      return;
    }

    let html = `
            <table>
                <thead>
                    <tr>
                        <th>Account</th>
                        <th>Username</th>
                        <th>Added On</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

    this.accounts.forEach(account => {
      const date = new Date(account.createdAt).toLocaleDateString();

      html += `
                <tr>
                    <td>${account.name}</td>
                    <td>${account.username}</td>
                    <td>${date}</td>
                    <td>
                        <button class="danger" onclick="app.deleteAccount('${account.id}')">Delete</button>
                    </td>
                </tr>
            `;
    });

    html += `
                </tbody>
            </table>
        `;

    accountsList.innerHTML = html;
  }

  /**
   * Update the account selector dropdown
   */
  updateAccountSelector() {
    const selector = document.getElementById('account-selector');

    // Clear current options
    selector.innerHTML = '<option value="">Select an account</option>';

    // Add options for each account
    this.accounts.forEach(account => {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = account.name;
      selector.appendChild(option);
    });

    // Hide account details when selection changes
    document.getElementById('account-details').style.display = 'none';
  }

  /**
   * Update UI when account selection changes
   */
  updateAccountSelection() {
    document.getElementById('account-details').style.display = 'none';
  }

  /**
   * Show an alert message
   * @param {string} message - The message to display
   * @param {string} type - The type of alert (success, danger, info, warning)
   */
  showAlert(message, type) {
    const alertElement = document.getElementById('alert-message');
    alertElement.textContent = message;
    alertElement.className = `alert alert-${type}`;
    alertElement.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      alertElement.style.display = 'none';
    }, 5000);
  }

  /**
   * Load accounts from the database
   */
  async loadAccounts() {
    try {
      // Show loading message
      document.getElementById('accounts-list').innerHTML = '<p>Loading accounts from database...</p>';

      // Get accounts from database via client
      const accounts = await this.databaseClient.getAllAccounts();
      this.accounts = accounts;

      // Update UI
      this.updateAccountsList();
      this.updateAccountSelector();
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.showAlert('Error loading accounts from database', 'danger');
    }
  }

  /**
 * Reset the verification form and state
 */
  resetVerification() {
    // Reset the file input
    document.getElementById('verify-image').value = '';

    // Hide account details
    document.getElementById('account-details').style.display = 'none';

    // Clear any alerts
    document.getElementById('alert-message').style.display = 'none';
  }

}

// Initialize the Password Manager and make it globally accessible
const app = new PasswordManager();
window.app = app; // Expose to global scope for event handlers