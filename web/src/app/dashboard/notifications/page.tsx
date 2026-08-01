export default function NotificationsPage() {
  return (
    <div className="w-full h-full flex flex-col p-6">
      <h1 className="text-2xl text-foreground font-semibold mb-6">All Notifications</h1>
      <div className="space-y-3">
        <p className="text-muted-foreground text-center py-8">No notifications yet</p>
      </div>
    </div>
  );
}
