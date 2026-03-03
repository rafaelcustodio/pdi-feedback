import { getMyNineBoxResult, getMyFullProfile, getMyPendingChangeRequests } from "./actions";
import { PerfilNineBox } from "@/components/perfil-ninebox";
import { PerfilTabs } from "@/components/perfil-tabs";

export default async function PerfilPage() {
  const [nineBoxResult, profileResult, pendingCRsResult] = await Promise.all([
    getMyNineBoxResult(),
    getMyFullProfile(),
    getMyPendingChangeRequests(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Meu Perfil</h1>

      <PerfilTabs
        profile={profileResult.data ?? null}
        pendingChangeRequests={pendingCRsResult.data ?? []}
        nineBoxContent={
          <PerfilNineBox result={nineBoxResult.data ?? null} />
        }
      />
    </div>
  );
}
