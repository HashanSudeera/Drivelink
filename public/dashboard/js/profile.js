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
// Setup multiple vehicles functionality
function setupMultipleVehicles() {
    const addVehicleBtn = document.getElementById("addVehicleBtn");
    const addVehicleModal = document.getElementById("addVehicleModal");
    const closeVehicleModal = document.getElementById("closeVehicleModal");
    const cancelAddVehicle = document.getElementById("cancelAddVehicle");
    const saveNewVehicle = document.getElementById("saveNewVehicle");
    const blurOverlay = document.getElementById("blurOverlay");
    const newVehicleModel = document.getElementById("newVehicleModel");
    const otherModelContainer = document.getElementById("otherModelContainer");
    
    // Show modal when Add Vehicle button is clicked
    if (addVehicleBtn && addVehicleModal && blurOverlay) {
        addVehicleBtn.addEventListener("click", function() {
            addVehicleModal.style.display = "block";
            blurOverlay.style.display = "block";
        });
    }
    
    // Handle "Other" selection in vehicle model dropdown
    if (newVehicleModel && otherModelContainer) {
        newVehicleModel.addEventListener("change", function() {
            if (this.value === "other") {
                otherModelContainer.style.display = "block";
            } else {
                otherModelContainer.style.display = "none";
            }
        });
    }
    
    // Close modal functions
    if (closeVehicleModal && cancelAddVehicle) {
        const closeModalFn = function() {
            addVehicleModal.style.display = "none";
            blurOverlay.style.display = "none";
            // Reset form fields
            document.getElementById("newVehicleModel").value = "dio";
            document.getElementById("otherModelInput").value = "";
            document.getElementById("newVehicleYear").value = "";
            document.getElementById("newVehiclePlate").value = "";
            document.getElementById("newVehicleFuel").value = "gasoline";
            document.getElementById("newVehicleMileage").value = "";
            otherModelContainer.style.display = "none";
        };
        
        closeVehicleModal.addEventListener("click", closeModalFn);
        cancelAddVehicle.addEventListener("click", closeModalFn);
    }
    
    // Save new vehicle
    if (saveNewVehicle) {
        saveNewVehicle.addEventListener("click", function() {
            addNewVehicle();
        });
    }
}

// Function to add a new vehicle
function addNewVehicle() {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast("Not logged in. Please log in again.");
        return;
    }
    
    // Get values from form
    let vehicleModel = document.getElementById("newVehicleModel").value;
    const vehicleYear = document.getElementById("newVehicleYear").value;
    const vehiclePlate = document.getElementById("newVehiclePlate").value;
    const vehicleFuel = document.getElementById("newVehicleFuel").value;
    const vehicleMileage = document.getElementById("newVehicleMileage").value;
    
    // Handle "other" model type
    if (vehicleModel === "other") {
        vehicleModel = document.getElementById("otherModelInput").value;
        if (!vehicleModel || vehicleModel.trim() === "") {
            showToast("Please specify vehicle model");
            return;
        }
    }
    
    // Validate required fields
    if (!vehicleModel || !vehicleYear || !vehiclePlate) {
        showToast("Please fill in all required fields");
        return;
    }
    
    // Create vehicle object
    const vehicleData = {
        model: vehicleModel,
        year: vehicleYear,
        plate: vehiclePlate,
        fuelType: vehicleFuel,
        mileage: vehicleMileage || 0,
        addedOn: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Add to user's vehicles collection
    firebase.firestore().collection("users").doc(user.uid).collection("vehicles")
        .add(vehicleData)
        .then(() => {
            console.log("Vehicle added successfully");
            showToast("Vehicle added successfully");
            
            // Close modal
            document.getElementById("addVehicleModal").style.display = "none";
            document.getElementById("blurOverlay").style.display = "none";
            
            // Update vehicle list in UI
            loadUserVehicles();
        })
        .catch(error => {
            console.error("Error adding vehicle:", error);
            showToast("Error adding vehicle");
        });
}

