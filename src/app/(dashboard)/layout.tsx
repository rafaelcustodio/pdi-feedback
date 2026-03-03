import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getImpersonationInfo } from "@/lib/impersonation";
import { AppLayout } from "@/components/layout/app-layout";
import { getUnreadNotificationCount } from "@/app/(dashboard)/notificacoes/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [notificationCount, impersonationInfo] = await Promise.all([
    getUnreadNotificationCount(),
    getImpersonationInfo(),
  ]);

  const isAdmin = (session.user as { role?: string }).role === "admin";

  return (
    <AppLayout
      userName={session.user.name}
      avatarUrl={session.user.image ?? null}
      userRole={session.user.role}
      evaluationMode={session.user.evaluationMode}
      notificationCount={notificationCount}
      isAdmin={isAdmin}
      impersonationInfo={
        impersonationInfo
          ? { name: impersonationInfo.name ?? "", role: impersonationInfo.role }
          : null
      }
    >
      {children}
    </AppLayout>
  );
}
