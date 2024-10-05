import dynamic from "next/dynamic";

const SensorSwitch = dynamic(() => import("@/components/SensorSwitch"), {
  ssr: false, // Set to false if you don't need server-side rendering for this component
  loading: () => <p>Loading...</p>, // Optional loading component
});

const InfusionDashboard = dynamic(
  () => import("@/components/InfusionDashboard"),
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
        <InfusionDashboard />
        <InfusionDashboard />
      </SensorSwitch>
    </main>
  );
}