// Function to load and display user's vehicles
function loadUserVehicles() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // Get user's vehicles
    firebase.firestore().collection("users").doc(user.uid).collection("vehicles")
        .orderBy("addedOn", "desc")
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log("No vehicles found");
                return;
            }
            
            // Create or clear vehicles container
            let vehiclesContainer = document.getElementById("vehicles-list");
            if (!vehiclesContainer) {
                // If container doesn't exist, create it after the vehicle info section
                const vehicleSection = document.querySelector('.profile-section:nth-child(2)');
                if (vehicleSection) {
                    vehiclesContainer = document.createElement("div");
                    vehiclesContainer.id = "vehicles-list";
                    vehiclesContainer.className = "vehicles-list";
                    vehicleSection.appendChild(vehiclesContainer);
                } else {
                    console.error("Vehicle section not found");
                    return;
                }
            } else {
                // Clear existing content
                vehiclesContainer.innerHTML = "";
            }
            
            // Add vehicles to container
            snapshot.forEach(doc => {
                const vehicle = doc.data();
                const vehicleId = doc.id;
                
                const vehicleCard = document.createElement("div");
                vehicleCard.className = "vehicle-card";
                vehicleCard.dataset.id = vehicleId;
                
                vehicleCard.innerHTML = `
                    <div class="vehicle-header">
                        <h4>${vehicle.model.toUpperCase()} (${vehicle.year})</h4>
                        <div class="vehicle-actions">
                            <button class="edit-vehicle-btn" data-id="${vehicleId}"><i class="fas fa-edit"></i></button>
                            <button class="delete-vehicle-btn" data-id="${vehicleId}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="vehicle-details">
                        <div class="info-row">
                            <div class="info-label">License Plate</div>
                            <div class="info-value">${vehicle.plate}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Fuel Type</div>
                            <div class="info-value">${vehicle.fuelType}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">Mileage</div>
                            <div class="info-value">${vehicle.mileage} km</div>
                        </div>
                    </div>
                `;
                
                vehiclesContainer.appendChild(vehicleCard);
                
                // Add event listeners for edit and delete buttons
                const editBtn = vehicleCard.querySelector(".edit-vehicle-btn");
                const deleteBtn = vehicleCard.querySelector(".delete-vehicle-btn");
                
                editBtn.addEventListener("click", function() {
                    // Handle edit vehicle logic
                    editVehicle(vehicleId);
                });
                
                deleteBtn.addEventListener("click", function() {
                    // Handle delete vehicle logic
                    if (confirm("Are you sure you want to delete this vehicle?")) {
                        deleteVehicle(vehicleId);
                    }
                });
            });
        })
        .catch(error => {
            console.error("Error loading vehicles:", error);
        });
}

// Function to edit a vehicle
function editVehicle(vehicleId) {
    // This function would open a modal for editing the vehicle
    // For simplicity, we're just showing a toast message
    showToast("Edit vehicle functionality to be implemented");
}

// Function to delete a vehicle
function deleteVehicle(vehicleId) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    firebase.firestore().collection("users").doc(user.uid).collection("vehicles").doc(vehicleId)
        .delete()
        .then(() => {
            console.log("Vehicle deleted successfully");
            showToast("Vehicle deleted successfully");
            
            // Update vehicle list in UI
            const vehicleCard = document.querySelector(`.vehicle-card[data-id="${vehicleId}"]`);
            if (vehicleCard) {
                vehicleCard.remove();
            }
        })
        .catch(error => {
            console.error("Error deleting vehicle:", error);
            showToast("Error deleting vehicle");
        });
}

