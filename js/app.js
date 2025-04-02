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

    // Check if reset button exists before adding event listener
    const resetButton = document.getElementById('reset-verify-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.fullResetVerification());
    }

    document.getElementById('generate-password-button').addEventListener('click', () => this.generateImagePassword());

    // Always call resetVerificationState - it will create the button if needed
    this.resetVerificationState();

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
        type: 'uploaded', // This is an uploaded image
        createdAt: new Date().toISOString()
      };

      // Add to database via client
      await this.databaseClient.addAccount(
        newAccount.id,
        newAccount.name,
        newAccount.username,
        newAccount.password,
        newAccount.notes,
        newAccount.type,
        null, // No rawSeed for uploaded images
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
   * This method belongs in the app.js file, not in ImagePasswordSystem
   */
  async verifyImage() {
    // Get the current selections
    const accountId = document.getElementById('account-selector').value;
    const fileInput = document.getElementById('verify-image');
    const imageFile = fileInput.files[0];

    // Reset previous verification state
    document.getElementById('account-details').style.display = 'none';

    // Validate inputs
    if (!accountId) {
      this.showAlert('Please select an account', 'danger');
      return;
    }

    if (!imageFile) {
      this.showAlert('Please select an image', 'danger');
      return;
    }

    // Find the selected account
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) {
      this.showAlert('Account not found', 'danger');
      return;
    }

    try {
      // Show loading indicator
      this.showAlert('Verifying image...', 'info');

      let isMatch = false;

      // Check if this is a generated password or an uploaded image
      if (account.type === 'generated' && account.rawSeed) {
        console.log("Verifying a generated password image");

        // For generated passwords, we just hash the stored raw seed and compare
        // with the stored password - we don't actually need to process the image
        const expectedPassword = await this.imagePasswordSystem.generatePassword(account.rawSeed);
        isMatch = (expectedPassword === account.password);

        console.log("Generated password verification:", isMatch ? "Successful" : "Failed");
      } else {
        console.log("Verifying an uploaded image");

        // For uploaded images, use the standard perceptual hash verification
        isMatch = await this.imagePasswordSystem.verifyImagePassword(imageFile, account.password);

        console.log("Uploaded image verification:", isMatch ? "Successful" : "Failed");
      }

      // Reset the file input to ensure a fresh file read on next attempt
      fileInput.value = '';

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
      console.error("Verification error:", error);
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
   * Update the account selector dropdown and handle selection changes
   * Add this to your app.js file
   */

  // Enhanced method to update the account selector
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

    // Set up event listener for selection changes
    selector.addEventListener('change', () => this.handleAccountSelectionChange());
  }

  /**
  * Handle account selection changes
  * This ensures we completely reset the verification state when switching accounts
  */
  handleAccountSelectionChange() {
    // Reset verification UI
    document.getElementById('account-details').style.display = 'none';

    // Clear file input to force a fresh file selection
    const fileInput = document.getElementById('verify-image');
    if (fileInput) {
      fileInput.value = '';
    }

    // Clear any previous alerts
    const alertElement = document.getElementById('alert-message');
    if (alertElement) {
      alertElement.style.display = 'none';
    }

    // Log the selection change for debugging
    const selectedAccountId = document.getElementById('account-selector').value;
    if (selectedAccountId) {
      const account = this.accounts.find(acc => acc.id === selectedAccountId);
      console.log('Account selection changed to:', account ? account.name : 'None');
    } else {
      console.log('No account selected');
    }
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

      // Get accounts from database via client with detailed error logging
      console.log("Attempting to load accounts from database...");
      let accounts = [];
      try {
        accounts = await this.databaseClient.getAllAccounts();
        console.log(`Successfully loaded ${accounts.length} accounts from database`);
      } catch (dbError) {
        console.error('Database error:', dbError);

        // Fallback to localStorage
        console.log("Falling back to localStorage...");
        const savedAccounts = localStorage.getItem('imagePasswordAccounts');
        if (savedAccounts) {
          accounts = JSON.parse(savedAccounts);
          console.log(`Loaded ${accounts.length} accounts from localStorage`);
        }

        this.showAlert('Database connection failed, using localStorage instead', 'warning');
      }

      this.accounts = accounts;

      // Update UI
      this.updateAccountsList();
      this.updateAccountSelector();
    } catch (error) {
      console.error('Critical error loading accounts:', error);
      this.showAlert('Error loading accounts. Check console for details', 'danger');
    }
  }

  /**
   * Completely reset the verification state
   * This can be called at any time to ensure a fresh verification process
   */
  resetVerificationState() {
    console.log('Resetting verification state');

    // Reset UI elements
    document.getElementById('account-details').style.display = 'none';

    // Clear file input
    const fileInput = document.getElementById('verify-image');
    if (fileInput) {
      fileInput.value = '';
    }

    // Reset any temporary data
    this._lastVerification = null;

    // Clear canvas cache
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1;
    canvas.height = 1;
    ctx.clearRect(0, 0, 1, 1);

    // Force garbage collection if possible
    if (window.gc) {
      window.gc();
    }

    // Only add the reset button if neither reset-verify-button nor reset-verification-button exists
    if (!document.getElementById('reset-verify-button') && !document.getElementById('reset-verification-button')) {
      const verifyButton = document.getElementById('verify-button');
      if (verifyButton) {
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-verify-button';
        resetButton.className = 'secondary';
        resetButton.textContent = 'Reset';
        resetButton.style.marginLeft = '10px';
        resetButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.resetVerificationState();
          this.showAlert('Verification state has been reset', 'info');
        });

        verifyButton.parentNode.insertBefore(resetButton, verifyButton.nextSibling);
      }
    }
  }

  // Add this method to alias resetVerificationState for consistency
  resetVerification() {
    this.resetVerificationState();
  }

  /**
 * Generate an image based on a password string
 * This creates a unique visual representation of the password
 *
 * @param {string} password - The password to visualize
 * @returns {Promise<Blob>} - A Blob containing the generated image
 */
  async generateImageFromPassword(password) {
    // Create a canvas to draw the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size (you can adjust as needed)
    canvas.width = 256;
    canvas.height = 256;

    // Create a hash from the password for consistent image generation
    const hash = await this.imagePasswordSystem.sha256(password);

    // Convert the hash to an array of numbers we can use to drive the visualization
    const values = [];
    for (let i = 0; i < hash.length; i += 2) {
      values.push(parseInt(hash.substr(i, 2), 16));
    }

    // Fill background
    ctx.fillStyle = `rgb(${values[0]}, ${values[1]}, ${values[2]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set number of shapes to draw based on hash
    const numShapes = 20 + (values[3] % 30);

    // Draw shapes based on the hash values
    for (let i = 0; i < numShapes; i++) {
      // Get color from hash values
      const colorIndex = (i * 3) % values.length;
      const r = values[(colorIndex) % values.length];
      const g = values[(colorIndex + 1) % values.length];
      const b = values[(colorIndex + 2) % values.length];

      // Set shape style
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;

      // Choose shape type based on hash values
      const shapeType = values[(i + 4) % values.length] % 3;

      // Get position and size from hash values
      const x = (values[(i + 5) % values.length] / 255) * canvas.width;
      const y = (values[(i + 6) % values.length] / 255) * canvas.height;
      const size = 10 + ((values[(i + 7) % values.length] / 255) * 50);

      // Draw different shapes based on the hash
      if (shapeType === 0) {
        // Circle
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (shapeType === 1) {
        // Rectangle
        ctx.fillRect(x, y, size, size);
      } else {
        // Triangle
        ctx.beginPath();
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x + size / 2, y + size / 2);
        ctx.lineTo(x - size / 2, y + size / 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Add some lines for additional uniqueness
    ctx.strokeStyle = `rgb(${values[8]}, ${values[9]}, ${values[10]})`;
    ctx.lineWidth = 2 + (values[11] % 4);

    for (let i = 0; i < 5; i++) {
      const startX = (values[(i * 2 + 12) % values.length] / 255) * canvas.width;
      const startY = (values[(i * 2 + 13) % values.length] / 255) * canvas.height;
      const endX = (values[(i * 2 + 14) % values.length] / 255) * canvas.width;
      const endY = (values[(i * 2 + 15) % values.length] / 255) * canvas.height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });
  }


  /**
 * Generate a random password string
 *
 * @param {number} length - The length of the password
 * @returns {string} - A random password string
 */
  generateRandomPassword(length = 16) {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";

    // Create a Uint8Array with random values
    const randomValues = new Uint8Array(length);
    window.crypto.getRandomValues(randomValues);

    // Use the random values to select characters from the charset
    for (let i = 0; i < length; i++) {
      const randomIndex = randomValues[i] % charset.length;
      password += charset[randomIndex];
    }

    return password;
  }

  /**
 * Generate and save an image password
 */
  /**
 * Generate and save an image password
 */
  async generateImagePassword() {
    try {
      // Show loading indicator
      this.showAlert('Generating password image...', 'info');

      // Get account details from form
      const accountName = document.getElementById('account-name').value.trim();
      const username = document.getElementById('username').value.trim();
      const notes = document.getElementById('notes').value.trim();

      // Validate inputs
      if (!accountName) {
        this.showAlert('Please enter an account name', 'danger');
        return;
      }

      if (!username) {
        this.showAlert('Please enter a username', 'danger');
        return;
      }

      // Check if account already exists
      if (this.accounts.some(account => account.name === accountName)) {
        this.showAlert('An account with this name already exists', 'danger');
        return;
      }

      // Generate a random password
      const rawPassword = this.generateRandomPassword(20);

      // Generate an image from the raw password
      const imageBlob = await this.generateImageFromPassword(rawPassword);

      // Calculate a perceptual hash of the generated image
      // We'll use this hash for verification later
      const imageHash = await this.calculateImagePerceptualHash(imageBlob);

      // Create a download link for the generated image
      const downloadUrl = URL.createObjectURL(imageBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `${accountName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_password.png`;

      // Create new account object
      const newAccount = {
        id: Date.now().toString(),
        name: accountName,
        username: username,
        password: imageHash, // Store the image hash as the password
        notes: notes,
        type: 'generated',
        createdAt: new Date().toISOString()
      };

      // Add to database via client
      await this.databaseClient.addAccount(
        newAccount.id,
        newAccount.name,
        newAccount.username,
        newAccount.password,
        newAccount.notes,
        newAccount.type,
        null, // We don't need to store the raw seed anymore
        newAccount.createdAt
      );

      // Update local accounts array
      this.accounts.push(newAccount);

      // Update UI
      this.updateAccountsList();
      this.updateAccountSelector();

      // Show preview of the generated image
      const imagePreview = document.getElementById('image-preview');
      imagePreview.src = downloadUrl;
      document.getElementById('preview-container').style.display = 'block';

      // Initiate download of the generated image
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Clear form fields
      document.getElementById('account-name').value = '';
      document.getElementById('username').value = '';
      document.getElementById('notes').value = '';

      // Show success message with additional instructions
      this.showAlert('Password image generated and downloaded! Save this image securely - you will need it to log in.', 'success');

    } catch (error) {
      console.error('Error generating image password:', error);
      this.showAlert(`Error: ${error.message}`, 'danger');
    }
  }

  /**
   * Calculate a perceptual hash of an image blob
   * @param {Blob} imageBlob - The image blob
   * @returns {Promise<string>} - The perceptual hash
   */
  async calculateImagePerceptualHash(imageBlob) {
    // Convert blob to image
    const imageURL = URL.createObjectURL(imageBlob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        // Create a small canvas for the perceptual hash
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Resize to small dimensions for the hash
        canvas.width = 8;
        canvas.height = 8;

        // Draw the image in grayscale
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, 0, 0, 8, 8);

        // Get pixel data
        const pixelData = ctx.getImageData(0, 0, 8, 8).data;

        // Calculate average pixel value
        let sum = 0;
        for (let i = 0; i < pixelData.length; i += 4) {
          sum += pixelData[i]; // Just using red channel since image is grayscale
        }
        const avg = sum / (pixelData.length / 4);

        // Generate binary hash based on whether pixel is above or below average
        let hash = '';
        for (let i = 0; i < pixelData.length; i += 4) {
          hash += pixelData[i] >= avg ? '1' : '0';
        }

        // Convert binary hash to hex
        let hexHash = '';
        for (let i = 0; i < hash.length; i += 4) {
          const chunk = hash.substr(i, 4);
          hexHash += parseInt(chunk, 2).toString(16);
        }

        // We have our perceptual hash
        resolve(hexHash);

        // Clean up
        URL.revokeObjectURL(imageURL);
      };

      img.onerror = () => {
        URL.revokeObjectURL(imageURL);
        reject(new Error('Failed to load image for hashing'));
      };

      img.src = imageURL;
    });
  }

  /**
   * Verify image password for selected account
   */
  async verifyImage() {
    // Store the selected values before anything happens
    const accountId = document.getElementById('account-selector').value;
    const fileInput = document.getElementById('verify-image');

    // Create a FileReader to safely read the file data
    let imageData = null;
    if (fileInput.files && fileInput.files.length > 0) {
      const reader = new FileReader();
      // Create a promise to handle the async file reading
      imageData = await new Promise((resolve, reject) => {
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(fileInput.files[0]);
      });
    }

    // If no image was selected, show an error
    if (!imageData) {
      this.showAlert('Please select an image', 'danger');
      return;
    }

    // Reset verification state
    document.getElementById('account-details').style.display = 'none';

    // Check if an account was selected
    if (!accountId) {
      this.showAlert('Please select an account', 'danger');
      return;
    }

    // Find the selected account
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) {
      this.showAlert('Account not found', 'danger');
      return;
    }

    try {
      // Show loading indicator
      this.showAlert('Verifying image...', 'info');

      // Create a new Image element from the data
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageData;
      });

      // Now convert the image back to a File object
      const blob = await fetch(imageData).then(r => r.blob());
      const file = new File([blob], "verification-image.png", { type: "image/png" });

      let isMatch = false;

      // Perform verification based on account type
      if (account.type === 'generated') {
        console.log("Verifying a generated password image");

        // Calculate hash of the uploaded image
        const uploadedHash = await this.imagePasswordSystem.generateImageHash(file);
        console.log("Generated image hash:", uploadedHash);
        console.log("Stored image hash:", account.password);

        // Compare with the stored hash
        isMatch = (uploadedHash === account.password);
      } else {
        console.log("Verifying an uploaded image");

        // Use standard verification
        isMatch = await this.imagePasswordSystem.verifyImagePassword(file, account.password);
      }

      console.log("Verification result:", isMatch);

      if (isMatch) {
        document.getElementById('account-username').textContent = account.username;
        document.getElementById('account-notes').textContent = account.notes || 'None';
        document.getElementById('account-details').style.display = 'block';

        this.showAlert('Authentication successful!', 'success');
      } else {
        document.getElementById('account-details').style.display = 'none';
        this.showAlert('Authentication failed. The image does not match.', 'danger');
      }

      // Always perform a full reset after verification
      // Delay slightly to ensure the alert is visible
      setTimeout(() => {
        this.fullResetVerification();
      }, 2000);
    } catch (error) {
      console.error("Verification error:", error);
      this.showAlert(`Error: ${error.message}`, 'danger');

      // Reset on error as well
      setTimeout(() => {
        this.fullResetVerification();
      }, 2000);
    }
  }

  /**
 * Completely reset the verification process
 * This ensures a fresh start for image verification
 */
  async fullResetVerification() {
    console.log('Performing full verification reset');

    // Clear UI state
    document.getElementById('account-details').style.display = 'none';

    // Create a new file input to replace the existing one
    const fileInputContainer = document.getElementById('verify-image').parentNode;
    const oldFileInput = document.getElementById('verify-image');

    // Create new file input with same attributes
    const newFileInput = document.createElement('input');
    newFileInput.type = 'file';
    newFileInput.id = 'verify-image';
    newFileInput.accept = 'image/*';

    // Replace the old input with the new one
    if (fileInputContainer && oldFileInput) {
      fileInputContainer.replaceChild(newFileInput, oldFileInput);
    }

    // Clear any alerts
    const alertElement = document.getElementById('alert-message');
    if (alertElement) {
      alertElement.style.display = 'none';
    }

    // Create a fresh ImagePasswordSystem instance
    this.imagePasswordSystem = new ImagePasswordSystem();

    // Clear browser cache for any canvas operations
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Resize to minimal dimensions to clear memory
      canvas.width = 1;
      canvas.height = 1;
    });

    // Add a small delay to ensure everything is reset
    await new Promise(resolve => setTimeout(resolve, 100));

    this.showAlert('Verification has been fully reset', 'info');
  }
}

// Initialize the Password Manager and make it globally accessible
const app = new PasswordManager();
window.app = app; // Expose to global scope for event handlers