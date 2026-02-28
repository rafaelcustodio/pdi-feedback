import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";
import {
  getUnreadNotificationCount,
  getRecentNotifications,
} from "@/app/(dashboard)/notificacoes/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [notificationCount, recentNotifications] = await Promise.all([
    getUnreadNotificationCount(),
    getRecentNotifications(10),
  ]);

  return (
    <AppLayout
      userName={session.user.name}
      avatarUrl={session.user.image ?? null}
      userRole={session.user.role}
      notificationCount={notificationCount}
      recentNotifications={recentNotifications}
    >
      {children}
    </AppLayout>
  );
}