// Add these function calls inside document.addEventListener("DOMContentLoaded", function() {...})
document.addEventListener("DOMContentLoaded", function() {
    // ... existing code
    
    // Setup Multiple Vehicles
    setupMultipleVehicles();
    
    // Load User Vehicles
    loadUserVehicles();
});
// Setup multiple vehicles and devices functionality
function setupMultipleVehicles() {
    const addVehicleBtn = document.getElementById("addVehicleBtn");
    const addVehicleModal = document.getElementById("addVehicleModal");
    const closeVehicleModal = document.getElementById("closeVehicleModal");
    const cancelAddVehicle = document.getElementById("cancelAddVehicle");
    const saveNewVehicle = document.getElementById("saveNewVehicle");
    const blurOverlay = document.getElementById("blurOverlay");
    const newVehicleModel = document.getElementById("newVehicleModel");
    const otherModelContainer = document.getElementById("otherModelContainer");
    const deviceSelector = document.getElementById("deviceSelector");
    
    // Show modal when Add Vehicle button is clicked
    if (addVehicleBtn && addVehicleModal && blurOverlay) {
        addVehicleBtn.addEventListener("click", function() {
            addVehicleModal.style.display = "block";
            blurOverlay.style.display = "block";
        });
    }
    
    // Handle "Other" selection in vehicle model dropdown
    if (newVehicleModel && otherModelContainer) {
        newVehicleModel.addEventListener("change", function() {
            if (this.value === "other") {
                otherModelContainer.style.display = "block";
            } else {
                otherModelContainer.style.display = "none";
            }
        });
    }
    
    // Device selector change event
    if (deviceSelector) {
        deviceSelector.addEventListener("change", function() {
            const selectedDeviceId = this.value;
            if (selectedDeviceId) {
                // Load vehicle data for the selected device
                loadVehicleDataForDevice(selectedDeviceId);
            }
        });
    }
    
    // Close modal functions
    if (closeVehicleModal && cancelAddVehicle) {
        const closeModalFn = function() {
            addVehicleModal.style.display = "none";
            blurOverlay.style.display = "none";
            // Reset form fields
            document.getElementById("newDeviceId").value = "";
            document.getElementById("newVehicleModel").value = "dio";
            document.getElementById("otherModelInput").value = "";
            document.getElementById("newVehicleYear").value = "";
            document.getElementById("newVehiclePlate").value = "";
            document.getElementById("newVehicleFuel").value = "gasoline";
            document.getElementById("newVehicleMileage").value = "";
            otherModelContainer.style.display = "none";
        };
        
        closeVehicleModal.addEventListener("click", closeModalFn);
        cancelAddVehicle.addEventListener("click", closeModalFn);
    }
    
    // Save new vehicle
    if (saveNewVehicle) {
        saveNewVehicle.addEventListener("click", function() {
            addNewVehicle();
        });
    }
}

