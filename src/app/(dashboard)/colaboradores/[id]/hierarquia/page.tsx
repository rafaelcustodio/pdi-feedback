import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEmployeeById, getEmployeeHierarchyTree } from "../../actions";
import { EmployeeHierarchy } from "@/components/employee-hierarchy";

export default async function HierarquiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [employee, tree] = await Promise.all([
    getEmployeeById(id),
    getEmployeeHierarchyTree(id),
  ]);

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/colaboradores"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Hierarquia de {employee.name}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Visualize a posição hierárquica deste colaborador na organização.
          </p>
        </div>
      </div>

      <EmployeeHierarchy tree={tree} targetId={id} />
    </div>
  );
}
