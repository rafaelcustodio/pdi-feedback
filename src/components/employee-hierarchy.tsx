"use client";

import { ChevronDown, User, Building2 } from "lucide-react";
import type { HierarchyNode } from "@/app/(dashboard)/colaboradores/actions";

interface EmployeeHierarchyProps {
  tree: HierarchyNode[];
  targetId: string;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  employee: "Colaborador",
};

export function EmployeeHierarchy({ tree, targetId }: EmployeeHierarchyProps) {
  if (tree.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
        <User className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-sm text-gray-500">
          Nenhuma hierarquia definida para este colaborador.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {tree.map((node) => (
        <HierarchyNodeComponent
          key={node.id}
          node={node}
          targetId={targetId}
          depth={0}
        />
      ))}
    </div>
  );
}

function HierarchyNodeComponent({
  node,
  targetId,
  depth,
}: {
  node: HierarchyNode;
  targetId: string;
  depth: number;
}) {
  const isTarget = node.id === targetId;

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-md px-3 py-2 ${
          isTarget ? "bg-blue-50 ring-1 ring-blue-200" : ""
        }`}
        style={{ marginLeft: `${depth * 28}px` }}
      >
        <User
          size={18}
          className={isTarget ? "text-blue-600" : "text-gray-400"}
        />
        <div className="flex-1">
          <span
            className={`text-sm font-medium ${
              isTarget ? "text-blue-700" : "text-gray-800"
            }`}
          >
            {node.name}
          </span>
          <span className="ml-2 text-xs text-gray-500">
            {roleLabels[node.role] ?? node.role}
          </span>
          {node.orgUnit && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-400">
              <Building2 size={10} />
              {node.orgUnit}
            </span>
          )}
        </div>
      </div>
      {node.children.length > 0 && (
        <>
          <div
            className="flex items-center py-0.5"
            style={{ marginLeft: `${depth * 28 + 20}px` }}
          >
            <ChevronDown size={14} className="text-gray-300" />
          </div>
          {node.children.map((child) => (
            <HierarchyNodeComponent
              key={child.id}
              node={child}
              targetId={targetId}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </div>
  );
}
