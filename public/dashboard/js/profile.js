// profile.js - Script for handling profile page functionality

document.addEventListener("DOMContentLoaded", function() {
    // Initialize Firebase Auth Listener
    initAuthListener();
    
    // Setup Edit Section Event Listeners
    setupEditSectionButtons();
    
    // Setup Avatar Change Functionality
    setupAvatarChange();
    
    // Setup Danger Zone Actions
    setupDangerZone();
    
    // Setup User Menu Toggle
    setupUserMenu();
});

// Firebase Auth Listener to load user data
function initAuthListener() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                // Load user profile data from Firestore
                const userRef = firebase.firestore().collection("users").doc(user.uid);
                const userDoc = await userRef.get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    populateUserProfile(userData, user);
                } else {
                    console.error("User document does not exist in Firestore");
                    showToast("Error loading profile data");
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                showToast("Error loading profile data");
            }
        } else {
            // User is not signed in, redirect to login
            window.location.href = "../login.html";
        }
    });
}

// Populate user profile with data from Firestore
function populateUserProfile(userData, user) {
    // Profile header information
    document.getElementById("profileName").textContent = userData.username || "User";
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("userEmail").textContent = user.email;
    
    // Format creation date
    const memberSince = userData.timestamp ? 
        new Date(userData.timestamp.seconds * 1000).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : 
        "Unknown";
    document.getElementById("memberSince").textContent = memberSince;
    
    // Personal information
    document.getElementById("userFullName").textContent = userData.username || "Not provided";
    document.getElementById("userPhone").textContent = userData.phone || "Not provided";
    document.getElementById("userAddress").textContent = userData.address || "Not provided";
    
    // Form inputs
    document.getElementById("fullNameInput").value = userData.username || "";
    document.getElementById("phoneInput").value = userData.phone || "";
    document.getElementById("addressInput").value = userData.address || "";
    
    // Vehicle information
    document.getElementById("vehicleModel").textContent = userData.vehicleType || "Not provided";
    document.getElementById("vehicleYear").textContent = userData.vehicleYear || "Not provided";
    document.getElementById("vehiclePlate").textContent = userData.vehiclePlate || "Not provided";
    document.getElementById("vehicleFuel").textContent = userData.fuelType || "Not provided";
    
    // Form inputs for vehicle
    document.getElementById("modelInput").value = userData.vehicleType || "";
    document.getElementById("yearInput").value = userData.vehicleYear || "";
    document.getElementById("plateInput").value = userData.vehiclePlate || "";
    
    // Set select option for fuel type
    const fuelInput = document.getElementById("fuelInput");
    if (fuelInput && userData.fuelType) {
        for (let i = 0; i < fuelInput.options.length; i++) {
            if (fuelInput.options[i].value === userData.fuelType.toLowerCase()) {
                fuelInput.selectedIndex = i;
                break;
            }
        }
    }
    
    // Account settings
    document.getElementById("deviceId").textContent = userData.deviceId || "Not provided";
    document.getElementById("deviceIdInput").value = userData.deviceId || "";
    document.getElementById("emailInput").value = user.email || "";
    
    // Set notification preferences if available
    if (userData.notifications) {
        document.getElementById("notificationToggle").checked = userData.notifications.enabled || true;
        document.getElementById("notificationCheckbox").checked = userData.notifications.enabled || true;
        document.getElementById("fuelAlertToggle").checked = userData.notifications.fuelAlerts || true;
        document.getElementById("fuelAlertCheckbox").checked = userData.notifications.fuelAlerts || true;
        document.getElementById("batteryAlertToggle").checked = userData.notifications.batteryAlerts || true;
        document.getElementById("batteryAlertCheckbox").checked = userData.notifications.batteryAlerts || true;
        document.getElementById("maintenanceToggle").checked = userData.notifications.maintenanceReminders || true;
        document.getElementById("maintenanceCheckbox").checked = userData.notifications.maintenanceReminders || true;
        document.getElementById("tripToggle").checked = userData.notifications.tripNotifications || false;
        document.getElementById("tripCheckbox").checked = userData.notifications.tripNotifications || false;
    }
    
    // Load avatar if available
    if (userData.avatarUrl) {
        document.getElementById("profileAvatar").src = userData.avatarUrl;
        document.getElementById("headerUserAvatar").src = userData.avatarUrl;
    }
}

