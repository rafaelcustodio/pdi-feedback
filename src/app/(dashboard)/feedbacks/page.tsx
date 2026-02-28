import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFeedbacks,
  getAvailableYears,
  getSubordinatesForFeedback,
  getScheduledFeedbackCountForEmployee,
} from "./actions";
import { FeedbackTable } from "@/components/feedback-table";

export default async function FeedbacksPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    year?: string;
    conductedAtFrom?: string;
    conductedAtTo?: string;
    status?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role || "employee";
  const params = await searchParams;
  const search = params.search ?? "";
  const year = params.year ?? "";
  const conductedAtFrom = params.conductedAtFrom ?? "";
  const conductedAtTo = params.conductedAtTo ?? "";
  const statusFilter = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const canCreate = role !== "employee";
  const isEmployeeView = role === "employee";

  const [data, availableYears, subordinates, scheduledCount] = await Promise.all([
    getFeedbacks(search, page, 10, year, conductedAtFrom, conductedAtTo, statusFilter),
    getAvailableYears(),
    canCreate ? getSubordinatesForFeedback() : Promise.resolve([]),
    isEmployeeView ? getScheduledFeedbackCountForEmployee() : Promise.resolve(0),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEmployeeView ? "Meus Feedbacks" : "Feedbacks"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {isEmployeeView
            ? "Visualize o histórico de feedbacks recebidos."
            : "Gerencie os feedbacks dos colaboradores da sua equipe."}
        </p>
      </div>

      <FeedbackTable
        feedbacks={data.feedbacks}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        search={search}
        year={year}
        conductedAtFrom={conductedAtFrom}
        conductedAtTo={conductedAtTo}
        statusFilter={statusFilter}
        availableYears={availableYears}
        canCreate={canCreate}
        isEmployeeView={isEmployeeView}
        subordinates={subordinates}
        scheduledCount={scheduledCount}
      />
    </div>
  );
}
