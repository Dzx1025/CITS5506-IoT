# Smart IV Bag Monitor

## Overview

This project implements a smart monitoring system for IV bags using a TTGO T-Beam v1.2 ESP32, a weight sensor (HX711), and various LEDs for status indication. The system provides real-time monitoring of IV fluid volume, flow rate, and status through MQTT and InfluxDB, with data visualization capabilities.

## Features

- Real-time monitoring of IV bag weight and volume
- Flow rate calculation using Weighted Moving Average (WMA)
- MQTT integration for real-time data publishing and control
- InfluxDB integration for data storage and visualization
- Multiple LED indicators for system status
- Customizable alert thresholds
- Wi-Fi connectivity for data transmission
- Web interface for easy monitoring

## Requirements

### Hardware Requirements

- TTGO T-Beam v1.2 ESP32 (ESP32-based development board)
- HX711 Load Cell Amplifier (for weight measurement)
- Load Cell (to measure the weight of the IV bag)
- LEDs (5 different colors for various status indications)
- Push Button (to set the full bag weight)

### Software Requirements

- Arduino IDE
- Required libraries:
  - WiFi
  - PubSubClient
  - HX711
  - ArduinoJson
  - InfluxDBClient

## MQTT Configuration

### Topic

For patient: `public/ivbag/patientId`:

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
    "minute": 20
  }
}
```

For hospital employees: `private/ctl/ivbag/patientId`

- **threshold** (Number): The warning lowest limit to be set.
- **reset** (Boolean): Whether to stop the speaker alarm and prepare for a new infusion bag.

```json
{
  "threshold": 20,
  "reset": false
}
```

### Mosquitto Configuration

**mosquitto.conf:**

```conf
pid_file /run/mosquitto/mosquitto.pid

persistence true
persistence_location /var/lib/mosquitto/

log_dest file /var/log/mosquitto/mosquitto.log

include_dir /etc/mosquitto/conf.d

# Add
listener 1883
protocol mqtt

listener 8080
protocol websockets

allow_anonymous true

password_file /etc/mosquitto/passwd

acl_file /etc/mosquitto/acl

log_type all
```

**acl:**

```conf
topic readwrite public/#

# Admin
user team40
topic readwrite #
```

**Default admin:**

```conf
Username: team40
Passoword: 123456
```

## Setup Instructions

### Hardware Setup

1. Connect the HX711 to the TTGO T-Beam:
   - DOUT pin to GPIO 13
  - SCK pin to GPIO 14

2. Connect the LEDs:
   - Notification LED: GPIO 25
   - Weight LED: GPIO 32
   - Network LED: GPIO 33
   - Communication LED: GPIO 15
   - Alert LEDs: GPIO 21 and 22

3. Connect the push button to GPIO 2

### Software Setup:

1. Install the required libraries in the Arduino IDE
2. Modify the Wi-Fi SSID, password, MQTT broker details, and InfluxDB details in the code
3. Upload the code to the TTGO T-Beam ESP32 using Arduino IDE

## Usage Instructions
1. Power on the ESP32.
2. Wait for the device to connect to Wi-Fi (Network LED will stop blinking).
3. When the bag is initially full, set the full IV bag weight by pressing the push button (Weight LED will stop blinking).
4. Monitor the IV bag status through MQTT messages and InfluxDB visualizations.
5. Use the MQTT control topic to adjust alert thresholds or reset the system.

## InfluxDB Visualization
To query and visualize data in the InfluxDB Web UI, use the following Flux query:

```bash
from(bucket: "iv_bag")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "monitor variables")
  |> filter(fn: (r) => r._field == "weight")
```
Adjust the time range and add more visualizations as needed in the InfluxDB Web UI.

## Troubleshooting
- If the communication LED is blinking, check your MQTT and InfluxDB connections
- If weight readings seem incorrect, you may need to adjust the calibration_factor in the code
