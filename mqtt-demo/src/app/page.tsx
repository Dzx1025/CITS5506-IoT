import dynamic from "next/dynamic";

const SensorSwitch = dynamic(() => import("@/components/SensorSwitch"), {
  ssr: false,
  loading: () => <p>Loading...</p>, // Optional loading component
});

const InfusionDashboard = dynamic(
  () => import("@/components/InfusionDashboard"),
  {
    ssr: false,
  }
);

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
    <main className="flex min-h-screen flex-col items-center justify-between p-12 mt-8">
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
