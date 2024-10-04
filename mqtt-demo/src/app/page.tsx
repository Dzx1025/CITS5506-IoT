import dynamic from "next/dynamic";

const DashBoard = dynamic(() => import("../components/dashboard"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-12 mt-8">
      <h3 className="text-4xl font-bold mb-4">IV Bag Volume Visualizer</h3>
      <DashBoard />
    </main>
  );
}
