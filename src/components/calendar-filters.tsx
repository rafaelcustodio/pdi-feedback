"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Filter } from "lucide-react";

interface CalendarFiltersProps {
  orgUnits: { id: string; name: string }[];
  eventCount: number;
  monthLabel: string;
}

export function CalendarFilters({
  orgUnits,
  eventCount,
  monthLabel,
}: CalendarFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSetor = searchParams.get("setor") || "";
  const currentTipo = searchParams.get("tipo") || "all";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || (value === "all" && key === "tipo") || (value === "" && key === "setor")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/calendario?${params.toString()}`);
    },
    [searchParams, router]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-gray-500">
        <Filter size={16} />
        <span className="font-medium">Filtros:</span>
      </div>

      {/* Setor dropdown */}
      <select
        value={currentSetor}
        onChange={(e) => updateFilter("setor", e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Todos os setores</option>
        {orgUnits.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>

      {/* Tipo dropdown */}
      <select
        value={currentTipo}
        onChange={(e) => updateFilter("tipo", e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">Todos</option>
        <option value="pdi">PDI</option>
        <option value="feedback">Feedback</option>
      </select>

      {/* Event count */}
      <span className="ml-auto text-sm text-gray-500">
        <span className="font-semibold text-gray-700">{eventCount}</span>{" "}
        {eventCount === 1 ? "evento" : "eventos"} em {monthLabel}
      </span>
    </div>
  );
}
