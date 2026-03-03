import { redirect } from "next/navigation";
import { getEffectiveAuth } from "@/lib/impersonation";
import { getDashboardData, getMyNineBoxEvaluations } from "./actions";
import {
  Users,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  Calendar,
  ArrowRight,
  CalendarClock,
  Clock,
} from "lucide-react";
import Link from "next/link";
import NineBoxEvaluationsSection from "@/components/ninebox-evaluations-section";

export default async function DashboardPage() {
  const session = await getEffectiveAuth();
  if (!session?.user) redirect("/login");

  const [data, nineBoxEvals] = await Promise.all([
    getDashboardData(),
    getMyNineBoxEvaluations(),
  ]);
  if (!data) redirect("/login");

  const userName = session.user.name?.split(" ")[0] || "Usuário";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Olá, {userName}. Aqui está o resumo das suas pendências.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Subordinate count */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Colaboradores</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.subordinateCount}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Diretos e indiretos na sua hierarquia
          </p>
        </div>

        {/* PDIs */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">PDIs Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.pdisPending}
              </p>
            </div>
          </div>
          {data.pdisOverdue > 0 ? (
            <p className="mt-3 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle size={14} />
              {data.pdisOverdue} com metas atrasadas
            </p>
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              Nenhuma meta atrasada
            </p>
          )}
        </div>

        {/* Feedbacks */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Feedbacks Pendentes
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {data.feedbacksPending}
              </p>
            </div>
          </div>
          {data.feedbacksOverdue > 0 ? (
            <p className="mt-3 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle size={14} />
              {data.feedbacksOverdue} agendamentos atrasados
            </p>
          ) : (
            <p className="mt-3 text-xs text-gray-500">
              Nenhum agendamento atrasado
            </p>
          )}
        </div>
      </div>

      {/* Nine Box Evaluations */}
      {nineBoxEvals && (
        <NineBoxEvaluationsSection
          pending={nineBoxEvals.pending}
          completed={nineBoxEvals.completed}
        />
      )}

      {/* Upcoming Scheduled Events */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CalendarClock size={20} />
            Próximos Eventos
          </h2>
          <Link
            href="/calendario"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Ver calendário completo
          </Link>
        </div>
        {data.upcomingScheduledEvents.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhum evento agendado encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.upcomingScheduledEvents.map((event) => (
              <li key={`${event.type}-${event.id}`}>
                <Link
                  href={event.href}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        event.type === "pdi"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {event.type === "pdi" ? (
                        <ClipboardList size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {event.type === "pdi" ? "PDI" : "Feedback"} —{" "}
                        {event.employeeName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(event.scheduledAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {event.status === "scheduled" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        <Clock size={12} />
                        Não preparado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Rascunho
                      </span>
                    )}
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming Items */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Calendar size={20} />
            Próximos Vencimentos
          </h2>
        </div>
        {data.upcomingItems.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhum vencimento próximo encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.upcomingItems.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        item.type === "pdi"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {item.type === "pdi" ? (
                        <ClipboardList size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.employeeName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {formatDate(item.dueDate)}
                    </span>
                    <ArrowRight size={16} className="text-gray-400" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
