import { AvisoDatos } from "@/components/ui/avisos";
import { Dotacion } from "@/components/views/dotacion";
import { loadDotacion, loadSucursales } from "@/lib/data";
import { currentMonthKey } from "@/lib/domain/periods";

export const metadata = { title: "Dotación" };

export default async function DotacionPage() {
  const [dotacion, sucursales] = await Promise.all([loadDotacion(), loadSucursales()]);

  return (
    <div>
      <AvisoDatos configured={sucursales.configured} error={sucursales.error || dotacion.error} />
      <Dotacion datos={dotacion.data} sucursales={sucursales.data} mesActual={currentMonthKey()} />
    </div>
  );
}
