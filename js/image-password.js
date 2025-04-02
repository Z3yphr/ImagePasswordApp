/**
 * ImagePasswordSystem - Core functionality for image-based password generation
 * This module handles the perceptual hashing of images and password verification
 */

class ImagePasswordSystem {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Generate a perceptual hash for the image
   * @param {File} imageFile - The image file to hash
   * @returns {Promise<string>} A hex string representing the image hash
   */
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

  /**
   * Load an image from a file
   * @param {File} file - The image file to load
   * @returns {Promise<HTMLImageElement>} The loaded image element
   */
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

  /**
   * Convert binary string to hexadecimal
   * @param {string} binary - Binary string to convert
   * @returns {string} Hexadecimal representation
   */
  binaryToHex(binary) {
    let hex = '';
    for (let i = 0; i < binary.length; i += 4) {
      const chunk = binary.substr(i, 4);
      hex += parseInt(chunk, 2).toString(16);
    }
    return hex;
  }

  /**
   * Generate a password from the image hash
   * @param {string} hash - The image hash
   * @returns {Promise<string>} The generated password
   */
  async generatePassword(hash) {
    // Create a more secure password by applying SHA-256 to the hash
    return this.sha256(hash);
  }

  /**
   * Simple implementation of SHA-256
   * @param {string} message - The message to hash
   * @returns {Promise<string>} SHA-256 hash as hex string
   */
  async sha256(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
 * Verify if an image matches the stored password
 * This is the correct method for the ImagePasswordSystem class
 *
 * @param {File} imageFile - The image file to verify
 * @param {string} storedHash - The stored password hash to check against
 * @returns {Promise<boolean>} Whether the image matches the stored password
 */
  async verifyImagePassword(imageFile, storedHash) {
    try {
      // Generate a unique identifier for this verification attempt
      const verificationId = Date.now().toString();
      console.log(`Starting verification ${verificationId}`);

      // Load the image manually to ensure no caching
      const image = await this.loadImage(imageFile);
      console.log(`Verification ${verificationId}: Image loaded, dimensions: ${image.width}x${image.height}`);

      // Create a fresh canvas for this verification
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Resize to small dimensions to normalize the image
      canvas.width = 8;
      canvas.height = 8;

      // Draw the image in grayscale
      ctx.filter = 'grayscale(100%)';
      ctx.drawImage(image, 0, 0, 8, 8);

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

      // Convert binary hash to hex for easier use
      const hexHash = this.binaryToHex(hash);
      console.log(`Verification ${verificationId}: Generated hash: ${hexHash}`);

      // Generate password from the hash
      const password = await this.generatePassword(hexHash);
      console.log(`Verification ${verificationId}: Generated password: ${password.substring(0, 10)}...`);
      console.log(`Verification ${verificationId}: Stored password: ${storedHash.substring(0, 10)}...`);

      // Compare the generated password with the stored one
      const isMatch = password === storedHash;
      console.log(`Verification ${verificationId}: Password match: ${isMatch}`);

      return isMatch;
    } catch (error) {
      console.error('Error verifying image password:', error);
      throw error;
    }
  }
}

// Export the class for use in other modules
export default ImagePasswordSystem;