# Smart IV Bag Monitor

## Overview

This project implements a smart monitoring system for IV bags using a TTGO T-Beam v1.2 ESP32, a weight sensor (HX711), and a 5V non-contact liquid level sensor. The system provides real-time monitoring of IV fluid volume, flow rate, and status through a web interface using WebSocket technology.

## Features

- Real-time monitoring of IV bag weight and volume
- Flow rate calculation
- Web interface for easy monitoring
- Wi-Fi access point for connection
- Real-time data updates using WebSocket

## Requirements

### Hardware Requirements

- TTGO T-Beam v1.2 ESP32 (ESP32-based development board)
- HX711 Load Cell Amplifier (for weight measurement)
- Load Cell (to measure the weight of the IV bag)
- LED (indicates when the full weight is set)
- Push Button (to set the full bag weight)

### Software Requirements

- Arduino IDE
- Required libraries:
  - WiFi
  - PubSubClient
  - HX711

## Topics for MQTT

For patient: `patientId/ivbag/public`:

- **level** (Number): The percentage of infusion bag remaining.
- **rate** (Number): Flow rates (mL/hr).
- **timeLeft**: Estimate of remaining time.
  - **hour** (Number)
  - **minute** (Number)

```json
{
  "level": 95,
  "rate": 23.52,
  "timeLeft": {
    "hour": 2,
    "minutes": 20
  }
}
```

For hospital employees: `patientId/ivbag/private/ctl`

- **threshold** (Number): The warning lowest limit to be set.
- **reset** (Boolean): Whether to stop the speaker alarm and prepare for a new infusion bag.

```json
{
  "threshold": 20,
  "reset": false
}
```

## Setup Instructions

### Hardware Setup

1. Hardware Connections:

   - Connect the HX711 to the TTGO T-Beam:
     - DOUT pin to GPIO 13
     - SCK pin to GPIO 14
   - Connect the a LED to GPIO 25 with a resistance.
   - Connect the push button to GPIO 2.

2. Software Setup:

   - Install the required libraries in the Arduino IDE:
   - PubSubClient.h for MQTT communication
   - HX711.h for weight sensor interaction
   - Modify the Wi-Fi SSID, password in the code to match the environment.
   - Upload the code to the TTGO T-Beam ESP32 using Arduino IDE.

### Frontend Setup

- Frontend: The web interface displays real-time IV fluid status and updates.

## Usage Instructions

1. Power on the ESP32.
2. When the bag is initially full, set the full IV bag weight by holding down the push button until the LED lights up.
3. Monitor the IV bag through the provided web interface.

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
