import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getEmployeeById, getOrgUnitsFlat } from "../actions";
import { EmployeeForm } from "@/components/employee-form";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [employee, orgUnits] = await Promise.all([
    getEmployeeById(id),
    getOrgUnitsFlat(),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <EmployeeForm
      mode="edit"
      orgUnits={orgUnits}
      initialData={{
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        orgUnitId: employee.hierarchy?.organizationalUnitId,
        managerId: employee.hierarchy?.managerId,
      }}
    />
  );
}
