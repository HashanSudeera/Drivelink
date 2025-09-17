

// Toggle submenu
function toggleSubMenu(element) {
    const parent = element.parentElement;
    parent.classList.toggle('active');
}

// Toggle theme
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
        localStorage.setItem('theme', 'light');
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
        localStorage.setItem('theme', 'dark');
    }
}




// Function to clear local storage
function clearStorage() {
    localStorage.clear();
    showToast('LocalStorage cleared!');
}

// Show toast message
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}


// Check for saved theme and initialize app
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
    }
    
    
});