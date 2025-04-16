# Web-Based NFC Attendance Management System

A comprehensive web-based attendance management system that integrates with NFC reader devices to record student attendance. The system supports role-based access control, distinguishing between Admin and Teacher users.

## Core Features

### User Roles & Permissions

#### Teacher Account:
- Logs in with a unique account
- Records attendance using an NFC reader device
- Imports student data by selecting a local .db file
- Views, exports, and resets their own attendance records
- Exports attendance data in .csv or .xlsx formats

#### Admin Account:
- Has access to all teacher accounts and their attendance records
- Views, edits, and deletes any attendance record
- Exports attendance data from any account in .csv or .xlsx format
- Resets attendance for any teacher or globally

### Database Integration
- Upload .db file containing student data (Name, Major, Stage, Study, Group)

### Attendance Tracking
- Records attendance by scanning NFC tags/cards
- Validates student identity against the database
- Saves timestamp with student data and teacher information

### Export & Reset Features
- Exports attendance to CSV or Excel (XLSX) format
- Resets attendance data (teacher-specific or global)

## Technology Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Database: SQLite for local storage
- Authentication: JWT-based authentication
- NFC Integration: Web NFC API (for compatible browsers)