import { getMyNineBoxResult } from "./actions";
import { PerfilNineBox } from "@/components/perfil-ninebox";
import { PerfilTabs } from "@/components/perfil-tabs";

export default async function PerfilPage() {
  const nineBoxResult = await getMyNineBoxResult();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Meu Perfil</h1>

      <PerfilTabs
        nineBoxContent={
          <PerfilNineBox result={nineBoxResult.data ?? null} />
        }
      />
    </div>
  );
}
