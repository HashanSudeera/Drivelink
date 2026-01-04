#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <TinyGPS++.h>
#include <Bounce2.h>
#include <Adafruit_ADS1X15.h>


// Firebase library and helpers
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// WiFi Credentials
#define WIFI_SSID "Pc"
#define WIFI_PASSWORD "12345678"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define FB_ENABLE_DEBUG false
#define FB_ENABLE_ERROR_STRING false
#define CORE_DEBUG_LEVEL 0

// Add these at the top with other defines
#define WIFI_TIMEOUT_MS 20000  // 20 second timeout
#define WIFI_RECONNECT_DELAY 5000  // 5 seconds between retries

// Firebase Credentials
#define API_KEY "AIzaSyAa9bahojYMk_1meGG8YCgUDFNj6MEHPeI"
#define DATABASE_URL "https://espclientsnew-default-rtdb.asia-southeast1.firebasedatabase.app/"

// ADS1115 setup
Adafruit_ADS1115 ads;  // Create an ADS1115 instance
const int fuelSensorChannel = 3; // Channel A0 for fuel sensor
const int tempSensorChannel = 1; // Channel A1 for temperature sensor

// Fuel sensor parameters
const float Rref = 220.0f;       // Reference resistor value
const float R_empty = 15.0f;     // Resistance when empty (4Ω)
const float R_full = 80.0f;     // Resistance when full (90Ω)
const float Vin = 3.3f;        // ADS1115 voltage reference

// NTC Thermistor parameters
const float R1 = 10000.0f;       // 10K series resistor for NTC
const float Beta = 3950.0f;      // Beta coefficient
const float Thermistor_T0 = 298.15f; // 25°C in Kelvin (298.15K)
const float R0 = 8000.0f;       // Resistance at T0 (10K at 25°C)

// Battery monitoring
const int voltageSensorPin = 35;
float vIn = 0.0f;                // Calculated battery voltage
const float factor = 5.45f;      // Voltage divider factor
const float vCC = 3.3f;          // ESP32 reference voltage

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Timer for Firebase updates
unsigned long sendDataPrevMillis = 0;
unsigned long sendDataInterval = 1000;
bool signupOK = false;

// Button Pins
const int buttonPin1 = 4;    // Screen change button
const int buttonPin2 = 26;   // Relay 1 control
const int buttonPin3 = 27;   // Relay 2 control

// Relay Pins
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       
const int relayPin2 = 33;
const int relayPin1 = 25;   

// Status LED Pin
const int statusLedPin = 2;

// GPS Setup
static const int RXD2 = 5, TXD2 = 18;
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// GPS Data Variables
float latitude = 0.0f, longitude = 0.0f, speed_kmh = 0.0f;
int satellites = 0;
String DeviceId = "User10";

// OLED display setup
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Display Screen States
enum ScreenState { 
  SPLASH_SCREEN, 
  DASHBOARD_SCREEN, 
  SPEED_DISPLAY, 
  FUEL_DISPLAY, 
  BATTERY_DISPLAY, 
  RELAY_STATUS_DISPLAY,
  TIME_TEMP_DISPLAY 
};
ScreenState currentScreen = SPLASH_SCREEN;

// Bounce objects for button debouncing
Bounce debouncerButton1 = Bounce();
Bounce debouncerButton2 = Bounce();
Bounce debouncerButton3 = Bounce();

// Relay states
bool relay1State = false;
bool relay2State = false;

// Button press flags
bool button2Pressed = false;
bool button3Pressed = false;

// Sensor variables
float fuelResistance = 0.0f;
float currentTemperature = 0.0f;
float fuelPercentage = 0.0f;

// Animation variables for splash screen
unsigned long splashStartTime = 0;

// Function declarations
void displayTask(void *parameter);
void firebaseTask(void *parameter);
void drawBatteryIcon(int x, int y, float percentage);
void drawFuelGauge(int x, int y, float percentage);
void drawSpeedometer(int x, int y, float speed);
void drawRelayStatus(int x, int y, bool status, int relayNum);
void drawTemperatureIcon(int x, int y, float temp);
float readFuelLevel();
float readTemperature();
float readBatteryVoltage();

