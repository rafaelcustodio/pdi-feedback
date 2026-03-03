import { getEffectiveAuth } from "@/lib/impersonation";
import { redirect, notFound } from "next/navigation";
import { getNineBoxDashboard } from "../../ninebox-actions";
import { NineBoxDashboard } from "@/components/ninebox-dashboard";

export default async function NineBoxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getEffectiveAuth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role || "employee";
  const { id } = await params;

  // Employees can only view their own Nine Box
  if (role === "employee" && id !== session.user.id) {
    notFound();
  }

  const result = await getNineBoxDashboard(id);

  if (result.error) {
    notFound();
  }

  const data = result.data!;
  const isEmployee = role === "employee";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Nine Box — {data.employeeName}
        </h1>
        {data.current && data.current.status === "open" && (
          <p className="mt-1 text-sm font-medium text-amber-600">
            Avaliação em andamento — resultado parcial
          </p>
        )}
      </div>

      {!data.current ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Nenhuma avaliação Nine Box disponível para este colaborador.
        </div>
      ) : (
        <NineBoxDashboard
          current={data.current}
          previous={data.previous}
          showDescriptive={!isEmployee}
        />
      )}
    </div>
  );
}
