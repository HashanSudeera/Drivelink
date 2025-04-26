// Fix the issue with the updateUserInterface function
function updateUserInterface(username, deviceId) {
    // Update username and device ID displays
    const usernameElement = document.getElementById("usernametag");
    if (usernameElement) {
        usernameElement.innerText = `Hi, ${username}!`;
    }
    
    const deviceIdElement = document.getElementById("device-id");
    if (deviceIdElement) {
        deviceIdElement.innerText = deviceId;
    }
    
    // Set default values for widgets with null checks
    updateElementText("engine-temp", "Loading...");
    updateElementText("vehicle-status", "<span class='status-connecting'>Connecting...</span>");
    updateElementText("fuel-liters", "Loading...");
    updateElementText("fuel-range", "Loading...");
    updateElementText("fuel-consumption", "Loading...");
    updateElementText("battery-voltage", "Loading...");
    updateElementText("battery-health", "Loading...");
    updateElementText("battery-last-check", "Loading...");
    updateElementText("engine-status", "Loading...");
    updateElementText("oil-status", "Loading...");
}

// Helper function to update element text with null check
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = text;
    }
}

// Enhanced Fuel widget update function
function updateFuelWidget(current_level, min_level, max_level) {
    // Calculate fuel level percentage
    let fuel_percentage = ((current_level - min_level) / (max_level - min_level)) * 100;
    
    // Ensure the fuel level stays between 0% and 100%
    fuel_percentage = Math.max(0, Math.min(100, fuel_percentage));
    
    // Calculate estimated liters (assuming a 50L tank)
    const fuel_liters = (fuel_percentage / 100) * 50;
    
    // Update fuel tank visual in both locations of the page
    updateFuelVisual("fuel-level", fuel_percentage);
    updateFuelVisual("waterLevel", fuel_percentage);
    
    // Update fuel percentage text in both places
    updateFuelText("fuelText", fuel_percentage);
    
    // Update fuel details
    updateElementText("fuel-liters", `${fuel_liters.toFixed(1)} L`);
    
    // Calculate estimated range (assuming 10km/L)
    const estimated_range = fuel_liters * 10;
    updateElementText("fuel-range", `~${Math.round(estimated_range)} km`);
    
    // Set fuel consumption (placeholder value)
    updateElementText("fuel-consumption", "7.8 L/100km");
}

// Helper function to update fuel visual elements
function updateFuelVisual(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.height = `${percentage}%`;
    }
}

// Helper function to update fuel text elements
function updateFuelText(elementId, percentage) {
    const elements = document.querySelectorAll(`#${elementId}`);
    elements.forEach(element => {
        if (element) {
            element.innerText = `${percentage.toFixed(1)}%`;
        }
    });
}

// Enhanced Battery widget update function
function updateBatteryWidget(voltage) {
    // Calculate battery percentage (assuming 12V battery)
    // 12.7V = 100%, 11.8V = 0%
    let batteryPercentage = ((voltage - 11.8) / 0.9) * 100;
    batteryPercentage = Math.max(0, Math.min(100, batteryPercentage));
    
    // Update battery charge visual in both locations
    updateBatteryVisual("battery-charge", batteryPercentage);
    updateBatteryVisual("charge", batteryPercentage, batteryPercentage);
    
    // Update battery percentage text in both places
    updateBatteryText("battery-percentage", batteryPercentage);
    
    // Update battery details
    updateElementText("battery-voltage", `${voltage.toFixed(1)} V`);
    
    // Set battery health based on voltage
    let healthStatus = "Critical";
    let healthColor = "var(--red)";
    
    if (voltage >= 12.7) {
        healthStatus = "Excellent";
        healthColor = "var(--green)";
    } else if (voltage >= 12.4) {
        healthStatus = "Good";
        healthColor = "var(--green)";
    } else if (voltage >= 12.2) {
        healthStatus = "Fair";
        healthColor = "var(--yellow)";
    } else if (voltage >= 12.0) {
        healthStatus = "Poor";
        healthColor = "var(--orange)";
    }
    
    updateElementText("battery-health", healthStatus);
    
    // Update timestamp
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleString();
    updateElementText("battery-last-check", formattedTime);
}

