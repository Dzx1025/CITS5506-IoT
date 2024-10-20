/*
 * IV Bag Monitor
 * 
 * This project uses an ESP32 with a HX711 load cell amplifier to monitor the weight
 * of an IV bag. It calculates the remaining fluid level, flow rate, and estimated
 * time left. The data is published via MQTT and stored in InfluxDB for monitoring
 * and analysis.
 * 
 * Key Features:
 * - Weight measurement using HX711 and load cell
 * - Wi-Fi connectivity
 * - MQTT publishing for real-time data transmission
 * - InfluxDB integration for data storage
 * - Flow rate calculation using Weighted Moving Average
 * - Estimated time remaining calculation
 * - LED indicators for various states
 * - Button interface for setting full bottle weight
 * 
 */

#include <ArduinoJson.h>
#include <HX711.h>
#include <InfluxDbClient.h>
#include <PubSubClient.h>
#include <WiFi.h>

// Network Settings
const char *ssid = "*******";             // Wi-Fi SSID
const char *password = "********";        // Wi-Fi password

WiFiClient wifi_client;
PubSubClient mqtt_client(wifi_client);

// MQTT Configuration
const char *mqtt_server = "172.20.10.4";  // MQTT broker IP (use 'ifconfig | grep inet' to check local IP)
const int mqtt_port = 1883;               // MQTT broker port
const char *mqtt_topic = "public/ivbag/40";
const char *mqtt_threshold_topic = "private/ctl/ivbag/40";
const char *mqtt_username = "*******";    // MQTT username
const char *mqtt_password = "*******";    // MQTT password

// InfluxDB Configuration
const char *influxdb_url = "http://172.20.10.4:8086";
const char *influxdb_org = "your_org";
const char *influxdb_bucket = "your_database";
const char *influxdb_token = "your_token";

InfluxDBClient db_client(influxdb_url, influxdb_org, influxdb_bucket, influxdb_token);

// HX711 Load Cell Configuration
HX711 scale;
const int DOUT = 13;                      // HX711 data pin
const int HX711_SCK = 14;                 // HX711 clock pin
float calibration_factor = -2111.5;       // Calibration factor for the load cell

// IV Bag Measurement Variables
float full_bottle_weight = 500;           // Initial full bottle weight (grams)
bool isFullBottleSet = false;             // Flag to indicate if full weight has been set
float lastValidWeight = full_bottle_weight;
int level = 100;                          // Current IV bag level (percentage)

// Button and Debounce Variables
const int buttonPin = 2;                  // Button pin
int buttonState = 0;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 500;  // Debounce delay in milliseconds

// Flow Rate and Time Left Calculation Variables
float previousWeight = 0;
unsigned long previousWeightTime = 0;
unsigned long lastCalculationTime = 0;
const unsigned long calculationInterval = 5000;  // Calculation interval in milliseconds
float weightSum = 0;
int weightCount = 0;
float averageWeight = 0;
float flowRate = 0;                       // Flow rate in mL per hour
int timeLeftHours = 999;
int timeLeftMinutes = 999;

// Weighted Moving Average (WMA) Variables for Flow Rate
const int WMA_WINDOW_SIZE = 6;
float flowRateHistory[WMA_WINDOW_SIZE];
int historyIndex = 0;

// LED Pin Assignments
const int speakerLedPin = 25;
const int weightLedPin = 32;              // LED for full weight setting
const int networkLedPin = 33;             // LED for network connection status
const int communicationLedPin = 15;
const int alertLedPin1 = 21;
const int alertLedPin2 = 22;

// LED Blinking Variables
unsigned long previousMillis = 0;
const long interval = 500;                // LED blink interval in milliseconds
int ledState = LOW;

// Threshold Variables
int user_threshold = 15;                  // Default alert threshold (percentage)
int previous_threshold = 15;              // Previous threshold for preventing duplicate alerts

// InfluxDB Write Interval
unsigned long lastInfluxDBWrite = 0;
const unsigned long influxDBWriteInterval = 5000;  // InfluxDB write interval in milliseconds

