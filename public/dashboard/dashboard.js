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

   // DOM Elements
   const vehicleDropdown = document.getElementById('vehicle-dropdown');
   const fuelLevel = document.getElementById('fuel-level');
   const fuelText = document.getElementById('fuelText');
   const fuelLiters = document.getElementById('fuel-liters');
   const fuelRange = document.getElementById('fuel-range');
   const batteryCharge = document.getElementById('battery-charge');
   const batteryPercentage = document.getElementById('battery-percentage');
   const batteryVoltage = document.getElementById('battery-voltage');
   const batteryHealth = document.getElementById('battery-health');
   const rpmGaugeFill = document.getElementById('rpm-gauge-fill');
   const rpmValue = document.getElementById('rpm-value');
   const engineStatus = document.getElementById('engine-status');
   const engineTemp = document.getElementById('engine-temp');
   const oilStatus = document.getElementById('oil-status');
   const ledStatus = document.getElementById('led-status');
   const relay1Switch = document.getElementById('relay1-switch');
   const relay2Switch = document.getElementById('relay2-switch');
   const relay1Status = document.getElementById('relay1-status');
   const relay2Status = document.getElementById('relay2-status');
   const notificationsList = document.getElementById('notifications-list');
   const deviceId = document.getElementById('device-id');
   
   
   
   // Load user vehicles
   function loadUserVehicles(userId) {
       db.ref('users/' + userId + '/vehicles').once('value').then(snapshot => {
           const vehicles = snapshot.val();
           if (vehicles) {
               // Clear existing options except the last one (Add New Vehicle)
               while (vehicleDropdown.options.length > 1) {
                   vehicleDropdown.remove(0);
               }
               
               // Add vehicle options
               Object.keys(vehicles).forEach(vehicleId => {
                   const option = document.createElement('option');
                   option.value = vehicleId;
                   option.textContent = vehicles[vehicleId].name + ' (' + vehicles[vehicleId].deviceId + ')';
                   vehicleDropdown.insertBefore(option, vehicleDropdown.options[vehicleDropdown.options.length - 1]);
               });
               
               // Select first vehicle by default
               vehicleDropdown.selectedIndex = 0;
               currentVehicleId = vehicleDropdown.options[0].value;
               
               // Load vehicle data
               loadVehicleData(currentVehicleId);
               loadNotifications(currentVehicleId);
               
               // Setup real-time listeners
               setupRealtimeListeners(currentVehicleId);
           } else {
               // No vehicles found, show add vehicle dialog
               showAddVehicleModal();
           }
       }).catch(error => {
           console.error("Error loading vehicles:", error);
           showToast('error', 'Error Loading Vehicles', 'Please check your connection and try again.');
       });
   }
   
   // Load vehicle data
   function loadVehicleData(vehicleId) {
       db.ref('devices/' + vehicleId).once('value').then(snapshot => {
           const vehicleData = snapshot.val();
           if (vehicleData) {
               // Set device ID
               deviceId.textContent = vehicleData.deviceId || 'Unknown';
               
               // Update fuel data
               updateFuelData(vehicleData.fuel || {});
               
               // Update battery data
               updateBatteryData(vehicleData.battery || {});
               
               // Update engine data
               updateEngineData(vehicleData.engine || {});
               
               // Update relay status
               updateRelayStatus(vehicleData.relays || {});
           }
       }).catch(error => {
           console.error("Error loading vehicle data:", error);
           showToast('error', 'Error', 'Could not load vehicle data.');
       });
   }
   
   // Setup real-time data listeners
   function setupRealtimeListeners(vehicleId) {
       // Remove any existing listeners
       if (notificationsRef) {
           notificationsRef.off();
       }
       
       // Fuel level listener
       db.ref('devices/' + vehicleId + '/fuel').on('value', snapshot => {
           const fuelData = snapshot.val() || {};
           updateFuelData(fuelData);
           checkFuelLevel(fuelData.percentage);
       });
       
       // Battery listener
       db.ref('devices/' + vehicleId + '/battery').on('value', snapshot => {
           const batteryData = snapshot.val() || {};
           updateBatteryData(batteryData);
           checkBatteryVoltage(batteryData.voltage);
       });
       
       // Engine data listener
       db.ref('devices/' + vehicleId + '/engine').on('value', snapshot => {
           const engineData = snapshot.val() || {};
           updateEngineData(engineData);
       });
       
       // Relay status listener
       db.ref('devices/' + vehicleId + '/relays').on('value', snapshot => {
           const relayData = snapshot.val() || {};
           updateRelayStatus(relayData);
       });
       
       // Notifications listener
       notificationsRef = db.ref('devices/' + vehicleId + '/notifications');
       notificationsRef.orderByChild('timestamp').limitToLast(10).on('value', snapshot => {
           const notifications = snapshot.val() || {};
           updateNotifications(notifications);
       });
   }
   
   // Update fuel data display
   function updateFuelData(fuelData) {
       const percentage = fuelData.percentage || 0;
       const liters = fuelData.liters || 0;
       const range = fuelData.range || 0;
       const consumption = fuelData.consumption || 0;
       
       // Update fuel level display
       fuelLevel.style.height = percentage + '%';
       fuelText.textContent = percentage + '%';
       fuelLiters.textContent = liters + ' L';
       fuelRange.textContent = '~' + range + ' km';
       
       // Change color based on level
       if (percentage <= 15) {
           fuelLevel.style.background = 'linear-gradient(to top, #ff5959, #ff8c42)';
       } else if (percentage <= 30) {
           fuelLevel.style.background = 'linear-gradient(to top, #ffab00, #ffc107)';
       } else {
           fuelLevel.style.background = 'linear-gradient(to top, #ff6b35, #ff8c42)';
       }
   }
   
   // Update battery data display
   function updateBatteryData(batteryData) {
       const percentage = batteryData.percentage || 0;
       const voltage = batteryData.voltage || 0;
       const health = batteryData.health || 'Unknown';
       const lastCheck = batteryData.lastCheck || 'Unknown';
       
       // Update battery level display
       batteryCharge.style.height = percentage + '%';
       batteryPercentage.textContent = percentage + '%';
       batteryVoltage.textContent = voltage + ' V';
       batteryHealth.textContent = health;
       
       // Change color based on level
       if (percentage <= 20) {
           batteryCharge.style.background = 'linear-gradient(to top, #ff5959, #ff8c42)';
       } else if (percentage <= 40) {
           batteryCharge.style.background = 'linear-gradient(to top, #ffab00, #ffc107)';
       } else {
           batteryCharge.style.background = 'linear-gradient(to top, #4caf50, #8bc34a)';
       }
   }
   
   // Update engine data display
   function updateEngineData(engineData) {
       const rpm = engineData.rpm || 0;
       const temp = engineData.temperature || 0;
       const status = engineData.status || 'Off';
       const oil = engineData.oil || 'Unknown';
       
       // Update RPM gauge
       const rpmPercentage = Math.min(100, (rpm / 8000) * 100);
       const rpmDegrees = (rpmPercentage / 100) * 180;
       rpmGaugeFill.style.background = `conic-gradient(
           var(--accent-color, #4a6dff) 0deg,
           var(--accent-color, #4a6dff) ${rpmDegrees}deg,
           transparent ${rpmDegrees}deg,
           transparent 360deg
       )`;
       rpmValue.textContent = rpm + ' RPM';
       
       // Update other engine data
       engineStatus.textContent = status;
       engineTemp.textContent = temp + '°C';
       oilStatus.textContent = oil;
       
       // Status classes
       engineStatus.className = 'status-value';
       if (status === 'Running') {
           engineStatus.classList.add('active');
       } else if (status === 'Warning') {
           engineStatus.classList.add('warning');
       } else if (status === 'Error') {
           engineStatus.classList.add('danger');
       }
       
       oilStatus.className = 'status-value';
       if (oil === 'Normal') {
           oilStatus.classList.add('success');
       } else if (oil === 'Low') {
           oilStatus.classList.add('warning');
       } else if (oil === 'Critical') {
           oilStatus.classList.add('danger');
       }
   }
   
   // Update relay status
   function updateRelayStatus(relayData) {
       const relay1 = relayData.relay1 || false;
       const relay2 = relayData.relay2 || false;
       
       // Update switch states
       relay1Switch.checked = relay1;
       relay2Switch.checked = relay2;
       
       // Update status text
       relay1Status.textContent = relay1 ? 'ON' : 'OFF';
       relay2Status.textContent = relay2 ? 'ON' : 'OFF';
   }
   
   // Update notifications display
   function updateNotifications(notifications) {
       // Clear current notifications
       notificationsList.innerHTML = '';
       
       // Convert to array and sort by timestamp (newest first)
       const notificationArray = Object.keys(notifications).map(key => {
           return { id: key, ...notifications[key] };
       }).sort((a, b) => b.timestamp - a.timestamp);
       
       // Add notifications to display
       notificationArray.forEach(notification => {
           const notificationEl = document.createElement('div');
           notificationEl.className = 'notification-item';
           if (!notification.read) {
               notificationEl.classList.add('unread');
           }
           
           const iconClass = getNotificationIconClass(notification.type);
           
           notificationEl.innerHTML = `
               <div class="notification-icon ${notification.type}">
                   <i class="${iconClass}"></i>
               </div>
               <div class="notification-content">
                   <h4>${notification.title}</h4>
                   <p>${notification.message}</p>
                   <span class="notification-time">${formatTimestamp(notification.timestamp)}</span>
               </div>
               <button class="notification-dismiss" data-id="${notification.id}">
                   <i class="fas fa-times"></i>
               </button>
           `;
           
           notificationsList.appendChild(notificationEl);
       });
       
       // Add event listeners to dismiss buttons
       document.querySelectorAll('.notification-dismiss').forEach(button => {
           button.addEventListener('click', function() {
               const notificationId = this.getAttribute('data-id');
               dismissNotification(notificationId);
           });
       });
   }
   
   // Helper function to get notification icon class
   function getNotificationIconClass(type) {
       switch (type) {
           case 'warning':
               return 'fas fa-exclamation-triangle';
           case 'info':
               return 'fas fa-info-circle';
           case 'danger':
               return 'fas fa-exclamation-circle';
           case 'success':
               return 'fas fa-check-circle';
           default:
               return 'fas fa-bell';
       }
   }
   
   // Helper function to format timestamp
   function formatTimestamp(timestamp) {
       const now = new Date();
       const date = new Date(timestamp);
       
       const diffMs = now - date;
       const diffMins = Math.floor(diffMs / 60000);
       const diffHours = Math.floor(diffMins / 60);
       const diffDays = Math.floor(diffHours / 24);
       
       if (diffMins < 1) {
           return 'Just now';
       } else if (diffMins < 60) {
           return `${diffMins} min ago`;
       } else if (diffHours < 24) {
           return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
       } else if (diffDays < 7) {
           return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
       } else {
           return date.toLocaleDateString();
       }
   }
   
   // Mark notification as read and dismiss
   function dismissNotification(notificationId) {
       if (currentVehicleId && notificationId) {
           db.ref(`devices/${currentVehicleId}/notifications/${notificationId}/read`).set(true)
             .then(() => {
                 console.log('Notification marked as read');
             })
             .catch(error => {
                 console.error('Error dismissing notification:', error);
             });
       }
   }
   
   // Check fuel level and create notification if low
   function checkFuelLevel(percentage) {
       if (percentage <= 15) {
           createNotification('warning', 'Low Fuel Warning', 'Fuel level is below 15%. Please refill soon.');
       } else if (percentage <= 25 && percentage > 15) {
           createNotification('info', 'Fuel Reminder', 'Fuel level is at ' + percentage + '%. Consider refilling soon.');
       }
   }
   
   // Check battery voltage and create notification if low
   function checkBatteryVoltage(voltage) {
       if (voltage < 11.5) {
           createNotification('danger', 'Critical Battery Voltage', 'Battery voltage is critically low at ' + voltage + 'V. Check battery immediately.');
       } else if (voltage < 12.0) {
           createNotification('warning', 'Low Battery Voltage', 'Battery voltage is low at ' + voltage + 'V. Battery might need service.');
       }
   }
   
   // Create a new notification
   function createNotification(type, title, message) {
       if (currentVehicleId) {
           const notificationRef = db.ref(`devices/${currentVehicleId}/notifications`).push();
           notificationRef.set({
               type: type,
               title: title,
               message: message,
               timestamp: firebase.database.ServerValue.TIMESTAMP,
               read: false
           }).then(() => {
               showToast(type, title, message);
           }).catch(error => {
               console.error('Error creating notification:', error);
           });
       }
   }
