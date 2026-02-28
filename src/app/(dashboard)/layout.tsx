import { AppLayout } from "@/components/layout/app-layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Replace with real session data from NextAuth
  const mockUser = {
    name: "Admin Sistema",
    avatarUrl: null,
    role: "admin",
  };

  return (
    <AppLayout
      userName={mockUser.name}
      avatarUrl={mockUser.avatarUrl}
      userRole={mockUser.role}
      notificationCount={3}
    >
      {children}
    </AppLayout>
  );
}
