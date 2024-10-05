import { useState, useEffect, useRef, useCallback } from "react";
import mqtt from "mqtt";

const MQTT_CONFIG = {
  BROKER_ADDRESS:
    process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "wss://test.mosquitto.org:8081",
  PUBLIC_TOPIC: process.env.NEXT_PUBLIC_MQTT_PUBLIC_TOPIC || "public/ivbag/",
  PRIVATE_TOPIC:
    process.env.NEXT_PUBLIC_MQTT_PRIVATE_TOPIC || "private/ctl/ivbag/",
} as const;

const useMqttConnection = () => {
  const [connectStatus, setConnectStatus] = useState<string>("Disconnected");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [sensorData, setSensorData] = useState({
    infusion: {
      level: 100,
      rate: 0.0,
      timeLeft: {
        hour: 999,
        minute: 999,
      },
      alertThreshold: 15,
    },
  });
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  const connect = useCallback(
    (username: string, password: string, patientId: number) => {
      return new Promise<void>((resolve, reject) => {
        if (clientRef.current?.connected) {
          clientRef.current.end();
        }

        console.log(`Connecting to MQTT broker: ${MQTT_CONFIG.BROKER_ADDRESS}`);

        const newClient = mqtt.connect(MQTT_CONFIG.BROKER_ADDRESS, {
          clientId: `patient_${patientId}_${Math.random()
            .toString(16)
            .slice(2, 10)}`,
          username,
          password,
          connectTimeout: 4000,
          reconnectPeriod: 4000,
          path: "/mqtt",
        });

        newClient.on("connect", () => {
          clientRef.current = newClient;
          setConnectStatus("Connected");
          setIsLoggedIn(true);
          console.log(`Connected to server with${username ? "" : "out"} login`);

          newClient.subscribe(
            `${MQTT_CONFIG.PUBLIC_TOPIC}${patientId}`,
            (err) => {
              if (err) {
                console.error("Subscription error:", err);
                reject(new Error("Subscription failed"));
              } else {
                console.log(
                  `Subscribed to topic: ${MQTT_CONFIG.PUBLIC_TOPIC}${patientId}`
                );
                resolve();
              }
            }
          );
        });

        newClient.on("error", (err) => {
          console.error("Connection error:", err);
          setConnectStatus("Error");
          setIsLoggedIn(false);
          reject(err);
        });

        newClient.on("offline", () => {
          setConnectStatus("Offline");
          setIsLoggedIn(false);
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
        });
      });
    },
    []
  );

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
      setConnectStatus("Disconnected");
      setIsLoggedIn(false);
    }
  }, []);

  const reconnect = useCallback(
    (patientId: number) => {
      disconnect();
      connect("", "", patientId).catch((err) =>
        console.error("Reconnection failed:", err)
      );
    },
    [connect, disconnect]
  );

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
      if (isLoggedIn) {
        setSensorData((prev) => ({
          ...prev,
          infusion: { ...prev.infusion, alertThreshold: value },
        }));
        publishMessage(
          MQTT_CONFIG.PRIVATE_TOPIC,
          JSON.stringify({ threshold: value })
        );
      } else {
        console.error("Not logged in. Unable to set alert threshold.");
      }
    },
    [publishMessage, isLoggedIn]
  );

  const setReset = useCallback(
    (value: boolean) => {
      if (isLoggedIn) {
        publishMessage(
          MQTT_CONFIG.PRIVATE_TOPIC,
          JSON.stringify({ reset: value })
        );
      } else {
        console.error("Not logged in. Unable to reset.");
      }
    },
    [publishMessage, isLoggedIn]
  );

  const logout = useCallback(() => {
    disconnect();
  }, [disconnect]);

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
    logout,
    isLoggedIn,
  };
};

export default useMqttConnection;
