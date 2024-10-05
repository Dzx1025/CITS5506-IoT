import dynamic from "next/dynamic";
import SensorSwitch from "@/components/SensorSwitch";
import InfusionDashboard from "@/components/InfusionDashboard";

const ECGDashboard = dynamic(() => import("@/components/ECGDashboard"), {
  ssr: false,
});

const TemperatureDashboard = dynamic(
  () => import("@/components/TemperatureDashboard"),
  {
    ssr: false,
  }
);

export default function Home() {
  return (
    <main className="fixed-main flex min-h-screen flex-col items-center justify-top p-12">
      {" "}
      <h3 className="text-4xl font-bold mb-4">VitalTrack Monitoring System</h3>
      <SensorSwitch
        options={[
          "Infusion pump sensors",
          "ECG Sensors",
          "Temperature sensors",
        ]}
      >
        <InfusionDashboard />
        <ECGDashboard />
        <TemperatureDashboard />
      </SensorSwitch>
    </main>
  );
}
