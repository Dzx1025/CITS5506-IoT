"use client";

import React from "react";
import { Droplet, Clock, RefreshCw } from "lucide-react";

interface InfusionDashboardProps {
  connectStatus: string;
  level: number;
  rate: number;
  timeLeft: {
    hour: number;
    minute: number;
  };
  alertThreshold: number;
  onAlertThresholdChange: (value: number) => void;
  onResetChange: (value: boolean) => void;
}

const InfusionDashboard: React.FC<InfusionDashboardProps> = ({
  connectStatus,
  level: waterLevel,
  rate: flowRate,
  timeLeft: estimatedTimeRemaining,
  alertThreshold,
  onAlertThresholdChange,
  onResetChange,
}) => {
  const isConnected = connectStatus === "Connected";
  const isLowWaterLevel = waterLevel <= alertThreshold;
  const waterLevelTextClass = isConnected
    ? isLowWaterLevel
      ? "text-red-400"
      : "text-blue-400"
    : "text-gray-400";
  const waterLevelBgClass = isConnected ? "bg-blue-400" : "bg-gray-600";

  return (
    <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg w-full max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-3 text-center">Infusion Pump</h2>

      <div className="flex items-center justify-between mb-4">
        <div className="relative w-16 h-48 border-2 border-gray-700 rounded-lg overflow-hidden">
          <div
            className={`absolute bottom-0 w-full transition-all duration-500 ${waterLevelBgClass}`}
            style={{ height: `${waterLevel}%` }}
          >
            <Droplet className="text-white w-full h-6 mt-1 animate-bounce opacity-50" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center pl-4 flex-grow">
          <p className={`text-4xl font-bold ${waterLevelTextClass}`}>
            {waterLevel}%
          </p>
          <p className="text-sm text-gray-400">Water Level</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-2 text-gray-400" />
          <p className="text-sm text-gray-300">Estimated Time Remaining:</p>
        </div>
        <p className="text-lg font-semibold">
          {estimatedTimeRemaining.hour}h {estimatedTimeRemaining.minute}m
        </p>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-300 mb-1">Flow Rate: {flowRate} ml/h</p>
      </div>

      <div className="mb-4">
        <label
          htmlFor="alertThreshold"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Alert Threshold (%)
        </label>
        <input
          type="number"
          id="alertThreshold"
          value={alertThreshold}
          onChange={(e) => onAlertThresholdChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {isLowWaterLevel && (
        <button
          onClick={() => onResetChange(true)}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out flex items-center justify-center"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Reset Infusion Pump
        </button>
      )}
    </div>
  );
};

export default InfusionDashboard;
