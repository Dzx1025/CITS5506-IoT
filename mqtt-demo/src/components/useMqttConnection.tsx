"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import mqtt from "mqtt";
import { alertNotify } from "@/components/toast";

const MQTT_CONFIG = {
  BROKER_ADDRESS:
    process.env.APP_MQTT_BROKER_URL || "wss://test.mosquitto.org:8081",
  PUBLIC_TOPIC: process.env.APP_MQTT_TOPIC || "ivbag/public",
  PRIVATE_TOPIC: process.env.APP_MQTT_THRESHOLD_TOPIC || "ivbag/private/ctl",
};

const useMqttConnection = (initialAlertThreshold: number) => {
  const [connectStatus, setConnectStatus] = useState<string>("Disconnected");
  const [waterLevel, setWaterLevel] = useState<number>(100);
  const [alertThreshold, setAlertThreshold] = useState<number>(
    initialAlertThreshold
  );

  const clientRef = useRef<mqtt.MqttClient | null>(null);
  const alertThresholdRef = useRef<number>(alertThreshold);

  // Update the alertThresholdRef whenever alertThreshold changes
  useEffect(() => {
    alertThresholdRef.current = alertThreshold;
  }, [alertThreshold]);

  const mqttConnect = useCallback(() => {
    if (clientRef.current?.connected) return;

    setConnectStatus("Connecting");

    const newClient = mqtt.connect(MQTT_CONFIG.BROKER_ADDRESS, {
      clientId: `mqttjs_${Math.random().toString(16).slice(2, 10)}`,
      keepalive: 60,
      connectTimeout: 4000,
      reconnectPeriod: 4000,
    });

    clientRef.current = newClient;

    newClient.on("connect", () => {
      setConnectStatus("Connected");
      console.log("Connected to MQTT broker");

      newClient.subscribe(MQTT_CONFIG.PUBLIC_TOPIC, (err) => {
        if (err) {
          console.error("Subscription error:", err);
        } else {
          console.log(`Subscribed to topic: ${MQTT_CONFIG.PUBLIC_TOPIC}`);
        }
      });
    });

    newClient.on("error", (err) => {
      console.error("Connection error:", err);
      setConnectStatus("Error");
    });

    newClient.on("offline", () => setConnectStatus("Offline"));

    newClient.on("message", (topic, message) => {
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

          setWaterLevel(level);

          // Use the latest alertThreshold value from the ref
          if (level < alertThresholdRef.current) {
            alertNotify(`Water level is low: ${level}%`);
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
  }, []); // No dependencies

  useEffect(() => {
    mqttConnect();

    return () => {
      if (clientRef.current?.connected) {
        clientRef.current.end();
      }
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

  const handleAlertThresholdChange = useCallback(
    (value: number) => {
      if (!isNaN(value) && value >= 0 && value <= 100) {
        setAlertThreshold(value);

        if (clientRef.current?.connected) {
          const message = JSON.stringify({ threshold: value });
          clientRef.current.publish(
            MQTT_CONFIG.PRIVATE_TOPIC,
            message,
            (err) => {
              if (err) {
                console.error("Failed to publish threshold:", err);
              } else {
                console.log(`Published alert threshold: ${message}`);
              }
            }
          );
        } else {
          console.error(
            "MQTT client not connected. Unable to publish threshold."
          );
        }
      }
    },
    [setAlertThreshold]
  );

  return {
    connectStatus,
    waterLevel,
    alertThreshold,
    handleReconnect,
    handleAlertThresholdChange,
  };
};

export default useMqttConnection;
