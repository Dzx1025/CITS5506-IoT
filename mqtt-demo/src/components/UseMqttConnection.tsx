import { useState, useEffect, useRef, useCallback } from "react";
import mqtt from "mqtt";

const MQTT_CONFIG = {
  BROKER_ADDRESS:
    process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "wss://test.mosquitto.org:8081",
  PUBLIC_TOPIC: process.env.NEXT_PUBLIC_MQTT_PUBLIC_TOPIC || "40/ivbag/public",
  PRIVATE_TOPIC:
    process.env.NEXT_PUBLIC_MQTT_PRIVATE_TOPIC || "40/ivbag/private/ctl",
} as const;

const useMqttConnection = () => {
  const [connectStatus, setConnectStatus] = useState<string>("Disconnected");
  const [sensorData, setSensorData] = useState({
    infusion: {
      level: 100,
      rate: 0.0,
      timeLeft: {
        hour: 0,
        minute: 0,
      },
      alertThreshold: 15,
    },
  });
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  const connect = useCallback(
    (username: string, password: string, patientId: string) => {
      if (clientRef.current?.connected) return;

      setConnectStatus("Connecting");

      const newClient = mqtt.connect(MQTT_CONFIG.BROKER_ADDRESS, {
        clientId: `patient_${patientId}_${Math.random()
          .toString(16)
          .slice(2, 10)}`,
        username,
        password,
        connectTimeout: 4000,
        reconnectPeriod: 4000,
      });

      newClient.on("connect", () => {
        clientRef.current = newClient;
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

      newClient.on("offline", () => {
        setConnectStatus("Offline");
      });

      newClient.on("message", (topic, message) => {
        console.log("Message received:", topic, message.toString());
        try {
          const parsedMessage = JSON.parse(message.toString());
          setSensorData((prev) => ({
            ...prev,
            infusion: {
              ...prev.infusion,
              level: parsedMessage.level ?? prev.infusion.level,
              rate: parsedMessage.rate ?? prev.infusion.rate,
              timeLeft: parsedMessage.timeLeft ?? prev.infusion.timeLeft,
            },
          }));
        } catch (error) {
          console.error("Error parsing MQTT message:", error);
        }
        console.log("Sensor data updated:", sensorData);
      });
    },
    []
  );

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
      setConnectStatus("Disconnected");
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect("", "", ""); // You might want to store these values or pass them from the UI
  }, [connect, disconnect]);

  const publishMessage = useCallback((topic: string, message: string) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish(topic, message, (err) => {
        if (err) {
          console.error("Failed to publish message:", err);
        } else {
          console.log(`Published message to ${topic}: ${message}`);
        }
      });
    } else {
      console.error("MQTT client not connected. Unable to publish message.");
    }
  }, []);

  const setAlertThreshold = useCallback(
    (value: number) => {
      setSensorData((prev) => ({
        ...prev,
        infusion: { ...prev.infusion, alertThreshold: value },
      }));
      publishMessage(
        MQTT_CONFIG.PRIVATE_TOPIC,
        JSON.stringify({ threshold: value })
      );
    },
    [publishMessage]
  );

  const setReset = useCallback(
    (value: boolean) => {
      publishMessage(
        MQTT_CONFIG.PRIVATE_TOPIC,
        JSON.stringify({ reset: value })
      );
    },
    [publishMessage]
  );

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectStatus,
    sensorData,
    connect,
    reconnect,
    setAlertThreshold,
    setReset,
  };
};

export default useMqttConnection;
