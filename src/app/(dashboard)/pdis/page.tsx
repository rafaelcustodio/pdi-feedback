import { getEffectiveAuth } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import { getPDIs, getSubordinatesWithoutActivePDI } from "./actions";
import { PDITable } from "@/components/pdi-table";
import { PdiMissingAlert } from "@/components/pdi-missing-alert";

export default async function PDIsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    conductedAtFrom?: string;
    conductedAtTo?: string;
    status?: string;
  }>;
}) {
  const session = await getEffectiveAuth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role || "employee";
  const params = await searchParams;
  const search = params.search ?? "";
  const conductedAtFrom = params.conductedAtFrom ?? "";
  const conductedAtTo = params.conductedAtTo ?? "";
  const statusFilter = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [data, subordinatesWithoutPDI] = await Promise.all([
    getPDIs(search, page, 10, conductedAtFrom, conductedAtTo, statusFilter),
    role !== "employee" ? getSubordinatesWithoutActivePDI() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {role === "employee" ? "Meus PDIs" : "Planos de Desenvolvimento Individual"}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {role === "employee"
            ? "Acompanhe seus planos de desenvolvimento individual."
            : "Gerencie os PDIs dos colaboradores da sua equipe."}
        </p>
      </div>

      {role !== "employee" && (
        <PdiMissingAlert subordinates={subordinatesWithoutPDI} />
      )}

      <PDITable
        pdis={data.pdis}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        search={search}
        conductedAtFrom={conductedAtFrom}
        conductedAtTo={conductedAtTo}
        statusFilter={statusFilter}
      />
    </div>
  );
}
