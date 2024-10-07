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
  User,
  Loader2,
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
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  const isConnected = connectStatus === "Connected";
  const isConnecting = connectStatus === "Connecting";
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
    setIsReconnecting(true);
    let result;
    try {
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
    } finally {
      setIsReconnecting(false);
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

  const getConnectionIcon = () => {
    if (isConnected) return Wifi;
    if (isConnecting) return Wifi;
    return WifiOff;
  };

  const getConnectionClass = () => {
    if (isConnected) return "text-connected";
    if (isConnecting) return "text-connecting";
    return "text-disconnected";
  };

  const Icon = getConnectionIcon();

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      <DashboardRenderer
        connectStatus={connectStatus}
        sensorData={sensorData}
        setAlertThreshold={setAlertThreshold}
        setReset={setReset}
      />
      <div className="bg-card-background text-foreground p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Icon className={`w-6 h-6 mr-2 ${getConnectionClass()}`} />
            <span className={`font-medium ${getConnectionClass()}`}>
              {connectStatus}
            </span>
          </div>
          {loggedInDoctor && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleContact}
                className="p-2 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors duration-300"
                title="Contact"
              >
                <Phone size={16} />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors duration-300"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Patient ID (required)"
              value={patientId || ""}
              onChange={(e) => handlePatientIdChange(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-foreground focus:ring-primary focus:border-primary transition-colors duration-300"
            />
            {isReconnecting ? (
              <div className="flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <button
                onClick={handleReconnect}
                disabled={!isPatientIdValid}
                className={`px-4 py-2 rounded-md transition-colors duration-300 ${
                  isPatientIdValid
                    ? "bg-primary text-white hover:bg-primary-dark"
                    : "bg-gray-500 text-gray-300 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
                }`}
              >
                Reconnect
              </button>
            )}
          </div>
          {!isPatientIdValid && patientId !== 0 && (
            <p className="text-error text-xs mt-1">Patient ID is required</p>
          )}
        </div>
        <div className="border-t border-gray-300 dark:border-gray-700 pt-4 mt-4">
          {loggedInDoctor ? (
            <div className="flex items-center justify-between">
              <span className="text-success flex items-center">
                <User size={16} className="mr-2" />
                Logged in as: {loggedInDoctor}
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowCredentials(!showCredentials)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors duration-300"
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
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-foreground focus:ring-primary focus:border-primary transition-colors duration-300"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-foreground focus:ring-primary focus:border-primary transition-colors duration-300"
                  />
                  <button
                    onClick={handleConnect}
                    disabled={!username || !password || !isPatientIdValid}
                    className={`w-full px-4 py-2 rounded-md transition-colors duration-300 ${
                      username && password && isPatientIdValid
                        ? "bg-primary text-white hover:bg-primary-dark"
                        : "bg-gray-500 text-gray-300 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Verify
                  </button>
                  {error && (
                    <div className="flex items-center text-error text-sm mt-2">
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
    </div>
  );
};

export default ConnectionDetails;
