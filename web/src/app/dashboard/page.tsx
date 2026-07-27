import MainPage from "./_components/MainPage";
import Sidebar from "./_components/Sidebar";

export default function DashboardPage() {
  return (
    <div className="dashboard w-screen h-screen flex justify-between items-center bg-black p-4">
        <Sidebar/>
        <MainPage/>
    </div>
  );
};
