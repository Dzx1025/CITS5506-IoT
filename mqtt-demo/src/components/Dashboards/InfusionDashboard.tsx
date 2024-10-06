"use client";

import React, { useState, useEffect, useRef } from "react";
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
  onAlertThresholdChange?: (value: number) => void;
  onResetChange?: (value: boolean) => void;
}

const InfusionDashboard: React.FC<InfusionDashboardProps> = ({
  connectStatus,
  level: waterLevel,
  rate: flowRate,
  timeLeft: estimatedTimeRemaining,
  onAlertThresholdChange,
  onResetChange,
}) => {
  const [localAlertThreshold, setLocalAlertThreshold] = useState(15);
  const isConnected = connectStatus === "Connected";
  const isLowWaterLevel = waterLevel <= localAlertThreshold;
  const waterLevelClass = isConnected
    ? isLowWaterLevel
      ? "bg-error"
      : "bg-primary"
    : "bg-gray-500 dark:bg-gray-700";

  const previousWaterLevelRef = useRef(waterLevel);

  useEffect(() => {
    if (isLowWaterLevel) {
      alertNotify(`Water level is low: ${waterLevel}%`);
    }
    previousWaterLevelRef.current = waterLevel;
  }, [waterLevel, isLowWaterLevel]);

  const handleAlertThresholdChange = (value: number) => {
    setLocalAlertThreshold(value);
    if (onAlertThresholdChange) {
      onAlertThresholdChange(value);
    }
  };

  const handleResetChange = () => {
    if (onResetChange) {
      onResetChange(true);
    }
  };

  return (
    <div className="bg-card-background text-foreground p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-primary">
        Infusion Pump
      </h2>

      <div className="flex items-center justify-between mb-8">
        <div className="relative w-20 h-56 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden border-2 border-gray-300 dark:border-gray-600">
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ${waterLevelClass}`}
            style={{ height: `${waterLevel}%` }}
          >
            <Droplet className="text-white w-full h-8 mt-2 animate-bounce opacity-50" />
          </div>
          <div className="absolute inset-0 border-2 border-gray-400 dark:border-gray-500 rounded-full pointer-events-none"></div>
        </div>
        <div className="flex flex-col items-center justify-center pl-6 flex-grow">
          <p
            className={`text-5xl font-bold ${
              isLowWaterLevel ? "text-error" : "text-primary"
            } transition-colors duration-300`}
          >
            {waterLevel}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Water Level
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 mr-2 text-primary" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Time Remaining:
            </p>
          </div>
          <p className="text-lg font-semibold">
            {estimatedTimeRemaining.hour}h {estimatedTimeRemaining.minute}m
          </p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
          <div className="flex items-center mb-2">
            <Droplet className="w-5 h-5 mr-2 text-primary" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Flow Rate:
            </p>
          </div>
          <p className="text-lg font-semibold">{flowRate.toFixed(1)} ml/h</p>
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="alertThreshold"
          className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
        >
          Alert Threshold (%)
        </label>
        <input
          type="number"
          id="alertThreshold"
          value={localAlertThreshold}
          onChange={(e) => handleAlertThresholdChange(Number(e.target.value))}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-md text-foreground focus:ring-primary focus:border-primary transition-colors duration-300"
          disabled={!isConnected}
        />
      </div>

      {isLowWaterLevel && (
        <button
          onClick={handleResetChange}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out flex items-center justify-center border border-yellow-600"
          disabled={!onResetChange}
        >
          <AlertTriangle className="w-5 h-5 mr-2" />
          Stop Warning
        </button>
      )}
    </div>
  );
};

export default InfusionDashboard;
