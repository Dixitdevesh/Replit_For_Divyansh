// Global variables
let currentUser = null;
let authMode = 'login'; // 'login' or 'register'

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        redirectToDashboard();
    } else {
        showLanding();
    }
}

function setupEventListeners() {
    // Teacher authentication form handlers
    const teacherLoginForm = document.getElementById('teacherLoginForm');
    const teacherRegisterForm = document.getElementById('teacherRegisterForm');
    const studentLoginForm = document.getElementById('studentLoginForm');

    if (teacherLoginForm) {
        teacherLoginForm.addEventListener('submit', handleTeacherLogin);
    }
    
    if (teacherRegisterForm) {
        teacherRegisterForm.addEventListener('submit', handleTeacherRegister);
    }
    
    if (studentLoginForm) {
        studentLoginForm.addEventListener('submit', handleStudentLogin);
    }
}

// Navigation functions
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
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
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

// Authentication handlers
function handleTeacherLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('teacherLoginEmail').value;
    const password = document.getElementById('teacherLoginPassword').value;
    
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const loginData = {
        email: email,
        password: password
    };
    
    showLoading();
    
    fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.message && data.role === 'teacher') {
            // Success
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            showToast('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'teacher_dashboard.html';
            }, 1500);
        } else {
            // Error
            showToast(data.error || 'Login failed', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Login error:', error);
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
    
    const registerData = {
        name: name,
        email: email,
        password: password
    };
    
    showLoading();
    
    fetch('http://localhost:5000/register_teacher', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerData)
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.message) {
            // Success
            showToast('Registration successful! Please login.', 'success');
            
            // Switch to login form
            authMode = 'login';
            updateAuthForm();
            
            // Clear the register form
            document.getElementById('teacherRegisterForm').reset();
        } else {
            // Error
            showToast(data.error || 'Registration failed', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Registration error:', error);
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
    
    const loginData = {
        email: email,
        password: password
    };
    
    showLoading();
    
    fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.message && data.role === 'student') {
            // Success
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            showToast('Login successful! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'student_dashboard.html';
            }, 1500);
        } else {
            // Error
            showToast(data.error || 'Login failed', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    });
}

// Utility functions
function redirectToDashboard() {
    if (!currentUser || !currentUser.role) {
        showLanding();
        return;
    }
    
    if (currentUser.role === 'teacher') {
        window.location.href = 'teacher_dashboard.html';
    } else if (currentUser.role === 'student') {
        window.location.href = 'student_dashboard.html';
    }
}

function clearUserData() {
    currentUser = null;
    localStorage.removeItem('currentUser');
}

function showLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('alertToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) {
        // Fallback to alert if toast elements don't exist
        alert(message);
        return;
    }
    
    toastMessage.textContent = message;
    
    // Update toast styling based on type
    const toastHeader = toast.querySelector('.toast-header');
    const icon = toastHeader.querySelector('i');
    
    // Reset classes
    icon.className = 'fas me-2';
    
    switch(type) {
        case 'success':
            icon.classList.add('fa-check-circle', 'text-success');
            break;
        case 'error':
            icon.classList.add('fa-exclamation-triangle', 'text-danger');
            break;
        case 'warning':
            icon.classList.add('fa-exclamation-circle', 'text-warning');
            break;
        default:
            icon.classList.add('fa-info-circle', 'text-primary');
    }
    
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();
}

// Validation functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function validateRequired(fields) {
    return fields.every(field => field && field.trim() !== '');
}

// Animation helpers
function addAnimation(element, animationClass, delay = 0) {
    setTimeout(() => {
        element.classList.add(animationClass);
    }, delay);
}

function removeAnimation(element, animationClass) {
    element.classList.remove(animationClass);
}

// Error handling
function handleNetworkError(error) {
    console.error('Network error:', error);
    showToast('Network connection error. Please check your connection and try again.', 'error');
}

function handleAPIError(data) {
    if (data && data.error) {
        showToast(data.error, 'error');
    } else {
        showToast('An unexpected error occurred. Please try again.', 'error');
    }
}

// Local storage helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

// Form helpers
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
}

function disableForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const inputs = form.querySelectorAll('input, button, select, textarea');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
}

function enableForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        const inputs = form.querySelectorAll('input, button, select, textarea');
        inputs.forEach(input => {
            input.disabled = false;
        });
    }
}

// Responsive helpers
function isMobile() {
    return window.innerWidth <= 768;
}

function isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
}

function isDesktop() {
    return window.innerWidth > 1024;
}

// Initialize responsive behavior
window.addEventListener('resize', function() {
    // Handle responsive changes if needed
    if (isMobile()) {
        // Mobile-specific adjustments
    } else if (isTablet()) {
        // Tablet-specific adjustments
    } else {
        // Desktop-specific adjustments
    }
});

// Export functions for use in other files
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
