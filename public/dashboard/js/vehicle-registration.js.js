// vehicle-registration.js - Script for handling multiple vehicle registration

document.addEventListener("DOMContentLoaded", function() {
    // Initialize variables to track vehicles
    let vehicleCount = 1;
    const maxVehicles = 3;
    
    // Setup Add Vehicle Button
    setupAddVehicleButton();
    
    // Add event listener to register button to handle multiple vehicles
    document.getElementById("register-button").addEventListener("click", handleRegistration);
});

// Setup the "Add Vehicle" button and functionality
function setupAddVehicleButton() {
    // Create an "Add Vehicle" button after the mileage input
    const mileageField = document.getElementById("mileage").parentElement;
    
    // Create Add Vehicle button
    const addVehicleBtn = document.createElement("button");
    addVehicleBtn.type = "button";
    addVehicleBtn.id = "add-vehicle-btn";
    addVehicleBtn.textContent = "Add Another Vehicle";
    addVehicleBtn.className = "secondary-btn";
    
    // Insert button after mileage field
    mileageField.parentNode.insertBefore(addVehicleBtn, mileageField.nextSibling);
    
    // Add event listener to the button
    addVehicleBtn.addEventListener("click", addVehicleFields);
}

// Add additional vehicle fields
function addVehicleFields() {
    const vehicleCount = document.querySelectorAll(".vehicle-section").length + 1;
    
    // Maximum 3 vehicles
    if (vehicleCount > 2) {
        showToast("Maximum 3 vehicles allowed");
        document.getElementById("add-vehicle-btn").style.display = "none";
        return;
    }
    
    // Create container for new vehicle fields
    const vehicleSection = document.createElement("div");
    vehicleSection.className = "vehicle-section";
    vehicleSection.id = `vehicle-section-${vehicleCount}`;
    
    // Add divider
    const divider = document.createElement("div");
    divider.className = "form-divider";
    
    // Add vehicle title
    const vehicleTitle = document.createElement("h3");
    vehicleTitle.textContent = `Vehicle ${vehicleCount + 1}`;
    
    // Create vehicle type dropdown
    const vehicleTypeGroup = document.createElement("div");
    vehicleTypeGroup.className = "form-group";
    
    const vehicleTypeSelect = document.createElement("select");
    vehicleTypeSelect.id = `vehicle-type-${vehicleCount}`;
    
    const options = ["dio", "ct100", "fz"];
    const optionLabels = ["Dio", "CT100", "FZ"];
    
    options.forEach((option, index) => {
        const optionElement = document.createElement("option");
        optionElement.value = option;
        optionElement.textContent = optionLabels[index];
        vehicleTypeSelect.appendChild(optionElement);
    });
    
    vehicleTypeGroup.appendChild(vehicleTypeSelect);
    
    // Create mileage input
    const mileageGroup = document.createElement("div");
    mileageGroup.className = "form-group";
    
    const mileageInput = document.createElement("input");
    mileageInput.type = "number";
    mileageInput.id = `mileage-${vehicleCount}`;
    mileageInput.placeholder = "Mileage (km)";
    mileageInput.required = true;
    
    mileageGroup.appendChild(mileageInput);
    
    // Create vehicle ID input
    const vehicleIdGroup = document.createElement("div");
    vehicleIdGroup.className = "form-group";
    
    const vehicleIdInput = document.createElement("input");
    vehicleIdInput.type = "text";
    vehicleIdInput.id = `vehicle-id-${vehicleCount}`;
    vehicleIdInput.placeholder = "Vehicle ID";
    vehicleIdInput.required = true;
    
    vehicleIdGroup.appendChild(vehicleIdInput);
    
    // Create license plate input
    const plateGroup = document.createElement("div");
    plateGroup.className = "form-group";
    
    const plateInput = document.createElement("input");
    plateInput.type = "text";
    plateInput.id = `vehicle-plate-${vehicleCount}`;
    plateInput.placeholder = "License Plate";
    plateInput.required = true;
    
    plateGroup.appendChild(plateInput);
    
    // Create remove button
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-vehicle-btn";
    removeBtn.textContent = "Remove Vehicle";
    removeBtn.addEventListener("click", function() {
        removeVehicleSection(vehicleSection.id);
    });
    
    // Append all elements to the vehicle section
    vehicleSection.appendChild(divider);
    vehicleSection.appendChild(vehicleTitle);
    vehicleSection.appendChild(vehicleTypeGroup);
    vehicleSection.appendChild(mileageGroup);
    vehicleSection.appendChild(vehicleIdGroup);
    vehicleSection.appendChild(plateGroup);
    vehicleSection.appendChild(removeBtn);
    
    // Insert vehicle section before the register button
    const registerButton = document.getElementById("register-button");
    registerButton.parentNode.insertBefore(vehicleSection, registerButton);
    
    // Show toast
    showToast(`Vehicle ${vehicleCount + 1} added`);
    
    // If we've reached the maximum, hide the add vehicle button
    if (vehicleCount + 1 >= 3) {
        document.getElementById("add-vehicle-btn").style.display = "none";
    }
}

