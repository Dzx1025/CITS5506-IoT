import dynamic from "next/dynamic";

const DashBoard = dynamic(() => import("../components/Dashboard"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">IV Bag Volume Visualizer</h1>
      <DashBoard />
    </main>
  );
}
