import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getEmployeeById, getOrgUnitsFlat, getEmployeeActivePDI } from "../actions";
import { EmployeeForm } from "@/components/employee-form";
import { EmployeePDISection } from "@/components/employee-pdi-section";

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

  const activePdi =
    employee.evaluationMode === "pdi" ? await getEmployeeActivePDI(id) : null;

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
      {employee.evaluationMode === "pdi" && (
        <EmployeePDISection
          employeeId={employee.id}
          activePdiId={activePdi?.id ?? null}
        />
      )}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Nine Box</h3>
          <Link
            href={`/colaboradores/${id}/ninebox`}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Nine Box
          </Link>
        </div>
      </div>
    </div>
  );
}