void setup() {
    Serial.begin(115200);
    gpsSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
    connectToWiFi();
     // Initialize OLED
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        Serial.println("OLED initialization failed!");
        while (true);
    }
    // Initialize ADS1115
    if (!ads.begin(0x48)) {
        Serial.println("Failed to initialize ADS1115!");
        while (true);
    }
    ads.setGain(GAIN_ONE); // +/-4.096V range

   

    // Initialize status LED
    pinMode(statusLedPin, OUTPUT);
    digitalWrite(statusLedPin, LOW);

    // Initialize buttons
    debouncerButton1.attach(buttonPin1, INPUT_PULLUP);
    debouncerButton1.interval(25);
    debouncerButton2.attach(buttonPin2, INPUT_PULLUP);
    debouncerButton2.interval(25);
    debouncerButton3.attach(buttonPin3, INPUT_PULLUP);
    debouncerButton3.interval(25);

    // Initialize relays
    pinMode(relayPin1, OUTPUT);
    pinMode(relayPin2, OUTPUT);
    digitalWrite(relayPin1, LOW);
    digitalWrite(relayPin2, LOW);

    // Firebase configuration
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;

    if (Firebase.signUp(&config, &auth, "", "")) {
        Serial.println("Firebase Anonymous Authentication Successful!");
        signupOK = true;
    } else {
        Serial.printf("Firebase SignUp Failed: %s\n", config.signer.signupError.message.c_str());
    }

    config.token_status_callback = tokenStatusCallback;
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    // Record splash screen start time
    splashStartTime = millis();

    // Create FreeRTOS tasks
    xTaskCreatePinnedToCore(
        displayTask,    // Function to implement the task
        "DisplayTask",  // Name of the task
        10000,         // Stack size in words
        NULL,          // Task input parameter
        2,             // Priority of the task (higher than firebaseTask)
        NULL,          // Task handle
        1              // Core where the task should run (Core 1)
    );

    xTaskCreatePinnedToCore(
        firebaseTask,
        "FirebaseTask",
        10000,
        NULL,
        1,             // Lower priority than displayTask
        NULL,
        0              // Core 0
    );
}

void loop() {
    // Button updates
    debouncerButton1.update();
    debouncerButton2.update();
    debouncerButton3.update();

    // Button 1 - Screen switch
    if (debouncerButton1.fell()) {
        currentScreen = static_cast<ScreenState>((currentScreen + 1) % 7);
        if (currentScreen == SPLASH_SCREEN) {
            currentScreen = DASHBOARD_SCREEN; // Skip splash screen
        }
    }

    // Button 2 - Relay 1 control
    if (debouncerButton2.fell()) {
        relay1State = !relay1State;
        digitalWrite(relayPin1, relay1State ? HIGH : LOW);
        button2Pressed = true;
    }

    // Button 3 - Relay 2 control
    if (debouncerButton3.fell()) {
        relay2State = !relay2State;
        digitalWrite(relayPin2, relay2State ? HIGH : LOW);
        button3Pressed = true;
    }

    // Read sensors
    fuelResistance = readFuelLevel();
    fuelPercentage = 100.0f - ((fuelResistance - R_full) / (R_empty - R_full)) * 100.0f;
    fuelPercentage = constrain(fuelPercentage, 0.0f, 100.0f);
    currentTemperature = readTemperature();
    vIn = readBatteryVoltage();

    // GPS parsing
    while (gpsSerial.available() > 0) {
        gps.encode(gpsSerial.read());
    }

    // LED status control
    static unsigned long lastBlinkTime = 0;
    static bool ledState = LOW;
    bool gpsConnected = gps.location.isValid();
    bool wifiConnected = (WiFi.status() == WL_CONNECTED);

    if (gpsConnected && wifiConnected) {
        if (millis() - lastBlinkTime >= 100) {
            ledState = !ledState;
            digitalWrite(statusLedPin, ledState);
            lastBlinkTime = millis();
        }
    } 
    else if (wifiConnected) {
        if (millis() - lastBlinkTime >= 1000) {
            ledState = !ledState;
            digitalWrite(statusLedPin, ledState);
            lastBlinkTime = millis();
        }
    } 
    else if (gpsConnected) {
        if (millis() - lastBlinkTime >= 500) {
            ledState = !ledState;
            digitalWrite(statusLedPin, ledState);
            lastBlinkTime = millis();
        }
    } 
    else {
        digitalWrite(statusLedPin, LOW);
    }

    // Check splash screen timeout
    if (currentScreen == SPLASH_SCREEN && (millis() - splashStartTime >= 2000)) {
        currentScreen = DASHBOARD_SCREEN;
    }

    delay(10);
}
void connectToWiFi() {
    Serial.println("\nConnecting to WiFi...");
    
    // Clear old WiFi credentials
    WiFi.disconnect(true);
    delay(1000);
    
    // Set mode before connecting
    WiFi.mode(WIFI_STA);
    
    // Begin connection
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    unsigned long startAttemptTime = millis();
    
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(500);
        
        // Check for timeout
        if (millis() - startAttemptTime > WIFI_TIMEOUT_MS) {
            Serial.println("\nFailed to connect to WiFi!");
            Serial.println("Restarting ESP32 to try again...");
            delay(1000);
            ESP.restart();
            return;
        }
    }
    
    Serial.println("\nConnected to WiFi!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
}

