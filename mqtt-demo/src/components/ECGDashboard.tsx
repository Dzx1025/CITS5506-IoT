"use client";

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const ECGDashboard = () => {
  const [ecgData, setEcgData] = useState<{ time: number; value: number }[]>([]);

  useEffect(() => {
    // Simulating real-time ECG data
    const interval = setInterval(() => {
      setEcgData((oldData) => {
        const newData = [
          ...oldData,
          {
            time: Date.now(),
            value: Math.sin(Date.now() / 1000) * 0.5 + Math.random() * 0.5,
          },
        ];
        return newData.slice(-100); // Keep last 100 data points
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">ECG Dashboard</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ecgData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={false} />
            <YAxis domain={[-1, 1]} />
            <Tooltip
              labelFormatter={(label) => new Date(label).toLocaleTimeString()}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ECGDashboard;
