import { getEffectiveAuth } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import { getEmployees } from "./actions";
import { EmployeeTable } from "@/components/employee-table";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await getEffectiveAuth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const search = params.search ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const data = await getEmployees(search, page, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Colaboradores</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gerencie os colaboradores da empresa e seus vínculos hierárquicos.
        </p>
      </div>

      <EmployeeTable
        employees={data.employees}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        search={search}
      />
    </div>
  );
}
