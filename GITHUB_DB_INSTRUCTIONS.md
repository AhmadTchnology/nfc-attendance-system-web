# GitHub Database Integration Instructions

## Overview

This document explains how to use the new GitHub integration feature for storing and managing database files for the NFC Attendance System. This integration allows you to:

1. Store database files on GitHub instead of locally
2. Access your database from anywhere with internet access
3. Share databases between different devices
4. Keep everything free by leveraging GitHub's free storage

## Setup Instructions

### 1. Create a GitHub Repository

If you haven't already created a repository for your NFC Attendance System, follow the instructions in `GITHUB_INSTRUCTIONS.md` to create one.

### 2. Create a Personal Access Token

To upload database files to GitHub, you'll need a Personal Access Token:

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token" (classic)
3. Give it a descriptive name like "NFC Attendance System"
4. Select the "repo" scope to allow access to your repositories
5. Click "Generate token"
6. **IMPORTANT**: Copy the token immediately and store it securely. You won't be able to see it again!

### 3. Using the GitHub Integration

#### Loading Databases from GitHub

1. Log in to the NFC Attendance System
2. Navigate to the "Import Students" section
3. In the "Load Database from GitHub" section, select a database file from the dropdown
4. Click "Load Database"
5. The system will download and use the selected database

#### Uploading Databases to GitHub

1. Navigate to the "Import Students" section
2. In the "Upload Database to GitHub" section, select a local database file
3. Enter your GitHub Personal Access Token
4. Click "Upload to GitHub"
5. The database will be uploaded to your GitHub repository in the `databases` folder

## Troubleshooting

### Common Issues

1. **"GitHub API error"**: Make sure your Personal Access Token has the correct permissions (repo scope)
2. **"No database files found"**: If you haven't uploaded any databases yet, the dropdown will be empty
3. **"Failed to upload database"**: Check your internet connection and GitHub token

### NFC Simulation Mode

The system now includes an improved NFC simulation mode that works on all devices, not just Android. When the Web NFC API is not available (on non-Android devices or unsupported browsers), the system will automatically switch to simulation mode.

To use simulation mode:

1. Click "Start NFC Reader" on the attendance page
2. The system will detect if NFC is not supported and activate simulation mode
3. Use the simulation controls to select a sample student or create a custom entry
4. Click "Simulate Scan" to record attendance

## Benefits of GitHub Integration

- **Free Storage**: GitHub provides free storage for your database files
- **Version Control**: GitHub keeps track of all changes to your database files
- **Accessibility**: Access your databases from any device with internet access
- **Backup**: Your databases are safely stored in the cloud
- **Collaboration**: Multiple teachers can access the same database files

## Technical Details

The GitHub integration uses the GitHub API to interact with your repository. Database files are stored in the `databases` folder of your repository. The system uses your Personal Access Token to authenticate with GitHub, but the token is only stored in your browser session and never sent to our servers.

When you load a database from GitHub, the system downloads the file and uploads it to the server temporarily for use during your session. This ensures compatibility with the existing system while providing the benefits of cloud storage.