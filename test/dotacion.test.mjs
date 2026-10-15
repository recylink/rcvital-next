// Dotación (propia de Vital): upsert por Sucursal × Mes × Género y suma anual.

import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { url } from "./raiz.mjs";

const hojasMem = new Map();
const clon = (v) => JSON.parse(JSON.stringify(v));

mock.module(url("node_modules/server-only/index.js"), { namedExports: {}, defaultExport: {} });

mock.module(url("lib/google/sheets-api.js"), {
  namedExports: {
    normalizarAncho: (filas, ancho) => (filas || []).map((f) => [...f, ...Array(ancho - f.length).fill("")]),
    existeHoja: async (n) => hojasMem.has(n),
    crearHoja: async (n, enc) => hojasMem.set(n, [enc ? [...enc] : []]),
    leerHoja: async (n) => clon(hojasMem.get(n) || []),
    leerFilas: async (n) => clon((hojasMem.get(n) || []).slice(1)),
    leerVariasHojas: async () => ({}),
    escribirCeldas: async () => 0,
    reemplazarHoja: async () => {
      throw new Error("reemplazarHoja no debe usarse en Dotación");
    },
    escribirFilas: async (n, filas) => {
      const h = hojasMem.get(n);
      for (const f of filas) f.values.forEach((v, i) => (h[f.row - 1][i] = v));
      return filas.length;
    },
    agregarFilas: async (n, filas) => {
      hojasMem.get(n).push(...clon(filas));
      return filas.length;
    },
    borrarFilas: async (n, indices) => {
      const h = hojasMem.get(n);
      const orden = [...new Set(indices)].filter((i) => i >= 1).sort((a, b) => b - a);
      for (const i of orden) h.splice(i, 1);
      return orden.length;
    },
    hojas: async () => [],
  },
});

const { SDK_POST } = await import(url("lib/google/actions.js"));
const { anualPersonasMes, patchDotacion, unflattenDotacion } = await import(
  url("lib/domain/dotacion.js")
);

const HOJA = "Dotación";
const leer = () => hojasMem.get(HOJA).slice(1);

test("crea la hoja con su encabezado la primera vez", async () => {
  hojasMem.delete(HOJA);
  await SDK_POST.upsertDotacion({ rows: [["dot_1", "suc_a", "2026-05", "Hombre", 10]], remove: [] });
  assert.deepEqual(hojasMem.get(HOJA)[0], ["ID", "Sucursal", "Mes", "Género", "Cantidad"]);
  assert.equal(leer().length, 1);
});

test("corregir sobrescribe: un solo valor por sucursal × mes × género, y conserva el ID", async () => {
  hojasMem.set(HOJA, [
    ["ID", "Sucursal", "Mes", "Género", "Cantidad"],
    ["dot_1", "suc_a", "2026-05", "Hombre", 10],
    ["dot_2", "suc_a", "2026-05", "Mujer", 8],
    ["dot_3", "suc_a", "2026-06", "Hombre", 11],
    ["dot_4", "suc_b", "2026-05", "Hombre", 3],
  ]);
  const antes = clon(leer());

  await SDK_POST.upsertDotacion({
    rows: [
      ["dot_nuevo", "suc_a", "2026-05", "Hombre", 12], // corrige
      ["dot_5", "suc_a", "2026-05", "Sin informar", 1], // agrega
    ],
    remove: [],
  });

  const ahora = leer();
  assert.equal(ahora.length, 5);
  assert.deepEqual(ahora[0], ["dot_1", "suc_a", "2026-05", "Hombre", 12], "mismo ID, cantidad nueva");
  assert.deepEqual(ahora.slice(1, 4), antes.slice(1, 4), "otro género, otro mes y otra sucursal intactos");
  assert.deepEqual(ahora[4], ["dot_5", "suc_a", "2026-05", "Sin informar", 1]);
});

test("encuentra la fila aunque Sheets haya convertido el mes en fecha", async () => {
  hojasMem.set(HOJA, [
    ["ID", "Sucursal", "Mes", "Género", "Cantidad"],
    ["dot_1", "suc_a", "01-05-2026", "Hombre", 10],
  ]);
  await SDK_POST.upsertDotacion({ rows: [["x", "suc_a", "2026-05", "Hombre", 9]], remove: [] });
  assert.equal(leer().length, 1, "no duplica la fila");
  assert.equal(leer()[0][4], 9);
});

test("vaciar una celda borra solo esa clave", async () => {
  hojasMem.set(HOJA, [
    ["ID", "Sucursal", "Mes", "Género", "Cantidad"],
    ["dot_1", "suc_a", "2026-05", "Hombre", 10],
    ["dot_2", "suc_a", "2026-05", "Mujer", 8],
  ]);
  const p = patchDotacion(
    { "suc_a\u0000Hombre": 10, "suc_a\u0000Mujer": 8 },
    { "suc_a\u0000Hombre": 10, "suc_a\u0000Mujer": "" },
    "2026-05",
  );
  assert.deepEqual(p, { upsert: [], remove: [{ sucursal: "suc_a", mes: "2026-05", genero: "Mujer" }] });
  await SDK_POST.upsertDotacion({ rows: [], remove: p.remove.map((d) => [d.sucursal, d.mes, d.genero]) });
  assert.deepEqual(leer(), [["dot_1", "suc_a", "2026-05", "Hombre", 10]]);
});

test("anual = suma de los meses del año (personas-mes), por sucursal × género", () => {
  const datos = unflattenDotacion([
    ["1", "suc_a", "2026-01", "Hombre", 50],
    ["2", "suc_a", "2026-02", "Hombre", 50],
    ["3", "suc_a", "2026-02", "Mujer", 5],
    ["4", "suc_a", "2025-12", "Hombre", 999], // otro año
    ["5", "suc_b", "2026-03", "Trans femenino", 1],
    ["6", "suc_b", "2026-03", "Hombre", "abc"], // inválida: se ignora
  ]);
  const a = anualPersonasMes(datos, "2026");
  assert.deepEqual(a.suc_a, { porGenero: { Hombre: 100, Mujer: 5 }, total: 105, meses: 2 });
  assert.deepEqual(a.suc_b, { porGenero: { "Trans femenino": 1 }, total: 1, meses: 1 });

  // 50 personas los 12 meses = 600 personas-mes, no 50.
  const todoElAnio = Array.from({ length: 12 }, (_, i) => ({
    sucursal: "s", mes: `2026-${String(i + 1).padStart(2, "0")}`, genero: "Hombre", cantidad: 50,
  }));
  assert.equal(anualPersonasMes(todoElAnio, 2026).s.total, 600);
});
