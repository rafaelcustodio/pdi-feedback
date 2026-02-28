import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCalendarEvents } from "./actions";
import { CalendarView } from "@/components/calendar-view";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    ano?: string;
    setor?: string;
    tipo?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const month = parseInt(params.mes ?? String(now.getMonth() + 1), 10);
  const year = parseInt(params.ano ?? String(now.getFullYear()), 10);
  const setor = params.setor || undefined;
  const tipo = (params.tipo as "pdi" | "feedback" | "all") || "all";

  const events = await getCalendarEvents(month, year, {
    organizationalUnitId: setor,
    tipo,
  });

  // Serialize dates for client component
  const serializedEvents = events.map((e) => ({
    ...e,
    scheduledAt: e.scheduledAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calendário</h1>
        <p className="mt-1 text-sm text-gray-600">
          Visualize os PDIs e Feedbacks agendados em formato de calendário mensal.
        </p>
      </div>

      <CalendarView
        events={serializedEvents}
        month={month}
        year={year}
      />
    </div>
  );
}