// Setup edit section buttons and functionality
function setupEditSectionButtons() {
    // Click handlers for edit buttons
    const editButtons = document.querySelectorAll(".edit-section-btn");
    editButtons.forEach(button => {
        button.addEventListener("click", function() {
            const section = this.getAttribute("data-section");
            const viewSection = document.getElementById(`${section}-info-section`) || 
                                document.getElementById(`${section}-section`);
            const editSection = document.getElementById(`${section}-info-edit`) || 
                               document.getElementById(`${section}-edit`);
            
            if (viewSection && editSection) {
                viewSection.style.display = "none";
                editSection.style.display = "block";
            }
        });
    });
    
    // Click handlers for cancel buttons
    const cancelButtons = document.querySelectorAll(".cancel-btn");
    cancelButtons.forEach(button => {
        button.addEventListener("click", function() {
            const section = this.getAttribute("data-section");
            const viewSection = document.getElementById(`${section}-info-section`) || 
                                document.getElementById(`${section}-section`);
            const editSection = document.getElementById(`${section}-info-edit`) || 
                               document.getElementById(`${section}-edit`);
            
            if (viewSection && editSection) {
                viewSection.style.display = "block";
                editSection.style.display = "none";
            }
        });
    });
    
    // Click handlers for save buttons
    const saveButtons = document.querySelectorAll(".save-btn");
    saveButtons.forEach(button => {
        button.addEventListener("click", function() {
            const section = this.getAttribute("data-section");
            saveSection(section);
        });
    });
}

// Save section data to Firestore
function saveSection(section) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast("Not logged in. Please log in again.");
        return;
    }
    
    const userRef = firebase.firestore().collection("users").doc(user.uid);
    let updates = {};
    
    switch (section) {
        case "personal":
            updates = {
                username: document.getElementById("fullNameInput").value,
                phone: document.getElementById("phoneInput").value,
                address: document.getElementById("addressInput").value
            };
            break;
            
        case "vehicle":
            updates = {
                vehicleType: document.getElementById("modelInput").value,
                vehicleYear: document.getElementById("yearInput").value,
                vehiclePlate: document.getElementById("plateInput").value,
                fuelType: document.getElementById("fuelInput").value
            };
            break;
            
        case "account":
            // Handle password change separately
            const currentPassword = document.getElementById("currentPasswordInput").value;
            const newPassword = document.getElementById("newPasswordInput").value;
            const confirmPassword = document.getElementById("confirmPasswordInput").value;
            
            if (currentPassword && newPassword) {
                if (newPassword !== confirmPassword) {
                    showToast("New passwords do not match");
                    return;
                }
                
                // Update password
                updateUserPassword(currentPassword, newPassword);
            }
            
            updates = {
                deviceId: document.getElementById("deviceIdInput").value,
                'notifications.enabled': document.getElementById("notificationCheckbox").checked
            };
            break;
            
        case "notifications":
            updates = {
                'notifications.fuelAlerts': document.getElementById("fuelAlertCheckbox").checked,
                'notifications.batteryAlerts': document.getElementById("batteryAlertCheckbox").checked,
                'notifications.maintenanceReminders': document.getElementById("maintenanceCheckbox").checked,
                'notifications.tripNotifications': document.getElementById("tripCheckbox").checked,
                'notifications.enabled': true
            };
            break;
    }
    
    // Update Firestore document
    userRef.update(updates)
        .then(() => {
            console.log(`${section} information updated successfully`);
            showToast(`${section.charAt(0).toUpperCase() + section.slice(1)} information updated successfully`);
            
            // Update visible content
            updateVisibleContent(section, updates);
            
            // Hide edit section, show view section
            const viewSection = document.getElementById(`${section}-info-section`) || 
                            document.getElementById(`${section}-section`);
            const editSection = document.getElementById(`${section}-info-edit`) || 
                           document.getElementById(`${section}-edit`);
            
            if (viewSection && editSection) {
                viewSection.style.display = "block";
                editSection.style.display = "none";
            }
        })
        .catch(error => {
            console.error(`Error updating ${section} information:`, error);
            showToast(`Error updating ${section} information`);
        });
}

// Update user password
function updateUserPassword(currentPassword, newPassword) {
    const user = firebase.auth().currentUser;
    
    // Create credential with current password
    const credential = firebase.auth.EmailAuthProvider.credential(
        user.email, 
        currentPassword
    );
    
    // Reauthenticate
    user.reauthenticateWithCredential(credential)
        .then(() => {
            // Update password
            return user.updatePassword(newPassword);
        })
        .then(() => {
            console.log("Password updated successfully");
            showToast("Password updated successfully");
            // Clear password fields
            document.getElementById("currentPasswordInput").value = "";
            document.getElementById("newPasswordInput").value = "";
            document.getElementById("confirmPasswordInput").value = "";
        })
        .catch(error => {
            console.error("Error updating password:", error);
            showToast("Error updating password: " + error.message);
        });
}