void setup() {
  Serial.begin(115200);

  // Initialize HX711
  scale.begin(DOUT, HX711_SCK);
  scale.set_scale(calibration_factor);
  scale.tare();

  // Set up the button
  pinMode(buttonPin, INPUT_PULLUP);
  // Set up the LED
  pinMode(speakerLedPin, OUTPUT);
  pinMode(weightLedPin, OUTPUT);
  pinMode(networkLedPin, OUTPUT);
  pinMode(communicationLedPin, OUTPUT);
  pinMode(alertLedPin1, OUTPUT);
  pinMode(alertLedPin2, OUTPUT);
  digitalWrite(speakerLedPin, LOW);

  setup_wifi();

  // Set up MQTT connection and callback function to handle messages
  mqtt_client.setServer(mqtt_server, mqtt_port);
  mqtt_client.setCallback(callback);
  
  if (mqtt_client.connect("ESP32Client", mqtt_username, mqtt_password)) {
  Serial.println("Connected to MQTT Broker!");
  mqtt_client.subscribe(mqtt_threshold_topic);
  } else {
    Serial.println("Failed to connect to MQTT Broker.");
  }

  setupInfluxDB();

  // initialize flow rate history for Weighted Moving Average calculation
  for (int i = 0; i < WMA_WINDOW_SIZE; i++) {
    flowRateHistory[i] = 0;
  }
}

void loop() {
  unsigned long currentMillis = millis();

  if (!mqtt_client.connected()) {
    reconnect();
  }
  mqtt_client.loop();

  // Handle weight LED, blink when waiting for setting full bottle, keep LED on after being set
  if (!isFullBottleSet) {
    if (currentMillis - previousMillis >= interval) {
      previousMillis = currentMillis;
      ledState = !ledState;
      digitalWrite(weightLedPin, ledState);
    }
  } else {
    digitalWrite(weightLedPin, HIGH);
  }

  // Handle network LED
  if (WiFi.status() != WL_CONNECTED) {
    if (currentMillis - previousMillis >= interval) {
      previousMillis = currentMillis;
      ledState = !ledState;
      digitalWrite(networkLedPin, ledState);
    }
  } else {
    digitalWrite(networkLedPin, HIGH);
  }

  // Handle communication LED logic
  bool isMqttConnected = mqtt_client.connected();
  bool isInfluxDbConnected = db_client.validateConnection();

  if (!isMqttConnected || !isInfluxDbConnected) {
    if (currentMillis - previousMillis >= interval) {
      previousMillis = currentMillis;
      ledState = !ledState;
      digitalWrite(communicationLedPin, ledState);  // Blink when any connection is not established
    }
  } else {
    digitalWrite(communicationLedPin, HIGH);  // Keep LED on when both connections are established
  }

  buttonState = digitalRead(buttonPin);

  // Check if button is pressed to set full bottle weight
  if (isButtonPressed()) {
    setFullBottleWeight();
  }

  // Read weight from sensor
  float current_weight = readWeightFromSensor();

  // If full bottle weight is not set, display message and wait for button press
  if (!isFullBottleSet) {
    level = 100;
    flowRate = 0;
    timeLeftHours = 999;
    timeLeftMinutes = 999;
    Serial.println("Please set the full bottle weight by pressing the button.");
  } else {
    weightSum += current_weight;
    weightCount++;

    calculateLevel(current_weight);

    // Calculate flow rate and time left every 3 seconds, to avoid the effect of noise
    if (currentMillis - lastCalculationTime >= calculationInterval) {
      averageWeight = weightSum / weightCount;
      calculateFlowRate(averageWeight);
      calculateTimeLeft(averageWeight, flowRate);

      weightSum = 0;
      weightCount = 0;

      lastCalculationTime = currentMillis;
    }

    publishData();
  }

  Serial.print("current threshold:");
  Serial.println(user_threshold);

  // Check the weight level against the user threshold, blink when level is under threshold
  if (level <= user_threshold) {
    for (int i = 0; i < 2; i++) {
    digitalWrite(alertLedPin1, HIGH);
    digitalWrite(alertLedPin2, LOW);
    delay(250);
    digitalWrite(alertLedPin1, LOW);
    digitalWrite(alertLedPin2, HIGH);
    delay(250);
    }
  } else {
    digitalWrite(alertLedPin1, LOW);
    digitalWrite(alertLedPin2, LOW);
    delay(1000);
  }

}

/*
 * Setup Wi-Fi Connection
 * 
 * This function initializes the Wi-Fi connection using the provided SSID and password.
 * It prints the connection status and IP address to the serial monitor.
 */
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

/*
 * Reconnect to MQTT Broker
 * 
 * This function attempts to reconnect to the MQTT broker if the connection is lost.
 * It uses a random client ID and subscribes to the threshold topic upon successful connection.
 */
