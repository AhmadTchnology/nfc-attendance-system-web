// Main JavaScript for NFC Attendance System

// Global variables
let currentUser = null;
let nfcReader = null;
let isNfcReading = false;
let attendanceRecords = [];
let teachersList = [];

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const userDisplay = document.getElementById('user-display');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const adminNav = document.getElementById('admin-nav');

// NFC Elements
const startNfcBtn = document.getElementById('start-nfc-btn');
const nfcStatus = document.getElementById('nfc-status');
const recentScansList = document.getElementById('recent-scans-list');

// Records Elements
const recordsTable = document.getElementById('records-table');
const recordsBody = document.getElementById('records-body');
const recordsEmpty = document.getElementById('records-empty');
const searchRecords = document.getElementById('search-records');
const dateFilter = document.getElementById('date-filter');
const clearFilter = document.getElementById('clear-filter');

// Import Elements
const importForm = document.getElementById('import-form');
const importStatus = document.getElementById('import-status');
const dbInfoContent = document.getElementById('db-info-content');

// Export Elements
const exportBtn = document.getElementById('export-btn');
const teacherSelectContainer = document.getElementById('teacher-select-container');
const teacherSelect = document.getElementById('teacher-select');
const resetBtn = document.getElementById('reset-btn');
const adminResetOptions = document.getElementById('admin-reset-options');
const resetTeacherSelect = document.getElementById('reset-teacher-select');

// Admin Elements
const addTeacherBtn = document.getElementById('add-teacher-btn');
const addTeacherModal = document.getElementById('add-teacher-modal');
const addTeacherForm = document.getElementById('add-teacher-form');
const addTeacherError = document.getElementById('add-teacher-error');
const teachersTable = document.getElementById('teachers-table');
const teachersBody = document.getElementById('teachers-body');
const teachersEmpty = document.getElementById('teachers-empty');
const closeModal = document.querySelector('.close-modal');

// Navigation Elements
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
navLinks.forEach(link => link.addEventListener('click', handleNavigation));

// NFC Events
if (startNfcBtn) {
    startNfcBtn.addEventListener('click', toggleNfcReader);
}

// Records Events
if (searchRecords) {
    searchRecords.addEventListener('input', filterRecords);
}
if (dateFilter) {
    dateFilter.addEventListener('change', filterRecords);
}
if (clearFilter) {
    clearFilter.addEventListener('click', clearFilters);
}

// Import Events
if (importForm) {
    importForm.addEventListener('submit', handleImport);
}

// Export Events
if (exportBtn) {
    exportBtn.addEventListener('click', handleExport);
}
if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
}

// Admin Events
if (addTeacherBtn) {
    addTeacherBtn.addEventListener('click', () => {
        addTeacherModal.classList.remove('hidden');
    });
}
if (closeModal) {
    closeModal.addEventListener('click', () => {
        addTeacherModal.classList.add('hidden');
        addTeacherForm.reset();
        addTeacherError.textContent = '';
    });
}
if (addTeacherForm) {
    addTeacherForm.addEventListener('submit', handleAddTeacher);
}

// Reset scope radio buttons
const resetScopeRadios = document.querySelectorAll('input[name="reset-scope"]');
if (resetScopeRadios.length > 0) {
    resetScopeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'teacher') {
                document.getElementById('reset-teacher-select').classList.remove('hidden');
            } else {
                document.getElementById('reset-teacher-select').classList.add('hidden');
            }
        });
    });
}

// Initialize the application
async function initApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        try {
            // Use our custom validateToken function instead of fetching from a non-existent endpoint
            const userData = await validateToken();
            
            if (userData) {
                setCurrentUser(userData);
                showDashboard();
                loadInitialData();
            } else {
                // Token invalid, clear it
                localStorage.removeItem('token');
                showLogin();
            }
        } catch (error) {
            console.error('Error validating token:', error);
            showLogin();
        }
    } else {
        showLogin();
    }
}

