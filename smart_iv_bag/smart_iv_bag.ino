#include <ArduinoJson.h>
#include <HX711.h>
#include <InfluxDbClient.h>
#include <PubSubClient.h>
#include <WiFi.h>

// Wi-Fi settings
const char *ssid = "*******";
const char *password = "********";

WiFiClient wifi_client;

// MQTT broker details
PubSubClient mqtt_client(wifi_client);

// use 'ifconfig | grep inet' to check local internet ip
const char *mqtt_server = "172.20.10.4";
const int mqtt_port = 1883;
const char *mqtt_topic = "public/ivbag/40";
const char *mqtt_threshold_topic = "private/ctl/ivbag/40";
const char *mqtt_username = "*******";
const char *mqtt_password = "*******";

// InfluxDB details
const char *influxdb_url = "http://172.20.10.4:8086";
const char *influxdb_org = "your_org";
const char *influxdb_bucket = "your_database";
const char *influxdb_token = "your_token";

InfluxDBClient db_client(influxdb_url, influxdb_org, influxdb_bucket, influxdb_token);

// HX711 settings
HX711 scale;
const int DOUT = 13;
const int HX711_SCK = 14;

float calibration_factor = -2111.5;
float full_bottle_weight = 500;  // Default value, can be changed via button
bool isFullBottleSet = false;
float lastValidWeight = full_bottle_weight;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 500;  // 500 milliseconds debounce delay

// Variables for flow rate and time left calculation
float previousWeight = 0;
unsigned long previousWeightTime = 0;
unsigned long lastCalculationTime = 0;
const unsigned long calculationInterval = 5000; // 5s
float weightSum = 0;
int weightCount = 0;
float averageWeight = 0;
float flowRate = 0;  // mL per hour
int timeLeftHours = 999;
int timeLeftMinutes = 999;

// Variables for WMA flow rate calculation
const int WMA_WINDOW_SIZE = 6;
float flowRateHistory[WMA_WINDOW_SIZE];
int historyIndex = 0;


// Pin for the button to set full bottle weight
const int buttonPin = 2;
int buttonState = 0;

// Pin for the LED
const int speakerLedPin = 25;
const int weightLedPin = 32;  // LED for full weight setting
const int networkLedPin = 33; // LED for network connection status
const int communicationLedPin = 15;
const int alertLedPin1 = 21;
const int alertLedPin2 = 22;

// Level of the IV bag
int level = 100;

// Variables for LED blinking
unsigned long previousMillis = 0;
const long interval = 500;  // Interval at which to blink (milliseconds)
int ledState = LOW;

int user_threshold = 15;  // Default threshold
int previous_threshold = 15; 

unsigned long lastInfluxDBWrite = 0;
const unsigned long influxDBWriteInterval = 5000; // 5 seconds

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

  mqtt_client.setServer(mqtt_server, mqtt_port);
  mqtt_client.setCallback(callback);  // Set the callback function for incoming MQTT 
  
  if (mqtt_client.connect("ESP32Client", mqtt_username, mqtt_password)) {
  Serial.println("Connected to MQTT Broker!");
  mqtt_client.subscribe(mqtt_threshold_topic);
  } else {
    Serial.println("Failed to connect to MQTT Broker.");
  }

  setupInfluxDB();

  // initialize flow rate history
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

// Function to connect to Wi-Fi
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

// Function to reconnect to MQTT broker if the connection is lost
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

bool isButtonPressed() {
  return digitalRead(buttonPin) == LOW;
}

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

void setFullBottleWeight() {
  full_bottle_weight = readWeightFromSensor();
  isFullBottleSet = true;
  Serial.println("Full bottle weight set to: " + String(full_bottle_weight));

  // Turn on LED for 1 second after full bottle weight is set
  digitalWrite(speakerLedPin, HIGH);
  delay(1000);
  digitalWrite(speakerLedPin, LOW);
}

void calculateLevel(float current_weight) {
  if (full_bottle_weight != 0) {
    level = (current_weight / full_bottle_weight) * 100;
    level = constrain(level, 0, 100);  // Ensure level is between 0 and 100
  } else {
    level = 0;
  }
}

void calculateFlowRate(float averageWeight) {
  static float previousAverageWeight = 0;
  static unsigned long previousCalculationTime = 0;

  unsigned long currentTime = millis();
  float timeDifference = (currentTime - previousCalculationTime) / 3600000.0;  // Convert to hours

  float instantFlowRate = 0;
  if (previousAverageWeight > 0 && timeDifference > 0) {
    instantFlowRate = (previousAverageWeight - averageWeight) / timeDifference; // Assuming 1g = 1mL
    instantFlowRate = max(instantFlowRate, 0.0f);  // Ensure flow rate is not negative
  }

  updateFlowRateHistory(instantFlowRate);

  // calculate WMA
  float totalWeight = 0;
  float weightedFlowRate = 0;

  for (int i = 0; i < WMA_WINDOW_SIZE; i++) {
    int index = (historyIndex - i + WMA_WINDOW_SIZE) % WMA_WINDOW_SIZE;
    float weight = WMA_WINDOW_SIZE - i;
    weightedFlowRate += flowRateHistory[index] * weight;
    totalWeight += weight;
  }

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

void updateFlowRateHistory(float instantFlowRate) {
  flowRateHistory[historyIndex] = instantFlowRate;
  historyIndex = (historyIndex + 1) % WMA_WINDOW_SIZE;
}

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

    // use the flux query as follow to show the data in influxdb Web UI 
    // from(bucket: "iv_bag")
    //  |> range(start: -5m)
    //  |> filter(fn: (r) => r._measurement == "monitor variables")
    //  |> filter(fn: (r) => r._field == "weight")
}

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