// Helper function to update battery visual elements
function updateBatteryVisual(elementId, percentage, colorPercentage = null) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.height = `${percentage}%`;
        
        // Set color based on charge level if colorPercentage is provided
        if (colorPercentage !== null) {
            if (colorPercentage <= 25) {
                element.style.background = "var(--red)";
            } else if (colorPercentage <= 50) {
                element.style.background = "var(--orange)";
            } else if (colorPercentage <= 75) {
                element.style.background = "var(--yellow)";
            } else {
                element.style.background = "var(--green)";
            }
        }
    }
}

// Helper function to update battery text elements
function updateBatteryText(elementId, percentage) {
    const elements = document.querySelectorAll(`#${elementId}`);
    elements.forEach(element => {
        if (element) {
            element.innerText = `Battery: ${Math.round(percentage)}%`;
        }
    });
}

// Enhanced initializer function to handle potential errors
function initializeFirebaseAndAuth() {
    try {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userId = user.uid;
                    const db = firebase.firestore();

                    // Fetch user data from Firestore
                    const userRef = db.collection("users").doc(userId);
                    const userSnap = await userRef.get();

                    if (!userSnap.exists) {
                        console.error("User data not found in Firestore.");
                        showToast("User data not found. Please contact support.");
                        return;
                    }

                    const userData = userSnap.data();
                    const deviceId = userData.deviceId || "No Device";
                    const username = userData.username || "User";
                    const vehicleType = userData.vehicleType || "Default";
                    
                    // Store important data in localStorage
                    localStorage.setItem("deviceId", deviceId);
                    localStorage.setItem("username", username);
                    localStorage.setItem("vehicleType", vehicleType);
                    
                    // Update UI elements
                    updateUserInterface(username, deviceId);
                    
                    // Fetch vehicle data
                    const vehicleRef = db.collection("vehicle").doc(vehicleType);
                    const vehicleSnap = await vehicleRef.get();

                    if (vehicleSnap.exists) {
                        const vehicleData = vehicleSnap.data();
                        const min_value = vehicleData.minLevel || 0;
                        const max_value = vehicleData.maxLevel || 100;
                        
                        localStorage.setItem("min_value", min_value);
                        localStorage.setItem("max_value", max_value);
                        
                        // Update max level display
                        const maxIdElement = document.getElementById("max-id");
                        if (maxIdElement) {
                            maxIdElement.innerText = `${max_value}%`;
                        }
                        
                        // Initialize real-time data listeners
                        initializeRealtimeListeners(deviceId, min_value, max_value);
                    } else {
                        console.log("No vehicle data found.");
                        showToast("Vehicle configuration not found. Using default values.");
                        
                        // Use default values if no vehicle data
                        localStorage.setItem("min_value", "0");
                        localStorage.setItem("max_value", "100");
                        
                        // Initialize real-time data listeners with defaults
                        initializeRealtimeListeners(deviceId, 0, 100);
                    }
                } catch (error) {
                    console.error("Error initializing dashboard:", error);
                    showToast("Error loading dashboard data. Using demo mode.");
                    
                    // Initialize demo mode
                    initializeDemoMode();
                }
            } else {
                // Redirect if user is not logged in
                window.location.href = "../login.html";
            }
        });
    } catch (error) {
        console.error("Fatal error initializing Firebase:", error);
        showToast("Could not connect to service. Using demo mode.");
        
        // Initialize demo mode if Firebase fails
        initializeDemoMode();
    }
}

// Add a demo mode function to show example data
function initializeDemoMode() {
    // Demo data
    const demoUsername = "Demo User";
    const demoDeviceId = "DL-DEMO-2023";
    
    // Update UI with demo data
    updateUserInterface(demoUsername, demoDeviceId);
    
    // Set some example values
    const demoFuelLevel = 65;
    const demoBatteryVoltage = 12.5;
    const demoTemperature = 87;
    
    // Update widgets with demo values
    updateFuelWidget(demoFuelLevel, 0, 100);
    updateBatteryWidget(demoBatteryVoltage);
    
    const engineTempElement = document.getElementById("engine-temp");
    if (engineTempElement) {
        engineTempElement.innerText = `${demoTemperature}°C`;
    }
    
    const vehicleStatusElement = document.getElementById("vehicle-status");
    if (vehicleStatusElement) {
        vehicleStatusElement.innerHTML = "<span class='status-online'>Demo Mode</span>";
    }
    
    const maxIdElement = document.getElementById("max-id");
    if (maxIdElement) {
        maxIdElement.innerText = "100%";
    }
    
    // Set up simulated data updates
    startDemoDataSimulation();
}

