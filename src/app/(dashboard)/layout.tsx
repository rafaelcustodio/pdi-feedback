import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getEffectiveAuth, getImpersonationInfo } from "@/lib/impersonation";
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

  const [notificationCount, impersonationInfo, effectiveSession] = await Promise.all([
    getUnreadNotificationCount(),
    getImpersonationInfo(),
    getEffectiveAuth(),
  ]);

  // isAdmin uses REAL session (for impersonate button in sidebar)
  const isAdmin = (session.user as { role?: string }).role === "admin";
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
    >
      {children}
    </AppLayout>
  );
}