void reconnect() {
  while (!mqtt_client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "TTGO-TBeam-";
    clientId += String(random(0xffff), HEX);
    if (mqtt_client.connect(clientId.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("connected");

      // Once connected, subscribe to the topic
      if (mqtt_client.subscribe(mqtt_threshold_topic)) {
        Serial.print("Subscribed to topic: ");
        Serial.println(mqtt_threshold_topic);
      } else {
        Serial.println("Failed to subscribe to topic.");
      }

    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt_client.state());
      Serial.println(" try again in 2 seconds");
      delay(2000);
    }
  }
}

/*
 * Set up InfluxDB Connection
 * 
 * This function initializes the connection to the InfluxDB server.
 * It attempts to validate the connection and prints the status to the serial monitor.
 */
void setupInfluxDB() {
  Serial.println("Setting up InfluxDB connection...");
  

  if (db_client.validateConnection()) {
    Serial.print("Connected to InfluxDB: ");
    Serial.println(db_client.getServerUrl());
  } else {
    Serial.print("InfluxDB connection failed: ");
    Serial.println(db_client.getLastErrorMessage());
  }
}

/*
 * Check Button Press
 * 
 * This function checks if the button connected to buttonPin is pressed.
 * 
 * @return true if the button is pressed (LOW state), false otherwise
 */
bool isButtonPressed() {
  return digitalRead(buttonPin) == LOW;
}

/*
 * Read Weight from Sensor
 * 
 * This function reads the weight from the HX711 sensor with debounce logic.
 * It updates the lastValidWeight if a new reading is taken.
 * 
 * @return The current weight reading or the last valid weight if debounce time hasn't elapsed
 */
float readWeightFromSensor() {
  unsigned long currentTime = millis();
  if (currentTime - lastDebounceTime > debounceDelay) {
    lastDebounceTime = currentTime;
    float weight = -scale.get_units();
    Serial.print("current weight: ");
    Serial.println(weight);
    lastValidWeight = weight;  // Update last valid weight value
    return weight;
  }
  return lastValidWeight;
}


/*
 * Set Full Bottle Weight
 * 
 * This function sets the weight of a full IV bag. It reads the current weight,
 * updates the full_bottle_weight variable, and provides visual feedback via LED.
 */
void setFullBottleWeight() {
  full_bottle_weight = readWeightFromSensor();
  isFullBottleSet = true;
  Serial.println("Full bottle weight set to: " + String(full_bottle_weight));

  // Turn on LED for 1 second after full bottle weight is set
  digitalWrite(speakerLedPin, HIGH);
  delay(1000);
  digitalWrite(speakerLedPin, LOW);
}

/*
 * Calculate Fluid Level
 * 
 * This function calculates the remaining fluid level as a percentage
 * based on the current weight and the full bottle weight.
 * 
 * @param current_weight The current weight reading from the sensor
 */
void calculateLevel(float current_weight) {
  if (full_bottle_weight != 0) {
    level = (current_weight / full_bottle_weight) * 100;
    level = constrain(level, 0, 100);  // Ensure level is between 0 and 100
  } else {
    level = 0;
  }
}

/*
 * Calculate Flow Rate
 * 
 * This function calculates the flow rate using a Weighted Moving Average (WMA) approach.
 * It takes the average weight over a period and computes the instantaneous flow rate,
 * then updates the WMA for a smoother flow rate estimation.
 * 
 * @param averageWeight The average weight measured over the calculation interval
 */
void calculateFlowRate(float averageWeight) {
  static float previousAverageWeight = 0;
  static unsigned long previousCalculationTime = 0;

  unsigned long currentTime = millis();
  // Calculate time difference in hours
  float timeDifference = (currentTime - previousCalculationTime) / 3600000.0;  // Convert to hours

  // Update flow rate history for Weighted Moving Average calculation
  float instantFlowRate = 0;
  if (previousAverageWeight > 0 && timeDifference > 0) {
    instantFlowRate = (previousAverageWeight - averageWeight) / timeDifference; // Assuming 1g = 1mL
    instantFlowRate = max(instantFlowRate, 0.0f);  // Ensure flow rate is not negative
  }
  // Update flow rate history for Weighted Moving Average calculation
  updateFlowRateHistory(instantFlowRate);

  // Calculate Weighted Moving Average
  float totalWeight = 0;
  float weightedFlowRate = 0;

  for (int i = 0; i < WMA_WINDOW_SIZE; i++) {
    int index = (historyIndex - i + WMA_WINDOW_SIZE) % WMA_WINDOW_SIZE;
    float weight = WMA_WINDOW_SIZE - i; // Assign higher weight to more recent values
    weightedFlowRate += flowRateHistory[index] * weight;
    totalWeight += weight;
  }

  // Calculate final flow rate
  if (totalWeight > 0) {
    flowRate = weightedFlowRate / totalWeight;
  } else {
    flowRate = 0;
  }

  previousAverageWeight = averageWeight;
  previousCalculationTime = currentTime;
  Serial.print("Updated flow rate (WMA): ");
  Serial.println(flowRate);
}

