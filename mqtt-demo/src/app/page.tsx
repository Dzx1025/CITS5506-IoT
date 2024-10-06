import ConnectionDetails from "@/components/Dashboards/ConnectionDetails";
import { Toaster } from "react-hot-toast";

export default function Home() {
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <Toaster />
      <div className="space-y-6 p-4 max-w-md mx-auto">
        <h1 className="text-2xl sm:text-4xl font-bold mb-6 text-center">
          VitalTrack System
        </h1>
        <ConnectionDetails />
      </div>
    </main>
  );
}
