const toggleButton = document.getElementById('toggle-btn')
const sidebar = document.getElementById('sidebar')

function toggleSidebar() {
    sidebar.classList.toggle('close')
    toggleButton.classList.toggle('rotate')

    closeAllSubMenus()
}

/* function toggleSubMenu(button) {

    if (!button.nextElementSibling.classList.contains('show')) {
        closeAllSubMenus()
    }

    button.nextElementSibling.classList.toggle('show')
    button.classList.toggle('rotate')

    if (sidebar.classList.contains('close')) {
        sidebar.classList.toggle('close')
        toggleButton.classList.toggle('rotate')
    }
}

function closeAllSubMenus() {
    Array.from(sidebar.getElementsByClassName('show')).forEach(ul => {
        ul.classList.remove('show')
        ul.previousElementSibling.classList.remove('rotate')
    })
} */

/*trip manger funtions*/
// Import Firebase
/* 
// Sample event listeners for demonstration
document.getElementById('logout-button').addEventListener('click', function() {
    showToast('Logging out...');
    setTimeout(function() {
        window.location.href = 'login.html';
    }, 1500);
});

document.getElementById('header-logout').addEventListener('click', function() {
    showToast('Logging out...');
    setTimeout(function() {
        window.location.href = 'login.html';
    }, 1500);
});


 */