// Image Password System

class ImagePasswordSystem {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  // Generate a perceptual hash for the image
  async generateImageHash(imageFile) {
    try {
      // Load the image
      const image = await this.loadImage(imageFile);

      // Resize to small dimensions to normalize the image
      this.canvas.width = 8;
      this.canvas.height = 8;

      // Draw the image in grayscale
      this.ctx.filter = 'grayscale(100%)';
      this.ctx.drawImage(image, 0, 0, 8, 8);

      // Get pixel data
      const pixelData = this.ctx.getImageData(0, 0, 8, 8).data;

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

      // Convert binary hash to hex for easier use
      const hexHash = this.binaryToHex(hash);

      return hexHash;
    } catch (error) {
      console.error('Error generating image hash:', error);
      throw error;
    }
  }

  // Load an image from a file
  loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = event.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Convert binary string to hexadecimal
  binaryToHex(binary) {
    let hex = '';
    for (let i = 0; i < binary.length; i += 4) {
      const chunk = binary.substr(i, 4);
      hex += parseInt(chunk, 2).toString(16);
    }
    return hex;
  }

  // Generate a password from the image hash
  generatePassword(hash) {
    // Create a more secure password by applying SHA-256 to the hash
    return this.sha256(hash);
  }

  // Simple implementation of SHA-256 (in a real app, use a proper crypto library)
  async sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  // Verify if an image matches the stored password
  async verifyImagePassword(imageFile, storedHash) {
    const hash = await this.generateImageHash(imageFile);
    const password = await this.generatePassword(hash);
    return password === storedHash;
  }
}

// Example usage
const app = {
  imagePasswordSystem: new ImagePasswordSystem(),
  storedPassword: null,

  init() {
    // Set up event listeners
    document.getElementById('registerButton').addEventListener('click', this.registerImage.bind(this));
    document.getElementById('verifyButton').addEventListener('click', this.verifyImage.bind(this));
  },

  async registerImage() {
    const fileInput = document.getElementById('registerImage');
    if (fileInput.files.length === 0) {
      this.showMessage('Please select an image to register');
      return;
    }

    try {
      const file = fileInput.files[0];
      const hash = await this.imagePasswordSystem.generateImageHash(file);
      this.storedPassword = await this.imagePasswordSystem.generatePassword(hash);

      this.showMessage(`Image registered! Generated password: ${this.storedPassword.substring(0, 10)}...`);
    } catch (error) {
      this.showMessage(`Error: ${error.message}`);
    }
  },

  async verifyImage() {
    const fileInput = document.getElementById('verifyImage');
    if (fileInput.files.length === 0) {
      this.showMessage('Please select an image to verify');
      return;
    }

    if (!this.storedPassword) {
      this.showMessage('Please register an image first');
      return;
    }

    try {
      const file = fileInput.files[0];
      const isMatch = await this.imagePasswordSystem.verifyImagePassword(file, this.storedPassword);

      if (isMatch) {
        this.showMessage('Success! The image matches the registered image.');
      } else {
        this.showMessage('Authentication failed. The image does not match.');
      }
    } catch (error) {
      this.showMessage(`Error: ${error.message}`);
    }
  },

  showMessage(message) {
    const messageElement = document.getElementById('message');
    messageElement.textContent = message;
  }
};

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});