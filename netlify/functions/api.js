// API routes for the NFC Attendance System
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const XLSX = require('xlsx');
const fetch = require('node-fetch');


// Load environment variables
require('dotenv').config();

// GitHub configuration from environment variables
const GITHUB_CONFIG = {
  token: process.env.GITHUB_TOKEN,
  owner: process.env.GITHUB_OWNER,
  repo: process.env.GITHUB_REPO,
  branch: process.env.GITHUB_BRANCH,
  dbFolder: 'databases'
};

// Initialize express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// GitHub configuration endpoint - provides non-sensitive config to client
app.get('/github-config', (req, res) => {
  // Set proper content type header to ensure JSON parsing works correctly
  res.setHeader('Content-Type', 'application/json');
  res.json({
    owner: GITHUB_CONFIG.owner,
    repo: GITHUB_CONFIG.repo,
    branch: GITHUB_CONFIG.branch,
    dbFolder: GITHUB_CONFIG.dbFolder
  });
});

// Upload to GitHub endpoint
app.post('/upload-to-github', authenticateToken, upload.single('database'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No database file provided' });
    }

    // Read the file as base64
    const fileContent = fs.readFileSync(req.file.path);
    const base64Content = Buffer.from(fileContent).toString('base64');

    // Generate a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${req.file.originalname.replace('.db', '')}_${timestamp}.db`;
    const path = `${GITHUB_CONFIG.dbFolder}/${fileName}`;

    // Ensure the folder exists
    await ensureGitHubFolderExists();

    // Upload the file to GitHub
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Upload database file: ${fileName}`,
        content: base64Content,
        branch: GITHUB_CONFIG.branch
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    // Clean up the temporary file
    fs.unlinkSync(req.file.path);

    res.json({ message: `Database uploaded successfully to GitHub: ${fileName}` });
  } catch (error) {
    console.error('Error uploading to GitHub:', error);
    res.status(500).json({ message: `Error uploading to GitHub: ${error.message}` });
  }
});

// Helper function to ensure the GitHub folder exists
async function ensureGitHubFolderExists() {
  try {
    // Check if the folder exists
    const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dbFolder}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_CONFIG.token}`
      }
    });

    if (response.status === 404) {
      // Folder doesn't exist, create it
      const createResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.dbFolder}/.gitkeep`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_CONFIG.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Create databases folder',
            content: Buffer.from('').toString('base64'),
            branch: GITHUB_CONFIG.branch
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error('Failed to create databases folder');
      }
    }
  } catch (error) {
    console.error('Error ensuring GitHub folder exists:', error);
    throw error;
  }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Ensure data directories exist - use /tmp for Netlify Functions
const dataDir = process.env.NETLIFY ? '/tmp' : path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database setup
const dbPath = path.join(dataDir, 'system.db');
console.log('Using database path:', dbPath);
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Users table (for authentication)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    student_db_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Attendance records table
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    major TEXT,
    stage TEXT,
    study TEXT,
    study_group TEXT,
    teacher_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
  )`);

  // Create default admin account with specified credentials
  db.get("SELECT * FROM users WHERE role = 'admin'", (err, row) => {
    if (err) {
      console.error(err.message);
    }
    // Delete any existing admin accounts
    db.run("DELETE FROM users WHERE role = 'admin'", (delErr) => {
      if (delErr) {
        console.error('Error deleting existing admin accounts:', delErr.message);
      }
      
      // Create the default admin account with specified credentials
      const hashedPassword = bcrypt.hashSync('NiceWork2025', 10);
      db.run(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        ['Ahmad Tech', hashedPassword, 'admin'],
        function(err) {
          if (err) {
            console.error('Error creating default admin account:', err.message);
          } else {
            console.log('Default admin account created successfully');
          }
        }
      );
    });
  });
});

// JWT Secret
const JWT_SECRET = 'nfc-attendance-system-secret';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin authorization middleware
const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// File upload configuration for student database
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, dataDir); // This now points to /tmp on Netlify
  },
  filename: function(req, file, cb) {
    cb(null, 'students_' + req.user.id + '_' + Date.now() + '.db');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    if (file.mimetype !== 'application/x-sqlite3' && !file.originalname.endsWith('.db')) {
      return cb(new Error('Only SQLite database files are allowed'));
    }
    cb(null, true);
  }
});

// Routes

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const passwordIsValid = bcrypt.compareSync(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      token
    });
  });
});

// Logout route
app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Create teacher account (admin only)
app.post('/users', authenticateToken, authorizeAdmin, (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    [username, hashedPassword, 'teacher'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Username already exists' });
        }
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.status(201).json({
        id: this.lastID,
        username,
        role: 'teacher'
      });
    }
  );
});

