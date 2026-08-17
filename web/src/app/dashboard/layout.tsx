import Sidebar from "./_components/Sidebar";
import { CollectionsProvider } from "./_components/CollectionsProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard flex h-dvh w-full min-w-0 flex-col gap-2 overflow-hidden bg-background p-2 sm:p-3 md:flex-row md:gap-3 md:p-4">
      <Sidebar />
      <main className="order-1 min-h-0 min-w-0 flex-1 overflow-hidden md:order-0">
        <CollectionsProvider>{children}</CollectionsProvider>
      </main>
    </div>
  );
}
