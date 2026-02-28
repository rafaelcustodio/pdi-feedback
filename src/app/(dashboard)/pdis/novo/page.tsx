import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSubordinatesForPDI } from "../actions";
import { PDIForm } from "@/components/pdi-form";

export default async function NovoPDIPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role || "employee";

  // Only managers and admins can create PDIs
  if (role === "employee") {
    redirect("/pdis");
  }

  const subordinates = await getSubordinatesForPDI();

  return (
    <div className="mx-auto max-w-3xl">
      <PDIForm mode="create" subordinates={subordinates} />
    </div>
  );
}
