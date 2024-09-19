#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <HX711.h>

// Wi-Fi settings
const char* ssid = "SmartIVBag";
const char* password = "12345678";

// IP Address details
IPAddress local_ip(192,168,1,1);
IPAddress gateway(192,168,1,1);
IPAddress subnet(255,255,255,0);

// WebSocket server
WebSocketsServer webSocket = WebSocketsServer(81);

// HX711 circuit wiring
const int LOADCELL_DOUT_PIN = 16;
const int LOADCELL_SCK_PIN = 17;

HX711 scale;

// Liquid level sensor pin
const int LIQUID_LEVEL_PIN = 34;

// LED pins
const int LED_LOW = 25;
const int LED_MEDIUM = 26;
const int LED_HIGH = 27;

// Global variables to store sensor data
float weight = 0;
int volume = 100;
String state = "off";
float flowRate = 0;
float initialFullWeight = 0;
float emptyBagWeight = 0;
int lastLiquidLevel = 0;
bool isFirstMeasurement = true;

// Variables for flow rate calculation
unsigned long lastMeasurementTime = 0;
int lastVolume = 100;

// Calibration factor for the load cell
const float calibration_factor = -7050.0;  // This value is obtained using the SparkFun_HX711_Calibration sketch

// Test mode flag
bool testMode = true;
unsigned long testStartTime;

void setup() {
  Serial.begin(115200);
  
  // Initialize HX711
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);

  // Initialize the weight sensor
  scale.set_scale(calibration_factor);
  scale.tare();

  // Initialize lastLiquidLevel
  lastLiquidLevel = analogRead(LIQUID_LEVEL_PIN);
  Serial.println("Initial liquid level set to: " + String(lastLiquidLevel));

  // Set the initial full weight (this should be done when the bag is full)
  if (scale.is_ready()) {
    initialFullWeight = scale.get_units(5);  // Get the average of 5 readings
    Serial.println("Initial full weight set to: " + String(initialFullWeight) + " grams");
  } else {
    Serial.println("Error: Weight sensor not ready. Please check the connection.");
  }
  
  // Setup pins
  pinMode(LIQUID_LEVEL_PIN, INPUT);
  pinMode(LED_LOW, OUTPUT);
  pinMode(LED_MEDIUM, OUTPUT);
  pinMode(LED_HIGH, OUTPUT);
  
  // Initialize WiFi
  WiFi.softAP(ssid, password);
  WiFi.softAPConfig(local_ip, gateway, subnet);
  
  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("WebSocket server started");
  
  // Initialize lastMeasurementTime and testStartTime
  lastMeasurementTime = millis();
  testStartTime = millis();
  Serial.println("Initial measurement time set");

  Serial.println("Setup complete. Running in test mode.");
}

void loop() {
  webSocket.loop();
  
  if (testMode) {
    updateTestData();
  } else {
    updateSensorData();
  }
  
  sendData();
  delay(100);
}

void updateTestData() {
  unsigned long currentTime = millis();
  unsigned long elapsedTime = (currentTime - testStartTime) / 1000; // Convert to seconds

  // Simulate decreasing volume over time
  float volumePercentage = 100.0 - (elapsedTime / 1.2); // Decrease by 1% every 1.2 seconds
  volume = constrain(int(volumePercentage), 0, 100); // Ensure volume is between 0 and 100

  // Simulate flow rate
  flowRate = 300.0; // mL/h (5 times faster than the original)

  // Simulate weight (assuming 1mL = 1g for simplicity)
  weight = volume;

  // Reset test every 2 minutes
  if (elapsedTime >= 120) {
    testStartTime = currentTime;
    Serial.println("Test reset after 2 minutes");
  }

  // Print test data for debugging
  Serial.println("Test Data - Volume: " + String(volume) + "%, Weight: " + String(weight, 2) + "g, Flow Rate: " + String(flowRate, 2) + "mL/h");
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      state = "off";
      break;
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
        state = "on";
      }
      break;
    case WStype_TEXT:
      Serial.printf("[%u] get Text: %s\n", num, payload);
      // Handle incoming messages here if needed
      break;
  }
}

void sendData() {
  DynamicJsonDocument doc(1024);
  doc["volume"] = volume;
  doc["state"] = state;
  doc["flowRate"] = flowRate;
  
  String jsonString;
  serializeJson(doc, jsonString);
  webSocket.broadcastTXT(jsonString);
  
  // Print data to Serial for debugging
  Serial.println(jsonString);
}

void updateSensorData() {
  // Update weight
  if (scale.is_ready()) {
    weight = scale.get_units();
    Serial.println("Current weight: " + String(weight) + " grams");
    
    // Calculate volume percentage
    if (initialFullWeight > emptyBagWeight) {
      volume = ((weight - emptyBagWeight) / (initialFullWeight - emptyBagWeight)) * 100;
      volume = constrain(volume, 0, 100);  // Ensure volume is between 0% and 100%
      Serial.println("Calculated volume: " + String(volume) + "%");
    } else {
      Serial.println("Error: Invalid weight range. Please check initialFullWeight and emptyBagWeight.");
    }
  } else {
    Serial.println("Weight sensor not ready. Skipping weight and volume update.");
  }
  
  // Control LED based on calculated volume
  if (volume < 20) {
    digitalWrite(LED_LOW, HIGH);
    digitalWrite(LED_MEDIUM, LOW);
    digitalWrite(LED_HIGH, LOW);
  } else if (volume < 80) {
    digitalWrite(LED_LOW, LOW);
    digitalWrite(LED_MEDIUM, HIGH);
    digitalWrite(LED_HIGH, LOW);
  } else {
    digitalWrite(LED_LOW, LOW);
    digitalWrite(LED_MEDIUM, LOW);
    digitalWrite(LED_HIGH, HIGH);
  }
  
  // Calculate flow rate using liquid level sensor
  unsigned long currentTime = millis();
  unsigned long timeDifference = currentTime - lastMeasurementTime;
  
  if (timeDifference >= 10000 || isFirstMeasurement) { // Calculate flow rate every 10 seconds or on first measurement
    int currentLiquidLevel = analogRead(LIQUID_LEVEL_PIN);
    Serial.println("Current liquid level: " + String(currentLiquidLevel));
    
    if (!isFirstMeasurement) {
      int liquidLevelDifference = lastLiquidLevel - currentLiquidLevel;
      
      // Convert liquid level difference to volume (mL)
      // Assuming liquid density is 1g/mL (water). TODO: Change density based on the liquid type
      float fullRange = 4095.0; // have to change this value based on the sensor
      float volumeDifference = (liquidLevelDifference / fullRange) * (initialFullWeight - emptyBagWeight);
      
      // Calculate flow rate in mL/hour
      if (timeDifference > 0) {
        flowRate = volumeDifference / (timeDifference / 1000.0 / 3600.0);
      } else {
        flowRate = 0; // keep the flow rate as 0 if the time difference is 0
      }
      
      Serial.println("Current flow rate: " + String(flowRate) + " mL/hour");
      Serial.println("Time since last measurement: " + String(timeDifference / 1000.0) + " seconds");
    } else {
      Serial.println("First measurement. Flow rate calculation will start on next update.");
      isFirstMeasurement = false;
    }
    
    lastLiquidLevel = currentLiquidLevel;
    lastMeasurementTime = currentTime;
  }
}