// Simulate changing data for demo mode
function startDemoDataSimulation() {
    setInterval(() => {
        // Generate random fluctuations for demo values
        const fuelLevel = 55 + (Math.sin(Date.now() / 10000) * 10);
        const batteryVoltage = 12.3 + (Math.sin(Date.now() / 8000) * 0.4);
        const temperature = 85 + (Math.sin(Date.now() / 15000) * 8);
        
        // Update widgets with fluctuating demo values
        updateFuelWidget(fuelLevel, 0, 100);
        updateBatteryWidget(batteryVoltage);
        
        const engineTempElement = document.getElementById("engine-temp");
        if (engineTempElement) {
            engineTempElement.innerText = `${temperature.toFixed(1)}°C`;
            
            // Set temperature warning status
            if (temperature > 95) {
                engineTempElement.classList.add("status-danger");
                engineTempElement.classList.remove("status-warning");
            } else if (temperature > 85) {
                engineTempElement.classList.add("status-warning");
                engineTempElement.classList.remove("status-danger");
            } else {
                engineTempElement.classList.remove("status-danger", "status-warning");
            }
        }
        
        // Update RPM in demo mode
        const demoRPM = 800 + (Math.sin(Date.now() / 3000) * 1500);
        updateRPM(Math.round(demoRPM));
        
    }, 2000); // Update every 2 seconds
}

// Toggle sidebar function (fixed from the original code)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('toggle-btn');
    
    if (sidebar) {
        sidebar.classList.toggle('expanded');
    }
    
    if (toggleButton) {
        toggleButton.classList.toggle('rotate');
    }
    
    // Close all sub-menus when sidebar is toggled
    closeAllSubMenus();
}

// Toggle submenu function (was commented out in original)
function toggleSubMenu(button) {
    if (button && button.nextElementSibling) {
        // Close other submenus first
        if (!button.nextElementSibling.classList.contains('show')) {
            closeAllSubMenus();
        }
        
        button.nextElementSibling.classList.toggle('show');
        button.classList.toggle('rotate');
        
        // Ensure sidebar is expanded when submenu is opened
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('close')) {
            sidebar.classList.remove('close');
            
            const toggleButton = document.getElementById('toggle-btn');
            if (toggleButton) {
                toggleButton.classList.toggle('rotate');
            }
        }
    }
}

// Close all submenus function (was commented out in original)
function closeAllSubMenus() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        Array.from(sidebar.getElementsByClassName('show')).forEach(ul => {
            ul.classList.remove('show');
            if (ul.previousElementSibling) {
                ul.previousElementSibling.classList.remove('rotate');
            }
        });
    }
}

// Toggle theme function
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;
    
    body.classList.toggle('dark-mode');
    
    if (themeIcon) {
        if (body.classList.contains('dark-mode')) {
            themeIcon.className = 'fas fa-sun';
            if (themeToggle.querySelector('span')) {
                themeToggle.querySelector('span').innerText = 'Light Mode';
            }
        } else {
            themeIcon.className = 'fas fa-moon';
            if (themeToggle.querySelector('span')) {
                themeToggle.querySelector('span').innerText = 'Dark Mode';
            }
        }
    }
    
    // Save preference to localStorage
    localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
}

// Document ready handler - main entry point
document.addEventListener("DOMContentLoaded", function () {
    // Initialize Firebase and check authentication
    initializeFirebaseAndAuth();
    
    // Setup event listeners for controls and widgets
    setupEventListeners();
    
    // Initialize the RPM meter
    initializeRpmMeter();
    
    // Set up refresh buttons functionality
    setupRefreshButtons();
    
    // Load saved theme preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true' && !document.body.classList.contains('dark-mode')) {
        toggleTheme();
    } else if (savedDarkMode === 'false' && document.body.classList.contains('dark-mode')) {
        toggleTheme();
    }
});