import ConnectionDetails from "@/components/ConnectionDetails";
import { Toaster } from "react-hot-toast";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-950 text-white">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 text-center">
          VitalTrack Monitoring System
        </h1>
        <ConnectionDetails />
      </div>
    </main>
  );
}
