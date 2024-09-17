# Smart IV Bag Monitor

## Overview

This project implements a smart monitoring system for IV bags using a TTGO T-Beam v1.2 ESP32, a weight sensor (HX711), and a 5V non-contact liquid level sensor. The system provides real-time monitoring of IV fluid volume, flow rate, and status through a web interface using WebSocket technology.

## Features

- Real-time monitoring of IV bag weight and volume
- Flow rate calculation
- Web interface for easy monitoring
- Wi-Fi access point for connection
- Real-time data updates using WebSocket
- LED indicators for different volume levels

## Hardware Requirements

- TTGO T-Beam v1.2 ESP32
- HX711 weight sensor
- 5V non-contact liquid level sensor
- 3 LEDs (for low, medium, and high volume indication)

## Software Requirements

- Arduino IDE
- Required libraries:
  - WiFi
  - WebSocketsServer
  - ArduinoJson
  - HX711

## Setup Instructions

### Hardware Setup

1. Connect the HX711 weight sensor to the ESP32:
   - DOUT pin to GPIO 16
   - SCK pin to GPIO 17
2. Connect the 5V non-contact liquid level sensor to GPIO 34 of the ESP32.
3. Connect the LEDs:
   - Low volume LED to GPIO 25
   - Medium volume LED to GPIO 26
   - High volume LED to GPIO 27
4. Ensure all connections are secure.

### Software Setup

1. Open the `smart_iv_bag.ino` file in Arduino IDE.
2. Install all required libraries through the Arduino Library Manager.
3. Upload the code to your TTGO T-Beam v1.2 ESP32.

### Frontend Setup

1. Save the provided HTML file on your computer or host it on a web server.

## Usage Instructions

1. Power on the ESP32.
2. Connect to the Wi-Fi network created by the ESP32:
   - SSID: "SmartIVBag"
   - Password: "12345678"
3. Open a web browser and navigate to http://192.168.1.1
4. The web interface will display:
   - A graphical representation of the IV bag
   - Current status (On/Off)
   - Current fluid volume percentage
   - Current flow rate (mL/hour)
5. The information updates in real-time through the WebSocket connection (not yet finalized).

## Data Interpretation

- Status "On" indicates that the system detects fluid flow.
- Volume percentage shows the amount of fluid remaining in the IV bag.
- Flow rate indicates the rate at which fluid is flowing out.
- LED indicators:
  - Low (red): Volume < 20%
  - Medium (yellow): Volume between 20% and 80%
  - High (green): Volume > 80%

## TODO
- Speaker Alarm: Design and implement alarm sounds when low volume.
    - Implement alert system for critical volume levels or flow rate changes
    - Add speaker alarm for audible alerts


## Possible Future Improvements
- Personalized Threshold Settings
   - Develop a user interface for customizing level thresholds

- Data Management System
   - Select and integrate a suitable database system (e.g., SQLite for local storage or a cloud-based solution) to store IV bag monitoring data
   - Implement data logging functionality to periodically save monitoring data for viewing and analyzing historical data

- Patient Management System
   - Implement a tagging system to associate IV bags with patient information
   - Design a data structure for storing patient and IV bag information
   - Create a user interface for adding, editing, and viewing patient information