// Function to add a new vehicle with device ID
function addNewVehicle() {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast("Not logged in. Please log in again.");
        return;
    }
    
    // Get values from form
    const deviceId = document.getElementById("newDeviceId").value.trim();
    let vehicleModel = document.getElementById("newVehicleModel").value;
    const vehicleYear = document.getElementById("newVehicleYear").value;
    const vehiclePlate = document.getElementById("newVehiclePlate").value;
    const vehicleFuel = document.getElementById("newVehicleFuel").value;
    const vehicleMileage = document.getElementById("newVehicleMileage").value;
    
    // Handle "other" model type
    if (vehicleModel === "other") {
        vehicleModel = document.getElementById("otherModelInput").value;
        if (!vehicleModel || vehicleModel.trim() === "") {
            showToast("Please specify vehicle model");
            return;
        }
    }
    
    // Validate required fields
    if (!deviceId || !vehicleModel || !vehicleYear || !vehiclePlate) {
        showToast("Please fill in all required fields");
        return;
    }
    
    // Check if device ID already exists
    firebase.firestore().collection("users").doc(user.uid).collection("devices")
        .where("deviceId", "==", deviceId)
        .get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                showToast("Device ID already registered");
                return;
            }
            
            // Create vehicle data object
            const deviceData = {
                deviceId: deviceId,
                model: vehicleModel,
                year: vehicleYear,
                plate: vehiclePlate,
                fuelType: vehicleFuel,
                mileage: vehicleMileage || 0,
                isDefault: false, // First device added will be set as default
                addedOn: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // Check if this is the first device (to set as default)
            return firebase.firestore().collection("users").doc(user.uid).collection("devices")
                .get()
                .then((devicesSnapshot) => {
                    if (devicesSnapshot.empty) {
                        deviceData.isDefault = true; // First device, set as default
                    }
                    
                    // Add to user's devices collection
                    return firebase.firestore().collection("users").doc(user.uid).collection("devices")
                        .add(deviceData);
                });
        })
        .then(() => {
            console.log("Vehicle with device ID added successfully");
            showToast("Vehicle added successfully");
            
            // Close modal
            document.getElementById("addVehicleModal").style.display = "none";
            document.getElementById("blurOverlay").style.display = "none";
            
            // Update device list in UI
            loadUserDevices();
        })
        .catch(error => {
            console.error("Error adding vehicle:", error);
            showToast("Error adding vehicle: " + error.message);
        });
}

// Function to load user's devices and populate dropdown
function loadUserDevices() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const deviceSelector = document.getElementById("deviceSelector");
    if (!deviceSelector) return;
    
    // Clear existing options except the first one
    while (deviceSelector.options.length > 1) {
        deviceSelector.remove(1);
    }
    
    // Get user's devices
    firebase.firestore().collection("users").doc(user.uid).collection("devices")
        .orderBy("addedOn", "desc")
        .get()
        .then(snapshot => {
            let defaultDeviceId = null;
            
            // Add devices to dropdown
            snapshot.forEach(doc => {
                const device = doc.data();
                const option = document.createElement("option");
                option.value = device.deviceId;
                option.textContent = `${device.model} (${device.deviceId})`;
                deviceSelector.appendChild(option);
                
                // Keep track of default device
                if (device.isDefault) {
                    defaultDeviceId = device.deviceId;
                }
            });
            
            // Create devices container and list all devices
            createDevicesContainer(snapshot);
            
            // Select default device
            if (defaultDeviceId) {
                deviceSelector.value = defaultDeviceId;
                // Load data for default device
                loadVehicleDataForDevice(defaultDeviceId);
            } else if (deviceSelector.options.length > 1) {
                // If no default, select first device
                deviceSelector.selectedIndex = 1;
                loadVehicleDataForDevice(deviceSelector.value);
            }
        })
        .catch(error => {
            console.error("Error loading devices:", error);
            showToast("Error loading devices");
        });
}

