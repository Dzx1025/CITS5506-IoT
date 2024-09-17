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
String state = "on";
float flowRate = 0;

// Variables for flow rate calculation
unsigned long lastMeasurementTime = 0;
int lastVolume = 100;

void setup() {
  Serial.begin(115200);

  // Initialize HX711
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);

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

  // Initialize lastMeasurementTime
  lastMeasurementTime = millis();
}

void loop() {
  webSocket.loop();
  updateSensorData();
  sendData();
  delay(100);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      break;
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
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
}

void updateSensorData() {
  // Update weight
  if (scale.is_ready()) {
    weight = scale.get_units();
  }

  // Update volume
  // TODO: Implement a more sophisticated method to determine volume
  int liquidLevel = analogRead(LIQUID_LEVEL_PIN);
  volume = map(liquidLevel, 0, 4095, 0, 100);

  // Control LED based on liquid level
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

  // Update state
  // TODO: Implement a more sophisticated method to determine state
  state = (weight > 0 && volume > 0) ? "on" : "off";

  // Calculate flow rate
  unsigned long currentTime = millis();
  unsigned long timeDifference = currentTime - lastMeasurementTime;

  if (timeDifference >= 60000) { // Calculate flow rate every minute
    int volumeDifference = lastVolume - volume;
    
    // Assuming 1% volume change is equivalent to 1 mL
    // and converting the time difference from milliseconds to hours
    flowRate = (volumeDifference * 60.0) / (timeDifference / 1000.0 / 3600.0);

    lastVolume = volume;
    lastMeasurementTime = currentTime;
  }
}