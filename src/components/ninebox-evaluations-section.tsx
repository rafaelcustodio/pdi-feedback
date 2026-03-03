"use client";

import { useState } from "react";
import { ClipboardCheck, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import type {
  NineBoxEvaluationItem,
  NineBoxEvaluationCompletedItem,
} from "@/app/(dashboard)/dashboard/actions";

type Props = {
  pending: NineBoxEvaluationItem[];
  completed: NineBoxEvaluationCompletedItem[];
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function NineBoxEvaluationsSection({
  pending,
  completed,
}: Props) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (pending.length === 0 && completed.length === 0) return null;

  // Limit completed to 5 items in v1
  const completedDisplay = completed.slice(0, 5);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ClipboardCheck size={20} />
          Avaliações Nine Box
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Pendentes */}
        {pending.length > 0 && (
          <div className="px-6 py-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              Pendentes
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-xs font-bold text-amber-700">
                {pending.length}
              </span>
            </h3>
            <ul className="space-y-3">
              {pending.map((item) => (
                <li
                  key={item.evaluatorId}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.evaluateeName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.feedbackPeriod} · Convite em{" "}
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/ninebox/${item.evaluatorId}`}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Responder
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Respondidas */}
        {completedDisplay.length > 0 && (
          <div className="px-6 py-4">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="mb-3 flex w-full items-center gap-2 text-sm font-semibold text-gray-700"
            >
              {showCompleted ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              Respondidas ({completedDisplay.length})
            </button>
            {showCompleted && (
              <ul className="space-y-3">
                {completedDisplay.map((item) => (
                  <li key={item.evaluatorId}>
                    <p className="text-sm font-medium text-gray-900">
                      {item.evaluateeName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.feedbackPeriod} · Respondido em{" "}
                      {formatDate(item.completedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
