"use client";

import { useState, useTransition } from "react";
import { submitNineBoxResponse } from "@/app/(dashboard)/feedbacks/ninebox-actions";

interface NineBoxFormProps {
  evaluatorId: string;
  evaluateeName: string;
  feedbackPeriod: string;
}

const DESEMPENHO_QUESTIONS = [
  { key: "q1", label: "Qualidade do trabalho entregue" },
  { key: "q2", label: "Cumprimento de prazos e metas" },
  { key: "q3", label: "Conhecimento técnico e competências" },
  { key: "q4", label: "Capacidade de resolução de problemas" },
  { key: "q5", label: "Colaboração e trabalho em equipe" },
  { key: "q6", label: "Responsabilidade e comprometimento" },
] as const;

const POTENCIAL_QUESTIONS = [
  { key: "q7", label: "Capacidade de aprender novas habilidades" },
  { key: "q8", label: "Adaptabilidade a mudanças" },
  { key: "q9", label: "Iniciativa e proatividade" },
  { key: "q10", label: "Potencial para assumir maiores responsabilidades" },
  { key: "q11", label: "Habilidades de liderança e influência" },
  { key: "q12", label: "Visão estratégica e pensamento crítico" },
] as const;

const SCALE_OPTIONS = [
  { value: 1, label: "Ruim" },
  { value: 2, label: "Regular" },
  { value: 3, label: "Bom" },
  { value: 4, label: "Muito Bom" },
  { value: 5, label: "Ótimo" },
];

export function NineBoxForm({ evaluatorId, evaluateeName, feedbackPeriod }: NineBoxFormProps) {
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [q13, setQ13] = useState("");
  const [q14, setQ14] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const allNumericAnswered = [
    "q1", "q2", "q3", "q4", "q5", "q6",
    "q7", "q8", "q9", "q10", "q11", "q12",
  ].every((key) => answers[key] !== undefined);

  const allDescriptiveAnswered = q13.trim() !== "" && q14.trim() !== "";
  const canSubmit = allNumericAnswered && allDescriptiveAnswered && !isPending;

  function setAnswer(key: string, value: number) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const responses = {
        q1: answers.q1 as number,
        q2: answers.q2 as number,
        q3: answers.q3 as number,
        q4: answers.q4 as number,
        q5: answers.q5 as number,
        q6: answers.q6 as number,
        q7: answers.q7 as number,
        q8: answers.q8 as number,
        q9: answers.q9 as number,
        q10: answers.q10 as number,
        q11: answers.q11 as number,
        q12: answers.q12 as number,
        q13PontosFortes: q13.trim(),
        q14Oportunidade: q14.trim(),
      };

      const result = await submitNineBoxResponse(evaluatorId, responses);
      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || "Erro ao enviar avaliação");
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Obrigado!</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sua avaliação foi registrada.
          </p>
          <a
            href="/feedbacks"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Avaliação Nine Box — {evaluateeName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Período: {feedbackPeriod}
          </p>
          <p className="mt-3 text-sm text-gray-600">
            Avalie o colaborador nas questões abaixo usando a escala de 1 (Ruim) a 5 (Ótimo).
            Todas as questões são obrigatórias.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Desempenho Section */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Desempenho</h2>
          <p className="mb-5 text-sm text-gray-500">
            Avalie o desempenho atual do colaborador
          </p>
          <div className="space-y-6">
            {DESEMPENHO_QUESTIONS.map((q) => (
              <QuestionRow
                key={q.key}
                questionKey={q.key}
                label={q.label}
                value={answers[q.key]}
                onChange={(val) => setAnswer(q.key, val)}
              />
            ))}
          </div>
        </div>

        {/* Potencial Section */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Potencial</h2>
          <p className="mb-5 text-sm text-gray-500">
            Avalie o potencial de crescimento do colaborador
          </p>
          <div className="space-y-6">
            {POTENCIAL_QUESTIONS.map((q) => (
              <QuestionRow
                key={q.key}
                questionKey={q.key}
                label={q.label}
                value={answers[q.key]}
                onChange={(val) => setAnswer(q.key, val)}
              />
            ))}
          </div>
        </div>

        {/* Descritiva Section */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white px-8 py-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Avaliação Descritiva</h2>
          <p className="mb-5 text-sm text-gray-500">
            Descreva suas observações sobre o colaborador
          </p>

          <div className="mb-5">
            <label htmlFor="q13" className="mb-1.5 block text-sm font-medium text-gray-700">
              13. Pontos fortes do colaborador
            </label>
            <textarea
              id="q13"
              rows={4}
              value={q13}
              onChange={(e) => setQ13(e.target.value)}
              placeholder="Descreva os principais pontos fortes..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="q14" className="mb-1.5 block text-sm font-medium text-gray-700">
              14. Oportunidades de melhoria
            </label>
            <textarea
              id="q14"
              rows={4}
              value={q14}
              onChange={(e) => setQ14(e.target.value)}
              placeholder="Descreva as principais oportunidades de melhoria..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Enviando..." : "Enviar Avaliação"}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionRow({
  questionKey,
  label,
  value,
  onChange,
}: {
  questionKey: string;
  label: string;
  value: number | undefined;
  onChange: (val: number) => void;
}) {
  const questionNumber = questionKey.replace("q", "");

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-gray-700">
        {questionNumber}. {label}
      </p>
      <div className="flex gap-2">
        {SCALE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-1 flex-col items-center rounded-lg border px-2 py-2 text-xs transition-colors ${
              value === opt.value
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 font-medium"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="text-base font-semibold">{opt.value}</span>
            <span className="mt-0.5">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
