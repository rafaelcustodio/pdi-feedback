type Faixa = "baixo" | "medio" | "alto";

interface NineBoxGridProps {
  desempenhoFaixa: Faixa;
  potencialFaixa: Faixa;
}

const GRID: { potencial: Faixa; desempenho: Faixa; label: string }[][] = [
  // Top row (Alto Potencial)
  [
    { potencial: "alto", desempenho: "baixo", label: "Forte Potencial" },
    { potencial: "alto", desempenho: "medio", label: "Alto Potencial" },
    { potencial: "alto", desempenho: "alto", label: "Top Performer" },
  ],
  // Middle row (Médio Potencial)
  [
    { potencial: "medio", desempenho: "baixo", label: "Enigma" },
    { potencial: "medio", desempenho: "medio", label: "Profissional Chave" },
    { potencial: "medio", desempenho: "alto", label: "Alto Desempenho" },
  ],
  // Bottom row (Baixo Potencial)
  [
    { potencial: "baixo", desempenho: "baixo", label: "Insuficiente" },
    { potencial: "baixo", desempenho: "medio", label: "Eficaz" },
    { potencial: "baixo", desempenho: "alto", label: "Comprometido" },
  ],
];

// Inactive / Active colors per row
const COLORS: Record<Faixa, { inactive: string; active: string }[]> = {
  alto: [
    { inactive: "bg-teal-50 text-teal-700", active: "bg-teal-500 text-white ring-2 ring-teal-700" },
    { inactive: "bg-emerald-50 text-emerald-700", active: "bg-emerald-500 text-white ring-2 ring-emerald-700" },
    { inactive: "bg-green-50 text-green-700", active: "bg-green-600 text-white ring-2 ring-green-800" },
  ],
  medio: [
    { inactive: "bg-amber-50 text-amber-700", active: "bg-amber-500 text-white ring-2 ring-amber-700" },
    { inactive: "bg-yellow-50 text-yellow-700", active: "bg-yellow-500 text-white ring-2 ring-yellow-700" },
    { inactive: "bg-purple-50 text-purple-700", active: "bg-purple-500 text-white ring-2 ring-purple-700" },
  ],
  baixo: [
    { inactive: "bg-rose-50 text-rose-700", active: "bg-rose-500 text-white ring-2 ring-rose-700" },
    { inactive: "bg-pink-50 text-pink-700", active: "bg-pink-500 text-white ring-2 ring-pink-700" },
    { inactive: "bg-red-50 text-red-700", active: "bg-red-400 text-white ring-2 ring-red-600" },
  ],
};

const POT_LABELS: Faixa[] = ["alto", "medio", "baixo"];
const POT_DISPLAY: Record<Faixa, string> = {
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};
const DES_DISPLAY: Record<Faixa, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

export function NineBoxGrid({ desempenhoFaixa, potencialFaixa }: NineBoxGridProps) {
  return (
    <div className="inline-block">
      {/* Column headers */}
      <div className="mb-1 grid grid-cols-[auto_1fr_1fr_1fr] gap-1">
        <div className="w-20" />
        {(["baixo", "medio", "alto"] as Faixa[]).map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500">
            {DES_DISPLAY[d]}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      {GRID.map((row, rowIdx) => {
        const potLevel = POT_LABELS[rowIdx];
        return (
          <div key={potLevel} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1 mb-1">
            {/* Row label */}
            <div className="flex w-20 items-center justify-end pr-2">
              <span className="text-xs font-medium text-gray-500">
                {POT_DISPLAY[potLevel]}
              </span>
            </div>
            {row.map((cell, colIdx) => {
              const isActive =
                cell.potencial === potencialFaixa &&
                cell.desempenho === desempenhoFaixa;
              const colorSet = COLORS[potLevel][colIdx];
              const className = isActive ? colorSet.active : colorSet.inactive;

              return (
                <div
                  key={cell.label}
                  className={`flex h-20 w-28 items-center justify-center rounded-lg p-1 text-center text-xs font-semibold ${className}`}
                >
                  {cell.label}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Axis labels */}
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-1">
        <div className="w-20" />
        <div className="text-center text-xs font-medium text-gray-400">
          Desempenho →
        </div>
      </div>
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-gray-400 hidden">
        ← Potencial
      </div>
    </div>
  );
}
