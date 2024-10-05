"use client";

import React from "react";
import dynamic from "next/dynamic";
import SensorSwitch from "@/components/SensorSwitch";

const InfusionDashboard = dynamic(
  () => import("@/components/InfusionDashboard"),
  { ssr: false }
);
const ECGDashboard = dynamic(() => import("@/components/ECGDashboard"), {
  ssr: false,
});
const TemperatureDashboard = dynamic(
  () => import("@/components/TemperatureDashboard"),
  { ssr: false }
);

interface DashboardRendererProps {
  connectStatus: string;
  sensorData: {
    infusion: {
      level: number;
      rate: number;
      timeLeft: {
        hour: number;
        minute: number;
      };
      alertThreshold: number;
    };
  };
  setAlertThreshold: (value: number) => void;
  setReset: (value: boolean) => void;
}

const DashboardRenderer: React.FC<DashboardRendererProps> = ({
  connectStatus,
  sensorData,
  setAlertThreshold,
  setReset,
}) => {
  return (
    <SensorSwitch
      options={["Infusion pump Sensors", "ECG Sensors", "Temperature Sensors"]}
    >
      <InfusionDashboard
        connectStatus={connectStatus}
        level={sensorData.infusion.level}
        rate={sensorData.infusion.rate}
        timeLeft={sensorData.infusion.timeLeft}
        alertThreshold={sensorData.infusion.alertThreshold}
        onAlertThresholdChange={setAlertThreshold}
        onResetChange={setReset}
      />
      <ECGDashboard />
      <TemperatureDashboard />
    </SensorSwitch>
  );
};

export default DashboardRenderer;