// Upload student database file
app.post('/upload-db', authenticateToken, upload.single('database'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  
  // Store the file path in the user's session or database
  const dbFilePath = req.file.path;
  
  // First check if student_db_path column exists, and add it if it doesn't
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error('Error checking table schema:', err.message);
      return res.status(500).json({ message: 'Database error: ' + err.message });
    }
    
    // Check if student_db_path column exists in the results
    const hasStudentDbPath = rows && Array.isArray(rows) && rows.some(row => row.name === 'student_db_path');
    
    if (!hasStudentDbPath) {
      // Add the column if it doesn't exist
      db.run("ALTER TABLE users ADD COLUMN student_db_path TEXT", (alterErr) => {
        if (alterErr) {
          console.error('Error adding student_db_path column:', alterErr.message);
          return res.status(500).json({ message: 'Error updating database schema: ' + alterErr.message });
        }
        updateUserRecord();
      });
    } else {
      updateUserRecord();
    }
  });
  
  // Function to update the user record with the database path
  function updateUserRecord() {
    try {
      db.run(
        "UPDATE users SET student_db_path = ? WHERE id = ?",
        [dbFilePath, req.user.id],
        function(err) {
          if (err) {
            console.error('Error updating user record:', err.message);
            return res.status(500).json({ message: 'Error updating user record: ' + err.message });
          }
          res.json({ message: 'Database uploaded successfully', path: dbFilePath });
        }
      );
    } catch (error) {
      console.error('Exception during database update:', error);
      return res.status(500).json({ message: 'Server error during database update' });
    }
  }
});

// Record attendance
app.post('/attendance', authenticateToken, (req, res) => {
  const { student_id, student_name, major, stage, study, study_group } = req.body;
  
  if (!student_id || !student_name) {
    return res.status(400).json({ message: 'Student ID and name are required' });
  }
  
  db.run(
    `INSERT INTO attendance 
    (student_id, student_name, major, stage, study, study_group, teacher_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [student_id, student_name, major, stage, study, study_group, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      
      res.status(201).json({
        id: this.lastID,
        student_id,
        student_name,
        timestamp: new Date().toISOString()
      });
    }
  );
});

// Get attendance records (filtered by teacher for non-admin users)
app.get('/attendance', authenticateToken, (req, res) => {
  let query = "SELECT * FROM attendance";
  let params = [];
  
  if (req.user.role !== 'admin') {
    query += " WHERE teacher_id = ?";
    params.push(req.user.id);
  }
  
  query += " ORDER BY timestamp DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(rows);
  });
});

// Export attendance records to CSV/XLSX
app.get('/export', authenticateToken, (req, res) => {
  const format = req.query.format || 'csv';
  const teacherId = req.query.teacher_id;
  
  let query = "SELECT * FROM attendance";
  let params = [];
  
  if (req.user.role !== 'admin' || teacherId) {
    query += " WHERE teacher_id = ?";
    params.push(teacherId || req.user.id);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    
    // Generate file path
    const fileName = `attendance_export_${Date.now()}.${format}`;
    const filePath = path.join(dataDir, fileName);
    
    if (format === 'xlsx') {
      XLSX.writeFile(wb, filePath);
    } else {
      // Default to CSV
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      fs.writeFileSync(filePath, csvContent);
    }
    
    // For Netlify functions, we need to return the file content instead of using res.download
    const fileContent = fs.readFileSync(filePath);
    const base64Content = fileContent.toString('base64');
    
    // Clean up the file
    fs.unlinkSync(filePath);
    
    res.json({
      fileName: fileName,
      fileContent: base64Content,
      contentType: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
    });
  });
});

// Reset attendance records
app.delete('/attendance/reset', authenticateToken, (req, res) => {
  const teacherId = req.query.teacher_id;
  
  let query = "DELETE FROM attendance";
  let params = [];
  
  if (req.user.role !== 'admin') {
    // Teachers can only reset their own records
    query += " WHERE teacher_id = ?";
    params.push(req.user.id);
  } else if (teacherId) {
    // Admins can reset specific teacher's records
    query += " WHERE teacher_id = ?";
    params.push(teacherId);
  }
  // If no teacherId is provided and user is admin, all records will be deleted
  
  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    
    res.json({ 
      message: 'Attendance records reset successfully',
      count: this.changes
    });
  });
});

// Get all teachers (admin only)
app.get('/users', authenticateToken, authorizeAdmin, (req, res) => {
  db.all("SELECT id, username, role, created_at FROM users WHERE role = 'teacher'", (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(rows);
  });
});

// Export the serverless handler
module.exports.handler = serverless(app);