import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFeedbacks, getAvailableYears } from "./actions";
import { FeedbackTable } from "@/components/feedback-table";

export default async function FeedbacksPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role || "employee";
  const params = await searchParams;
  const search = params.search ?? "";
  const year = params.year ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [data, availableYears] = await Promise.all([
    getFeedbacks(search, page, 10, year),
    getAvailableYears(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {role === "employee" ? "Meus Feedbacks" : "Feedbacks"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {role === "employee"
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
        availableYears={availableYears}
        canCreate={role !== "employee"}
        isEmployeeView={role === "employee"}
      />
    </div>
  );
}
