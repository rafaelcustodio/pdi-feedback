import { getEffectiveAuth } from "@/lib/impersonation";
import { redirect, notFound } from "next/navigation";
import { getCalendarEventById } from "../event-actions";
import { CalendarEventDetailView } from "@/components/calendar-event-detail";

export default async function CalendarEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const session = await getEffectiveAuth();
  if (!session?.user) redirect("/login");

  const { eventId } = await params;
  const event = await getCalendarEventById(eventId);

  if (!event) notFound();

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role || "employee";
  const canEdit =
    role === "admin" || (role === "manager" && event.managerId === userId);

  return (
    <div className="space-y-6">
      <CalendarEventDetailView event={event} canEdit={canEdit} />
    </div>
  );
}
