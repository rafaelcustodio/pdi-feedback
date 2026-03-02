import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

  const notificationCount = await getUnreadNotificationCount();

  return (
    <AppLayout
      userName={session.user.name}
      avatarUrl={session.user.image ?? null}
      userRole={session.user.role}
      evaluationMode={session.user.evaluationMode}
      notificationCount={notificationCount}
    >
      {children}
    </AppLayout>
  );
}
