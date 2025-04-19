// Firebase configuration endpoint for the NFC Attendance System
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

// Initialize express app
const app = express();

// Middleware
app.use(cors());

// Firebase configuration endpoint - provides non-sensitive config to client
app.get('/', (req, res) => {
  // Get Firebase configuration from environment variables
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
  
  res.json(firebaseConfig);
});

// Export the serverless function
module.exports.handler = serverless(app);