float readFuelLevel() {
    
    int16_t adcValue = ads.readADC_SingleEnded(fuelSensorChannel);
    
    Serial.print("Fuel ADC: "); Serial.print(adcValue);
    
    float vOut = (adcValue * Vin) / 32767.0f;
    Serial.print("  Voltage: "); Serial.print(vOut, 3); Serial.print("V");
    
    if (vOut < 0.001f) vOut = 0.001f;
    if (vOut > (Vin - 0.001f)) vOut = Vin - 0.001f;
    
    float resistance = (Rref * vOut) / (Vin - vOut);
    Serial.print("  Resistance: "); Serial.print(resistance, 1); Serial.print("Ω");
    
    static float filteredResistance = resistance;
    filteredResistance = 0.1f * resistance + 0.9f * filteredResistance;
    
    float fuelPercentage = 100.0f * ((filteredResistance - R_empty) / (R_full - R_empty));
    fuelPercentage = constrain(fuelPercentage, 0.0f, 100.0f);
    
    Serial.print("  Fuel: "); Serial.print(fuelPercentage, 1); Serial.println("%");
    return fuelPercentage;
}

void checkCalibration() {
   
    float testResistances[] = {4.0f, 20.0f, 50.0f, 90.0f};
    
    for (float R : testResistances) {
        // Theoretical voltage
        float vOut = Vin * R / (Rref + R);
        // Theoretical ADC value
        int16_t adcValue = (vOut / Vin) * 32767.0f;
        
        Serial.print("Test R="); Serial.print(R); 
        Serial.print("Ω  Expected V="); Serial.print(vOut, 3);
        Serial.print("  Expected ADC="); Serial.print(adcValue);
        
        // Now calculate back
        float calcV = (adcValue * Vin) / 32767.0f;
        float calcR = (Rref * calcV) / (Vin - calcV);
        
        Serial.print("  Calculated R="); Serial.print(calcR, 1);
        Serial.print("Ω  Error="); Serial.print((calcR - R)/R * 100.0f); 
        Serial.println("%");
    }
}

float readTemperature() {
    
    int16_t adcValue = ads.readADC_SingleEnded(tempSensorChannel);
    float vOut = (adcValue * Vin) / 32767.0f;
    
    float ntcResistance = (vOut > 0.01f) ? (R1 * vOut) / (Vin - vOut) : R0;
    
    float steinhart;
    steinhart = ntcResistance / R0;          // (R/R0)
    steinhart = log(steinhart);              // ln(R/R0)
    steinhart /= Beta;                       // 1/B * ln(R/R0)
    steinhart += 1.0f / Thermistor_T0;      // + (1/To)
    steinhart = 1.0f / steinhart;           // Invert
    steinhart -= 273.15f;                   // Convert to °C
    
    return steinhart;
}

