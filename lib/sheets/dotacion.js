import "server-only";
import { apiGet, apiPostSoloSdk, TAGS } from "../apps-script";
import { unflattenDotacion } from "../domain/dotacion";
import { nextConsumoId } from "../domain/ids";

// Dotación ↔ hoja "Dotación" (propia de Vital, ver CLIENTE.md).
// Columnas: [ID, Sucursal (id), Mes (YYYY-MM), Género, Cantidad].

export async function readDotacion() {
  const data = await apiGet({ action: "getDotacion" }, { tag: TAGS.dotacion, revalidate: 30 });
  return unflattenDotacion((data && data.rows) || []);
}

/**
 * Escribe solo las celdas que cambiaron. El ID nuevo solo se usa si la fila no
 * existía: `upsertDotacion` conserva el de la planilla.
 */
export async function saveDotacion({ upsert, remove }) {
  return apiPostSoloSdk({
    action: "upsertDotacion",
    rows: (upsert || []).map((d) => [nextConsumoId("dot"), d.sucursal, d.mes, d.genero, d.cantidad]),
    remove: (remove || []).map((d) => [d.sucursal, d.mes, d.genero]),
  });
}
