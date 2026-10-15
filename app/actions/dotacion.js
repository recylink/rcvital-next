"use server";

import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/apps-script";
import { run } from "@/lib/result";
import { saveDotacion } from "@/lib/sheets/dotacion";
import { cantidadValida, GENEROS } from "@/lib/domain/dotacion";

/**
 * Guarda los cambios de un mes de Dotación (propia de Vital). Recibe el patch
 * { upsert, remove } que arma la pantalla; se valida acá porque el navegador no
 * es de confiar.
 */
export async function saveDotacionAction(patch) {
  return run(async () => {
    const upsert = (patch && patch.upsert) || [];
    const remove = (patch && patch.remove) || [];
    for (const d of [...upsert, ...remove]) {
      if (!d.sucursal || !/^\d{4}-\d{2}$/.test(d.mes || "") || !GENEROS.includes(d.genero)) {
        throw new Error("Celda de dotación inválida: falta sucursal, mes o género.");
      }
    }
    for (const d of upsert) {
      if (cantidadValida(d.cantidad) == null) {
        throw new Error(`Cantidad inválida (${d.cantidad}): debe ser un entero mayor o igual a 0.`);
      }
    }
    if (!upsert.length && !remove.length) return { escrito: null };

    const escrito = await saveDotacion({ upsert, remove });
    revalidateTag(TAGS.dotacion);
    return { escrito };
  });
}
