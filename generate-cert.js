// Generate SSL certificates for HTTPS without requiring OpenSSL
// Save this as 'generate-cert.js'

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const forge = require('node-forge');

// Create certs directory if it doesn't exist
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

console.log('Generating SSL certificates...');

try {
  // Generate a private key
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const privateKey = forge.pki.privateKeyToPem(keys.privateKey);

  // Create a certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;

  // Set certificate attributes
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{
    name: 'commonName',
    value: 'localhost'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    name: 'stateOrProvinceName',
    value: 'State'
  }, {
    name: 'localityName',
    value: 'City'
  }, {
    name: 'organizationName',
    value: 'Organization'
  }, {
    name: 'organizationalUnitName',
    value: 'Unit'
  }];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Set extensions
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 2, // DNS
      value: 'localhost'
    }]
  }]);

  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Convert certificate to PEM format
  const certificate = forge.pki.certificateToPem(cert);

  // Write the key and certificate to files
  fs.writeFileSync(path.join(certsDir, 'key.pem'), privateKey);
  fs.writeFileSync(path.join(certsDir, 'cert.pem'), certificate);

  console.log('SSL certificates generated successfully in the certs folder!');
} catch (error) {
  console.error('Error generating SSL certificates:', error.message);
  process.exit(1);
}