float readBatteryVoltage() {
    // Read battery voltage
    int sensorValue = analogRead(voltageSensorPin);
    float voltage = (sensorValue * vCC) / 4095.0f; // ESP32 has 12-bit ADC
    return voltage * factor; // Apply voltage divider scaling
}
// Add these global variables
float animatedBatteryLevel = 0.0f;
unsigned long lastBatteryAnimTime = 0;
// Display Task Implementation
void displayTask(void *parameter) {
    while (true) {
        // Update sensor data
        if (gps.location.isValid()) {
            latitude = gps.location.lat();
            longitude = gps.location.lng();
        }
        if (gps.speed.isValid()) {
            speed_kmh = gps.speed.kmph();
        }
        if (gps.satellites.isValid()) {
            satellites = gps.satellites.value();
        }
        // Battery animation - smooth transitions
        if (millis() - lastBatteryAnimTime > 50) { // Update every 50ms
            if (animatedBatteryLevel < vIn)
                animatedBatteryLevel += 0.05f;
            else if (animatedBatteryLevel > vIn)
                animatedBatteryLevel -= 0.05f;
            else
                animatedBatteryLevel = vIn;
                
            lastBatteryAnimTime = millis();
        }
        display.clearDisplay();
        
        switch (currentScreen) {
            case SPLASH_SCREEN: {
                display.setTextSize(2);
                display.setTextColor(WHITE);
                display.setCursor(20, 20);
                display.println("DriveLink");
                display.setTextSize(1);
                display.setCursor(30, 40);
                display.println("By TeraNode");
                break;
            }
            
             case DASHBOARD_SCREEN: {
                
                
                display.drawLine(SCREEN_WIDTH/2+15, 0, SCREEN_WIDTH/2+15, SCREEN_HEIGHT, WHITE);
                display.drawLine(SCREEN_WIDTH/2+16, 0, SCREEN_WIDTH/2+16, SCREEN_HEIGHT, WHITE);
                
                // Horizontal divider for bottom section
                display.drawLine(0, 47, SCREEN_WIDTH, 47, WHITE);
                
                // Speed box (top left)
                 
                display.setTextColor(WHITE);
                display.setTextSize(1);
                display.setCursor(3, 1);
                display.print("Speed");
                // Satellite indicator
                display.setCursor(SCREEN_WIDTH/2+18, 1);
                display.setTextSize(1);
                display.print("Sat- ");
                display.print(satellites);
                // Temperature display
                drawTemperatureIcon(SCREEN_WIDTH/2 + 18, 25, currentTemperature);
                
                // Large speed value (size 2 instead of 3 to fit better)
                display.setTextSize(4);
                display.setCursor(5, 9);
                display.print((int)speed_kmh);
                
                // Speed units
                display.setTextSize(1);
               
                display.print("km/h");
                
                display.fillRect(0, 38, SCREEN_WIDTH/2 - 1, SCREEN_HEIGHT - 38, WHITE);
                display.setTextColor(BLACK);
                display.setCursor(3, 40);
                display.print("Fuel");
                
                // Vertical divider
                display.drawLine(SCREEN_WIDTH/2, 30, SCREEN_WIDTH/2, SCREEN_HEIGHT, BLACK);
                
                // Fuel percentage
                display.setTextSize(2);
                display.setCursor(10, 48);
                display.print((int)fuelPercentage);
                display.setTextSize(1);
                display.print("%");
                
                // Battery box (bottom right) - inverted colors
                display.fillRect(SCREEN_WIDTH/2 + 1, 38, SCREEN_WIDTH/2 - 1, SCREEN_HEIGHT - 38, WHITE);
                display.setCursor(SCREEN_WIDTH/2 + 3, 40);
                display.print("Battery");
                
                // Battery voltage
                display.setTextSize(2);
                display.setCursor(SCREEN_WIDTH/2 + 10, 48);
                display.print(vIn, 1);
                display.setTextSize(1);
                display.print("V");
                
                break;
            }
            
            
            case SPEED_DISPLAY: {
                // Draw header
                display.setTextSize(1);
                display.setTextColor(WHITE); // Ensure text color is set
                display.setCursor(5, 0);
                display.println("DriveLink");
                display.drawLine(0, 10, SCREEN_WIDTH, 10, WHITE);
                // Satellite indicator
                display.setCursor(SCREEN_WIDTH - 44, 1);
                display.setTextSize(1);
                display.print("Sat- ");
                display.print(satellites);
                // Draw speedometer on the left side
                drawSpeedometer(0, 15, speed_kmh);
                
                // Draw speed value on the right side with large, bold text
                display.setTextSize(5);
                display.setTextColor(WHITE); // Ensure text color is set
                display.setCursor(60, 15);
                display.print((int)speed_kmh);
                
                // Draw "Kmh" label
                display.setTextSize(1);
                display.setTextColor(WHITE); // Ensure text color is set
                display.setCursor(105, 53);
                display.println("Kmh");
                break;
            }

            case FUEL_DISPLAY: {
                // Draw header
                display.setTextSize(1);
                display.setTextColor(WHITE); // Ensure text color is set
                display.setCursor(5, 0);
                display.println("DriveLink");
                display.drawLine(0, 10, SCREEN_WIDTH, 10, WHITE);
                // Satellite indicator
                display.setCursor(SCREEN_WIDTH - 44, 1);
                display.setTextSize(1);
                display.print("Sat- ");
                display.print(satellites);
               
                
                // Draw label
                display.setTextSize(1);
                display.setCursor(45, 20);
                display.println("Fuel");
                
                // Draw large fuel tank on left
                drawFuelGauge(5, 15, fuelPercentage);
                
                // Draw large percentage display on right
                display.setTextSize(4);
                display.setCursor(41, 30);
                display.print((int)fuelPercentage);
                
                // Draw % symbol
                display.setTextSize(2);
                display.print("%");
                break;
            }
            
            // Then in your BATTERY_DISPLAY case:
            case BATTERY_DISPLAY: {
                 // Draw header
                display.setTextSize(1);
                display.setTextColor(WHITE); // Ensure text color is set
                display.setCursor(5, 0);
                display.println("DriveLink");
                display.drawLine(0, 10, SCREEN_WIDTH, 10, WHITE);
                // Satellite indicator
                display.setCursor(SCREEN_WIDTH - 44, 1);
                display.setTextSize(1);
                display.print("Sat- ");
                display.print(satellites);
                
                display.setCursor(50,30 );
                display.println("Battery");
                
                // Draw large battery icon on left side
                drawBatteryIcon(5, 20, vIn);
                
                // Status text based on voltage
                display.setTextSize(2);
                display.setCursor(50, 13);
                if (vIn >= 13.5) {
                    display.println("Bast");
                } else if (vIn >= 11.0) {
                    display.println("Good");
                } else {
                    display.println("Low");
                }
                
                // Large voltage display
                display.setTextSize(3);
                display.setCursor(50, 39);
                display.print(vIn, 1);
                display.setTextSize(1);
                display.println("v");
                
                break;
            }
            
            // And then for the RELAY_STATUS_DISPLAY case:
            case RELAY_STATUS_DISPLAY: {
                  // Draw header
                display.setTextSize(1);
                display.setTextColor(WHITE); // Ensure text color is set
                display.setCursor(5, 0);
                display.println("DriveLink");
                display.drawLine(0, 10, SCREEN_WIDTH, 10, WHITE);
                // Satellite indicator
                display.setCursor(SCREEN_WIDTH - 44, 1);
                display.setTextSize(1);
                display.print("Sat- ");
                display.print(satellites);
                
                display.fillRect(0, 10, 128, 64, WHITE);
                display.setTextColor(BLACK); // Ensure text color is set
                // Draw relay 1 status
                display.setTextSize(2);
                display.setCursor(3, 16);
                display.print("R1");
                
                // Draw relay 1 status box
                display.drawRect(30, 15, 45, 17, BLACK);
                if (relay1State) {
                    display.fillRect(30, 15, 45, 17, BLACK);
                    display.setTextColor(BLACK);
                } else {
                    display.setTextColor(BLACK);
                }
                display.setCursor(80, 15);
                display.print(relay1State ? "ON" : "OFF");
                display.setTextColor(BLACK);
                
                
                
                // Draw relay 2
                display.setTextSize(2);
                display.setCursor(3, 34);
                display.print("R2");
                
                // Draw relay 2 status box
                display.drawRect(30, 33, 45, 17, BLACK);
                if (relay2State) {
                    display.fillRect(30, 33, 45,17, BLACK);
                    display.setTextColor(BLACK);
                } else {
                    display.setTextColor(BLACK);
                }
                display.setCursor(80, 33);
                display.print(relay2State ? "ON" : "OFF");
                display.setTextColor(BLACK);

                display.drawLine(0, 53, SCREEN_WIDTH, 53, BLACK);

                // Draw bottom instruction
                display.setTextSize(1);
                display.setCursor(25, 55);
                display.print("R1-B1 | R2-B2");
                break;
            }
            
            case TIME_TEMP_DISPLAY: {
                // Time and temperature screen
                display.setTextSize(2);
                display.setTextColor(WHITE);
                
                // Time display (using system uptime)
                unsigned long uptime = millis() / 1000;
                int hours = (uptime / 3600) % 24;
                int minutes = (uptime / 60) % 60;
                int seconds = uptime % 60;
                char timeStr[9];
                sprintf(timeStr, "%02d:%02d:%02d", hours, minutes, seconds);
                display.setCursor(SCREEN_WIDTH/2 - 40, 10);
                display.println(timeStr);
                
                // Temperature display
                drawTemperatureIcon(SCREEN_WIDTH/2 - 16, 50, currentTemperature);
                break;
            }
        }
        display.display();
        vTaskDelay(50 / portTICK_PERIOD_MS); // Reduced refresh rate to 20Hz
    }
}

