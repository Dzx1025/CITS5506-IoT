import dynamic from "next/dynamic";

const DashBoard = dynamic(() => import("../components/dashboard"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 mt-8">
      <h1 className="text-4xl font-bold mb-4">IV Bag Volume Visualizer</h1>
      <p className="text-lg mb-8">
        Monitor and control IV fluid levels in real-time
      </p>
      <DashBoard />
    </main>
  );
}