// Update visible content after saving changes
function updateVisibleContent(section, updates) {
    switch (section) {
        case "personal":
            document.getElementById("userFullName").textContent = updates.username || "Not provided";
            document.getElementById("userPhone").textContent = updates.phone || "Not provided";
            document.getElementById("userAddress").textContent = updates.address || "Not provided";
            document.getElementById("profileName").textContent = updates.username || "User";
            break;
            
        case "vehicle":
            document.getElementById("vehicleModel").textContent = updates.vehicleType || "Not provided";
            document.getElementById("vehicleYear").textContent = updates.vehicleYear || "Not provided";
            document.getElementById("vehiclePlate").textContent = updates.vehiclePlate || "Not provided";
            document.getElementById("vehicleFuel").textContent = updates.fuelType || "Not provided";
            break;
            
        case "account":
            document.getElementById("deviceId").textContent = updates.deviceId || "Not provided";
            document.getElementById("notificationToggle").checked = updates['notifications.enabled'];
            break;
            
        case "notifications":
            document.getElementById("fuelAlertToggle").checked = updates['notifications.fuelAlerts'];
            document.getElementById("batteryAlertToggle").checked = updates['notifications.batteryAlerts'];
            document.getElementById("maintenanceToggle").checked = updates['notifications.maintenanceReminders'];
            document.getElementById("tripToggle").checked = updates['notifications.tripNotifications'];
            break;
    }
}

// Setup avatar change functionality
function setupAvatarChange() {
    const changeAvatarBtn = document.getElementById("changeAvatarBtn");
    const avatarUpload = document.getElementById("avatarUpload");
    const profileAvatar = document.getElementById("profileAvatar");
    const headerUserAvatar = document.getElementById("headerUserAvatar");
    
    // Open file dialog when change avatar button is clicked
    if (changeAvatarBtn && avatarUpload) {
        changeAvatarBtn.addEventListener("click", function() {
            avatarUpload.click();
        });
    }
    
    // Handle avatar file selection
    if (avatarUpload) {
        avatarUpload.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            // Validate file is an image
            if (!file.type.match('image.*')) {
                showToast("Please select an image file");
                return;
            }
            
            // Show a loading state
            showToast("Uploading avatar...");
            
            // Get current user
            const user = firebase.auth().currentUser;
            if (!user) {
                showToast("User not logged in");
                return;
            }
            
            // Create a storage reference
            const storageRef = firebase.storage().ref(`avatars/${user.uid}`);
            const uploadTask = storageRef.put(file);
            
            // Monitor upload progress
            uploadTask.on('state_changed', 
                (snapshot) => {
                    // Progress function
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                }, 
                (error) => {
                    // Error function
                    console.error("Error uploading avatar:", error);
                    showToast("Error uploading avatar");
                }, 
                () => {
                    // Complete function
                    uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                        console.log('File available at', downloadURL);
                        
                        // Update avatar URL in Firestore
                        firebase.firestore().collection("users").doc(user.uid)
                            .update({
                                avatarUrl: downloadURL
                            })
                            .then(() => {
                                // Update avatars in the UI
                                if (profileAvatar) profileAvatar.src = downloadURL;
                                if (headerUserAvatar) headerUserAvatar.src = downloadURL;
                                showToast("Avatar updated successfully");
                            })
                            .catch(error => {
                                console.error("Error updating avatar URL:", error);
                                showToast("Error updating avatar");
                            });
                    });
                }
            );
        });
    }
}

// Setup danger zone actions
function setupDangerZone() {
    const deleteAccountBtn = document.getElementById("deleteAccountBtn");
    const resetDataBtn = document.getElementById("resetDataBtn");
    const deleteModal = document.getElementById("deleteModal");
    const blurOverlay = document.getElementById("blurOverlay");
    const closeModal = document.querySelector(".close-modal");
    const cancelDelete = document.getElementById("cancelDelete");
    const confirmDelete = document.getElementById("confirmDelete");
    
    // Delete account button
    if (deleteAccountBtn && deleteModal && blurOverlay) {
        deleteAccountBtn.addEventListener("click", function() {
            deleteModal.style.display = "block";
            blurOverlay.style.display = "block";
        });
    }
    
    // Close modal buttons
    if (closeModal && cancelDelete) {
        const closeModalFn = function() {
            deleteModal.style.display = "none";
            blurOverlay.style.display = "none";
            // Clear password field
            document.getElementById("deleteConfirmPassword").value = "";
        };
        
        closeModal.addEventListener("click", closeModalFn);
        cancelDelete.addEventListener("click", closeModalFn);
    }
    
    // Confirm delete button
    if (confirmDelete) {
        confirmDelete.addEventListener("click", function() {
            const password = document.getElementById("deleteConfirmPassword").value;
            if (!password) {
                showToast("Please enter your password to confirm");
                return;
            }
            
            deleteUserAccount(password);
        });
    }
    
    // Reset data button
    if (resetDataBtn) {
        resetDataBtn.addEventListener("click", function() {
            if (confirm("Are you sure you want to reset all your data? This cannot be undone.")) {
                resetUserData();
            }
        });
    }
}

