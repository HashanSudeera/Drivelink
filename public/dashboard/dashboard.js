// Dashboard JavaScript - Updates UI elements with real-time Firebase data
document.addEventListener("DOMContentLoaded", function () {
    // Initialize Firebase and check authentication
    initializeFirebaseAndAuth();
    
    // Setup event listeners for controls and widgets
    setupEventListeners();
    
    // Initialize the RPM meter
    initializeRpmMeter();
    
    // Set up refresh buttons functionality
    setupRefreshButtons();
});

function initializeFirebaseAndAuth() {
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
                const deviceId = userData.deviceId;
                const username = userData.username;
                const vehicleType = userData.vehicleType;
                
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
                    const min_value = vehicleData.minLevel;
                    const max_value = vehicleData.maxLevel;
                    
                    localStorage.setItem("min_value", min_value);
                    localStorage.setItem("max_value", max_value);
                    
                    // Initialize real-time data listeners
                    initializeRealtimeListeners(deviceId, min_value, max_value);
                } else {
                    console.log("No vehicle data found.");
                    showToast("Vehicle configuration not found. Some features may not work correctly.");
                }
            } catch (error) {
                console.error("Error initializing dashboard:", error);
                /* showToast("Error loading dashboard data."); */
            }
        } else {
            // Redirect if user is not logged in
            window.location.href = "../login.html";
        }
    });
}

function updateUserInterface(username, deviceId) {
    // Update username and device ID displays
    document.getElementById("usernametag").innerText = `Hi, ${username}!`;
    document.getElementById("device-id").innerText = deviceId;
    
    // Set default values for widgets
    document.getElementById("engine-temp").innerText = "Loading...";
    document.getElementById("vehicle-status").innerHTML = "<span class='status-connecting'>Connecting...</span>";
    document.getElementById("fuel-liters").innerText = "Loading...";
    document.getElementById("fuel-range").innerText = "Loading...";
    document.getElementById("fuel-consumption").innerText = "Loading...";
    document.getElementById("battery-voltage").innerText = "Loading...";
    document.getElementById("battery-health").innerText = "Loading...";
    document.getElementById("battery-last-check").innerText = "Loading...";
    document.getElementById("engine-status").innerText = "Loading...";
    document.getElementById("oil-status").innerText = "Loading...";
}

function initializeRealtimeListeners(deviceId, min_value, max_value) {
    const sensorRef = firebase.database().ref(deviceId);
    
    // Listen for real-time data changes
    sensorRef.on("value", (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Update all UI components with the latest data
            updateDashboard(data, min_value, max_value);
            
            // Store current values in localStorage for other pages
            storeCurrentValuesInLocalStorage(data);
        } else {
            console.error("No data found for device ID:", deviceId);
            document.getElementById("vehicle-status").innerHTML = "<span class='status-offline'>Offline</span>";
            showToast("No data received from your device.");
        }
    });
}

function updateDashboard(data, min_value, max_value) {
    // Update fuel status
    if (data.fuel_sensor && data.fuel_sensor.value !== undefined) {
        const current_level = parseFloat(data.fuel_sensor.value);
        updateFuelWidget(current_level, min_value, max_value);
    }
    
    // Update battery status
    if (data.battery && data.battery.value !== undefined) {
        const batteryVoltage = parseFloat(data.battery.value);
        updateBatteryWidget(batteryVoltage);
    }
    
    // Update temperature
    if (data.temperature && data.temperature.value !== undefined) {
        const temperature = parseFloat(data.temperature.value);
        document.getElementById("engine-temp").innerText = `${temperature.toFixed(1)}°C`;
        
        // Set temperature warning status
        if (temperature > 95) {
            document.getElementById("engine-temp").classList.add("status-danger");
        } else if (temperature > 85) {
            document.getElementById("engine-temp").classList.add("status-warning");
        } else {
            document.getElementById("engine-temp").classList.remove("status-danger", "status-warning");
        }
    }
    
    // Update vehicle status
    document.getElementById("vehicle-status").innerHTML = "<span class='status-online'>Online</span>";
    
    // Update relay statuses
    updateRelayStatus(data);
    
    // Update engine status based on RPM or other logic
    if (data.time && data.time.current) {
        const currentTime = new Date();
        const formattedTime = currentTime.toLocaleString();
        document.getElementById("battery-last-check").innerText = formattedTime;
    }
    
    // Update oil status (placeholder, could be based on other sensors)
    document.getElementById("oil-status").innerText = "Normal";
    
    // Update engine status (placeholder, based on relay1 as ignition)
    if (data.relay1 && data.relay1.status === true) {
        document.getElementById("engine-status").innerText = "Running";
        document.getElementById("engine-status").className = "status-value active";
    } else {
        document.getElementById("engine-status").innerText = "Off";
        document.getElementById("engine-status").className = "status-value inactive";
    }
    
    // Update RPM meter (placeholder data for now)
    updateRPM(calculateRPM(data));
}

