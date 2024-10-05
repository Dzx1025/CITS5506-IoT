"use client";

import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  LogOut,
  Phone,
} from "lucide-react";
import useMqttConnection from "@/components/UseMqttConnection";
import DashboardRenderer from "@/components/DashboardRenderer";

const ConnectionDetails: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [patientId, setPatientId] = useState<number>(
    Number(process.env.PATIENT_ID) || 40
  );
  const [isPatientIdValid, setIsPatientIdValid] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const {
    connectStatus,
    sensorData,
    connect,
    reconnect,
    setAlertThreshold,
    setReset,
    logout,
    isLoggedIn,
  } = useMqttConnection();

  useEffect(() => {
    setIsPatientIdValid(Number.isInteger(patientId) && patientId > 0);
  }, [patientId]);

  const handleConnect = async () => {
    if (username && password && isPatientIdValid) {
      try {
        await connect(username, password, patientId);
        setLoggedInUser(username);
        setUsername("");
        setPassword("");
      } catch (error) {
        console.error("Login failed:", error);
        // Handle login failure (e.g., show error message to user)
      }
    }
  };

  const handleLogout = () => {
    logout();
    setLoggedInUser(""); // Clear logged in user
  };

  const handleReconnect = () => {
    if (isPatientIdValid) {
      reconnect(patientId);
    }
  };

  const handleContact = () => {
    // Placeholder for contact functionality
    console.log("Contact button clicked");
  };

  const isConnected = connectStatus === "Connected";
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
              value={patientId}
              onChange={(e) => setPatientId(Number(e.target.value))}
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
          {loggedInUser ? (
            <div className="flex items-center justify-between">
              <span className="text-green-400">
                Logged in as: {loggedInUser}
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
