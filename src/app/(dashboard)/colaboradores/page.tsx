import { getEffectiveAuth } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import { getEmployees, getPendingEmployees, getPendingEmployeesCount, getChangeRequests, getPendingChangeRequestsCount } from "./actions";
import { ColaboradoresTabs } from "@/components/colaboradores-tabs";

export default async function ColaboradoresPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; tab?: string; psearch?: string; ppage?: string; crsearch?: string; crpage?: string; crstatus?: string; crpagesize?: string }>;
}) {
  const session = await getEffectiveAuth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const tab = params.tab ?? "all";
  const search = params.search ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const psearch = params.psearch ?? "";
  const ppage = Math.max(1, parseInt(params.ppage ?? "1", 10) || 1);
  const crsearch = params.crsearch ?? "";
  const crpage = Math.max(1, parseInt(params.crpage ?? "1", 10) || 1);
  const crstatus = params.crstatus ?? "";
  const crpagesize = Math.max(10, parseInt(params.crpagesize ?? "50", 10) || 50);

  const [data, pendingData, pendingCount, changeRequestsData, crPendingCount] = await Promise.all([
    getEmployees(search, page, 10),
    getPendingEmployees(psearch, ppage, 10),
    getPendingEmployeesCount(),
    getChangeRequests({
      search: crsearch || undefined,
      status: crstatus || undefined,
      page: crpage,
      pageSize: crpagesize,
    }),
    getPendingChangeRequestsCount(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Colaboradores</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie os colaboradores da empresa e seus vínculos hierárquicos.
        </p>
      </div>

      <ColaboradoresTabs
        activeTab={tab}
        employees={data.employees}
        employeesTotal={data.total}
        employeesPage={data.page}
        employeesPageSize={data.pageSize}
        employeesSearch={search}
        pending={pendingData.employees}
        pendingTotal={pendingData.total}
        pendingPage={pendingData.page}
        pendingPageSize={pendingData.pageSize}
        pendingSearch={psearch}
        pendingCount={pendingCount}
        changeRequests={changeRequestsData.requests}
        changeRequestsTotal={changeRequestsData.total}
        changeRequestsPage={changeRequestsData.page}
        changeRequestsPageSize={changeRequestsData.pageSize}
        changeRequestsSearch={crsearch}
        changeRequestsStatus={crstatus}
        changeRequestsPendingCount={crPendingCount}
      />
    </div>
  );
}
