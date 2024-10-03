import toast from "react-hot-toast";

export const alertNotify = (message: string) =>
  toast.custom(
    () => (
      <div className="bg-red-100 text-red-800 font-medium rounded-lg p-4 shadow-md">
        <div className="flex items-center">
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p className="font-medium">{message}</p>
        </div>
      </div>
    ),
    {
      duration: 3000,
      position: "top-center",
    }
  );
