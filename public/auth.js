// Function to check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/auth/status');
        const data = await response.json();
        updateUI(data.isAuthenticated);
    } catch (error) {
        console.error('Error checking auth status:', error);
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
    } else {
        authButtons.forEach(btn => btn.style.display = 'none');
        if (loginBtn) loginBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
    }
}

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', checkAuthStatus);
