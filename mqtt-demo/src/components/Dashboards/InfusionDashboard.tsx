"use client";

import React, { useEffect, useRef } from "react";
import { Droplet, Clock, AlertTriangle } from "lucide-react";
import { alertNotify } from "@/components/Toast";

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
  const waterLevelBgClass = isConnected
    ? isLowWaterLevel
      ? "bg-red-400"
      : "bg-blue-400"
    : "bg-gray-600";

  const previousWaterLevelRef = useRef(waterLevel);

  useEffect(() => {
    if (isLowWaterLevel) {
      alertNotify(`Water level is low: ${waterLevel}%`);
    }
    previousWaterLevelRef.current = waterLevel;
  }, [waterLevel, isLowWaterLevel]);

  return (
    <div className="bg-gray-800 text-white p-6 rounded-2xl shadow-lg w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-300">
        Infusion Pump
      </h2>

      <div className="flex items-center justify-between mb-8">
        <div className="relative w-20 h-56 border-2 border-gray-600 rounded-full overflow-hidden">
          <div
            className={`absolute bottom-0 w-full transition-all duration-1000 ${waterLevelBgClass}`}
            style={{ height: `${waterLevel}%` }}
          >
            <Droplet className="text-white w-full h-8 mt-2 animate-bounce opacity-50" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center pl-6 flex-grow">
          <p
            className={`text-5xl font-bold ${waterLevelTextClass} transition-colors duration-300`}
          >
            {waterLevel}%
          </p>
          <p className="text-sm text-gray-400 mt-2">Water Level</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-700 p-4 rounded-xl">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 mr-2 text-blue-300" />
            <p className="text-sm text-gray-300">Time Remaining:</p>
          </div>
          <p className="text-lg font-semibold">
            {estimatedTimeRemaining.hour}h {estimatedTimeRemaining.minute}m
          </p>
        </div>
        <div className="bg-gray-700 p-4 rounded-xl">
          <div className="flex items-center mb-2">
            <Droplet className="w-5 h-5 mr-2 text-blue-300" />
            <p className="text-sm text-gray-300">Flow Rate:</p>
          </div>
          <p className="text-lg font-semibold">{flowRate.toFixed(1)} ml/h</p>
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="alertThreshold"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Alert Threshold (%)
        </label>
        <input
          type="number"
          id="alertThreshold"
          value={alertThreshold}
          onChange={(e) => onAlertThresholdChange(Number(e.target.value))}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
        />
      </div>

      {isLowWaterLevel && (
        <button
          onClick={() => onResetChange(true)}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out flex items-center justify-center"
        >
          <AlertTriangle className="w-5 h-5 mr-2" />
          Stop Warning
        </button>
      )}
    </div>
  );
};

export default InfusionDashboard;
