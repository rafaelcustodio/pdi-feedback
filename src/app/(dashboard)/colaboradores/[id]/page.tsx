import { getEffectiveAuth } from "@/lib/impersonation";
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
  const session = await getEffectiveAuth();
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
        isPending={!employee.hierarchy && !!employee.isActive}
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
          addressNumber: employee.addressNumber ?? undefined,
          addressComplement: employee.addressComplement ?? undefined,
          city: employee.city ?? undefined,
          state: employee.state ?? undefined,
          zipCode: employee.zipCode ?? undefined,
          personalEmail: employee.personalEmail ?? undefined,
          rg: employee.rg ?? undefined,
          ethnicity: employee.ethnicity ?? undefined,
          gender: employee.gender ?? undefined,
          maritalStatus: employee.maritalStatus ?? undefined,
          educationLevel: employee.educationLevel ?? undefined,
          livesWithDescription: employee.livesWithDescription ?? undefined,
          hasBradescoAccount: employee.hasBradescoAccount ?? undefined,
          bankAgency: employee.bankAgency ?? undefined,
          bankAccount: employee.bankAccount ?? undefined,
          hasOtherEmployment: employee.hasOtherEmployment ?? undefined,
          healthPlanOption: employee.healthPlanOption ?? undefined,
          wantsTransportVoucher: employee.wantsTransportVoucher ?? undefined,
          contractType: employee.contractType ?? undefined,
          shirtSize: employee.shirtSize ?? undefined,
          hasChildren: employee.hasChildren ?? undefined,
          childrenAges: employee.childrenAges ?? undefined,
          hasIRDependents: employee.hasIRDependents ?? undefined,
          hobbies: employee.hobbies,
          socialNetworks: employee.socialNetworks,
          favoriteBookMovieGenres: employee.favoriteBookMovieGenres ?? undefined,
          favoriteBooks: employee.favoriteBooks ?? undefined,
          favoriteMovies: employee.favoriteMovies ?? undefined,
          favoriteMusic: employee.favoriteMusic ?? undefined,
          admiredValues: employee.admiredValues ?? undefined,
          foodAllergies: employee.foodAllergies ?? undefined,
          hasPets: employee.hasPets ?? undefined,
          participateInVideos: employee.participateInVideos ?? undefined,
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
