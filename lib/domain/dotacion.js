// Dotación: personas que trabajaron en cada Sucursal en un mes, por género.
// Código propio de Vital (ver CLIENTE.md). Isomorfo y sin dependencias de
// servidor: lo usan la pantalla, la Server Action y las pruebas.
//
// Hoja "Dotación": [ID, Sucursal (id), Mes (YYYY-MM), Género, Cantidad].
// Un solo valor por sucursal × mes × género; corregir sobrescribe.

import { parseDate } from "./parse";

// Orden de la grilla. El DAE pide más categorías; las que faltan se declaran 0.
export const GENEROS = ["Hombre", "Mujer", "Trans masculino", "Trans femenino", "Sin informar"];

/**
 * Mes de una celda → "YYYY-MM". Las escrituras van con USER_ENTERED, así que
 * Sheets puede haber convertido "2026-05" en fecha; se lee de vuelta lo que sea.
 */
export function mesDe(v) {
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  const d = parseDate(s);
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : "";
}

/** Entero >= 0, o null si no lo es. */
export function cantidadValida(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** Filas crudas de la hoja → [{ sucursal, mes, genero, cantidad }]. */
export function unflattenDotacion(rows) {
  const out = [];
  for (const r of rows || []) {
    const sucursal = String(r[1] ?? "").trim();
    const mes = mesDe(r[2]);
    const genero = String(r[3] ?? "").trim();
    const cantidad = cantidadValida(r[4]);
    if (!sucursal || !mes || !genero || cantidad == null) continue;
    out.push({ sucursal, mes, genero, cantidad });
  }
  return out;
}

/** Clave de celda de la grilla. */
export const celda = (sucursal, genero) => `${sucursal}\u0000${genero}`;

/** Datos de un mes → { [celda]: cantidad }. */
export function grillaDelMes(datos, mes) {
  const g = {};
  for (const d of datos || []) if (d.mes === mes) g[celda(d.sucursal, d.genero)] = d.cantidad;
  return g;
}

/**
 * Diferencia entre la grilla guardada y la editada. Celda con número → upsert;
 * celda vaciada que tenía valor → remove. Lo que no cambió no viaja.
 */
export function patchDotacion(antes, ahora, mes) {
  const upsert = [];
  const remove = [];
  const claves = new Set([...Object.keys(antes || {}), ...Object.keys(ahora || {})]);
  for (const k of claves) {
    const [sucursal, genero] = k.split("\u0000");
    const a = antes?.[k];
    const b = ahora?.[k];
    if (b === "" || b == null) {
      if (a != null) remove.push({ sucursal, mes, genero });
    } else if (b !== a) {
      upsert.push({ sucursal, mes, genero, cantidad: b });
    }
  }
  return { upsert, remove };
}

/**
 * Vista anual: SUMA de los meses del año, por sucursal × género. El resultado son
 * personas-mes, NO personas (50 personas todo el año = 600). Decisión de Vital
 * (2026-10-15): se muestra la suma, etiquetada así para que no se copie al DAE
 * como dotación.
 *
 * Devuelve { [sucursal]: { porGenero: { [genero]: n }, total, meses } }, donde
 * `meses` es cuántos meses distintos tienen algún dato.
 */
export function anualPersonasMes(datos, anio) {
  const out = {};
  const pref = String(anio) + "-";
  for (const d of datos || []) {
    if (!d.mes.startsWith(pref)) continue;
    const s = (out[d.sucursal] ||= { porGenero: {}, total: 0, mesesSet: new Set() });
    s.porGenero[d.genero] = (s.porGenero[d.genero] || 0) + d.cantidad;
    s.total += d.cantidad;
    s.mesesSet.add(d.mes);
  }
  for (const s of Object.values(out)) {
    s.meses = s.mesesSet.size;
    delete s.mesesSet;
  }
  return out;
}
