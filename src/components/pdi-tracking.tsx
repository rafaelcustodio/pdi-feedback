"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Circle,
  XCircle,
} from "lucide-react";
import type { PDIDetail } from "@/app/(dashboard)/pdis/actions";
import {
  addEvidence,
  addComment,
  updateGoalStatus,
} from "@/app/(dashboard)/pdis/actions";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-700",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const goalStatusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluída",
};

const goalStatusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const goalStatusIcons: Record<string, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
};

interface PDITrackingProps {
  pdi: PDIDetail;
  userId: string;
  userRole: string;
}

export function PDITracking({ pdi, userId, userRole }: PDITrackingProps) {
  const isEmployee = pdi.employeeId === userId;
  const isManager = pdi.managerId === userId || userRole === "admin";

  const completedGoals = pdi.goals.filter(
    (g) => g.status === "completed"
  ).length;
  const progressPct =
    pdi.goals.length > 0
      ? Math.round((completedGoals / pdi.goals.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pdis"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              PDI - {pdi.employeeName}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusColors[pdi.status] ?? "bg-gray-100 text-gray-500"
              }`}
            >
              {statusLabels[pdi.status] ?? pdi.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Período: {pdi.period} | Gestor: {pdi.managerName}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {pdi.goals.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Progresso</span>
            <span className="text-gray-500">
              {completedGoals}/{pdi.goals.length} metas ({progressPct}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Goals */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">
          Metas ({pdi.goals.length})
        </h2>

        {pdi.goals.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma meta cadastrada.</p>
        ) : (
          <div className="space-y-4">
            {pdi.goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isEmployee={isEmployee}
                isManager={isManager}
                pdiStatus={pdi.status}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <CommentsSection
        pdiId={pdi.id}
        comments={pdi.comments}
        userId={userId}
      />

      {/* Metadata */}
      <div className="text-xs text-gray-400">
        {pdi.conductedAt && (
          <>
            Realizado em{" "}
            {new Date(pdi.conductedAt).toLocaleDateString("pt-BR")} |{" "}
          </>
        )}
        Criado em {new Date(pdi.createdAt).toLocaleDateString("pt-BR")} |
        Última atualização em{" "}
        {new Date(pdi.updatedAt).toLocaleDateString("pt-BR")}
      </div>
    </div>
  );
}

// ============================================================
// Goal Card with status management and evidence
// ============================================================

function GoalCard({
  goal,
  isEmployee,
  isManager,
  pdiStatus,
}: {
  goal: PDIDetail["goals"][number];
  isEmployee: boolean;
  isManager: boolean;
  pdiStatus: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const StatusIcon = goalStatusIcons[goal.status] ?? Circle;
  const isActive = pdiStatus === "active";

  async function handleStatusChange(
    newStatus: "pending" | "in_progress" | "completed"
  ) {
    setLoading(true);
    setError(null);
    const result = await updateGoalStatus(goal.id, newStatus);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Erro ao atualizar status");
    }
  }

  async function handleAddEvidence() {
    if (!evidenceDesc.trim()) return;
    setLoading(true);
    setError(null);
    const result = await addEvidence(goal.id, evidenceDesc);
    setLoading(false);
    if (result.success) {
      setEvidenceDesc("");
      setShowEvidenceForm(false);
    } else {
      setError(result.error ?? "Erro ao adicionar evidência");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      {/* Goal Header */}
      <div
        className="cursor-pointer p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <StatusIcon
                size={16}
                className={
                  goal.status === "completed"
                    ? "text-green-500"
                    : goal.status === "in_progress"
                      ? "text-blue-500"
                      : "text-gray-400"
                }
              />
              <h3 className="font-medium text-gray-900">{goal.title}</h3>
            </div>
            {goal.description && (
              <p className="mt-1 pl-6 text-sm text-gray-600">
                {goal.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3 pl-6 text-xs text-gray-500">
              <span className="rounded bg-gray-200 px-2 py-0.5">
                {goal.competency}
              </span>
              {goal.dueDate && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(goal.dueDate).toLocaleDateString("pt-BR")}
                </span>
              )}
              {goal.evidences.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <FileText size={12} />
                  {goal.evidences.length} evidência
                  {goal.evidences.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                goalStatusColors[goal.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {goalStatusLabels[goal.status] ?? goal.status}
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4">
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Status Actions */}
          {isActive && (isEmployee || isManager) && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Alterar Status:
              </p>
              <div className="flex flex-wrap gap-2">
                {isEmployee && goal.status !== "in_progress" && (
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <Clock size={12} />
                    Marcar Em Andamento
                  </button>
                )}
                {isEmployee && goal.status !== "completed" && (
                  <button
                    onClick={() => handleStatusChange("completed")}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} />
                    Marcar Concluída
                  </button>
                )}
                {isManager && goal.status === "completed" && (
                  <button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    Rejeitar Conclusão
                  </button>
                )}
                {isManager && goal.status === "completed" && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                    <CheckCircle2 size={12} />
                    Aprovada
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Evidences List */}
          {goal.evidences.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Evidências ({goal.evidences.length}):
              </p>
              <div className="space-y-2">
                {goal.evidences.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-md border border-gray-200 bg-white p-3"
                  >
                    <p className="text-sm text-gray-700">{ev.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(ev.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Evidence */}
          {isActive && (isEmployee || isManager) && (
            <div>
              {!showEvidenceForm ? (
                <button
                  onClick={() => setShowEvidenceForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                >
                  <Plus size={12} />
                  Adicionar Evidência
                </button>
              ) : (
                <div className="rounded-md border border-gray-200 bg-white p-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">
                    Nova Evidência:
                  </p>
                  <textarea
                    value={evidenceDesc}
                    onChange={(e) => setEvidenceDesc(e.target.value)}
                    placeholder="Descreva a evidência de progresso..."
                    rows={3}
                    className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowEvidenceForm(false);
                        setEvidenceDesc("");
                      }}
                      disabled={loading}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAddEvidence}
                      disabled={loading || !evidenceDesc.trim()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus size={12} />
                      {loading ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Comments Section
// ============================================================

function CommentsSection({
  pdiId,
  comments,
  userId,
}: {
  pdiId: string;
  comments: PDIDetail["comments"];
  userId: string;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    const result = await addComment(pdiId, content);
    setLoading(false);
    if (result.success) {
      setContent("");
    } else {
      setError(result.error ?? "Erro ao enviar comentário");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-medium text-gray-900">
        Comentários ({comments.length})
      </h2>

      {/* Comments List */}
      <div className="mb-4 max-h-96 space-y-3 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum comentário ainda. Inicie uma conversa sobre este PDI.
          </p>
        ) : (
          comments.map((comment) => {
            const isOwn = comment.authorId === userId;
            return (
              <div
                key={comment.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? "bg-blue-50 text-blue-900"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-xs font-medium">
                    {isOwn ? "Você" : comment.authorName}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">
                    {comment.content}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(comment.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input */}
      {error && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva um comentário..."
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Send size={14} />
          {loading ? "..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
