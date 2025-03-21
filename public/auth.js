// Function to check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/status');
        if (!response.ok) {
            throw new Error('Failed to fetch auth status');
        }
        const data = await response.json();
        console.log('Auth status:', data);
        updateUI(data.isAuthenticated);
        return data;
    } catch (error) {
        console.error('Error checking auth status:', error);
        updateUI(false);
        return { isAuthenticated: false };
    }
}

// Function to update UI based on auth status
function updateUI(isAuthenticated) {
    const authButtons = document.querySelectorAll('.auth-dependent');
    const loginBtn = document.querySelector('.login-btn');
    const userMenu = document.querySelector('.user-menu');
    
    if (isAuthenticated) {
        authButtons.forEach(btn => btn.style.display = 'block');
        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        
        // Update begin button if on homepage
        const beginBtn = document.getElementById('begin');
        if (beginBtn && window.location.pathname === '/' || window.location.pathname === '/home') {
            beginBtn.href = '/begin';
        }
    } else {
        authButtons.forEach(btn => btn.style.display = 'none');
        if (loginBtn) loginBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
        
        // Update begin button if on homepage
        const beginBtn = document.getElementById('begin');
        if (beginBtn && window.location.pathname === '/' || window.location.pathname === '/home') {
            beginBtn.href = '/login';
        }
    }
}

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    
    // Periodically check auth status (every 30 seconds)
    setInterval(checkAuthStatus, 30000);
});

// Listen for storage events (for cross-tab synchronization)
window.addEventListener('storage', (event) => {
    if (event.key === 'authState') {
        const authState = JSON.parse(event.newValue);
        updateUI(authState.isAuthenticated);
    }
});

// Function to handle login
async function login() {
    window.location.href = '/auth/google';
}

// Function to handle logout
async function logout() {
    window.location.href = '/logout';
    localStorage.setItem('authState', JSON.stringify({ isAuthenticated: false }));
}
