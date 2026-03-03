import { NineBoxGrid } from "@/components/ninebox-grid";
import type { NineBoxEvalResult } from "@/app/(dashboard)/colaboradores/ninebox-actions";

interface NineBoxDashboardProps {
  current: NineBoxEvalResult;
  previous: NineBoxEvalResult | null;
  showDescriptive?: boolean;
}

function computeDelta(current: number, previous: number | null) {
  if (previous === null) return null;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100) : 0;
  return { diff, pct, previous };
}

function getQuadranteMovement(
  currentQuadrante: string,
  previousQuadrante: string | null
): "progressao" | "regressao" | "manutencao" | null {
  if (!previousQuadrante) return null;
  if (currentQuadrante === previousQuadrante) return "manutencao";

  const ranking: Record<string, number> = {
    "Insuficiente": 1,
    "Eficaz": 2,
    "Enigma": 3,
    "Comprometido": 4,
    "Profissional Chave": 5,
    "Forte Potencial": 6,
    "Alto Desempenho": 7,
    "Alto Potencial": 8,
    "Top Performer": 9,
  };

  const currentRank = ranking[currentQuadrante] ?? 0;
  const previousRank = ranking[previousQuadrante] ?? 0;

  return currentRank > previousRank ? "progressao" : "regressao";
}

function DeltaDisplay({ current, previous }: { current: number; previous: number | null }) {
  const delta = computeDelta(current, previous);
  if (!delta) return null;

  const isUp = delta.diff > 0;
  const isDown = delta.diff < 0;

  return (
    <div className="mt-1 flex items-center gap-1 text-xs">
      <span className="text-gray-500 dark:text-gray-400">({delta.previous.toFixed(2)})</span>
      {isUp && (
        <>
          <span className="text-green-600 dark:text-green-400">▲</span>
          <span className="text-green-600 dark:text-green-400">+{Math.abs(delta.pct).toFixed(1)}%</span>
        </>
      )}
      {isDown && (
        <>
          <span className="text-red-600 dark:text-red-400">▼</span>
          <span className="text-red-600 dark:text-red-400">-{Math.abs(delta.pct).toFixed(1)}%</span>
        </>
      )}
      {!isUp && !isDown && (
        <span className="text-gray-500 dark:text-gray-400">0.0%</span>
      )}
    </div>
  );
}

function KPICard({
  title,
  value,
  previous,
  children,
}: {
  title: string;
  value: string;
  previous?: number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {children}
      {previous !== undefined && (
        <DeltaDisplay
          current={parseFloat(value)}
          previous={previous}
        />
      )}
    </div>
  );
}

const MOVEMENT_LABELS: Record<string, { label: string; className: string }> = {
  progressao: { label: "Progressão ▲", className: "text-green-600 dark:text-green-400" },
  regressao: { label: "Regressão ▼", className: "text-red-600 dark:text-red-400" },
  manutencao: { label: "Manutenção", className: "text-gray-600 dark:text-gray-400" },
};

function getScoreColor(value: number): string {
  if (value <= 2.33) return "text-red-600 dark:text-red-400";
  if (value <= 3.66) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

export function NineBoxDashboard({ current, previous, showDescriptive = true }: NineBoxDashboardProps) {
  const movement = getQuadranteMovement(
    current.quadrante,
    previous?.quadrante ?? null
  );

  const desempenhoAverages = current.questionAverages.slice(0, 6);
  const potencialAverages = current.questionAverages.slice(6, 12);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Média Geral"
          value={current.mediaGeral.toFixed(2)}
          previous={previous?.mediaGeral ?? null}
        />
        <KPICard
          title="Potencialidade"
          value={current.potencial.toFixed(2)}
          previous={previous?.potencial ?? null}
        />
        <KPICard
          title="Desempenho"
          value={current.desempenho.toFixed(2)}
          previous={previous?.desempenho ?? null}
        />
        <KPICard title="Quadrante" value={current.quadrante}>
          {movement && (
            <p className={`mt-1 text-xs font-medium ${MOVEMENT_LABELS[movement].className}`}>
              {MOVEMENT_LABELS[movement].label}
            </p>
          )}
        </KPICard>
      </div>

      {/* Nine Box Movement */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Movimentação no Nine Box
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Baixo: 1,00–2,33 | Médio: 2,34–3,66 | Alto: 3,67–5,00
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          {previous && (
            <>
              <div className="text-center">
                <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                  Avaliação Anterior — {previous.feedbackPeriod}
                </p>
                <NineBoxGrid
                  desempenhoFaixa={previous.desempenhoFaixa}
                  potencialFaixa={previous.potencialFaixa}
                />
              </div>
              <div className="flex items-center text-3xl text-gray-400 dark:text-gray-500">→</div>
            </>
          )}
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">
              Avaliação Atual — {current.feedbackPeriod}
            </p>
            <NineBoxGrid
              desempenhoFaixa={current.desempenhoFaixa}
              potencialFaixa={current.potencialFaixa}
            />
          </div>
        </div>
      </div>

      {/* Question averages as table */}
      {current.questionAverages.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Médias por Pergunta
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {current.completedEvaluators} de {current.totalEvaluators} avaliadores responderam
          </p>

          {/* Desempenho table */}
          <div className="mt-5">
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Desempenho (Q1–Q6)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="py-2 pr-4 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th className="py-2 pr-4 text-left font-medium text-gray-500 dark:text-gray-400">Critério</th>
                    <th className="py-2 text-right font-medium text-gray-500 dark:text-gray-400">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {desempenhoAverages.map((qa) => (
                    <tr key={qa.key} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{qa.key.toUpperCase()}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{qa.label}</td>
                      <td className={`py-2 text-right font-semibold ${getScoreColor(qa.average)}`}>
                        {qa.average.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Potencial table */}
          <div className="mt-5">
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Potencial (Q7–Q12)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="py-2 pr-4 text-left font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th className="py-2 pr-4 text-left font-medium text-gray-500 dark:text-gray-400">Critério</th>
                    <th className="py-2 text-right font-medium text-gray-500 dark:text-gray-400">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {potencialAverages.map((qa) => (
                    <tr key={qa.key} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{qa.key.toUpperCase()}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{qa.label}</td>
                      <td className={`py-2 text-right font-semibold ${getScoreColor(qa.average)}`}>
                        {qa.average.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Evaluator descriptive feedback (Q13/Q14) — only for managers/admins */}
      {showDescriptive && current.evaluatorDetails.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Feedback Descritivo dos Avaliadores
          </h3>
          <div className="mt-4 space-y-4">
            {current.evaluatorDetails.map((detail, idx) => (
              <div key={idx} className="rounded-md border border-gray-100 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{detail.name}</p>
                {detail.q13PontosFortes && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pontos Fortes</p>
                    <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{detail.q13PontosFortes}</p>
                  </div>
                )}
                {detail.q14Oportunidade && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Oportunidades de Melhoria</p>
                    <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">{detail.q14Oportunidade}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