// Firebase Task Implementation
void firebaseTask(void *parameter) {
    while (true) {
        if (Firebase.ready() && signupOK && (millis() - sendDataPrevMillis >= sendDataInterval)) {
            sendDataPrevMillis = millis();

            FirebaseJson json;
            json.set("button_status/value", digitalRead(buttonPin1));
            json.set("tracking/latitude", latitude);
            json.set("tracking/longitude", longitude);
            json.set("tracking/speed", speed_kmh);
            json.set("tracking/satellites", satellites);
            json.set("fuel_sensor/value", fuelPercentage);
            json.set("battery/value", vIn);
            json.set("temperature/value", currentTemperature);
            json.set("relay1/status", relay1State);
            json.set("relay2/status", relay2State);
            json.set("time/current", millis() / 1000);

            if (Firebase.RTDB.updateNode(&fbdo, DeviceId, &json)) {
                Serial.println("Data updated successfully!");
            } else {
                Serial.println("Data upload FAILED: " + fbdo.errorReason());
            }
        }

        // Check for remote relay control updates
        if (!button2Pressed && Firebase.RTDB.getBool(&fbdo, F("User10/relay1/status"))) {
            relay1State = fbdo.to<bool>();
            digitalWrite(relayPin1, relay1State ? HIGH : LOW);
        }
        if (!button3Pressed && Firebase.RTDB.getBool(&fbdo, F("User10/relay2/status"))) {
            relay2State = fbdo.to<bool>();
            digitalWrite(relayPin2, relay2State ? HIGH : LOW);
        }

        button2Pressed = false;
        button3Pressed = false;
        vTaskDelay(100 / portTICK_PERIOD_MS); // 10Hz update rate
    }
}
// Helper function to draw a more modern speedometer
void drawSpeedometer(int x, int y, float speed) {
    // Constrain speed to 0-200 km/h for display purposes
    speed = constrain(speed, 0, 100);
    
    // Draw outer arc with gaps (segmented style)
    int centerX = x + 25;
    int centerY = y + 25;
    int radius = 25;
    
    // Draw the segmented arcs - more modern style with distinct segments
    for (int i = 0; i < 7; i++) {
        // Calculate start and end angles for each segment
        float startAngle = -240 + (i * 45);
        float endAngle = startAngle + 30;
        
        // Convert angles to radians
        float startRad = startAngle * PI / 180.0;
        float endRad = endAngle * PI / 180.0;
        
        // For thicker segments
        for (int r = radius - 2; r <= radius; r++) {
            for (float angle = startRad; angle <= endRad; angle += 0.02) {
                int arcX = centerX + r * cos(angle);
                int arcY = centerY + r * sin(angle);
                display.drawPixel(arcX, arcY, WHITE);
            }
        }
    }
    
    // Calculate needle position based on speed
    float needleAngle = map(speed, 0, 100, -240, 240) * PI / 180.0;
    int needleLength = 22;
    int needleX = centerX + needleLength * cos(needleAngle);
    int needleY = centerY + needleLength * sin(needleAngle);
    
    // Draw thicker needle for a more modern look
    display.drawLine(centerX, centerY, needleX, needleY, WHITE);
    // Make needle thicker
    display.drawLine(centerX + 1, centerY, needleX + 1, needleY, WHITE);
    
    // Draw center hub
    display.fillCircle(centerX, centerY, 4, WHITE);
}