function updateFuelWidget(current_level, min_level, max_level) {
    // Calculate fuel level percentage
    let fuel_percentage = ((current_level - min_level) / (max_level - min_level)) * 100;
    
    // Ensure the fuel level stays between 0% and 100%
    fuel_percentage = Math.max(0, Math.min(100, fuel_percentage));
    
    // Calculate estimated liters (assuming a 50L tank)
    const fuel_liters = (fuel_percentage / 100) * 50;
    
    // Update fuel tank visual
    const fuelLevel = document.getElementById("fuel-level");
    if (fuelLevel) {
        fuelLevel.style.height = `${fuel_percentage}%`;
    }
    
    // Update fuel percentage text
    const fuelText = document.getElementById("fuelText");
    if (fuelText) {
        fuelText.innerText = `${fuel_percentage.toFixed(1)}%`;
    }
    
    // Update fuel details
    document.getElementById("fuel-liters").innerText = `${fuel_liters.toFixed(1)} L`;
    
    // Calculate estimated range (assuming 10km/L)
    const estimated_range = fuel_liters * 10;
    document.getElementById("fuel-range").innerText = `~${Math.round(estimated_range)} km`;
    
    // Set fuel consumption (placeholder value)
    document.getElementById("fuel-consumption").innerText = "7.8 L/100km";
    
    // Also update the water level display if it exists
    const waterLevel = document.getElementById("waterLevel");
    if (waterLevel) {
        waterLevel.style.height = `${fuel_percentage}%`;
    }
}

function updateBatteryWidget(voltage) {
    // Calculate battery percentage (assuming 12V battery)
    // 12.7V = 100%, 11.8V = 0%
    let batteryPercentage = ((voltage - 11.8) / 0.9) * 100;
    batteryPercentage = Math.max(0, Math.min(100, batteryPercentage));
    
    // Update battery charge visual
    const batteryCharge = document.getElementById("battery-charge");
    if (batteryCharge) {
        batteryCharge.style.height = `${batteryPercentage}%`;
    }
    
    // Update battery percentage text
    const batteryPercentageText = document.getElementById("battery-percentage");
    if (batteryPercentageText) {
        batteryPercentageText.innerText = `${Math.round(batteryPercentage)}%`;
    }
    
    // Update battery details
    document.getElementById("battery-voltage").innerText = `${voltage.toFixed(1)} V`;
    
    // Set battery health based on voltage
    let healthStatus = "Critical";
    if (voltage >= 12.7) {
        healthStatus = "Excellent";
    } else if (voltage >= 12.4) {
        healthStatus = "Good";
    } else if (voltage >= 12.2) {
        healthStatus = "Fair";
    } else if (voltage >= 12.0) {
        healthStatus = "Poor";
    }
    
    document.getElementById("battery-health").innerText = healthStatus;
    
    // Also update battery charge in the main container if it exists
    const charge = document.querySelector(".charge");
    if (charge) {
        charge.style.height = `${batteryPercentage}%`;
        
        // Set color based on charge level
        if (batteryPercentage <= 25) {
            charge.style.background = "var(--red)";
        } else if (batteryPercentage <= 50) {
            charge.style.background = "var(--orange)";
        } else if (batteryPercentage <= 75) {
            charge.style.background = "var(--yellow)";
        } else {
            charge.style.background = "var(--green)";
        }
    }
}

