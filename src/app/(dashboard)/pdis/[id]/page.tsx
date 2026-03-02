import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPDIById } from "../actions";
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

  // Interactive tracking view for active/cancelled PDIs
  return (
    <div className="mx-auto max-w-3xl">
      <PDITracking pdi={pdi} userId={userId} userRole={role} />
    </div>
  );
}
