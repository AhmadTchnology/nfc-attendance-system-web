// Firebase Authentication for NFC Attendance System

// Initialize Firebase with configuration from environment variables
const FirebaseAuth = {
    // Firebase instance
    auth: null,
    
    // Initialize Firebase
    async init() {
        try {
            // Fetch Firebase configuration from server
            const response = await fetch('/.netlify/functions/api/firebase-config');
            if (!response.ok) {
                throw new Error('Failed to load Firebase configuration');
            }
            
            const firebaseConfig = await response.json();
            
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
                    });
                }
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
            loginForm.removeEventListener('submit', handleLogin);
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }
        
        // Replace the logout button handler
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.removeEventListener('click', handleLogout);
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
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
            await this.auth.signInWithEmailAndPassword(email, password);
            // Auth state change listener will handle the rest
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = error.message || 'Login failed. Please check your credentials.';
        }
    },
    
    // Handle logout
    async handleLogout() {
        try {
            await this.auth.signOut();
            // Auth state change listener will handle the rest
        } catch (error) {
            console.error('Logout error:', error);
        }
    },
    
    // Get current user token for API requests
    async getCurrentUserToken() {
        const user = this.auth.currentUser;
        if (user) {
            return user.getIdToken();
        }
        return null;
    }
};

// Initialize Firebase when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase SDK is loaded
    if (typeof firebase !== 'undefined') {
        FirebaseAuth.init();
    } else {
        console.error('Firebase SDK not loaded');
    }
});