void drawBatteryIcon(int x, int y, float voltage) {
    // Map voltage (10.0V-12.6V) to segments (0-8)
    int segments = map(constrain(voltage, 0, 13.6) * 10, 0, 136, 0, 6);
    
    // Draw battery outline - make it larger to match the image
    int battWidth = 35;
    int battHeight = 43;
    
    // Draw the battery container
    display.drawRoundRect(x, y, battWidth, battHeight, 2, WHITE);
    display.fillRoundRect(x + battWidth/2 -5 , 15, 10, 5, 0, WHITE); // battery terminal
    
    // Draw battery segments (8 total)
    int segHeight = battHeight/4 -4;
    int segGap = 1;
    int startY = y + battHeight - segHeight - 2;
    
    for (int i = 0; i < 5; i++) {
        if (i < segments) {
            display.fillRect(x + 3, startY - i * (segHeight + segGap), battWidth - 5, segHeight, WHITE);
        } else {
            /* display.drawRect(x + 2, startY - i * (segHeight + segGap), battWidth - 5, segHeight, WHITE); */
        }
    }
}



void drawFuelGauge(int x, int y, float percentage) {
    percentage = constrain(percentage, 0, 100);
    
    // Calculate dimensions for larger fuel tank
    int tankWidth = 35;
    int tankHeight = 45;
    int cornerRadius = 3;
    
    // Draw rounded rectangle for fuel tank
    // Draw top and bottom lines
    display.drawLine(x + cornerRadius, y, x + tankWidth - cornerRadius, y, WHITE);
    display.drawLine(x + cornerRadius, y + tankHeight, x + tankWidth - cornerRadius, y + tankHeight, WHITE);
    
    // Draw left and right lines
    display.drawLine(x, y + cornerRadius, x, y + tankHeight - cornerRadius, WHITE);
    display.drawLine(x + tankWidth, y + cornerRadius, x + tankWidth, y + tankHeight - cornerRadius, WHITE);
    
    // Draw rounded corners
    display.drawCircleHelper(x + cornerRadius, y + cornerRadius, cornerRadius, 1, WHITE);
    display.drawCircleHelper(x + tankWidth - cornerRadius, y + cornerRadius, cornerRadius, 2, WHITE);
    display.drawCircleHelper(x + cornerRadius, y + tankHeight - cornerRadius, cornerRadius, 8, WHITE);
    display.drawCircleHelper(x + tankWidth - cornerRadius, y + tankHeight - cornerRadius, cornerRadius, 4, WHITE);
    
    // Draw fuel level (adjusted to account for rounded corners)
    int fuelHeight = map(percentage, 0, 100, 0, tankHeight - (2 * cornerRadius));
    display.fillRect(x + 2, y + tankHeight - fuelHeight - cornerRadius, tankWidth - 4, fuelHeight, WHITE);
    
    // Fill bottom rounded part if fuel level is high enough
    if (percentage > 10) {
        display.fillRect(x + 2, y + tankHeight - cornerRadius, tankWidth - 4, cornerRadius - 2, WHITE);
    }
}


