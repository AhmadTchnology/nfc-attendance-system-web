// Firebase Authentication for NFC Attendance System

// Initialize Firebase with configuration from environment variables
const FirebaseAuth = {
    // Firebase instance
    auth: null,
    
    // Initialize Firebase
    async init() {
        try {
            // Fetch Firebase configuration from server
            const response = await fetch('/.netlify/functions/firebase-config');
            
            // Check if response is OK
            if (!response.ok) {
                console.error('Failed to load Firebase configuration, status:', response.status);
                throw new Error(`Failed to load Firebase configuration: ${response.status}`);
            }
            
            // Check content type to ensure we're getting JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`Expected JSON but got ${contentType || 'unknown content type'}`);
                throw new Error(`Expected JSON but got ${contentType || 'unknown content type'}`);
            }
            
            // Parse the response as JSON
            let firebaseConfig;
            try {
                firebaseConfig = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse Firebase config as JSON:', jsonError);
                throw new Error('Failed to parse Firebase configuration as JSON');
            }
            
            // Validate the config object has required fields
            if (!firebaseConfig || !firebaseConfig.apiKey) {
                console.error('Invalid Firebase configuration:', firebaseConfig);
                throw new Error('Invalid Firebase configuration');
            }
            
            console.log('Firebase config loaded successfully');
            
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            
            console.log('Firebase Authentication initialized');
            
            // Set up auth state listener
            this.auth.onAuthStateChanged(this.handleAuthStateChanged.bind(this));
            
            // Set up UI elements
            this.setupUI();
            
            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            // Fall back to local login if Firebase fails
            this.setupUI();
            return false;
        }
    },
    
    // Handle authentication state changes
    handleAuthStateChanged(user) {
        if (user) {
            // User is signed in
            this.getCurrentUserRole(user).then(userData => {
                if (userData) {
                    // Store user data and token
                    localStorage.setItem('user', JSON.stringify(userData));
                    
                    // Get ID token for API requests
                    user.getIdToken().then(token => {
                        localStorage.setItem('token', token);
                        
                        // Update UI
                        if (typeof setCurrentUser === 'function') {
                            setCurrentUser(userData);
                            showDashboard();
                            loadInitialData();
                        }
                    }).catch(error => {
                        console.error('Error getting ID token:', error);
                    });
                }
            }).catch(error => {
                console.error('Error getting user role:', error);
            });
        } else {
            // User is signed out
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            
            // Update UI
            if (typeof showLogin === 'function') {
                showLogin();
            }
        }
    },
    
    // Get current user role from Firestore
    async getCurrentUserRole(user) {
        try {
            // Get user claims from token
            const idTokenResult = await user.getIdTokenResult();
            const role = idTokenResult.claims.role || 'teacher'; // Default to teacher if no role
            
            return {
                id: user.uid,
                username: user.displayName || user.email,
                email: user.email,
                role: role
            };
        } catch (error) {
            console.error('Error getting user role:', error);
            return null;
        }
    },
    
    // Set up UI elements
    setupUI() {
        // Replace the login form submit handler
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            // Remove existing event listeners if any
            const newLoginForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newLoginForm, loginForm);
            newLoginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
        
        // Replace the logout button handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            // Remove existing event listeners if any
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            newLogoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    },
    
    // Handle login form submission
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('username').value; // Using username field for email
        const password = document.getElementById('password').value;
        const loginError = document.getElementById('login-error');
        
        try {
            loginError.textContent = '';
            
            // Check if Firebase auth is initialized
            if (this.auth) {
                try {
                    await this.auth.signInWithEmailAndPassword(email, password);
                    // Auth state change listener will handle the rest
                    return;
                } catch (firebaseError) {
                    console.error('Firebase login error:', firebaseError);
                    // Continue to server login if Firebase fails
                }
            }
            
            // Fall back to server login if Firebase auth is not available
            const response = await fetch('/.netlify/functions/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username: email, password })
            });
            
            // Check if response is OK
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                
                // Handle different response types
                if (contentType && contentType.includes('application/json')) {
                    const error = await response.json();
                    throw new Error(error.message || 'Login failed. Please check your credentials.');
                } else {
                    throw new Error(`Login failed with status: ${response.status}`);
                }
            }
            
            // Parse the response as JSON
            let userData;
            try {
                userData = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse login response as JSON:', jsonError);
                throw new Error('Failed to parse login response');
            }
            
            // Store user data and token
            localStorage.setItem('token', userData.token);
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Update UI
            if (typeof setCurrentUser === 'function') {
                setCurrentUser(userData);
                showDashboard();
                loadInitialData();
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = error.message || 'Login failed. Please check your credentials.';
        }
    },
    
    // Handle logout
    async handleLogout() {
        try {
            // If Firebase auth is initialized, sign out
            if (this.auth) {
                await this.auth.signOut();
            }
            
            // Also call server logout endpoint
            try {
                await fetch('/.netlify/functions/api/logout', { method: 'POST' });
            } catch (serverError) {
                console.error('Server logout error:', serverError);
            }
            
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Update UI
            if (typeof showLogin === 'function') {
                showLogin();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    },
    
    // Get current user token for API requests
    async getCurrentUserToken() {
        const user = this.auth?.currentUser;
        if (user) {
            try {
                return await user.getIdToken();
            } catch (error) {
                console.error('Error getting ID token:', error);
                return null;
            }
        }
        return localStorage.getItem('token') || null;
    }
};

// Initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase SDK is loaded
    if (typeof firebase !== 'undefined') {
        FirebaseAuth.init().catch(error => {
            console.error('Failed to initialize Firebase:', error);
        });
    } else {
        console.error('Firebase SDK not loaded');
    }
});