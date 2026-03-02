import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getFeedbackById } from "../actions";
import { FeedbackForm } from "@/components/feedback-form";
import { FeedbackReadOnly } from "@/components/feedback-read-only";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const feedback = await getFeedbackById(id);

  if (!feedback) {
    notFound();
  }

  const userId = session.user.id;
  const role = session.user.role || "employee";

  // Check if the current user can edit this feedback
  const canEdit =
    (feedback.status === "draft" || feedback.status === "scheduled") &&
    (role === "admin" || feedback.managerId === userId);

  if (canEdit) {
    return (
      <div className="mx-auto max-w-3xl">
        <FeedbackForm
          mode="edit"
          initialData={{
            id: feedback.id,
            employeeId: feedback.employeeId,
            employeeName: feedback.employeeName,
            period: feedback.period,
            content: feedback.content ?? "",
            strengths: feedback.strengths ?? "",
            improvements: feedback.improvements ?? "",
            rating: feedback.rating ?? 0,
            scheduledDate: feedback.scheduledAt
              ? new Date(feedback.scheduledAt).toISOString().split("T")[0]
              : "",
            createdAt: new Date(feedback.createdAt).toISOString(),
            status: feedback.status,
            scheduledAt: feedback.scheduledAt
              ? new Date(feedback.scheduledAt).toISOString().split("T")[0]
              : undefined,
          }}
        />
      </div>
    );
  }

  // Read-only view for submitted feedbacks or employees viewing their feedback
  return (
    <div className="mx-auto max-w-3xl">
      <FeedbackReadOnly feedback={feedback} />
    </div>
  );
}
