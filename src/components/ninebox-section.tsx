"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  startNineBoxEvaluation,
} from "@/app/(dashboard)/feedbacks/ninebox-actions";
import type {
  NineBoxStatusData,
  EvaluatorCandidate,
} from "@/app/(dashboard)/feedbacks/ninebox-actions";

interface NineBoxSectionProps {
  feedbackId: string;
  isManager: boolean;
  isCancelled: boolean;
  nineBoxStatus: NineBoxStatusData | null;
  candidates: EvaluatorCandidate[];
}

export function NineBoxSection({
  feedbackId,
  isManager,
  isCancelled,
  nineBoxStatus,
  candidates,
}: NineBoxSectionProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Don't show anything if user is not manager/admin or feedback is cancelled
  if (!isManager || isCancelled) return null;

  // If no evaluation exists, show the "Iniciar Nine Box" button
  if (!nineBoxStatus) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Nine Box</h3>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Iniciar Nine Box
          </button>
        </div>

        {showModal && (
          <StartNineBoxModal
            candidates={candidates}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            error={error}
            isPending={isPending}
            onCancel={() => {
              setShowModal(false);
              setSelectedIds([]);
              setSearchTerm("");
              setError(null);
            }}
            onSubmit={() => {
              setError(null);
              startTransition(async () => {
                const result = await startNineBoxEvaluation(
                  feedbackId,
                  selectedIds
                );
                if (result.success) {
                  setShowModal(false);
                  setSelectedIds([]);
                  setSearchTerm("");
                  router.refresh();
                } else {
                  setError(result.error || "Erro ao iniciar avaliação");
                }
              });
            }}
          />
        )}
      </div>
    );
  }

  // Evaluation exists — show status
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Nine Box</h3>
        <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
          Nine Box em andamento — {nineBoxStatus.completedEvaluators}/
          {nineBoxStatus.totalEvaluators} respondidos
        </span>
      </div>
    </div>
  );
}

function StartNineBoxModal({
  candidates,
  selectedIds,
  setSelectedIds,
  searchTerm,
  setSearchTerm,
  error,
  isPending,
  onCancel,
  onSubmit,
}: {
  candidates: EvaluatorCandidate[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  error: string | null;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCandidate = (id: string) => {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">
          Iniciar Avaliação Nine Box
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Selecione os colegas que irão avaliar o colaborador.
        </p>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Candidate list */}
        <div className="mt-3 max-h-60 overflow-y-auto rounded-md border border-gray-200">
          {filteredCandidates.length === 0 ? (
            <p className="p-3 text-center text-sm text-gray-500">
              Nenhum usuário encontrado
            </p>
          ) : (
            filteredCandidates.map((candidate) => (
              <label
                key={candidate.id}
                className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(candidate.id)}
                  onChange={() => toggleCandidate(candidate.id)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {candidate.name}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {candidate.email}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>

        {selectedIds.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {selectedIds.length} avaliador{selectedIds.length !== 1 ? "es" : ""}{" "}
            selecionado{selectedIds.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending || selectedIds.length === 0}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "Disparando..." : "Disparar Avaliação"}
          </button>
        </div>
      </div>
    </div>
  );
}
