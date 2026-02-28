"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import {
  createFeedback,
  updateFeedback,
} from "@/app/(dashboard)/feedbacks/actions";
import type { SubordinateOption } from "@/app/(dashboard)/feedbacks/actions";

interface FeedbackFormProps {
  mode: "create" | "edit";
  subordinates?: SubordinateOption[];
  initialData?: {
    id: string;
    employeeId: string;
    employeeName: string;
    period: string;
    content: string;
    strengths: string;
    improvements: string;
    rating: number;
    conductedAt: string;
    createdAt?: string;
  };
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className="p-0.5 disabled:cursor-default"
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
        >
          <Star
            size={24}
            className={`transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-600">{value}/5</span>
      )}
    </div>
  );
}

export function FeedbackForm({
  mode,
  subordinates,
  initialData,
}: FeedbackFormProps) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId ?? "");
  const [period, setPeriod] = useState(initialData?.period ?? "");
  const [conductedAt, setConductedAt] = useState(initialData?.conductedAt ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [strengths, setStrengths] = useState(initialData?.strengths ?? "");
  const [improvements, setImprovements] = useState(
    initialData?.improvements ?? ""
  );
  const [rating, setRating] = useState(initialData?.rating ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    (mode === "create" ? !!employeeId : true) &&
    !!period.trim() &&
    !!conductedAt &&
    !!content.trim() &&
    !!strengths.trim() &&
    !!improvements.trim() &&
    rating >= 1 &&
    rating <= 5;

  async function handleSave(submit: boolean) {
    setLoading(true);
    setError(null);

    let result;
    if (mode === "create") {
      result = await createFeedback({
        employeeId,
        period,
        content,
        strengths,
        improvements,
        rating,
        conductedAt,
        submit,
      });
    } else {
      result = await updateFeedback(initialData!.id, {
        period,
        content,
        strengths,
        improvements,
        rating,
        conductedAt,
        submit,
      });
    }

    setLoading(false);

    if (result.success) {
      router.push("/feedbacks");
    } else {
      setError(result.error ?? "Erro ao salvar");
    }
  }

  function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    handleSave(false);
  }

  return (
    <form onSubmit={handleSubmitForm} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/feedbacks"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === "create" ? "Novo Feedback" : "Editar Feedback"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {mode === "create"
              ? "Crie um feedback para um colaborador da sua equipe."
              : `Edite o feedback de ${initialData?.employeeName}.`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-4">
          {/* Employee selection (create mode only) */}
          {mode === "create" && subordinates && (
            <div>
              <label
                htmlFor="fb-employee"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Colaborador *
              </label>
              <select
                id="fb-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                disabled={loading}
              >
                <option value="">Selecione um colaborador</option>
                {subordinates.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Employee name (edit mode - read only) */}
          {mode === "edit" && initialData && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Colaborador
              </label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {initialData.employeeName}
              </p>
            </div>
          )}

          {/* Period */}
          <div>
            <label
              htmlFor="fb-period"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Período *
            </label>
            <input
              id="fb-period"
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Ex: Janeiro 2026, Q1 2026, 1º Semestre 2026"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          {/* Conducted At */}
          <div>
            <label
              htmlFor="fb-conducted-at"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Data de Realização *
            </label>
            <input
              id="fb-conducted-at"
              type="date"
              value={conductedAt}
              onChange={(e) => setConductedAt(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Data em que a sessão de feedback foi realizada.
            </p>
          </div>

          {/* Created At (edit mode only - read only info) */}
          {mode === "edit" && initialData?.createdAt && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de Criação
              </label>
              <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {new Date(initialData.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Avaliação *
            </label>
            <StarRating
              value={rating}
              onChange={setRating}
              disabled={loading}
            />
          </div>

          {/* Strengths */}
          <div>
            <label
              htmlFor="fb-strengths"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Pontos Fortes *
            </label>
            <textarea
              id="fb-strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Descreva os pontos fortes do colaborador neste período..."
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Improvements */}
          <div>
            <label
              htmlFor="fb-improvements"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Pontos de Melhoria *
            </label>
            <textarea
              id="fb-improvements"
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="Descreva os pontos que o colaborador pode melhorar..."
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="fb-content"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Conteúdo Geral *
            </label>
            <textarea
              id="fb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Comentários gerais sobre o desempenho do colaborador..."
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Link
          href="/feedbacks"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading || !period.trim() || !conductedAt || (mode === "create" && !employeeId)}
          className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? "Salvando..." : "Salvar Rascunho"}
        </button>
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={loading || !canSubmit}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          title={
            !canSubmit
              ? "Preencha todos os campos obrigatórios para submeter"
              : ""
          }
        >
          <Send size={16} />
          {loading ? "Submetendo..." : "Submeter Feedback"}
        </button>
      </div>
    </form>
  );
}