// Authentication Functions
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/.netlify/functions/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('token', userData.token);
            setCurrentUser(userData);
            showDashboard();
            loadInitialData();
            loginForm.reset();
            loginError.textContent = '';
        } else {
            const error = await response.json();
            loginError.textContent = error.message || 'Login failed. Please check your credentials.';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'An error occurred during login. Please try again.';
    }
}

async function handleLogout() {
    try {
        await fetch('/.netlify/functions/api/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        currentUser = null;
        showLogin();
    }
}

function setCurrentUser(user) {
    currentUser = user;
    userDisplay.textContent = `${user.username} (${user.role.charAt(0).toUpperCase() + user.role.slice(1)})`;
    
    // Show/hide admin features
    if (user.role === 'admin') {
        adminNav.classList.remove('hidden');
        teacherSelectContainer.classList.remove('hidden');
        adminResetOptions.classList.remove('hidden');
        resetBtn.textContent = 'Reset Selected Data';
    } else {
        adminNav.classList.add('hidden');
        teacherSelectContainer.classList.add('hidden');
        adminResetOptions.classList.add('hidden');
        resetBtn.textContent = 'Reset My Data';
    }
}

function showLogin() {
    loginContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
}

function showDashboard() {
    loginContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
}

// Navigation Functions
function handleNavigation(event) {
    event.preventDefault();
    
    const targetSection = event.currentTarget.getAttribute('data-section');
    
    // Update active link
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Show target section, hide others
    contentSections.forEach(section => {
        if (section.id === `${targetSection}-section`) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
    
    // Load section-specific data
    if (targetSection === 'records') {
        loadAttendanceRecords();
    } else if (targetSection === 'admin') {
        loadTeachers();
    }
}

// Data Loading Functions
async function loadInitialData() {
    // Load attendance records
    await loadAttendanceRecords();
    
    // If admin, load teachers list
    if (currentUser && currentUser.role === 'admin') {
        await loadTeachers();
    }
}

async function loadAttendanceRecords() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/.netlify/functions/api/attendance', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            attendanceRecords = await response.json();
            displayAttendanceRecords(attendanceRecords);
        } else {
            console.error('Failed to load attendance records');
        }
    } catch (error) {
        console.error('Error loading attendance records:', error);
    }
}

async function loadTeachers() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/.netlify/functions/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            teachersList = await response.json();
            displayTeachers(teachersList);
            populateTeacherDropdowns(teachersList);
        } else {
            console.error('Failed to load teachers');
        }
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

// Display Functions
function displayAttendanceRecords(records) {
    if (records.length === 0) {
        recordsTable.classList.add('hidden');
        recordsEmpty.classList.remove('hidden');
        return;
    }
    
    recordsTable.classList.remove('hidden');
    recordsEmpty.classList.add('hidden');
    
    recordsBody.innerHTML = '';
    
    records.forEach(record => {
        const row = document.createElement('tr');
        
        const timestamp = new Date(record.timestamp);
        const formattedDate = timestamp.toLocaleDateString();
        const formattedTime = timestamp.toLocaleTimeString();
        
        row.innerHTML = `
            <td>${record.student_id}</td>
            <td>${record.student_name}</td>
            <td>${record.major || '-'}</td>
            <td>${record.stage || '-'}</td>
            <td>${record.study || '-'}</td>
            <td>${record.study_group || '-'}</td>
            <td>${formattedDate} ${formattedTime}</td>
            <td>
                ${currentUser.role === 'admin' ? 
                    `<button class="btn btn-small btn-danger delete-record" data-id="${record.id}">Delete</button>` : 
                    ''}
            </td>
        `;
        
        recordsBody.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-record').forEach(button => {
        button.addEventListener('click', async () => {
            const recordId = button.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this record?')) {
                await deleteRecord(recordId);
            }
        });
    });
}

