import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPDIs } from "./actions";
import { PDITable } from "@/components/pdi-table";

export default async function PDIsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role || "employee";
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const data = await getPDIs(search, page, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {role === "employee" ? "Meus PDIs" : "Planos de Desenvolvimento Individual"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {role === "employee"
            ? "Acompanhe seus planos de desenvolvimento individual."
            : "Gerencie os PDIs dos colaboradores da sua equipe."}
        </p>
      </div>

      <PDITable
        pdis={data.pdis}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        search={search}
        canCreate={role !== "employee"}
      />
    </div>
  );
}