/*
 * Update Flow Rate History
 * 
 * This function updates the flow rate history array used for the Weighted Moving Average calculation.
 * 
 * @param instantFlowRate The most recent instantaneous flow rate calculation
 */
void updateFlowRateHistory(float instantFlowRate) {
  flowRateHistory[historyIndex] = instantFlowRate;
  historyIndex = (historyIndex + 1) % WMA_WINDOW_SIZE;
}

/*
 * Calculate Time Left
 * 
 * This function estimates the time remaining before the IV bag reaches the user-defined threshold.
 * It calculates the time based on the current average weight, flow rate, and threshold.
 * 
 * @param averageWeight The current average weight of the IV bag
 * @param flowRate The current flow rate
 */
void calculateTimeLeft(float averageWeight, float flowRate) {
  if (flowRate > 0) {
    float remainWeight = averageWeight - full_bottle_weight * user_threshold / 100;
    float remainingTimeHours = remainWeight / flowRate;
    timeLeftHours = int(remainingTimeHours);
    timeLeftMinutes = (remainingTimeHours - timeLeftHours) * 60;
    Serial.println("Updated time left");
  } else {
    timeLeftHours = 999;
    timeLeftMinutes = 999;
  }
}

/*
 * Publish Data
 * 
 * This function prepares and publishes the current IV bag data (level, flow rate, time left)
 * to the MQTT broker. It also triggers periodic writes to InfluxDB.
 */

void publishData() {
  // Create a JSON document
  JsonDocument data;
  data["level"] = level;
  data["rate"] = flowRate;
  JsonObject timeLeft = data.createNestedObject("timeLeft");
  timeLeft["hour"] = timeLeftHours;
  timeLeft["minute"] = timeLeftMinutes;

  // Serialize JSON document to string
  String payload;
  serializeJson(data, payload);

  Serial.print("Publishing message: ");
  Serial.println(payload);
  mqtt_client.publish(mqtt_topic, payload.c_str());

  // Write data to InfluxDB
  if (millis() - lastInfluxDBWrite >= influxDBWriteInterval) {
    writeDataToInfluxDB(level);
    lastInfluxDBWrite = millis();
  }
}

/*
 * Write Data to InfluxDB
 * 
 * This function writes the current fluid level data to InfluxDB.
 * 
 * @param level The current fluid level percentage
 */
void writeDataToInfluxDB(int level) {
  Serial.println("Preparing to write data to InfluxDB...");

  Point sensorData("monitor variables");

  sensorData.addField("weight", level);

  if (db_client.writePoint(sensorData)) {
      Serial.println("Data written to InfluxDB");
    } else {
      Serial.print("InfluxDB write failed: ");
      Serial.println(db_client.getLastErrorMessage());
    }

}

/*
 * MQTT Callback Function
 * 
 * This function is called when a message is received on the subscribed MQTT topic.
 * It handles messages for updating the alert threshold or resetting the full bottle weight.
 * 
 * @param topic The topic of the received message
 * @param payload The message payload
 * @param length The length of the payload
 */
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic: ");
  Serial.print(topic);
  Serial.print(". Message: ");
  
  // Convert the incoming byte payload to a string
  String message;
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println(message);

// Initialize ArduinoJson document and parse the message
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("Failed to parse JSON: ");
    Serial.println(error.c_str());
    return;
  }

  // Extract the threshold value from the JSON
  if (doc.containsKey("threshold")) {
    int new_threshold = doc["threshold"];
    if (new_threshold != previous_threshold) {
      user_threshold = new_threshold;
      previous_threshold = new_threshold;
      Serial.print("User set new threshold: ");
      Serial.println(user_threshold);
      digitalWrite(speakerLedPin, HIGH);
      delay(1000);
      digitalWrite(speakerLedPin, LOW);
    }
  } else if (doc.containsKey("reset")) {
    if (isFullBottleSet == true) {
      isFullBottleSet = false;
      Serial.print("reset: true");
      digitalWrite(speakerLedPin, HIGH);
      delay(1000);
      digitalWrite(speakerLedPin, LOW);
    }
  } else {
    Serial.println("No 'threshold' or 'reset' field found in the message");
  }
}