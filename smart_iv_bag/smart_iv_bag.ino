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

const char *mqtt_server = "test.mosquitto.org";
const int mqtt_port = 1883;
const char *mqtt_topic = "public/ivbag/40";
const char *mqtt_threshold_topic = "private/ctl/ivbag/";

// InfluxDB details
// use 'ifconfig | grep inet' to check local internet ip
const char *influxdb_url = "http://192.168.1.5:8086";
// const char *influxdb_db_name = "your_database";
// const char *influxdb_user = "your_username";
// const char *influxdb_password = "your_password";
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
float flowRate = 0;  // mL per hour
int timeLeftHours = 999;
int timeLeftMinutes = 999;

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
  mqtt_client.setCallback(callback);  // Set the callback function for incoming MQTT messages

  if (mqtt_client.connected()) {
    Serial.println("Connected to MQTT Broker!");
    mqtt_client.subscribe(mqtt_threshold_topic);
  } else {
    Serial.println("Failed to connect to MQTT Broker.");
  }

  setupInfluxDB();
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
    calculateLevel(current_weight);

    // Calculate flow rate and time left every 3 seconds, to avoid the effect of noise
    if (currentMillis - previousMillis >= 3000) {
      previousMillis = currentMillis;
      calculateFlowRate(current_weight);
      calculateTimeLeft(current_weight, flowRate);
    }

    publishData();
  }

  Serial.print("current threshold:");
  Serial.println(user_threshold);

  // Check the weight level against the user threshold, blink when level is under threshold
  if (level < user_threshold) {
    for (int i = 0; i < 2; i++) {
    digitalWrite(alertLedPin1, HIGH);
    digitalWrite(alertLedPin2, LOW);
    digitalWrite(speakerLedPin, LOW);
    delay(250);
    digitalWrite(alertLedPin1, LOW);
    digitalWrite(alertLedPin2, HIGH);
    digitalWrite(speakerLedPin, HIGH);
    delay(250);
    }
  } else {
    digitalWrite(alertLedPin1, LOW);
    digitalWrite(alertLedPin2, LOW);
    digitalWrite(speakerLedPin, LOW);
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
    if (mqtt_client.connect(clientId.c_str())) {
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
  // db_client.setConnectionParamsV1(influxdb_url, influxdb_db_name, influxdb_user, influxdb_password);
  

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

void calculateFlowRate(float current_weight) {
  unsigned long currentTime = millis();
  float weightDifference = previousWeight - current_weight;
  float timeDifference = (currentTime - previousWeightTime) / 3600000.0;  // Convert to hours

  if (previousWeight > 0) {
    flowRate = (weightDifference / timeDifference);  // Assuming 1g = 1mL
    flowRate = max(flowRate, 0);  // Ensure flow rate is not negative
  } else { 
    flowRate = 0;
  }

  previousWeight = current_weight;
  previousWeightTime = currentTime;
}

void calculateTimeLeft(float current_weight, float flowRate) {
  if (flowRate > 0) {
    float remainingTimeHours = current_weight / flowRate;
    timeLeftHours = int(remainingTimeHours);
    timeLeftMinutes = (remainingTimeHours - timeLeftHours) * 60;
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
  // Serial.println("Point created with measurement 'monitor variables'");

  sensorData.addField("weight", level);
  // Serial.print("Added field 'weight' with value: ");
  // Serial.println((float)level);

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
    user_threshold = doc["threshold"];
    Serial.print("User set threshold: ");
    Serial.println(user_threshold);
    digitalWrite(speakerLedPin, HIGH);
    delay(200);
    digitalWrite(speakerLedPin, LOW);
  } else if (doc.containsKey("reset")) {
    isFullBottleSet = false;
    Serial.print("reset: true");
    digitalWrite(speakerLedPin, HIGH);
    delay(200);
    digitalWrite(speakerLedPin, LOW);
  } else {
    Serial.println("No 'threshold' or 'reset' field found in the message");
  }
}