function displayTeachers(teachers) {
    if (teachers.length === 0) {
        teachersTable.classList.add('hidden');
        teachersEmpty.classList.remove('hidden');
        return;
    }
    
    teachersTable.classList.remove('hidden');
    teachersEmpty.classList.add('hidden');
    
    teachersBody.innerHTML = '';
    
    teachers.forEach(teacher => {
        const row = document.createElement('tr');
        const created = new Date(teacher.created_at).toLocaleDateString();
        
        row.innerHTML = `
            <td>${teacher.id}</td>
            <td>${teacher.username}</td>
            <td>${created}</td>
            <td>
                <button class="btn btn-small btn-outline view-teacher" data-id="${teacher.id}">View Records</button>
            </td>
        `;
        
        teachersBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-teacher').forEach(button => {
        button.addEventListener('click', () => {
            const teacherId = button.getAttribute('data-id');
            // Navigate to records section and filter by teacher
            document.querySelector('.nav-link[data-section="records"]').click();
            // TODO: Implement filtering by teacher ID
        });
    });
}

function populateTeacherDropdowns(teachers) {
    // Clear existing options except the first one
    teacherSelect.innerHTML = '<option value="">All Teachers</option>';
    document.getElementById('reset-teacher').innerHTML = '';
    
    teachers.forEach(teacher => {
        const option1 = document.createElement('option');
        option1.value = teacher.id;
        option1.textContent = teacher.username;
        teacherSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = teacher.id;
        option2.textContent = teacher.username;
        document.getElementById('reset-teacher').appendChild(option2);
    });
}

