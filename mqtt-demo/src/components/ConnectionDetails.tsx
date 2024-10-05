"use client";

import React, { useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import useMqttConnection from "@/components/UseMqttConnection";
import DashboardRenderer from "@/components/DashboardRenderer";

const ConnectionDetails: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [patientId, setPatientId] = useState("");

  const {
    connectStatus,
    sensorData,
    connect,
    reconnect,
    setAlertThreshold,
    setReset,
  } = useMqttConnection();

  const handleConnect = () => {
    connect(username, password, patientId);
  };

  const isConnected = connectStatus === "Connected";
  const statusColor = isConnected ? "text-green-400" : "text-red-400";
  const Icon = isConnected ? Wifi : WifiOff;

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Icon className={`w-6 h-6 mr-2 ${statusColor}`} />
            <span className={`font-medium ${statusColor}`}>
              {connectStatus}
            </span>
          </div>
          <button
            onClick={reconnect}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-0.5 hover:shadow-lg text-sm"
          >
            Reconnect
          </button>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="Patient ID"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          />
          <button
            onClick={handleConnect}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out text-sm"
          >
            Submit
          </button>
        </div>
      </div>

      <DashboardRenderer
        connectStatus={connectStatus}
        sensorData={sensorData}
        setAlertThreshold={setAlertThreshold}
        setReset={setReset}
      />
    </div>
  );
};

export default ConnectionDetails;