// Remove a vehicle section
function removeVehicleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.parentNode.removeChild(section);
        
        // Renumber the remaining vehicle sections
        renumberVehicleSections();
        
        // Show the add vehicle button again
        document.getElementById("add-vehicle-btn").style.display = "block";
        
        showToast("Vehicle removed");
    }
}

// Renumber vehicle sections after removal
function renumberVehicleSections() {
    const sections = document.querySelectorAll(".vehicle-section");
    sections.forEach((section, index) => {
        const title = section.querySelector("h3");
        title.textContent = `Vehicle ${index + 2}`;
    });
}

// Handle registration with multiple vehicles
function handleRegistration() {
    // Get main user info
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const deviceId = document.getElementById("device-id").value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showToast("Passwords do not match");
        return;
    }
    
    // Get primary vehicle info
    const primaryVehicle = {
        vehicleType: document.getElementById("vehicle-type").value,
        mileage: document.getElementById("mileage").value,
        vehicleId: deviceId, // Using device ID as primary vehicle ID
        vehiclePlate: "", // This field isn't in the original form
        isPrimary: true
    };
    
    // Collect all additional vehicles
    const additionalVehicles = [];
    const vehicleSections = document.querySelectorAll(".vehicle-section");
    
    vehicleSections.forEach((section, index) => {
        const sectionId = section.id.split("-")[2];
        
        const vehicle = {
            vehicleType: document.getElementById(`vehicle-type-${sectionId}`).value,
            mileage: document.getElementById(`mileage-${sectionId}`).value,
            vehicleId: document.getElementById(`vehicle-id-${sectionId}`).value,
            vehiclePlate: document.getElementById(`vehicle-plate-${sectionId}`).value,
            isPrimary: false
        };
        
        additionalVehicles.push(vehicle);
    });
    
    // Register user with Firebase Auth
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Get user ID
            const userId = userCredential.user.uid;
            
            // Create user document in Firestore
            return firebase.firestore().collection("users").doc(userId).set({
                username: username,
                email: email,
                deviceId: deviceId,
                vehicleType: primaryVehicle.vehicleType,
                vehicleYear: new Date().getFullYear().toString(), // Default to current year
                vehiclePlate: primaryVehicle.vehiclePlate,
                mileage: primaryVehicle.mileage,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                vehicles: [primaryVehicle, ...additionalVehicles]
            });
        })
        .then(() => {
            showToast("Registration successful!");
            // Redirect to dashboard after successful registration
            setTimeout(() => {
                window.location.href = "dashboard/dashboard.html";
            }, 2000);
        })
        .catch((error) => {
            console.error("Error registering user:", error);
            showToast("Registration failed: " + error.message);
        });
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    
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