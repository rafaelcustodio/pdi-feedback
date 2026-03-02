import { redirect } from "next/navigation";

// In the continuous PDI model, PDIs are auto-created via getOrCreatePDI.
// Manual creation is no longer supported. Redirect to PDI list.
export default function NovoPDIPage() {
  redirect("/pdis");
}
