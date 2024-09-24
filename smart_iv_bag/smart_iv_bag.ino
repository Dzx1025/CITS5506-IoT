#include <WiFi.h>
#include <PubSubClient.h>
#include <HX711.h>

// Wi-Fi settings
const char* ssid = "*******";
const char* password = "********";

// MQTT broker details
const char* mqtt_server = "test.mosquitto.org";
const int mqtt_port = 1883;
const char* mqtt_topic = "ivbag/40/testnum";

// MQTT client and WiFi client instances
WiFiClient espClient;
PubSubClient client(espClient);

HX711 scale;
const int DOUT = 13;
const int HX711_SCK = 14;

float calibration_factor = -7050;
float full_bottle_weight = 500; // Default value, can be changed via button
bool isFullBottleSet = false;
int level = 100;

// Pin for the button to set full bottle weight
const int buttonPin = 2;  
int buttonState = 0;       

// Pin for the LED
const int ledPin = 25;  

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
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  buttonState = digitalRead(buttonPin);

  // Check if button is pressed to set full bottle weight
  if (buttonState == LOW) {
    full_bottle_weight = -scale.get_units();
    isFullBottleSet = true;
    Serial.println("Full bottle weight set to: " + String(full_bottle_weight));

    // Turn on LED for 1 second after full bottle weight is set
    digitalWrite(ledPin, HIGH); 
    delay(1000);             
    digitalWrite(ledPin, LOW);

    delay(500); // Debounce
  }

  // Read weight from sensor
  float current_weight = -scale.get_units();
  Serial.print("currentweight: ");
  Serial.println(current_weight);

  if (!isFullBottleSet) {
    level = 100;
    Serial.println("Please set the full bottle weight by pressing the button.");
  } else if (full_bottle_weight != 0) {
    // Calculate level as a percentage
    level = (current_weight / full_bottle_weight) * 100;
    level = constrain(level, 0, 100); // Ensure level is between 0 and 100
  } else {
    level = 0;
  }

  // Publish level data to the topic
  String payload = "{\"level\": " + String(level) + "}";
  Serial.print("Publishing message: ");
  Serial.println(payload);
  client.publish(mqtt_topic, payload.c_str());

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
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "TTGO-TBeam-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 2 seconds");
      delay(2000);
    }
  }
}