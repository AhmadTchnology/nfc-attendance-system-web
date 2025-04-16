// GitHub Integration for NFC Attendance System
// This module handles fetching database files from GitHub

const GitHubIntegration = {
    // Configuration
    config: {
        owner: 'AhmadTchnology', // GitHub username
        repo: 'nfc-attendance-system-web', // Repository name
        branch: 'main', // Branch name
        dbFolder: 'databases', // Folder in the repo where .db files are stored
        apiUrl: 'https://api.github.com'
    },

    /**
     * Initialize the GitHub integration
     */
    init() {
        console.log('GitHub Integration initialized');
        this.setupUI();
        this.loadAvailableDatabases();
    },

    /**
     * Set up the UI for GitHub integration
     */
    setupUI() {
        // Get the import section
        const importSection = document.getElementById('import-section');
        if (!importSection) return;

        // Create GitHub section
        const githubSection = document.createElement('div');
        githubSection.className = 'github-integration';
        githubSection.innerHTML = `
            <h3>Load Database from GitHub</h3>
            <p>Select a database file from the repository:</p>
            <div class="form-group">
                <select id="github-db-select" class="form-control">
                    <option value="">-- Select a database file --</option>
                </select>
            </div>
            <button id="github-load-btn" class="btn btn-primary">Load Database</button>
            <div id="github-status" class="status-message"></div>
        `;

        // Insert before the current import form
        const importForm = document.querySelector('.import-container');
        importSection.insertBefore(githubSection, importForm);

        // Add separator
        const separator = document.createElement('div');
        separator.className = 'separator';
        separator.innerHTML = '<span>OR</span>';
        importSection.insertBefore(separator, importForm);

        // Add event listener for the load button
        document.getElementById('github-load-btn').addEventListener('click', () => this.handleDatabaseLoad());

        // Add some styles
        const style = document.createElement('style');
        style.textContent = `
            .github-integration {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f0f8ff;
                border: 1px solid #b3d7ff;
                border-radius: 5px;
            }
            .separator {
                display: flex;
                align-items: center;
                text-align: center;
                margin: 20px 0;
            }
            .separator::before,
            .separator::after {
                content: '';
                flex: 1;
                border-bottom: 1px solid #ddd;
            }
            .separator span {
                padding: 0 10px;
                font-weight: bold;
                color: #777;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Load available databases from GitHub
     */
    async loadAvailableDatabases() {
        const statusElement = document.getElementById('github-status');
        const selectElement = document.getElementById('github-db-select');
        
        if (!statusElement || !selectElement) return;
        
        try {
            statusElement.textContent = 'Loading available databases...';
            statusElement.className = 'status-message';
            
            // Fetch the list of files in the databases folder
            const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.dbFolder}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const files = await response.json();
            
            // Clear existing options except the first one
            while (selectElement.options.length > 1) {
                selectElement.remove(1);
            }
            
            // Filter for .db files and add them to the select
            const dbFiles = files.filter(file => file.name.endsWith('.db'));
            
            if (dbFiles.length === 0) {
                statusElement.textContent = 'No database files found in the repository.';
                return;
            }
            
            dbFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file.path;
                option.textContent = file.name;
                option.dataset.downloadUrl = file.download_url;
                selectElement.appendChild(option);
            });
            
            statusElement.textContent = `Found ${dbFiles.length} database files.`;
        } catch (error) {
            console.error('Error loading databases from GitHub:', error);
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.className = 'error-message';
        }
    },

    /**
     * Handle loading a database from GitHub
     */
    async handleDatabaseLoad() {
        const selectElement = document.getElementById('github-db-select');
        const statusElement = document.getElementById('github-status');
        const dbInfoContent = document.getElementById('db-info-content');
        
        if (!selectElement || !statusElement) return;
        
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        
        if (!selectedOption || !selectedOption.value) {
            statusElement.textContent = 'Please select a database file.';
            statusElement.className = 'error-message';
            return;
        }
        
        try {
            statusElement.textContent = `Loading ${selectedOption.textContent}...`;
            statusElement.className = 'status-message';
            
            const downloadUrl = selectedOption.dataset.downloadUrl;
            const fileName = selectedOption.textContent;
            
            // Fetch the file content
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                throw new Error(`Failed to download file: ${response.status}`);
            }
            
            // Get the file as blob
            const blob = await response.blob();
            
            // Create a File object
            const file = new File([blob], fileName, { type: 'application/x-sqlite3' });
            
            // Create FormData and append the file
            const formData = new FormData();
            formData.append('database', file);
            
            // Upload to the server
            const token = localStorage.getItem('token');
            const uploadResponse = await fetch('/.netlify/functions/api/upload-db', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                throw new Error(error.message || 'Failed to upload database');
            }
            
            const result = await uploadResponse.json();
            statusElement.textContent = result.message;
            statusElement.className = 'status-message';
            
            // Update DB info
            if (dbInfoContent) {
                dbInfoContent.innerHTML = `
                    <p><strong>File:</strong> ${fileName}</p>
                    <p><strong>Source:</strong> GitHub Repository</p>
                    <p><strong>Loaded:</strong> ${new Date().toLocaleString()}</p>
                `;
            }
            
        } catch (error) {
            console.error('Error loading database from GitHub:', error);
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.className = 'error-message';
        }
    },

    /**
     * Refresh the list of available databases
     */
    refreshDatabases() {
        this.loadAvailableDatabases();
    }
};

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in before initializing
    const token = localStorage.getItem('token');
    if (token) {
        GitHubIntegration.init();
    }
});