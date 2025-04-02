/**
 * Password Manager Application
 * Handles the UI and integration with the ImagePasswordSystem
 */

import ImagePasswordSystem from './image-password.js';

class PasswordManager {
  constructor() {
    this.imagePasswordSystem = new ImagePasswordSystem();
    this.accounts = [];
    this.loadAccounts();

    // Initialize UI elements
    this.initUI();
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

    // Account management
    document.getElementById('accounts-tab').addEventListener('click', () => this.updateAccountsList());

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

      // Add new account
      const newAccount = {
        id: Date.now().toString(),
        name: accountName,
        username: username,
        password: password,
        notes: notes,
        createdAt: new Date().toISOString()
      };

      this.accounts.push(newAccount);
      this.saveAccounts();

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
  deleteAccount(accountId) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    this.accounts = this.accounts.filter(account => account.id !== accountId);
    this.saveAccounts();

    this.updateAccountsList();
    this.updateAccountSelector();

    this.showAlert('Account deleted successfully!', 'success');
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
   * Load accounts from localStorage
   */
  loadAccounts() {
    try {
      // First try to load from file (will work if file exists and we're not in a browser)
      fetch('data/passwords.json')
        .then(response => response.json())
        .then(data => {
          this.accounts = data;
          this.updateAccountsList();
          this.updateAccountSelector();
        })
        .catch(err => {
          console.log('Could not load from file, trying localStorage');
          // Fall back to localStorage
          const savedAccounts = localStorage.getItem('imagePasswordAccounts');
          if (savedAccounts) {
            this.accounts = JSON.parse(savedAccounts);
            this.updateAccountsList();
            this.updateAccountSelector();
          }
        });
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.accounts = [];
    }
  }

  /**
   * Save accounts to localStorage and file if possible
   */
  saveAccounts() {
    // Save to localStorage
    localStorage.setItem('imagePasswordAccounts', JSON.stringify(this.accounts));

    // In a real application, you would send this data to a server
    // For this example, we'll just log that it would be saved
    console.log('Accounts saved to localStorage. In a real app, this would be saved to a server or file.');
  }
}

// Initialize the Password Manager and make it globally accessible
const app = new PasswordManager();
window.app = app; // Expose to global scope for event handlers