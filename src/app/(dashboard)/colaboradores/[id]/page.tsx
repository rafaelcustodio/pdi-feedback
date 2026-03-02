import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getEmployeeById, getOrgUnitsFlat, getEmployeeSchedules, getEmployeeSectorSchedule } from "../actions";
import { EmployeeForm } from "@/components/employee-form";
import { ScheduleSection } from "@/components/schedule-section";

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
  const [employee, orgUnits, schedules, sectorSchedule] = await Promise.all([
    getEmployeeById(id),
    getOrgUnitsFlat(),
    getEmployeeSchedules(id),
    getEmployeeSectorSchedule(id),
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
        }}
      />
      <ScheduleSection
        employeeId={employee.id}
        initialPdiFrequency={schedules.pdiFrequency}
        initialPdiNextDueDate={schedules.pdiNextDueDate}
        initialFeedbackFrequency={schedules.feedbackFrequency}
        initialFeedbackNextDueDate={schedules.feedbackNextDueDate}
        sectorSchedule={sectorSchedule}
      />
    </div>
  );
}
