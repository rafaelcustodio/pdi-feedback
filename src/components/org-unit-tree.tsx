"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Check,
  X,
  Building2,
  Users,
} from "lucide-react";
import type { OrgUnitNode } from "@/app/(dashboard)/configuracoes/actions";
import {
  updateOrganizationalUnit,
  deleteOrganizationalUnit,
} from "@/app/(dashboard)/configuracoes/actions";

interface OrgUnitTreeProps {
  nodes: OrgUnitNode[];
}

export function OrgUnitTree({ nodes }: OrgUnitTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
        <Building2 className="mx-auto mb-3 text-gray-400" size={40} />
        <p className="text-sm text-gray-500">
          Nenhuma unidade organizacional cadastrada.
        </p>
        <p className="mt-1 text-sm text-gray-400">
          Use o formulário acima para criar a primeira unidade.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-100">
        {nodes.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} />
        ))}
      </ul>
    </div>
  );
}

function TreeNode({ node, depth }: { node: OrgUnitNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChildren = node.children.length > 0;
  const employeeCount = node._count.employeeHierarchies;

  async function handleSave() {
    if (!editName.trim()) return;
    setLoading(true);
    setError(null);
    const result = await updateOrganizationalUnit(node.id, editName);
    setLoading(false);
    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error ?? "Erro ao atualizar");
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const result = await deleteOrganizationalUnit(node.id);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Erro ao excluir");
    }
  }

  function handleCancel() {
    setEditName(node.name);
    setEditing(false);
    setError(null);
  }

  return (
    <li>
      <div
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 ${
            !hasChildren ? "invisible" : ""
          }`}
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <Building2 size={16} className="shrink-0 text-gray-400" />

        {/* Name - editable or static */}
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              disabled={loading}
            />
            <button
              onClick={handleSave}
              disabled={loading || !editName.trim()}
              className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
              aria-label="Salvar"
            >
              <Check size={16} />
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Cancelar"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm font-medium text-gray-800">
              {node.name}
            </span>

            {/* Employee count badge */}
            {employeeCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                <Users size={12} />
                {employeeCount}
              </span>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                aria-label="Editar nome"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                aria-label="Excluir unidade"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          className="px-3 pb-2 text-xs text-red-600"
          style={{ paddingLeft: `${depth * 24 + 52}px` }}
        >
          {error}
        </div>
      )}

      {/* Children */}
      {hasChildren && expanded && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
