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
    <div className="space-y-6">
      <EmployeeForm
        mode="edit"
        orgUnits={orgUnits}
        initialData={{
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          evaluationMode: employee.evaluationMode,
          orgUnitId: employee.hierarchy?.organizationalUnitId,
          managerId: employee.hierarchy?.managerId,
          admissionDate: employee.admissionDate?.toISOString().slice(0, 10),
          phone: employee.phone ?? undefined,
          cpf: employee.cpf ?? undefined,
          birthDate: employee.birthDate?.toISOString().slice(0, 10),
          jobTitle: employee.jobTitle ?? undefined,
          address: employee.address ?? undefined,
          city: employee.city ?? undefined,
          state: employee.state ?? undefined,
          zipCode: employee.zipCode ?? undefined,
        }}
      />
    </div>
  );
}
