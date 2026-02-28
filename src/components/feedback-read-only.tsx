"use client";

import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import type { FeedbackDetail } from "@/app/(dashboard)/feedbacks/actions";

interface FeedbackReadOnlyProps {
  feedback: FeedbackDetail;
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Submetido",
};

export function FeedbackReadOnly({ feedback }: FeedbackReadOnlyProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/feedbacks"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">
            Feedback - {feedback.employeeName}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Feedback realizado por {feedback.managerName} • Período:{" "}
            {feedback.period}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            feedback.status === "submitted"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {statusLabels[feedback.status] ?? feedback.status}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="space-y-6">
          {/* Rating */}
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Avaliação
            </h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={24}
                  className={
                    star <= (feedback.rating ?? 0)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
              {feedback.rating && (
                <span className="ml-2 text-sm text-gray-600">
                  {feedback.rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Strengths */}
          {feedback.strengths && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Pontos Fortes
              </h3>
              <p className="whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                {feedback.strengths}
              </p>
            </div>
          )}

          {/* Improvements */}
          {feedback.improvements && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Pontos de Melhoria
              </h3>
              <p className="whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                {feedback.improvements}
              </p>
            </div>
          )}

          {/* Content */}
          {feedback.content && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">
                Conteúdo Geral
              </h3>
              <p className="whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                {feedback.content}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
            <p>
              Criado em:{" "}
              {new Date(feedback.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              Última atualização:{" "}
              {new Date(feedback.updatedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
