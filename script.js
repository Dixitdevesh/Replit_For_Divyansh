// ============================
// School App JavaScript
// ============================

// Global variables
let currentUser = null;
let authMode = 'login'; // 'login' or 'register'

// Detect environment (localhost vs ngrok)
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocal ? 'http://localhost:5000' : ' https://aa561eaedf47.ngrok-free.app';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// ============================
// Initialization
// ============================
function initializeApp() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        redirectToDashboard();
    } else {
        showLanding();
    }
}

function setupEventListeners() {
    const teacherLoginForm = document.getElementById('teacherLoginForm');
    const teacherRegisterForm = document.getElementById('teacherRegisterForm');
    const studentLoginForm = document.getElementById('studentLoginForm');

    if (teacherLoginForm) teacherLoginForm.addEventListener('submit', handleTeacherLogin);
    if (teacherRegisterForm) teacherRegisterForm.addEventListener('submit', handleTeacherRegister);
    if (studentLoginForm) studentLoginForm.addEventListener('submit', handleStudentLogin);
}

// ============================
// Navigation Functions
// ============================
function showLanding() {
    hideAllPages();
    document.getElementById('landingPage').classList.add('active');
    clearUserData();
}

function showTeacherAuth() {
    hideAllPages();
    document.getElementById('teacherAuthPage').classList.add('active');
    authMode = 'login';
    updateAuthForm();
}

function showStudentLogin() {
    hideAllPages();
    document.getElementById('studentLoginPage').classList.add('active');
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
}

function toggleAuthForm() {
    authMode = authMode === 'login' ? 'register' : 'login';
    updateAuthForm();
}

function updateAuthForm() {
    const loginForm = document.getElementById('teacherLoginForm');
    const registerForm = document.getElementById('teacherRegisterForm');
    const switchText = document.getElementById('authSwitchText');
    const switchBtn = document.getElementById('authSwitchBtn');

    if (authMode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        switchText.textContent = "Don't have an account?";
        switchBtn.textContent = 'Register here';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        switchText.textContent = 'Already have an account?';
        switchBtn.textContent = 'Login here';
    }
}

// ============================
// Authentication Handlers
// ============================
function handleTeacherLogin(event) {
    event.preventDefault();
    const email = document.getElementById('teacherLoginEmail').value;
    const password = document.getElementById('teacherLoginPassword').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    showLoading();
    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        hideLoading();
        if (data.message && data.role === 'teacher') {
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            showToast('Login successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'teacher_dashboard.html', 1500);
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    })
    .catch(err => {
        hideLoading();
        console.error('Login error:', err);
        showToast('Network error. Please try again.', 'error');
    });
}

function handleTeacherRegister(event) {
    event.preventDefault();
    const name = document.getElementById('teacherRegisterName').value;
    const email = document.getElementById('teacherRegisterEmail').value;
    const password = document.getElementById('teacherRegisterPassword').value;

    if (!name || !email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }

    showLoading();
    fetch(`${API_BASE_URL}/register_teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    })
    .then(res => res.json())
    .then(data => {
        hideLoading();
        if (data.message) {
            showToast('Registration successful! Please login.', 'success');
            authMode = 'login';
            updateAuthForm();
            document.getElementById('teacherRegisterForm').reset();
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    })
    .catch(err => {
        hideLoading();
        console.error('Registration error:', err);
        showToast('Network error. Please try again.', 'error');
    });
}

function handleStudentLogin(event) {
    event.preventDefault();
    const email = document.getElementById('studentLoginEmail').value;
    const password = document.getElementById('studentLoginPassword').value;

    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    showLoading();
    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        hideLoading();
        if (data.message && data.role === 'student') {
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            showToast('Login successful! Redirecting...', 'success');
            setTimeout(() => window.location.href = 'student_dashboard.html', 1500);
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    })
    .catch(err => {
        hideLoading();
        console.error('Login error:', err);
        showToast('Network error. Please try again.', 'error');
    });
}

// ============================
// Utility Functions
// ============================
function redirectToDashboard() {
    if (!currentUser || !currentUser.role) {
        showLanding();
        return;
    }
    if (currentUser.role === 'teacher') window.location.href = 'teacher_dashboard.html';
    else if (currentUser.role === 'student') window.location.href = 'student_dashboard.html';
}

function clearUserData() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('alertToast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) { alert(message); return; }

    toastMessage.textContent = message;
    const toastHeader = toast.querySelector('.toast-header');
    const icon = toastHeader.querySelector('i');
    icon.className = 'fas me-2';

    switch(type) {
        case 'success': icon.classList.add('fa-check-circle', 'text-success'); break;
        case 'error': icon.classList.add('fa-exclamation-triangle', 'text-danger'); break;
        case 'warning': icon.classList.add('fa-exclamation-circle', 'text-warning'); break;
        default: icon.classList.add('fa-info-circle', 'text-primary');
    }

    new bootstrap.Toast(toast, { autohide: true, delay: 5000 }).show();
}

// ============================
// Validation Helpers
// ============================
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePassword(password) { return password && password.length >= 6; }
function validateRequired(fields) { return fields.every(f => f && f.trim() !== ''); }

// ============================
// Form Helpers
// ============================
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}
function disableForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.querySelectorAll('input, button, select, textarea').forEach(el => el.disabled = true);
}
function enableForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.querySelectorAll('input, button, select, textarea').forEach(el => el.disabled = false);
}

// ============================
// Responsive Helpers
// ============================
function isMobile() { return window.innerWidth <= 768; }
function isTablet() { return window.innerWidth > 768 && window.innerWidth <= 1024; }
function isDesktop() { return window.innerWidth > 1024; }

window.addEventListener('resize', () => {
    // Add responsive adjustments if needed
});

// ============================
// Export Functions
// ============================
window.schoolApp = {
    showLanding,
    showTeacherAuth,
    showStudentLogin,
    toggleAuthForm,
    showLoading,
    hideLoading,
    showToast,
    validateEmail,
    validatePassword,
    validateRequired,
    clearUserData,
    redirectToDashboard
};
