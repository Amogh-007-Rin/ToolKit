import ThemeToggleButton from "@/components/ui/buttons/ThemeToggleButton";

export default function SettingsPage() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <h1 className="text-4xl text-white font-bold">Settings</h1>
      <p className="text-gray-400 mt-4">Manage your application settings</p>
      <div className="absolute top-6 right-6">
        <ThemeToggleButton/>
      </div>
    </div>
  );
};
