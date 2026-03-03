import { getEffectiveAuth } from "@/lib/impersonation";
import { redirect } from "next/navigation";
import { getAccessibleUnits } from "./actions";
import { ProgramacaoPanel } from "@/components/programacao-panel";

export default async function ProgramacaoPage() {
  const session = await getEffectiveAuth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role || "employee";
  if (role === "employee") {
    redirect("/dashboard");
  }

  const units = await getAccessibleUnits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Programação</h1>
        <p className="mt-1 text-sm text-gray-600">
          Acompanhe e programe PDIs e feedbacks por setor e período.
        </p>
      </div>

      <ProgramacaoPanel units={units} />
    </div>
  );
}
