// GitHub Database Manager for NFC Attendance System
// This module handles uploading and managing database files on GitHub

const GitHubDBManager = {
    // Configuration - now loaded from server environment variables
    config: {
        // These values will be provided by the server
        owner: '', // GitHub username
        repo: '', // Repository name
        branch: '', // Branch name
        dbFolder: 'databases', // Folder in the repo where .db files are stored
        apiUrl: 'https://api.github.com'
    },
    
    // Load configuration from server
    async loadConfig() {
        try {
            const response = await fetch('/.netlify/functions/api/github-config');
            if (response.ok) {
                // Check content type to ensure we're getting JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}`);
                }
                
                const config = await response.json();
                this.config.owner = config.owner;
                this.config.repo = config.repo;
                this.config.branch = config.branch;
                console.log('GitHub configuration loaded from server');
            } else {
                console.error('Failed to load GitHub configuration, status:', response.status);
                // Try fallback to direct API endpoint
                const fallbackResponse = await fetch('/api/github-config');
                if (fallbackResponse.ok) {
                    const config = await fallbackResponse.json();
                    this.config.owner = config.owner;
                    this.config.repo = config.repo;
                    this.config.branch = config.branch;
                    console.log('GitHub configuration loaded from fallback endpoint');
                }
            }
        } catch (error) {
            console.error('Failed to load GitHub configuration:', error);
        }
    },

    /**
     * Initialize the GitHub DB Manager
     */
    async init() {
        console.log('GitHub DB Manager initialized');
        await this.loadConfig();
        this.setupUI();
    },

    /**
     * Set up the UI for GitHub DB Manager
     */
    setupUI() {
        // Get the import section
        const importSection = document.getElementById('import-section');
        if (!importSection) return;

        // Create GitHub upload section
        const githubUploadSection = document.createElement('div');
        githubUploadSection.className = 'github-upload';
        githubUploadSection.innerHTML = `
            <h3>Upload Database to GitHub</h3>
            <p>Upload your database file to the GitHub repository:</p>
            <div class="form-group">
                <label for="github-db-file">Select SQLite Database File (.db)</label>
                <input type="file" id="github-db-file" name="database" accept=".db" required>
            </div>
            <!-- Token is now stored securely in server environment variables -->
            <small>Your GitHub token is securely stored on the server.</small>
            <button id="github-upload-btn" class="btn btn-primary">Upload to GitHub</button>
            <div id="github-upload-status" class="status-message"></div>
        `;

        // Add after the GitHub integration section
        const githubIntegration = document.querySelector('.github-integration');
        if (githubIntegration) {
            importSection.insertBefore(githubUploadSection, githubIntegration.nextSibling);
        } else {
            // If GitHub integration section doesn't exist yet, add at the beginning
            const importForm = document.querySelector('.import-container');
            importSection.insertBefore(githubUploadSection, importForm);
        }

        // Add event listener for the upload button
        document.getElementById('github-upload-btn').addEventListener('click', () => this.handleDatabaseUpload());

        // Add some styles
        const style = document.createElement('style');
        style.textContent = `
            .github-upload {
                margin: 20px 0;
                padding: 15px;
                background-color: #f0fff0;
                border: 1px solid #b3d9b3;
                border-radius: 5px;
            }
            .github-upload small {
                display: block;
                margin-top: 5px;
                color: #666;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Handle uploading a database to GitHub
     */
    async handleDatabaseUpload() {
        const fileInput = document.getElementById('github-db-file');
        const statusElement = document.getElementById('github-upload-status');
        
        if (!fileInput || !statusElement) return;
        
        const file = fileInput.files[0];
        
        if (!file) {
            statusElement.textContent = 'Please select a database file.';
            statusElement.className = 'error-message';
            return;
        }
        
        statusElement.textContent = 'Uploading database to GitHub...';
        statusElement.className = 'status-message';
        
        try {
            // Create FormData and append the file
            const formData = new FormData();
            formData.append('database', file);
            
            // Upload to the server which will handle GitHub upload using the stored token
            const authToken = localStorage.getItem('token');
            const uploadResponse = await fetch('/.netlify/functions/api/upload-to-github', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });
            
            if (!uploadResponse.ok) {
                const error = await uploadResponse.json();
                throw new Error(error.message || 'Failed to upload database to GitHub');
            }
            
            const result = await uploadResponse.json();
            statusElement.textContent = result.message || 'Database uploaded to GitHub successfully!';
            
            // Refresh the list of available databases
            if (window.GitHubIntegration && typeof window.GitHubIntegration.loadAvailableDatabases === 'function') {
                window.GitHubIntegration.loadAvailableDatabases();
            }
        } catch (error) {
            console.error('Error uploading database to GitHub:', error);
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.className = 'error-message';
        }
        
        // The token is now stored securely on the server side
        // and the upload is handled by the server API endpoint
    },

    /**
     * Read a file as base64
     * @param {File} file - The file to read
     * @returns {Promise<string>} - Base64 encoded content
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Get the base64 string (remove the data URL prefix)
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Ensure the database folder exists in the repository
     * @param {string} token - GitHub token
     */
    async ensureFolderExists(token) {
        try {
            // Check if the folder exists
            const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.dbFolder}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });
            
            if (response.ok) {
                // Folder exists
                return;
            }
            
            // If we get a 404, the folder doesn't exist
            if (response.status !== 404) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            // Create the folder by creating a placeholder file
            const createUrl = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.dbFolder}/.gitkeep`;
            const createResponse = await fetch(createUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Create ${this.config.dbFolder} folder`,
                    content: 'IyBEYXRhYmFzZSBmaWxlcyBmb3IgTkZDIEF0dGVuZGFuY2UgU3lzdGVt', // Base64 for '# Database files for NFC Attendance System'
                    branch: this.config.branch
                })
            });
            
            if (!createResponse.ok) {
                const error = await createResponse.json();
                throw new Error(error.message || `Failed to create folder: ${createResponse.status}`);
            }
            
        } catch (error) {
            console.error('Error ensuring folder exists:', error);
            throw error;
        }
    }
};

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in before initializing
    const token = localStorage.getItem('token');
    if (token) {
        GitHubDBManager.init();
    }
});

// Make it available globally
window.GitHubDBManager = GitHubDBManager;