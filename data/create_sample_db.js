const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the sample database
const dbPath = path.join(__dirname, 'sample_students.db');

// Remove existing database if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

// Create a new database
const db = new sqlite3.Database(dbPath);

// Create students table and insert sample data
db.serialize(() => {
  // Create the students table
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    major TEXT,
    stage TEXT,
    study TEXT,
    study_group TEXT
  )`);

  // Insert sample student records
  const students = [
    { id: 'ST1001', name: 'Ahmed Shukor', major: 'Computer Engineer', stage: '3', study: 'Morning', study_group: 'A' },
    { id: 'ST1002', name: 'Sarah Johnson', major: 'Engineering', stage: '2', study: 'Morning', study_group: 'B' },
    { id: 'ST1003', name: 'Michael Brown', major: 'Mathematics', stage: '4', study: 'Evening', study_group: 'A' },
    { id: 'ST1004', name: 'Emily Davis', major: 'Physics', stage: '1', study: 'Morning', study_group: 'C' },
    { id: 'ST1005', name: 'David Wilson', major: 'Computer Science', stage: '3', study: 'Evening', study_group: 'B' },
    { id: 'ST1006', name: 'Jennifer Lee', major: 'Biology', stage: '2', study: 'Morning', study_group: 'A' },
    { id: 'ST1007', name: 'Robert Taylor', major: 'Chemistry', stage: '3', study: 'Evening', study_group: 'C' },
    { id: 'ST1008', name: 'Lisa Anderson', major: 'Computer Science', stage: '1', study: 'Morning', study_group: 'B' },
    { id: 'ST1009', name: 'James Martin', major: 'Engineering', stage: '4', study: 'Evening', study_group: 'A' },
    { id: 'ST1010', name: 'Michelle Garcia', major: 'Mathematics', stage: '2', study: 'Morning', study_group: 'C' }
  ];

  // Prepare statement for inserting students
  const stmt = db.prepare('INSERT INTO students VALUES (?, ?, ?, ?, ?, ?)');
  
  // Insert each student
  students.forEach(student => {
    stmt.run(student.id, student.name, student.major, student.stage, student.study, student.study_group);
  });
  
  // Finalize the prepared statement
  stmt.finalize();

  console.log('Sample student database created successfully!');
});

// Close the database connection when done
db.close(err => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database connection closed.');
  }
});