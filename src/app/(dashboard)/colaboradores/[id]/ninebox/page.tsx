import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getNineBoxDashboard } from "../../ninebox-actions";
import { NineBoxDashboard } from "@/components/ninebox-dashboard";

export default async function NineBoxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role || "employee";
  if (role === "employee") {
    redirect("/perfil");
  }

  const { id } = await params;
  const result = await getNineBoxDashboard(id);

  if (result.error) {
    notFound();
  }

  const data = result.data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Nine Box — {data.employeeName}
        </h1>
        {data.current && data.current.status === "open" && (
          <p className="mt-1 text-sm font-medium text-amber-600">
            Avaliação em andamento — resultado parcial
          </p>
        )}
      </div>

      {!data.current ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          Nenhuma avaliação Nine Box disponível para este colaborador.
        </div>
      ) : (
        <NineBoxDashboard current={data.current} previous={data.previous} />
      )}
    </div>
  );
}