function updateRelayStatus(data) {
    // Check if relay data exists and update UI
    if (data.relay1 && data.relay1.status !== undefined) {
        const relay1Switch = document.getElementById("relay1-switch");
        const relay1Status = document.getElementById("relay1-status");
        
        if (relay1Switch) {
            relay1Switch.checked = data.relay1.status === true;
        }
        
        if (relay1Status) {
            relay1Status.innerText = data.relay1.status === true ? "ON" : "OFF";
            relay1Status.className = data.relay1.status === true ? "control-status active" : "control-status";
        }
    }
    
    if (data.relay2 && data.relay2.status !== undefined) {
        const relay2Switch = document.getElementById("relay2-switch");
        const relay2Status = document.getElementById("relay2-status");
        
        if (relay2Switch) {
            relay2Switch.checked = data.relay2.status === true;
        }
        
        if (relay2Status) {
            relay2Status.innerText = data.relay2.status === true ? "ON" : "OFF";
            relay2Status.className = data.relay2.status === true ? "control-status active" : "control-status";
        }
    }
}

function setupEventListeners() {
    // Set up event listeners for relays
    const relay1Switch = document.getElementById("relay1-switch");
    const relay2Switch = document.getElementById("relay2-switch");
    
    if (relay1Switch) {
        relay1Switch.addEventListener("change", function() {
            toggleRelay("relay1", this.checked);
        });
    }
    
    if (relay2Switch) {
        relay2Switch.addEventListener("change", function() {
            toggleRelay("relay2", this.checked);
        });
    }
    
    // Set up notification dismiss functionality
    const notificationDismissButtons = document.querySelectorAll(".notification-dismiss");
    notificationDismissButtons.forEach(button => {
        button.addEventListener("click", function() {
            const notificationItem = this.closest(".notification-item");
            if (notificationItem) {
                notificationItem.style.height = "0";
                notificationItem.style.opacity = "0";
                setTimeout(() => {
                    notificationItem.remove();
                }, 300);
            }
        });
    });
    
    // Vehicle dropdown handler
    const vehicleDropdown = document.getElementById("vehicle-dropdown");
    if (vehicleDropdown) {
        vehicleDropdown.addEventListener("change", function() {
            if (this.value === "add-new") {
                showToast("Add new vehicle feature coming soon!");
                // Reset back to the first option
                this.selectedIndex = 0;
            }
        });
    }
}

function toggleRelay(relayName, status) {
    const deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        showToast("Device ID not found. Please reload the page.");
        return;
    }
    
    // Update relay status in Firebase
    const relayRef = firebase.database().ref(`${deviceId}/${relayName}/status`);
    relayRef.set(status)
        .then(() => {
            console.log(`${relayName} set to ${status}`);
            // If relay1 is turned off, turn off relay2 as well (mutual exclusion)
            if (relayName === "relay1" && !status) {
                firebase.database().ref(`${deviceId}/relay2/status`).set(false);
            }
            // If relay2 is turned off, turn off relay1 as well (mutual exclusion)
            if (relayName === "relay2" && !status) {
                firebase.database().ref(`${deviceId}/relay1/status`).set(false);
            }
        })
        .catch((error) => {
            console.error(`Error updating ${relayName}:`, error);
            showToast(`Failed to update ${relayName}. Please try again.`);
            // Reset switch UI state
            const relaySwitch = document.getElementById(`${relayName}-switch`);
            if (relaySwitch) {
                relaySwitch.checked = !status;
            }
        });
}

function storeCurrentValuesInLocalStorage(data) {
    // Store important values in localStorage for use in other pages
    if (data.fuel_sensor && data.fuel_sensor.value !== undefined) {
        localStorage.setItem("fuel_level", data.fuel_sensor.value);
    }
    
    if (data.battery && data.battery.value !== undefined) {
        localStorage.setItem("battery_level", data.battery.value);
    }
    
    if (data.temperature && data.temperature.value !== undefined) {
        localStorage.setItem("temperature", data.temperature.value);
    }
    
    if (data.tracking) {
        if (data.tracking.latitude !== undefined) {
            localStorage.setItem("latitude", data.tracking.latitude);
        }
        if (data.tracking.longitude !== undefined) {
            localStorage.setItem("longitude", data.tracking.longitude);
        }
    }
}

