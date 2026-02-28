import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrgUnitsFlat } from "../actions";
import { EmployeeForm } from "@/components/employee-form";

export default async function NovoColaboradorPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const orgUnits = await getOrgUnitsFlat();

  return <EmployeeForm mode="create" orgUnits={orgUnits} />;
}
