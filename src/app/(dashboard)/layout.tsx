import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEffectiveAuth, getImpersonationInfo } from "@/lib/impersonation";
import { AppLayout } from "@/components/layout/app-layout";
import { getUnreadNotificationCount } from "@/app/(dashboard)/notificacoes/actions";
import { getPendingEmployeesCount } from "@/app/(dashboard)/colaboradores/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isRealAdmin = (session.user as { role?: string }).role === "admin";

  const [notificationCount, impersonationInfo, effectiveSession, pendingCount] = await Promise.all([
    getUnreadNotificationCount(),
    getImpersonationInfo(),
    getEffectiveAuth(),
    isRealAdmin ? getPendingEmployeesCount() : Promise.resolve(0),
  ]);

  const isAdmin = isRealAdmin;
  // userRole/evaluationMode use EFFECTIVE session (for menu filtering during impersonation)
  const effectiveRole = (effectiveSession?.user as { role?: string })?.role || "employee";
  const effectiveEvalMode = (effectiveSession?.user as { evaluationMode?: string })?.evaluationMode || "feedback";

  return (
    <AppLayout
      userName={session.user.name}
      avatarUrl={session.user.image ?? null}
      userRole={effectiveRole}
      evaluationMode={effectiveEvalMode}
      notificationCount={notificationCount}
      isAdmin={isAdmin}
      impersonationInfo={
        impersonationInfo
          ? { name: impersonationInfo.name ?? "", role: impersonationInfo.role }
          : null
      }
      pendingEmployeesCount={pendingCount}
    >
      {children}
    </AppLayout>
  );
}
