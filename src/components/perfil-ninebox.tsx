import { NineBoxGrid } from "@/components/ninebox-grid";
import type { MyNineBoxResult } from "@/app/(dashboard)/perfil/actions";

interface PerfilNineBoxProps {
  result: MyNineBoxResult | null;
}

export function PerfilNineBox({ result }: PerfilNineBoxProps) {
  if (!result) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-gray-500">
          Nenhuma avaliação Nine Box disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Averages */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Média de Desempenho
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {result.desempenho.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Média de Potencial
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {result.potencial.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Média Geral</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {result.mediaGeral.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Quadrant name */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-sm font-medium text-gray-500">Quadrante</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {result.quadrante}
        </p>
      </div>

      {/* 3x3 Grid */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Posicionamento no Nine Box
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Baixo: 1,00–2,33 | Médio: 2,34–3,66 | Alto: 3,67–5,00
        </p>
        <div className="mt-4 flex justify-center">
          <NineBoxGrid
            desempenhoFaixa={result.desempenhoFaixa}
            potencialFaixa={result.potencialFaixa}
          />
        </div>
      </div>
    </div>
  );
}