// Delete user account
function deleteUserAccount(password) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast("User not logged in");
        return;
    }
    
    // Create credential for re-authentication
    const credential = firebase.auth.EmailAuthProvider.credential(
        user.email, 
        password
    );
    
    // Re-authenticate user
    user.reauthenticateWithCredential(credential)
        .then(() => {
            // Delete user data from Firestore
            return firebase.firestore().collection("users").doc(user.uid).delete();
        })
        .then(() => {
            // Delete user account
            return user.delete();
        })
        .then(() => {
            showToast("Account deleted successfully");
            // Redirect to login page
            setTimeout(() => {
                window.location.href = "../index.html";
            }, 2000);
        })
        .catch(error => {
            console.error("Error deleting account:", error);
            showToast("Error deleting account: " + error.message);
            
            // Hide modal
            document.getElementById("deleteModal").style.display = "none";
            document.getElementById("blurOverlay").style.display = "none";
        });
}

// Reset user data
function resetUserData() {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast("User not logged in");
        return;
    }
    
    // Get current device ID to preserve
    firebase.firestore().collection("users").doc(user.uid).get()
        .then(doc => {
            if (doc.exists) {
                const deviceId = doc.data().deviceId;
                const email = user.email;
                const username = doc.data().username;
                
                // Reset data but preserve essential fields
                return firebase.firestore().collection("users").doc(user.uid).set({
                    username: username,
                    email: email,
                    deviceId: deviceId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                throw new Error("User document not found");
            }
        })
        .then(() => {
            showToast("Data reset successfully");
            // Reload page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        })
        .catch(error => {
            console.error("Error resetting data:", error);
            showToast("Error resetting data: " + error.message);
        });
}

// Setup user menu toggle
function setupUserMenu() {
    const userMenu = document.querySelector(".user-menu");
    const userDropdown = document.querySelector(".user-dropdown");
    
    if (userMenu && userDropdown) {
        userMenu.addEventListener("click", function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle("active");
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener("click", function() {
            userDropdown.classList.remove("active");
        });
    }
    
    // Header logout button
    const headerLogout = document.getElementById("header-logout");
    if (headerLogout) {
        headerLogout.addEventListener("click", function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Logout function
function logout() {
    firebase.auth().signOut()
        .then(() => {
            localStorage.clear();
            window.location.href = "../login.html";
        })
        .catch(error => {
            console.error("Error signing out:", error);
            showToast("Error signing out");
        });
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const blurOverlay = document.getElementById("blurOverlay");
    
    if (!toast || !toastMessage) {
        console.error("Toast elements not found");
        return;
    }
    
    // Set toast message
    toastMessage.textContent = message;
    
    // Show toast
    toast.classList.add("show");
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// Toggle sidebar function (called from HTML)
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggle-btn");
    
    if (sidebar && toggleBtn) {
        sidebar.classList.toggle("expanded");
        toggleBtn.querySelector("i").classList.toggle("fa-chevron-left");
        toggleBtn.querySelector("i").classList.toggle("fa-chevron-right");
    }
}

// Toggle theme function (called from HTML)
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById("theme-toggle");
    const themeIcon = themeToggle.querySelector("i");
    const themeText = themeToggle.querySelector("span");
    
    body.classList.toggle("dark-mode");
    
    if (body.classList.contains("dark-mode")) {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
        themeText.textContent = "Dark Mode";
        localStorage.setItem("theme", "dark");
    } else {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
        themeText.textContent = "Light Mode";
        localStorage.setItem("theme", "light");
    }
}

// Toggle submenu function (called from HTML)
function toggleSubMenu(element) {
    const parent = element.parentElement;
    const subMenu = parent.querySelector(".sub-menu");
    const arrow = element.querySelector(".arrow");
    
    if (subMenu && arrow) {
        subMenu.classList.toggle("active");
        arrow.classList.toggle("rotate");
    }
}