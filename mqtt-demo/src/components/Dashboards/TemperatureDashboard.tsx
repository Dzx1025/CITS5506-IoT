"use client";

import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TemperatureDashboard = () => {
  const [tempData, setTempData] = useState<{ time: string; temp: number }[]>(
    []
  );

  useEffect(() => {
    // Simulating temperature data
    const interval = setInterval(() => {
      setTempData((oldData) => {
        const newTemp = 36.5 + Math.random() * 1.5; // Random temperature between 36.5 and 38
        const newData = [
          ...oldData,
          { time: new Date().toLocaleTimeString(), temp: newTemp },
        ];
        return newData.slice(-10); // Keep last 10 data points
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Temperature Dashboard</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={tempData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[35, 40]} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="temp"
              stroke="#82ca9d"
              fill="#82ca9d"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TemperatureDashboard;
