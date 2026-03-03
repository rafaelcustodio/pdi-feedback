"use client";

import { useRouter } from "next/navigation";
import type { EmployeeListItem, ChangeRequestItem } from "@/app/(dashboard)/colaboradores/actions";
import { EmployeeTable } from "@/components/employee-table";
import { ChangeRequestsTable } from "@/components/change-requests-table";

interface ColaboradoresTabsProps {
  activeTab: string;
  employees: EmployeeListItem[];
  employeesTotal: number;
  employeesPage: number;
  employeesPageSize: number;
  employeesSearch: string;
  pending: EmployeeListItem[];
  pendingTotal: number;
  pendingPage: number;
  pendingPageSize: number;
  pendingSearch: string;
  pendingCount: number;
  changeRequests: ChangeRequestItem[];
  changeRequestsTotal: number;
  changeRequestsPage: number;
  changeRequestsPageSize: number;
  changeRequestsSearch: string;
  changeRequestsStatus: string;
  changeRequestsPendingCount: number;
}

export function ColaboradoresTabs({
  activeTab,
  employees,
  employeesTotal,
  employeesPage,
  employeesPageSize,
  employeesSearch,
  pending,
  pendingTotal,
  pendingPage,
  pendingPageSize,
  pendingSearch,
  pendingCount,
  changeRequests,
  changeRequestsTotal,
  changeRequestsPage,
  changeRequestsPageSize,
  changeRequestsSearch,
  changeRequestsStatus,
  changeRequestsPendingCount,
}: ColaboradoresTabsProps) {
  const router = useRouter();

  function switchTab(tab: string) {
    router.replace(`/colaboradores?tab=${tab}`);
  }

  const tabs = [
    { id: "all", label: "Colaboradores" },
    { id: "pending", label: "Cadastros Pendentes", count: pendingCount },
    { id: "changes", label: "Solicitações de Alteração", count: changeRequestsPendingCount },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                    isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "changes" ? (
        <ChangeRequestsTable
          requests={changeRequests}
          total={changeRequestsTotal}
          page={changeRequestsPage}
          pageSize={changeRequestsPageSize}
          search={changeRequestsSearch}
          statusFilter={changeRequestsStatus}
        />
      ) : activeTab === "pending" ? (
        <EmployeeTable
          employees={pending}
          total={pendingTotal}
          page={pendingPage}
          pageSize={pendingPageSize}
          search={pendingSearch}
          variant="pending"
        />
      ) : (
        <EmployeeTable
          employees={employees}
          total={employeesTotal}
          page={employeesPage}
          pageSize={employeesPageSize}
          search={employeesSearch}
        />
      )}
    </div>
  );
}
