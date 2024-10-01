"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import mqtt from "mqtt";

const MQTT_BROKER_URL = "wss://test.mosquitto.org:8081";
const MQTT_TOPIC = "ivbag/40/testnum";

const MqttClient: React.FC = () => {
  const [connectStatus, setConnectStatus] = useState<string>("Disconnected");
  const [waterLevel, setWaterLevel] = useState<number>(100);
  const [alertThreshold, setAlertThreshold] = useState(15);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const isSubscribedRef = useRef<boolean>(false);

  const mqttConnect = useCallback(() => {
    if (clientRef.current?.connected) return;

    setConnectStatus("Connecting");
    const client = mqtt.connect(MQTT_BROKER_URL, {
      clientId: `mqttjs_${Math.random().toString(16).slice(2, 10)}`,
      path: "/mqtt",
      // keepalive: 60, // Ping every 60 seconds
      connectTimeout: 4000,
      reconnectPeriod: 4000,
    });

    clientRef.current = client;

    client.on("connect", () => {
      setConnectStatus("Connected");
      console.log("Connected to MQTT broker");

      if (!isSubscribedRef.current) {
        client.subscribe(MQTT_TOPIC, (err) => {
          if (err) {
            console.error("Subscription error:", err);
          } else {
            console.log(`Subscribed to topic: ${MQTT_TOPIC}`);
            isSubscribedRef.current = true;
          }
        });
      }
    });

    client.on("error", (err) => {
      console.error("Connection error:", err);
      setConnectStatus("Error");
    });

    client.on("offline", () => setConnectStatus("Offline"));

    client.on("message", (topic, message) => {
      // Log raw message data for debugging
      console.log("Message received:", topic, message.toString());

      try {
        const parsedMessage = JSON.parse(message.toString());

        if (
          parsedMessage &&
          typeof parsedMessage.level === "number" &&
          !isNaN(parsedMessage.level)
        ) {
          const level = Math.min(Math.max(parsedMessage.level, 0), 100);
          console.log("Parsed water level:", level);

          // Update the water level state
          setWaterLevel(level);
          // Show a browser notification if water level is below 15%
          if (level < alertThreshold && Notification.permission === "granted") {
            new Notification("Water Level Alert", {
              body: `Water level is low: ${level}%`,
            });
          }
        } else {
          console.error(
            "Invalid message format or missing 'level' field:",
            parsedMessage
          );
        }
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    });

    return () => {
      if (client.connected) {
        client.end();
      }
    };
  }, []);

  useEffect(() => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    mqttConnect();
  }, [mqttConnect]);

  const handleReconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end(true, {}, () => {
        clientRef.current = null;
        mqttConnect();
      });
    } else {
      mqttConnect();
    }
  }, [mqttConnect]);

  return (
    <div className="p-6 flex flex-col items-center">
      <div className="relative w-32 h-64 border-4 border-gray-300 rounded-lg overflow-hidden bg-white">
        <div
          className={`absolute bottom-0 w-full transition-all duration-500 ${
            connectStatus === "Connected" ? "bg-blue-500" : "bg-gray-400"
          }`}
          style={{ height: `${waterLevel}%` }}
        />
      </div>
      <p className="mt-4">Water Level: {waterLevel}%</p>
      <p className="mb-4">
        MQTT Client Status: <strong>{connectStatus}</strong>
      </p>
      <div className="mb-4">
        <label
          htmlFor="alertThreshold"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Alert Threshold (%):
        </label>
        <input
          type="number"
          id="alertThreshold"
          value={alertThreshold}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (!isNaN(value)) {
              setAlertThreshold(value);
            }
          }}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
          aria-label="Alert Threshold"
        />
      </div>
      <button
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
        onClick={handleReconnect}
        aria-label="Reconnect"
      >
        Reconnect
      </button>
    </div>
  );
};

export default MqttClient;
