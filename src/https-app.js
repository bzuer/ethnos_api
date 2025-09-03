const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import existing app configuration
const app = require('./app');

// SSL Configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../ssl/ethnos-api-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../ssl/ethnos-api-cert.pem'))
};

// HTTPS Port from environment or default
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const HTTP_PORT = process.env.PORT || 3000;

// Create HTTPS server
const httpsServer = https.createServer(sslOptions, app);

// Start servers
if (process.env.ENABLE_HTTPS === 'true') {
  // Start both HTTP and HTTPS
  app.listen(HTTP_PORT, () => {
    console.log(`✓ HTTP Server running on port ${HTTP_PORT}`);
  });

  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`✓ HTTPS Server running on port ${HTTPS_PORT}`);
    console.log(`✓ SSL/TLS enabled with certificates`);
  });
} else {
  // Default HTTP only
  app.listen(HTTP_PORT, () => {
    console.log(`✓ HTTP Server running on port ${HTTP_PORT} (SSL disabled)`);
  });
}

module.exports = { app, httpsServer };