import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPDIById } from "../actions";
import { PDIForm } from "@/components/pdi-form";
import { PDITracking } from "@/components/pdi-tracking";

export default async function PDIDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const pdi = await getPDIById(id);

  if (!pdi) {
    notFound();
  }

  const userId = session.user.id;
  const role = session.user.role || "employee";

  // Can edit only draft PDIs, and only the creator manager or admin
  const canEdit =
    pdi.status === "draft" &&
    (role === "admin" || pdi.managerId === userId);

  if (canEdit) {
    return (
      <div className="mx-auto max-w-3xl">
        <PDIForm
          mode="edit"
          initialData={{
            id: pdi.id,
            employeeId: pdi.employeeId,
            employeeName: pdi.employeeName,
            period: pdi.period,
            conductedAt: pdi.conductedAt
              ? new Date(pdi.conductedAt).toISOString().split("T")[0]
              : "",
            createdAt: pdi.createdAt.toISOString(),
            goals: pdi.goals.map((g) => ({
              id: g.id,
              title: g.title,
              description: g.description ?? "",
              competency: g.competency,
              status: g.status,
              dueDate: g.dueDate
                ? new Date(g.dueDate).toISOString().split("T")[0]
                : "",
            })),
          }}
        />
      </div>
    );
  }

  // Interactive tracking view for active/completed/cancelled PDIs
  return (
    <div className="mx-auto max-w-3xl">
      <PDITracking pdi={pdi} userId={userId} userRole={role} />
    </div>
  );
}
