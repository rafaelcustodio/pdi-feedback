import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSubordinatesForFeedback } from "../actions";
import { FeedbackForm } from "@/components/feedback-form";

export default async function NovoFeedbackPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role || "employee";

  // Only managers and admins can create feedback
  if (role === "employee") {
    redirect("/feedbacks");
  }

  const subordinates = await getSubordinatesForFeedback();

  return (
    <div className="mx-auto max-w-3xl">
      <FeedbackForm mode="create" subordinates={subordinates} />
    </div>
  );
}
