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
const char *mqtt_topic = "ivbag/40/testnum";

// InfluxDB details
const char *influxdb_url = "http://localhost:8086";
const char *influxdb_db_name = "your_database";
const char *influxdb_user = "your_username";
const char *influxdb_password = "your_password";

InfluxDBClient db_client(influxdb_url, influxdb_db_name);

// HX711 settings
HX711 scale;
const int DOUT = 13;
const int HX711_SCK = 14;

float calibration_factor = -7050;
float full_bottle_weight = 500;  // Default value, can be changed via button
bool isFullBottleSet = false;
float lastValidWeight = full_bottle_weight;
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 500;  // 500 milliseconds debounce delay

// Pin for the button to set full bottle weight
const int buttonPin = 2;
int buttonState = 0;

// Pin for the LED
const int ledPin = 25;

// Level of the IV bag
int level = 100;

void setup() {
  Serial.begin(115200);

  // Initialize HX711
  scale.begin(DOUT, HX711_SCK);
  scale.set_scale(calibration_factor);
  scale.tare();

  // Set up the button
  pinMode(buttonPin, INPUT_PULLUP);
  // Set up the LED
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  setup_wifi();
  mqtt_client.setServer(mqtt_server, mqtt_port);

  setupInfluxDB();
}

void loop() {
  if (!mqtt_client.connected()) {
    reconnect();
  }
  mqtt_client.loop();

  buttonState = digitalRead(buttonPin);

  // Check if button is pressed to set full bottle weight
  if (isButtonPressed()) {
    setFullBottleWeight();
  }

  // Read weight from sensor
  float current_weight = readWeightFromSensor();

  calculateLevel(current_weight);
  if (isFullBottleSet) {
    publishLevelData();
  }

  delay(1000);
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
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt_client.state());
      Serial.println(" try again in 2 seconds");
      delay(2000);
    }
  }
}

void setupInfluxDB() {
  db_client.setConnectionParamsV1(influxdb_url, influxdb_db_name, influxdb_user, influxdb_password);

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
  digitalWrite(ledPin, HIGH);
  delay(1000);
  digitalWrite(ledPin, LOW);
}

void calculateLevel(float current_weight) {
  if (!isFullBottleSet) {
    level = 100;
    Serial.println("Please set the full bottle weight by pressing the button.");
  } else if (full_bottle_weight != 0) {
    level = (current_weight / full_bottle_weight) * 100;
    level = constrain(level, 0, 100);  // Ensure level is between 0 and 100
  } else {
    level = 0;
  }
}

void publishLevelData() {
  // Create a JSON document
  JsonDocument data;
  data["level"] = level;
  // Serialize JSON document to string
  String payload;
  serializeJson(data, payload);

  Serial.print("Publishing message: ");
  Serial.println(payload);
  mqtt_client.publish(mqtt_topic, payload.c_str());

  // Write data to InfluxDB
  writeDataToInfluxDB(level);
}

void writeDataToInfluxDB(int level) {
  Point sensorData("monitor variables");
  sensorData.addField("weight", level);

  if (db_client.writePoint(sensorData)) {
    Serial.println("Data written to InfluxDB");
  } else {
    Serial.print("InfluxDB write failed: ");
    Serial.println(db_client.getLastErrorMessage());
  }
}
