"use client";

import React from "react";
import { Toaster } from "react-hot-toast";
import useMqttConnection from "@/components/useMqttConnection";

const WaterLevelIndicator: React.FC<{
  level: number;
  isConnected: boolean;
}> = ({ level, isConnected }) => (
  <div className="relative w-32 h-64 border-4 border-gray-300 rounded-lg overflow-hidden bg-white">
    <div
      className={`absolute bottom-0 w-full transition-all duration-500 ${
        isConnected ? "bg-blue-500" : "bg-gray-400"
      }`}
      style={{ height: `${level}%` }}
    />
  </div>
);

const Dashboard: React.FC = () => {
  const {
    connectStatus,
    waterLevel,
    alertThreshold,
    handleReconnect,
    handleAlertThresholdChange,
  } = useMqttConnection(15);

  return (
    <>
      <Toaster />
      <div className="p-6 flex flex-col items-center">
        <WaterLevelIndicator
          level={waterLevel}
          isConnected={connectStatus === "Connected"}
        />
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
            onChange={(e) => handleAlertThresholdChange(Number(e.target.value))}
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
    </>
  );
};

export default Dashboard;