// Filter Functions
function filterRecords() {
    const searchTerm = searchRecords.value.toLowerCase();
    const dateValue = dateFilter.value;
    
    let filteredRecords = [...attendanceRecords];
    
    if (searchTerm) {
        filteredRecords = filteredRecords.filter(record => {
            return (
                record.student_id.toLowerCase().includes(searchTerm) ||
                record.student_name.toLowerCase().includes(searchTerm) ||
                (record.major && record.major.toLowerCase().includes(searchTerm)) ||
                (record.stage && record.stage.toLowerCase().includes(searchTerm)) ||
                (record.study && record.study.toLowerCase().includes(searchTerm)) ||
                (record.study_group && record.study_group.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    if (dateValue) {
        const filterDate = new Date(dateValue);
        filterDate.setHours(0, 0, 0, 0);
        
        filteredRecords = filteredRecords.filter(record => {
            const recordDate = new Date(record.timestamp);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === filterDate.getTime();
        });
    }
    
    displayAttendanceRecords(filteredRecords);
}

function clearFilters() {
    searchRecords.value = '';
    dateFilter.value = '';
    displayAttendanceRecords(attendanceRecords);
}

// NFC Functions
async function toggleNfcReader() {
    if (!isNfcReading) {
        try {
            if ('NDEFReader' in window) {
                nfcReader = new NDEFReader();
                await nfcReader.scan();
                
                nfcReader.addEventListener('reading', handleNfcReading);
                
                isNfcReading = true;
                startNfcBtn.textContent = 'Stop NFC Reader';
                document.querySelector('.nfc-reader').classList.add('active');
                nfcStatus.textContent = 'NFC reader active. Tap a card to record attendance.';
                nfcStatus.className = 'status-message';
            } else {
                // Enable simulation mode automatically if Web NFC is not supported
                isNfcReading = true;
                startNfcBtn.textContent = 'Stop Simulation Mode';
                document.querySelector('.nfc-reader').classList.add('active');
                nfcStatus.textContent = 'Simulation mode active. Web NFC is not supported in this browser.';
                nfcStatus.className = 'status-message simulation-mode';
                
                // Show simulation controls
                showSimulationControls();
            }
        } catch (error) {
            console.error('Error starting NFC reader:', error);
            
            // Enable simulation mode if there's an error starting the NFC reader
            isNfcReading = true;
            startNfcBtn.textContent = 'Stop Simulation Mode';
            document.querySelector('.nfc-reader').classList.add('active');
            nfcStatus.textContent = 'Simulation mode active. Error with NFC reader: ' + error.message;
            nfcStatus.className = 'status-message simulation-mode';
            
            // Show simulation controls
            showSimulationControls();
        }
    } else {
        try {
            if (nfcReader) {
                // In a real implementation, we would abort the NFC reader here
                // However, the current Web NFC API doesn't have a direct method to stop scanning
                // So we'll just remove the event listener
                nfcReader.removeEventListener('reading', handleNfcReading);
            }
            
            isNfcReading = false;
            startNfcBtn.textContent = 'Start NFC Reader';
            document.querySelector('.nfc-reader').classList.remove('active');
            nfcStatus.textContent = 'NFC reader stopped.';
            nfcStatus.className = 'status-message';
            
            // Hide simulation controls
            hideSimulationControls();
        } catch (error) {
            console.error('Error stopping NFC reader:', error);
        }
    }
}

async function handleNfcReading({ message, serialNumber }) {
    try {
        // In a real implementation, the serialNumber would be the student ID
        // For demo purposes, we'll extract student info from the NFC tag's NDEF message
        let studentId = serialNumber || 'unknown';
        let studentName = 'Unknown Student';
        let studentInfo = {};
        
        // Try to parse student info from the NFC tag
        if (message && message.records) {
            for (const record of message.records) {
                if (record.recordType === 'text') {
                    const textDecoder = new TextDecoder();
                    const text = textDecoder.decode(record.data);
                    
                    try {
                        // Assuming the text is JSON with student info
                        const data = JSON.parse(text);
                        if (data.id) studentId = data.id;
                        if (data.name) studentName = data.name;
                        studentInfo = data;
                    } catch (e) {
                        // If not JSON, use the text as student name
                        studentName = text;
                    }
                    break;
                }
            }
        }
        
        // Record the attendance
        const token = localStorage.getItem('token');
        const response = await fetch('/.netlify/functions/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                student_id: studentId,
                student_name: studentName,
                major: studentInfo.major || '',
                stage: studentInfo.stage || '',
                study: studentInfo.study || '',
                study_group: studentInfo.study_group || ''
            })
        });
        
        if (response.ok) {
            const record = await response.json();
            
            // Add to recent scans list
            const scanItem = document.createElement('div');
            scanItem.className = 'scan-item';
            scanItem.innerHTML = `
                <div class="scan-info">
                    <strong>${studentName}</strong> (${studentId})
                    <div class="scan-time">${new Date().toLocaleTimeString()}</div>
                </div>
                <div class="scan-status">
                    <i class="fas fa-check-circle" style="color: #2ecc71;"></i>
                </div>
            `;
            
            // Remove empty message if present
            const emptyMessage = recentScansList.querySelector('.empty-message');
            if (emptyMessage) {
                recentScansList.removeChild(emptyMessage);
            }
            
            // Add new scan at the top
            recentScansList.insertBefore(scanItem, recentScansList.firstChild);
            
            // Limit to 10 recent scans
            if (recentScansList.children.length > 10) {
                recentScansList.removeChild(recentScansList.lastChild);
            }
            
            // Update attendance records
            await loadAttendanceRecords();
        } else {
            throw new Error('Failed to record attendance');
        }
    } catch (error) {
        console.error('Error processing NFC tag:', error);
        nfcStatus.textContent = `Error: ${error.message}`;
        nfcStatus.className = 'error-message';
    }
}

// Import Functions
async function handleImport(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('db-file');
    const file = fileInput.files[0];
    
    if (!file) {
        importStatus.textContent = 'Please select a database file.';
        importStatus.className = 'error-message';
        return;
    }
    
    if (!file.name.endsWith('.db')) {
        importStatus.textContent = 'Please select a valid SQLite database file (.db).';
        importStatus.className = 'error-message';
        return;
    }
    
    const formData = new FormData();
    formData.append('database', file);
    
    try {
        importStatus.textContent = 'Uploading database...';
        importStatus.className = 'status-message';
        
        const token = localStorage.getItem('token');
        const response = await fetch('/.netlify/functions/api/upload-db', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            importStatus.textContent = result.message;
            importStatus.className = 'status-message';
            
            // Update DB info
            dbInfoContent.innerHTML = `
                <p><strong>File:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
                <p><strong>Uploaded:</strong> ${new Date().toLocaleString()}</p>
            `;
            
            // Reset form
            importForm.reset();
        } else {
            const error = await response.json();
            importStatus.textContent = error.message || 'Failed to upload database.';
            importStatus.className = 'error-message';
        }
    } catch (error) {
        console.error('Import error:', error);
        importStatus.textContent = 'An error occurred during upload. Please try again.';
        importStatus.className = 'error-message';
    }
}

// Export Functions
async function handleExport() {
    const format = document.querySelector('input[name="export-format"]:checked').value;
    let teacherId = '';
    
    if (currentUser.role === 'admin' && teacherSelect.value) {
        teacherId = teacherSelect.value;
    }
    
    try {
        const token = localStorage.getItem('token');
        const url = `/.netlify/functions/api/export?format=${format}${teacherId ? `&teacher_id=${teacherId}` : ''}`;
        
        // Create a hidden iframe to handle the download
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        // Set up authorization header
        iframe.onload = function() {
            iframe.contentWindow.fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(response => response.blob())
              .then(blob => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = `attendance_export_${Date.now()}.${format}`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  document.body.removeChild(iframe);
              });
        };
        
        iframe.src = 'about:blank';
    } catch (error) {
        console.error('Export error:', error);
        alert('An error occurred during export. Please try again.');
    }
}

async function handleReset() {
    let confirmMessage = 'Are you sure you want to reset attendance data? This cannot be undone.';
    let teacherId = '';
    
    if (currentUser.role === 'admin') {
        const resetScope = document.querySelector('input[name="reset-scope"]:checked');
        
        if (resetScope) {
            if (resetScope.value === 'all') {
                confirmMessage = 'Are you sure you want to reset ALL attendance data? This cannot be undone.';
            } else if (resetScope.value === 'teacher') {
                teacherId = document.getElementById('reset-teacher').value;
                const teacherName = document.getElementById('reset-teacher').options[document.getElementById('reset-teacher').selectedIndex].text;
                confirmMessage = `Are you sure you want to reset attendance data for ${teacherName}? This cannot be undone.`;
            }
        }
    }
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const url = `/.netlify/functions/api/attendance/reset${teacherId ? `?teacher_id=${teacherId}` : ''}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`${result.message} (${result.count} records deleted)`);
            
            // Reload attendance records
            await loadAttendanceRecords();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to reset attendance data.');
        }
    } catch (error) {
        console.error('Reset error:', error);
        alert('An error occurred while resetting data. Please try again.');
    }
}

// Admin Functions
async function handleAddTeacher(event) {
    event.preventDefault();
    
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;
    
    if (!username || !password) {
        addTeacherError.textContent = 'Username and password are required.';
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/.netlify/functions/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const newTeacher = await response.json();
            addTeacherModal.classList.add('hidden');
            addTeacherForm.reset();
            addTeacherError.textContent = '';
            
            // Reload teachers list
            await loadTeachers();
            
            alert(`Teacher account for ${username} created successfully.`);
        } else {
            const error = await response.json();
            addTeacherError.textContent = error.message || 'Failed to create teacher account.';
        }
    } catch (error) {
        console.error('Add teacher error:', error);
        addTeacherError.textContent = 'An error occurred. Please try again.';
    }
}

async function deleteRecord(recordId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/.netlify/functions/api/attendance/${recordId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // Reload attendance records
            await loadAttendanceRecords();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to delete record.');
        }
    } catch (error) {
        console.error('Delete record error:', error);
        alert('An error occurred while deleting the record. Please try again.');
    }
}

// Simulation mode functions
function showSimulationControls() {
    // Remove any existing simulation controls first
    hideSimulationControls();
    
    const nfcContainer = document.querySelector('.nfc-reader-container');
    if (!nfcContainer) return;
    
    // Create simulation controls container
    const simContainer = document.createElement('div');
    simContainer.id = 'simulation-controls';
    simContainer.className = 'simulation-controls';
    
    // Add title
    const simTitle = document.createElement('h3');
    simTitle.textContent = 'Simulation Mode';
    simContainer.appendChild(simTitle);
    
    // Add description
    const simDesc = document.createElement('p');
    simDesc.textContent = 'Select a student from the sample database or create a custom entry:';
    simContainer.appendChild(simDesc);
    
    // Add sample students dropdown
    const sampleStudents = [
        { id: 'ST1001', name: 'Ahmed Shukor', major: 'Computer Engineer', stage: '3', study: 'Morning', study_group: 'A' },
        { id: 'ST1002', name: 'Sarah Johnson', major: 'Engineering', stage: '2', study: 'Morning', study_group: 'B' },
        { id: 'ST1003', name: 'Michael Brown', major: 'Mathematics', stage: '4', study: 'Evening', study_group: 'A' },
        { id: 'ST1004', name: 'Emily Davis', major: 'Physics', stage: '1', study: 'Morning', study_group: 'C' },
        { id: 'ST1005', name: 'David Wilson', major: 'Computer Science', stage: '3', study: 'Evening', study_group: 'B' }
    ];
    
    const studentSelect = document.createElement('select');
    studentSelect.id = 'sample-student-select';
    studentSelect.className = 'form-control';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select a sample student --';
    studentSelect.appendChild(defaultOption);
    
    // Add student options
    sampleStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.id} - ${student.name}`;
        option.dataset.student = JSON.stringify(student);
        studentSelect.appendChild(option);
    });
    
    simContainer.appendChild(studentSelect);
    
    // Add scan button for sample student
    const scanSampleBtn = document.createElement('button');
    scanSampleBtn.textContent = 'Simulate Scan';
    scanSampleBtn.className = 'btn btn-primary';
    scanSampleBtn.style.marginTop = '10px';
    scanSampleBtn.addEventListener('click', () => {
        const selectedOption = studentSelect.options[studentSelect.selectedIndex];
        if (selectedOption.value) {
            const studentData = JSON.parse(selectedOption.dataset.student);
            simulateNfcScan(studentData);
        } else {
            alert('Please select a student first');
        }
    });
    simContainer.appendChild(scanSampleBtn);
    
    // Add custom student form
    const customForm = document.createElement('div');
    customForm.className = 'custom-student-form';
    customForm.style.marginTop = '20px';
    
    const customTitle = document.createElement('h4');
    customTitle.textContent = 'Custom Student';
    customForm.appendChild(customTitle);
    
    // Create form fields
    const fields = [
        { id: 'custom-id', label: 'Student ID', placeholder: 'e.g. ST1234', required: true },
        { id: 'custom-name', label: 'Student Name', placeholder: 'e.g. John Doe', required: true },
        { id: 'custom-major', label: 'Major', placeholder: 'e.g. Computer Science' },
        { id: 'custom-stage', label: 'Stage', placeholder: 'e.g. 3' },
        { id: 'custom-study', label: 'Study', placeholder: 'e.g. Morning' },
        { id: 'custom-group', label: 'Group', placeholder: 'e.g. A' }
    ];
    
    fields.forEach(field => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.htmlFor = field.id;
        label.textContent = field.label + (field.required ? ' *' : '');
        formGroup.appendChild(label);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = field.id;
        input.className = 'form-control';
        input.placeholder = field.placeholder;
        if (field.required) input.required = true;
        formGroup.appendChild(input);
        
        customForm.appendChild(formGroup);
    });
    
    // Add scan button for custom student
    const scanCustomBtn = document.createElement('button');
    scanCustomBtn.textContent = 'Simulate Custom Scan';
    scanCustomBtn.className = 'btn btn-primary';
    scanCustomBtn.style.marginTop = '10px';
    scanCustomBtn.addEventListener('click', () => {
        const studentId = document.getElementById('custom-id').value;
        const studentName = document.getElementById('custom-name').value;
        
        if (!studentId || !studentName) {
            alert('Student ID and Name are required');
            return;
        }
        
        const studentData = {
            id: studentId,
            name: studentName,
            major: document.getElementById('custom-major').value,
            stage: document.getElementById('custom-stage').value,
            study: document.getElementById('custom-study').value,
            study_group: document.getElementById('custom-group').value
        };
        
        simulateNfcScan(studentData);
    });
    customForm.appendChild(scanCustomBtn);
    
    simContainer.appendChild(customForm);
    
    // Add the simulation controls to the page
    nfcContainer.appendChild(simContainer);
    
    // Add some basic styles
    const style = document.createElement('style');
    style.textContent = `
        .simulation-controls {
            margin-top: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        .simulation-mode {
            background-color: #fff3cd;
            color: #856404;
            border-color: #ffeeba;
        }
        .custom-student-form {
            border-top: 1px solid #ddd;
            padding-top: 15px;
        }
    `;
    document.head.appendChild(style);
}

