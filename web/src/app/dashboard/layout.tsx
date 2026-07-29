import Sidebar from "./_components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard w-screen h-screen flex justify-between items-center bg-black p-4">
      <Sidebar />
      <div className="w-[93%] h-full">
        {children}
      </div>
    </div>
  );
}
