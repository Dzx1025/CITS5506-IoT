import { useState, useCallback, useEffect, useRef } from "react";
import mqtt, { MqttClient } from "mqtt";

const MQTT_CONFIG = {
  BROKER_ADDRESS:
    process.env.NEXT_PUBLIC_MQTT_BROKER_URL || "wss://test.mosquitto.org:8081",
  PUBLIC_TOPIC: process.env.NEXT_PUBLIC_MQTT_PUBLIC_TOPIC || "public/ivbag/",
  PRIVATE_TOPIC:
    process.env.NEXT_PUBLIC_MQTT_PRIVATE_TOPIC || "private/ctl/ivbag/",
} as const;

const DEFAULT_SENSOR_DATA = {
  infusion: {
    level: 100,
    rate: 0.0,
    timeLeft: {
      hour: 999,
      minute: 999,
    },
    alertThreshold: 15,
  },
};

type SensorData = typeof DEFAULT_SENSOR_DATA;
type LoginType = "anonymous" | "user";

interface ConnectionResult {
  success: boolean;
  error?: string;
}

interface UseMqttConnectionResult {
  connectStatus: string;
  sensorData: SensorData;
  connect: (
    username: string,
    password: string,
    patientId: number
  ) => Promise<ConnectionResult>;
  reconnect: (newPatientId?: number) => Promise<ConnectionResult>;
  setAlertThreshold: (threshold: number) => Promise<boolean>;
  setReset: (reset: boolean) => Promise<boolean>;
  disconnect: () => void;
  resetSensorData: () => void;
  isAnonymous: boolean;
}

export function useMqttConnection(): UseMqttConnectionResult {
  const [connectStatus, setConnectStatus] = useState<string>("Disconnected");
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const clientRef = useRef<MqttClient | null>(null);
  const patientIdRef = useRef<number | null>(null);

  const connect = useCallback(
    (
      username: string,
      password: string,
      patientId: number
    ): Promise<ConnectionResult> => {
      return new Promise((resolve) => {
        if (clientRef.current) {
          clientRef.current.end();
        }

        setConnectStatus("Connecting");
        patientIdRef.current = patientId;

        const loginType: LoginType =
          username && password ? "user" : "anonymous";
        setIsAnonymous(loginType === "anonymous");

        const client = mqtt.connect(MQTT_CONFIG.BROKER_ADDRESS, {
          username: username || undefined,
          password: password || undefined,
          path: "/ws",
        });

        client.on("connect", () => {
          setConnectStatus("Connected");
          console.log(`Connected to ${MQTT_CONFIG.BROKER_ADDRESS}`);
          client.subscribe(`${MQTT_CONFIG.PUBLIC_TOPIC}${patientId}`);
          console.log(`Subscribed to ${MQTT_CONFIG.PUBLIC_TOPIC}${patientId}`);
          resolve({ success: true });
        });

        client.on("message", (topic, message) => {
          console.log("Received message:", message.toString());
          try {
            const data = JSON.parse(message.toString());
            setSensorData((prevData) => ({
              ...prevData,
              infusion: {
                ...prevData.infusion,
                level: data.level,
                rate: data.rate,
                timeLeft: data.timeLeft,
              },
            }));
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        });

        client.on("error", (err) => {
          console.error("MQTT connection error:", err);
          setConnectStatus("Error");
          if (err.message.includes("Not authorized")) {
            resolve({ success: false, error: "Authentication failed" });
          } else {
            resolve({ success: false, error: "Connection error" });
          }
        });

        client.on("close", () => {
          setConnectStatus("Disconnected");
        });

        client.on("offline", () => {
          setConnectStatus("Offline");
        });

        clientRef.current = client;
      });
    },
    []
  );

  const reconnect = useCallback(
    (newPatientId?: number): Promise<ConnectionResult> => {
      if (clientRef.current) {
        clientRef.current.end();
      }
      if (newPatientId !== undefined) {
        patientIdRef.current = newPatientId;
      }
      return connect("", "", patientIdRef.current!);
    },
    [connect]
  );

  const setAlertThreshold = useCallback(
    (threshold: number): Promise<boolean> => {
      return new Promise((resolve) => {
        if (
          !isAnonymous &&
          clientRef.current &&
          clientRef.current.connected &&
          patientIdRef.current
        ) {
          clientRef.current.publish(
            `${MQTT_CONFIG.PRIVATE_TOPIC}${patientIdRef.current}`,
            JSON.stringify({ threshold }),
            { qos: 1 },
            (error) => {
              if (error) {
                console.error("Failed to set alert threshold:", error);
                resolve(false);
              } else {
                console.log("Alert threshold set successfully");
                resolve(true);
              }
            }
          );
        } else {
          console.log(
            "Failed to set alert threshold: Not connected or anonymous"
          );
          resolve(false);
        }
      });
    },
    [isAnonymous]
  );

  const setReset = useCallback(
    (reset: boolean): Promise<boolean> => {
      return new Promise((resolve) => {
        if (
          !isAnonymous &&
          clientRef.current &&
          clientRef.current.connected &&
          patientIdRef.current
        ) {
          clientRef.current.publish(
            `${MQTT_CONFIG.PRIVATE_TOPIC}${patientIdRef.current}`,
            JSON.stringify({ reset }),
            { qos: 1 }, // Make sure the message is delivered
            (error) => {
              if (error) {
                console.error("Failed to set reset:", error);
                resolve(false);
              } else {
                console.log("Reset set successfully");
                resolve(true);
              }
            }
          );
        } else {
          console.log("Failed to set reset: Not connected or anonymous");
          resolve(false);
        }
      });
    },
    [isAnonymous]
  );

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.end();
      clientRef.current = null;
    }
    setConnectStatus("Disconnected");
    setIsAnonymous(true);
  }, []);

  const resetSensorData = useCallback(() => {
    setSensorData(DEFAULT_SENSOR_DATA);
  }, []);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);

  return {
    connectStatus,
    sensorData,
    connect,
    reconnect,
    setAlertThreshold,
    setReset,
    disconnect,
    resetSensorData,
    isAnonymous,
  };
}

export default useMqttConnection;
