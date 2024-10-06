"use client";

import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  LogOut,
  Phone,
  AlertCircle,
} from "lucide-react";
import useMqttConnection from "@/components/UseMqttConnection";
import DashboardRenderer from "@/components/DashboardRenderer";

const ConnectionDetails: React.FC = () => {
  const {
    connectStatus,
    sensorData,
    connect,
    reconnect,
    setAlertThreshold,
    setReset,
    disconnect,
    resetSensorData,
    isAnonymous,
  } = useMqttConnection();

  const [patientId, setPatientId] = useState<number>(0);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showCredentials, setShowCredentials] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loggedInDoctor, setLoggedInDoctor] = useState<string>("");

  const isConnected = connectStatus === "Connected";
  const isPatientIdValid = patientId !== 0;

  useEffect(() => {
    // Load saved data from localStorage
    const savedPatientId = localStorage.getItem("patientId");
    const savedUsername = localStorage.getItem("username");
    const savedPassword = localStorage.getItem("password");

    if (savedPatientId) setPatientId(Number(savedPatientId));
    if (savedUsername) setUsername(savedUsername);
    if (savedPassword) setPassword(savedPassword);
  }, []);

  useEffect(() => {
    if (isConnected && !isAnonymous) {
      setLoggedInDoctor(username);
      // Save login information to localStorage
      localStorage.setItem("username", username);
      localStorage.setItem("password", password);
    } else {
      setLoggedInDoctor("");
    }
  }, [isConnected, isAnonymous, username, password]);

  const handlePatientIdChange = (newPatientId: number) => {
    if (newPatientId !== patientId) {
      disconnect();
      setPatientId(newPatientId);
      resetSensorData();
      localStorage.setItem("patientId", newPatientId.toString());
    }
  };

  const handleConnect = async () => {
    setError("");
    const result = await connect(username, password, patientId);
    if (!result.success) {
      setError(result.error || "Connection failed");
    }
  };

  const handleReconnect = async () => {
    setError("");
    setShowCredentials(false);
    let result;
    if (loggedInDoctor) {
      // If already logged in, use the existing credentials
      result = await connect(username, password, patientId);
    } else {
      // If not logged in, use reconnect (which will connect anonymously)
      result = await reconnect(patientId);
    }
    if (!result.success) {
      setError(result.error || "Reconnection failed");
    }
  };

  const handleLogout = () => {
    disconnect();
    setUsername("");
    setPassword("");
    setLoggedInDoctor("");
    localStorage.removeItem("username");
    localStorage.removeItem("password");
  };

  const handleContact = () => {
    // Implement contact functionality
    console.log("Contact button clicked");
  };

  const statusColor = isConnected ? "text-green-400" : "text-red-400";
  const Icon = isConnected ? Wifi : WifiOff;
  const buttonClass =
    "font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out text-sm";
  const activeButtonClass =
    "bg-green-500 hover:bg-green-600 text-white transform hover:-translate-y-0.5 hover:shadow-lg";
  const disabledButtonClass = "bg-gray-500 text-gray-300 cursor-not-allowed";

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
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Patient ID (required)"
              value={patientId || ""}
              onChange={(e) => handlePatientIdChange(Number(e.target.value))}
              className={`flex-grow bg-gray-800 text-white px-3 py-2 rounded ${
                !isPatientIdValid && patientId !== 0
                  ? "border-red-500 border"
                  : ""
              }`}
            />
            <button
              onClick={handleReconnect}
              disabled={!isPatientIdValid}
              className={`${buttonClass} ${
                isPatientIdValid ? activeButtonClass : disabledButtonClass
              }`}
            >
              Reconnect
            </button>
          </div>
          {!isPatientIdValid && patientId !== 0 && (
            <p className="text-red-500 text-xs mt-1">Patient ID is required</p>
          )}
        </div>
        <div className="border-t border-gray-700 pt-4 mt-4">
          {loggedInDoctor ? (
            <div className="flex items-center justify-between">
              <span className="text-green-400">
                Logged in as: {loggedInDoctor}
              </span>
              <div className="space-x-2">
                <button
                  onClick={handleContact}
                  className={`${buttonClass} bg-blue-500 hover:bg-blue-600 text-white`}
                >
                  <Phone size={16} />
                </button>
                <button
                  onClick={handleLogout}
                  className={`${buttonClass} bg-red-500 hover:bg-red-600 text-white`}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-300 hover:text-white"
              >
                Advanced Settings
                {showCredentials ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </button>
              {showCredentials && (
                <div className="mt-2 space-y-2">
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
                  <button
                    onClick={handleConnect}
                    disabled={!username || !password || !isPatientIdValid}
                    className={`w-full ${buttonClass} ${
                      username && password && isPatientIdValid
                        ? activeButtonClass
                        : disabledButtonClass
                    }`}
                  >
                    Verify
                  </button>
                  {error && (
                    <div className="flex items-center text-red-500 text-sm mt-2">
                      <AlertCircle size={16} className="mr-2" />
                      {error}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
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
