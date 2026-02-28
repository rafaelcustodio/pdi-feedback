import { getNotifications, generateScheduleNotifications } from "./actions";
import { NotificationTable } from "@/components/notification-table";

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const filter = (params.filter as "all" | "unread" | "read") || "all";
  const pageSize = 20;

  // Generate notifications for upcoming/overdue schedules on page visit
  await generateScheduleNotifications();

  const { notifications, total } = await getNotifications(
    page,
    pageSize,
    filter
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Notificações</h1>
        <p className="mt-1 text-gray-600">
          Gerencie suas notificações de PDIs e feedbacks.
        </p>
      </div>

      <NotificationTable
        notifications={notifications}
        total={total}
        page={page}
        pageSize={pageSize}
        filter={filter}
      />
    </div>
  );
}