function setupRefreshButtons() {
    // Set up refresh button functionality
    const refreshButtons = document.querySelectorAll(".refresh-btn");
    refreshButtons.forEach(button => {
        button.addEventListener("click", function() {
            const widgetId = this.id.replace("refresh-", "");
            
            // Add rotation animation
            this.classList.add("rotating");
            
            // Remove rotation after animation completes
            setTimeout(() => {
                this.classList.remove("rotating");
                showToast(`${capitalizeFirstLetter(widgetId)} data refreshed`);
            }, 1000);
            
            // Force a data refresh from Firebase
            const deviceId = localStorage.getItem("deviceId");
            if (deviceId) {
                firebase.database().ref(deviceId).once("value");
            }
        });
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const blurOverlay = document.getElementById("blurOverlay");

    if (!toast || !toastMessage || !blurOverlay) {
        console.error("Toast or blur overlay elements not found in the DOM");
        return;
    }

    // Set the toast message
    toastMessage.textContent = message;

    // Show the toast and blur overlay
    toast.classList.add("show");
    document.body.classList.add("blurred");
    blurOverlay.style.display = "block";

    // Hide the toast and blur overlay after 2 seconds
    setTimeout(() => {
        toast.classList.remove("show");
        document.body.classList.remove("blurred");
        blurOverlay.style.display = "none";
    }, 2000);
}

// RPM Meter Implementation
function initializeRpmMeter() {
    // Create RPM meter widget and add to dashboard
    const dashboardWidgets = document.querySelector(".dashboard-widgets");
    if (dashboardWidgets) {
        const rpmWidget = document.createElement("div");
        rpmWidget.className = "widget rpm-widget";
        rpmWidget.innerHTML = `
            <div class="widget-header">
                <h2><i class="fas fa-tachometer-alt"></i> RPM Monitor</h2>
                <div class="widget-actions">
                    <button class="refresh-btn" id="refresh-rpm"><i class="fas fa-sync-alt"></i></button>
                    <button class="more-btn"><i class="fas fa-ellipsis-v"></i></button>
                </div>
            </div>
            <div class="widget-content">
                <div class="rpm-gauge">
                    <div class="rpm-dial">
                        <div class="rpm-indicator" id="rpm-needle"></div>
                        <div class="rpm-center"></div>
                        <div class="rpm-markings">
                            <span class="rpm-mark" style="transform: rotate(-135deg)">0</span>
                            <span class="rpm-mark" style="transform: rotate(-90deg)">1</span>
                            <span class="rpm-mark" style="transform: rotate(-45deg)">2</span>
                            <span class="rpm-mark" style="transform: rotate(0deg)">3</span>
                            <span class="rpm-mark" style="transform: rotate(45deg)">4</span>
                            <span class="rpm-mark" style="transform: rotate(90deg)">5</span>
                            <span class="rpm-mark" style="transform: rotate(135deg)">6</span>
                        </div>
                    </div>
                    <div class="rpm-value" id="rpm-value">0 RPM</div>
                </div>
                <div class="rpm-details">
                    <div class="detail-item">
                        <span class="label">Current RPM:</span>
                        <span class="value" id="rpm-current">0</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Average RPM:</span>
                        <span class="value" id="rpm-average">0</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Max RPM:</span>
                        <span class="value" id="rpm-max">0</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add some custom CSS for the RPM gauge
        const style = document.createElement("style");
        style.textContent = `
            .rpm-gauge {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .rpm-dial {
                position: relative;
                width: 200px;
                height: 100px;
                margin-bottom: 10px;
                overflow: hidden;
                border-top-left-radius: 100px;
                border-top-right-radius: 100px;
                background: rgba(0, 0, 0, 0.1);
            }
            
            .rpm-indicator {
                position: absolute;
                bottom: 0;
                left: 50%;
                width: 4px;
                height: 90px;
                background-color: #ff3e3e;
                transform-origin: bottom center;
                transform: translateX(-50%) rotate(-135deg);
                transition: transform 0.5s ease-out;
                z-index: 2;
            }
            
            .rpm-center {
                position: absolute;
                bottom: 0;
                left: 50%;
                width: 20px;
                height: 20px;
                background-color: #333;
                border-radius: 50%;
                transform: translateX(-50%);
                z-index: 3;
            }
            
            .rpm-markings {
                position: absolute;
                width: 100%;
                height: 100%;
            }
            
            .rpm-mark {
                position: absolute;
                bottom: 10px;
                left: 50%;
                font-size: 12px;
                transform-origin: center 90px;
                color: var(--text-color);
            }
            
            .rpm-value {
                font-size: 24px;
                font-weight: bold;
                color: var(--highlight-color);
            }
            
            .rpm-details {
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                width: 100%;
            }
        `;
        
        document.head.appendChild(style);
        dashboardWidgets.appendChild(rpmWidget);
        
        // Set up RPM refresh button
        const refreshRpmBtn = document.getElementById("refresh-rpm");
        if (refreshRpmBtn) {
            refreshRpmBtn.addEventListener("click", function() {
                this.classList.add("rotating");
                setTimeout(() => {
                    this.classList.remove("rotating");
                    showToast("RPM data refreshed");
                }, 1000);
            });
        }
    }
    
    // Initialize RPM history
    window.rpmHistory = [];
    window.rpmMax = 0;
}

function calculateRPM(data) {
    // In reality, this would come from a sensor
    // For demonstration, we'll use speed or calculate from other data
    let rpm = 0;
    
    if (data.tracking && data.tracking.speed) {
        // Calculate RPM based on speed (simplified formula)
        const speed = parseFloat(data.tracking.speed);
        rpm = speed * 180; // Example conversion
    } else if (data.time && data.time.current) {
        // If no speed data, generate RPM based on time for demonstration
        const time = parseInt(data.time.current);
        rpm = 800 + (Math.sin(time / 50) * 400);
    } else {
        // Fallback to a simulated value
        rpm = 800 + (Math.sin(Date.now() / 1000) * 400);
    }
    
    return Math.max(0, Math.round(rpm));
}

function updateRPM(rpm) {
    const rpmNeedle = document.getElementById("rpm-needle");
    const rpmValue = document.getElementById("rpm-value");
    const rpmCurrent = document.getElementById("rpm-current");
    const rpmAverage = document.getElementById("rpm-average");
    const rpmMax = document.getElementById("rpm-max");
    
    if (!rpmNeedle || !rpmValue || !rpmCurrent || !rpmAverage || !rpmMax) {
        return;
    }
    
    // Update RPM history
    window.rpmHistory.push(rpm);
    if (window.rpmHistory.length > 10) {
        window.rpmHistory.shift();
    }
    
    // Calculate max RPM
    window.rpmMax = Math.max(window.rpmMax, rpm);
    
    // Calculate average RPM
    const avgRpm = Math.round(
        window.rpmHistory.reduce((sum, val) => sum + val, 0) / window.rpmHistory.length
    );
    
    // Update needle position (scaled to match the dial)
    // -135deg is 0 RPM, 135deg is 6000 RPM
    const needleAngle = -135 + (rpm / 6000) * 270;
    rpmNeedle.style.transform = `translateX(-50%) rotate(${needleAngle}deg)`;
    
    // Update text displays
    rpmValue.innerText = `${rpm} RPM`;
    rpmCurrent.innerText = rpm;
    rpmAverage.innerText = avgRpm;
    rpmMax.innerText = window.rpmMax;
    
    // Change color based on RPM range
    if (rpm > 5000) {
        rpmNeedle.style.backgroundColor = "#ff3e3e"; // Red for high RPM
    } else if (rpm > 3500) {
        rpmNeedle.style.backgroundColor = "#ff9a3e"; // Orange for medium-high RPM
    } else {
        rpmNeedle.style.backgroundColor = "#5cb85c"; // Green for normal RPM
    }
}

// Add CSS for rotating animation
document.head.appendChild(document.createElement('style')).textContent = `
    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .rotating {
        animation: rotate 1s linear;
    }
    
    .status-online {
        color: #5cb85c;
        font-weight: bold;
    }
    
    .status-offline {
        color: #d9534f;
        font-weight: bold;
    }
    
    .status-connecting {
        color: #f0ad4e;
        font-weight: bold;
    }
    
    .status-danger {
        color: #d9534f;
    }
    
    .status-warning {
        color: #f0ad4e;
    }
    
    .control-status.active {
        color: #5cb85c;
        font-weight: bold;
    }
    
    .status-value.active {
        color: #5cb85c;
    }
    
    .status-value.inactive {
        color: #d9534f;
    }
`;