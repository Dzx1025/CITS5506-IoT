"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import mqtt from "mqtt";

const MQTT_BROKER_URL = "wss://test.mosquitto.org:8081";
const MQTT_TOPIC = "ivbag/40/testnum";

const MqttClient: React.FC = () => {
  const [connectStatus, setConnectStatus] = useState<string>("Disconnected");
  const [waterLevel, setWaterLevel] = useState<number>(100);
  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const isSubscribedRef = useRef<boolean>(false);

  const mqttConnect = useCallback(() => {
    if (clientRef.current?.connected) return;

    setConnectStatus("Connecting");
    const client = mqtt.connect(MQTT_BROKER_URL, {
      clientId: `mqttjs_${Math.random().toString(16).slice(2, 10)}`,
      path: "/mqtt",
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 4000,
    });

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
        } else {
          console.error(
            "Invalid message format or missing 'level' field:",
            parsedMessage,
          );
        }
      } catch (error) {
        console.error("Error parsing MQTT message:", error);
      }
    });

    clientRef.current = client;

    return () => {
      if (client.connected) {
        client.end();
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = mqttConnect();
    return () => {
      cleanup?.();
      clientRef.current = null;
    };
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
          className="absolute bottom-0 w-full bg-blue-500 transition-all duration-500"
          style={{ height: `${waterLevel}%` }}
        />
      </div>
      <p className="mt-4">Water Level: {waterLevel}%</p>
      <p className="mb-4">
        MQTT Client Status: <strong>{connectStatus}</strong>
      </p>
      <button
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
        onClick={handleReconnect}
      >
        Reconnect
      </button>
    </div>
  );
};

export default MqttClient;