// Create a container to display all devices
function createDevicesContainer(snapshot) {
    // Check if devices section already exists, if not create it
    let devicesSection = document.getElementById("devices-section");
    
    if (!devicesSection) {
        // Create a new section for devices after the vehicle info section
        const profileSections = document.querySelector('.profile-sections');
        
        devicesSection = document.createElement("div");
        devicesSection.id = "devices-section";
        devicesSection.className = "profile-section";
        
        devicesSection.innerHTML = `
            <div class="section-header">
                <h3><i class="fas fa-microchip"></i> Device Management</h3>
            </div>
            <div class="section-content" id="devices-list-container">
                <!-- Devices will be added here via JavaScript -->
            </div>
        `;
        
        // Insert after the vehicle section
        const vehicleSection = document.querySelector('.profile-section:nth-child(2)');
        if (vehicleSection && profileSections) {
            profileSections.insertBefore(devicesSection, vehicleSection.nextSibling);
        }
    }
    
    // Get the container for the device list
    const devicesContainer = document.getElementById("devices-list-container");
    if (!devicesContainer) return;
    
    // Clear existing content
    devicesContainer.innerHTML = "";
    
    // Add devices to container
    if (snapshot.empty) {
        devicesContainer.innerHTML = "<p>No devices registered yet.</p>";
        return;
    }
    
    snapshot.forEach(doc => {
        const device = doc.data();
        const deviceId = doc.id;
        
        const deviceCard = document.createElement("div");
        deviceCard.className = "device-card";
        deviceCard.dataset.id = deviceId;
        deviceCard.dataset.deviceId = device.deviceId;
        
        deviceCard.innerHTML = `
            <div class="device-info">
                <span class="device-name">${device.model} ${device.year}</span>
                <span class="device-id">Device ID: ${device.deviceId} ${device.isDefault ? '<span class="primary-device-badge">Default</span>' : ''}</span>
            </div>
            <div class="device-actions">
                ${!device.isDefault ? `<button class="make-default-btn" data-id="${deviceId}"><i class="fas fa-star"></i> Make Default</button>` : ''}
                <button class="edit-device-btn" data-id="${deviceId}"><i class="fas fa-edit"></i></button>
                <button class="delete-device-btn" data-id="${deviceId}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        devicesContainer.appendChild(deviceCard);
        
        // Add event listeners
        if (!device.isDefault) {
            const defaultBtn = deviceCard.querySelector(".make-default-btn");
            if (defaultBtn) {
                defaultBtn.addEventListener("click", function() {
                    setDefaultDevice(deviceId);
                });
            }
        }
        
        const editBtn = deviceCard.querySelector(".edit-device-btn");
        if (editBtn) {
            editBtn.addEventListener("click", function() {
                editDevice(deviceId);
            });
        }
        
        const deleteBtn = deviceCard.querySelector(".delete-device-btn");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", function() {
                if (device.isDefault) {
                    showToast("Cannot delete default device. Set another device as default first.");
                    return;
                }
                if (confirm("Are you sure you want to delete this device?")) {
                    deleteDevice(deviceId);
                }
            });
        }
    });
}

// Load vehicle data for selected device
function loadVehicleDataForDevice(deviceId) {
    const user = firebase.auth().currentUser;
    if (!user || !deviceId) return;
    
    firebase.firestore().collection("users").doc(user.uid).collection("devices")
        .where("deviceId", "==", deviceId)
        .limit(1)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log("No device found with ID:", deviceId);
                return;
            }
            
            const device = snapshot.docs[0].data();
            
            // Update vehicle information in the UI
            document.getElementById("vehicleModel").textContent = device.model || "Not provided";
            document.getElementById("vehicleYear").textContent = device.year || "Not provided";
            document.getElementById("vehiclePlate").textContent = device.plate || "Not provided";
            document.getElementById("vehicleFuel").textContent = device.fuelType || "Not provided";
            
            // Also update form fields
            document.getElementById("modelInput").value = device.model || "";
            document.getElementById("yearInput").value = device.year || "";
            document.getElementById("plateInput").value = device.plate || "";
            
            // Set select option for fuel type
            const fuelInput = document.getElementById("fuelInput");
            if (fuelInput && device.fuelType) {
                for (let i = 0; i < fuelInput.options.length; i++) {
                    if (fuelInput.options[i].value === device.fuelType.toLowerCase()) {
                        fuelInput.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Update device ID display
            document.getElementById("deviceId").textContent = device.deviceId;
            document.getElementById("deviceIdInput").value = device.deviceId;
        })
        .catch(error => {
            console.error("Error loading device data:", error);
            showToast("Error loading device data");
        });
}

// Set a device as default
function setDefaultDevice(deviceId) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // First, reset all devices to non-default
    firebase.firestore().collection("users").doc(user.uid).collection("devices")
        .get()
        .then(snapshot => {
            const batch = firebase.firestore().batch();
            
            snapshot.forEach(doc => {
                batch.update(doc.ref, { isDefault: false });
            });
            
            return batch.commit();
        })
        .then(() => {
            // Then set the selected device as default
            return firebase.firestore().collection("users").doc(user.uid).collection("devices")
                .doc(deviceId)
                .update({ isDefault: true });
        })
        .then(() => {
            console.log("Default device updated");
            showToast("Default device updated");
            
            // Reload devices
            loadUserDevices();
        })
        .catch(error => {
            console.error("Error setting default device:", error);
            showToast("Error setting default device");
        });
}

// Edit device
function editDevice(deviceId) {
    // In a real implementation, this would open a modal for editing
    // For now, just show a toast message
    showToast("Edit device functionality to be implemented");
}

// Delete device
function deleteDevice(deviceId) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    firebase.firestore().collection("users").doc(user.uid).collection("devices")
        .doc(deviceId)
        .get()
        .then(doc => {
            if (!doc.exists) throw new Error("Device not found");
            
            const device = doc.data();
            if (device.isDefault) throw new Error("Cannot delete default device");
            
            return firebase.firestore().collection("users").doc(user.uid).collection("devices")
                .doc(deviceId)
                .delete();
        })
        .then(() => {
            console.log("Device deleted successfully");
            showToast("Device deleted successfully");
            
            // Reload devices
            loadUserDevices();
        })
        .catch(error => {
            console.error("Error deleting device:", error);
            showToast("Error deleting device: " + error.message);
        });
}

// Modify existing saveSection function to handle device ID changes
function saveSection(section) {
    const user = firebase.auth().currentUser;
    if (!user) {
        showToast("Not logged in. Please log in again.");
        return;
    }
    
    // Get current selected device ID from dropdown
    const deviceSelector = document.getElementById("deviceSelector");
    const currentDeviceId = deviceSelector ? deviceSelector.value : null;
    
    if (section === "vehicle" && currentDeviceId) {
        // First find the device document
        firebase.firestore().collection("users").doc(user.uid).collection("devices")
            .where("deviceId", "==", currentDeviceId)
            .limit(1)
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    showToast("Device not found");
                    return;
                }
                
                const deviceDoc = snapshot.docs[0];
                
                // Update the specific device
                return deviceDoc.ref.update({
                    model: document.getElementById("modelInput").value,
                    year: document.getElementById("yearInput").value,
                    plate: document.getElementById("plateInput").value,
                    fuelType: document.getElementById("fuelInput").value
                });
            })
            .then(() => {
                console.log("Vehicle information updated successfully");
                showToast("Vehicle information updated successfully");
                
                // Update visible content
                document.getElementById("vehicleModel").textContent = document.getElementById("modelInput").value;
                document.getElementById("vehicleYear").textContent = document.getElementById("yearInput").value;
                document.getElementById("vehiclePlate").textContent = document.getElementById("plateInput").value;
                document.getElementById("vehicleFuel").textContent = document.getElementById("fuelInput").value;
                
                // Update dropdown text
                if (deviceSelector && deviceSelector.selectedIndex > 0) {
                    const selectedOption = deviceSelector.options[deviceSelector.selectedIndex];
                    selectedOption.textContent = `${document.getElementById("modelInput").value} (${currentDeviceId})`;
                }
                
                // Hide edit section, show view section
                document.getElementById("vehicle-info-section").style.display = "block";
                document.getElementById("vehicle-info-edit").style.display = "none";
                
                // Reload devices list
                loadUserDevices();
            })
            .catch(error => {
                console.error("Error updating vehicle information:", error);
                showToast("Error updating vehicle information");
            });
        
        return; // Exit function early
    }
    
    // For other sections, continue with original logic
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

// Add these function calls to the DOMContentLoaded event handler
document.addEventListener("DOMContentLoaded", function() {
    // ... existing code
    
    // Setup Multiple Vehicles and Device Management
    setupMultipleVehicles();
    
    // Load User Devices
    loadUserDevices();
});