void drawRelayStatus(int x, int y, bool status, int relayNum) {
    // Full screen header
    display.fillRect(0, 0, SCREEN_WIDTH, 10, WHITE);
    display.setTextColor(BLACK);
    display.setTextSize(1);
    display.setCursor(35, 1);
    display.print("DriveLink");
    display.setTextColor(WHITE);
    
    // Draw relay label
    display.setTextSize(2);
    display.setCursor(5, y);
    display.print("Relay ");
    display.print(relayNum);
    
    // Draw status box
    display.drawRect(x + 45, y - 5, 50, 25, WHITE);
    
    // Fill box if ON
    if (status) {
        display.fillRect(x + 45, y - 5, 50, 25, WHITE);
    }
    
    // Draw ON/OFF text
    if (status) {
        display.setTextColor(BLACK);
        display.setCursor(x + 100, y);
        display.print("ON");
    } else {
        display.setTextColor(WHITE);
        display.setCursor(x + 100, y);
        display.print("OFF");
    }
    display.setTextColor(WHITE);
    
    // Draw separator line
    display.drawLine(0, y + 30, SCREEN_WIDTH, y + 30, WHITE);
}

// Helper function to draw temperature icon
void drawTemperatureIcon(int x, int y, float temp) {
    // Draw thermometer bulb
    
    // Draw thermometer stem
    display.drawRect(x, y, 10, 20, WHITE);
    display.fillRect(x + 2, y + 2, 6, 16, BLACK);
    
    // Draw temperature level
    int tempHeight = map(constrain(temp, 0, 50), 0, 50, 0, 14);
    display.fillRect(x + 2, y + 2 + (14 - tempHeight), 6, tempHeight, WHITE);
    
    // Draw temperature text
    display.setTextSize(1);
    display.setCursor(x + 16, y + 2);
    display.print(temp, 1);
    display.println("C");
}