function hideSimulationControls() {
    const simControls = document.getElementById('simulation-controls');
    if (simControls) {
        simControls.remove();
    }
}

// Simulated NFC scanning function
async function simulateNfcScan(studentData) {
    // If NFC reader is not active, activate simulation mode automatically
    if (!isNfcReading) {
        // Auto-start simulation mode
        isNfcReading = true;
        startNfcBtn.textContent = 'Stop Simulation Mode';
        document.querySelector('.nfc-reader').classList.add('active');
        nfcStatus.textContent = 'Simulation mode activated automatically.';
        nfcStatus.className = 'status-message simulation-mode';
        
        // Show simulation controls
        showSimulationControls();
    }
    
    // Default student data if not provided
    const defaultData = {
        id: 'ST' + Math.floor(Math.random() * 10000),
        name: 'Test Student',
        major: 'Computer Science',
        stage: '3',
        study: 'Morning',
        study_group: 'A'
    };
    
    // Merge provided data with defaults
    const data = { ...defaultData, ...studentData };
    
    // Simulate NFC reading event
    await handleNfcReading({
        message: {
            records: [
                {
                    recordType: 'text',
                    data: new TextEncoder().encode(JSON.stringify(data))
                }
            ]
        },
        serialNumber: data.id
    });
    
    // Show success message
    nfcStatus.textContent = `Successfully recorded attendance for ${data.name} (${data.id}) in simulation mode.`;
    nfcStatus.className = 'status-message simulation-mode';
}

// Add validate-token endpoint to server.js if it doesn't exist
// This is a fallback for the client-side validation
async function validateToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        // Try to get attendance records as a way to validate the token
        const response = await fetch('/.netlify/functions/api/attendance', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // If we can access the attendance records, the token is valid
            // Extract user info from the token
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.id,
                username: payload.username,
                role: payload.role
            };
        }
    } catch (error) {
        console.error('Error validating token:', error);
    }
    
    return null;
}

// Initialize simulation mode if Web NFC is not supported
if (!('NDEFReader' in window)) {
    console.warn('Web NFC API is not supported in this browser.');
    
    // Make the simulateNfcScan function globally available
    window.simulateNfcScan = simulateNfcScan;
}