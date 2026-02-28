import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrganizationalUnits } from "./actions";
import { OrgUnitTree } from "@/components/org-unit-tree";
import { OrgUnitForm } from "@/components/org-unit-form";

export default async function ConfiguracoesPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const { tree, flat } = await getOrganizationalUnits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gerencie a estrutura organizacional da empresa.
        </p>
      </div>

      {/* Create form */}
      <OrgUnitForm parentOptions={flat} />

      {/* Tree view */}
      <div>
        <h2 className="mb-3 text-lg font-medium text-gray-800">
          Estrutura Organizacional
        </h2>
        <OrgUnitTree nodes={tree} />
      </div>
    </div>
  );
}
