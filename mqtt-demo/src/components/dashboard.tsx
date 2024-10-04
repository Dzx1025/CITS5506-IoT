"use client";

import React from "react";
import { Droplet } from "lucide-react";
import { Toaster } from "react-hot-toast";
import useMqttConnection from "@/components/useMqttConnection";

const defaultAlertThreshold = 15;

const Dashboard: React.FC = () => {
  const {
    connectStatus,
    waterLevel,
    alertThreshold,
    handleReconnect,
    handleAlertThresholdChange,
  } = useMqttConnection(defaultAlertThreshold);

  const isConnected = connectStatus === "Connected";
  const waterLevelTextClass =
    connectStatus === "Connected"
      ? waterLevel > alertThreshold
        ? "text-blue-500"
        : "alert"
      : "text-gray-300";
  const waterLevelBgClass = isConnected ? "bg-blue-500" : "bg-gray-400";
  const statusTextClass = isConnected ? "text-green-500" : "text-red-500";

  return (
    <div className="rounded-xl shadow-lg p-4 max-w-md w-full flex-col items-center">
      <Toaster />
      <div className="flex justify-center mb-8">
        <div className="relative w-32 h-96 border-4 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <div
            className={`absolute bottom-0 w-full transition-all duration-500 ${waterLevelBgClass}`}
            style={{ height: `${waterLevel}%` }}
          >
            <Droplet className="text-white w-full h-12 mt-2 animate-bounce" />
          </div>
        </div>
      </div>

      <div className="text-center mb-6">
        <p className={`water-level ${waterLevelTextClass}`}>
          Water Level: {waterLevel}%
        </p>
        <p className={`text-sm ${statusTextClass}`}>
          MQTT Client Status: <strong>{connectStatus}</strong>
        </p>
      </div>

      <div className="mb-6">
        <label
          htmlFor="alertThreshold"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Alert Threshold (%)
        </label>
        <input
          type="number"
          id="alertThreshold"
          defaultValue={alertThreshold}
          onChange={(e) =>
            handleAlertThresholdChange(
              e.target.value === ""
                ? defaultAlertThreshold
                : Number(e.target.value)
            )
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <button
        onClick={handleReconnect}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
      >
        Reconnect
      </button>
    </div>
  );
};

export default Dashboard;
