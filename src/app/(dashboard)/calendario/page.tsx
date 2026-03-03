import { getEffectiveAuth } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import { getCalendarEvents, getCalendarOrgUnits } from "./actions";
import { CalendarView } from "@/components/calendar-view";
import { CalendarFilters } from "@/components/calendar-filters";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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
  const session = await getEffectiveAuth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const month = parseInt(params.mes ?? String(now.getMonth() + 1), 10);
  const year = parseInt(params.ano ?? String(now.getFullYear()), 10);
  const setor = params.setor || undefined;
  const tipo = (params.tipo as "pdi" | "feedback" | "all") || "all";

  const [events, orgUnits] = await Promise.all([
    getCalendarEvents(month, year, {
      organizationalUnitId: setor,
      tipo,
    }),
    getCalendarOrgUnits(),
  ]);

  // Serialize dates for client component
  const serializedEvents = events.map((e) => ({
    ...e,
    scheduledAt: e.scheduledAt.toISOString(),
  }));

  const monthLabel = `${MONTH_NAMES[month - 1]}/${year}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Calendário</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Visualize os PDIs e Feedbacks agendados em formato de calendário mensal.
        </p>
      </div>

      <CalendarFilters
        orgUnits={orgUnits}
        eventCount={events.length}
        monthLabel={monthLabel}
      />

      <CalendarView
        events={serializedEvents}
        month={month}
        year={year}
      />
    </div>
  );
}
