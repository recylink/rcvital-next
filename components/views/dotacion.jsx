"use client";

// Dotación (propia de Vital, ver CLIENTE.md): personas que trabajaron en cada
// Sucursal en un mes, por género. Dos vistas: "Mes", la grilla editable que se
// guarda con un botón, y "Año", sucursal × género en filas y los 12 meses en
// columnas, con la suma del año en personas-mes.

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Btn, MonthPicker } from "@/components/ui/controls";
import { Card, SectionHead } from "@/components/ui/layout";
import { useToast } from "@/components/ui/toast";
import { saveDotacionAction } from "@/app/actions/dotacion";
import {
  anualPersonasMes,
  cantidadValida,
  celda,
  GENEROS,
  grillaDelMes,
  patchDotacion,
} from "@/lib/domain/dotacion";
import { monthLabelShort } from "@/lib/domain/format";
import { monthKey, prevMonthKey } from "@/lib/domain/periods";

const num = (n) => (n == null || n === "" ? "" : Number(n).toLocaleString("es-CL"));
const sumar = (xs) => xs.reduce((a, b) => a + (b === "" || b == null ? 0 : Number(b)), 0);
const nextMonthKey = (mk) => {
  const [y, m] = mk.split("-").map(Number);
  return m === 12 ? monthKey(y + 1, 1) : monthKey(y, m + 1);
};
const R = { textAlign: "right" };

export function Dotacion({ datos, sucursales, mesActual }) {
  const router = useRouter();
  const toast = useToast();
  const [vista, setVista] = useState("mes");
  const [mes, setMes] = useState(mesActual);
  const [anioVista, setAnioVista] = useState(Number(mesActual.slice(0, 4)));
  const anioActual = Number(mesActual.slice(0, 4));

  const guardada = useMemo(() => grillaDelMes(datos, mes), [datos, mes]);
  const [grilla, setGrilla] = useState(guardada);
  useEffect(() => setGrilla(guardada), [guardada]);
  const [guardando, startGuardar] = useTransition();

  // Activas, más las inactivas que tengan datos en el año: su historia se conserva.
  const filasDe = (anual) => (sucursales || []).filter((s) => s.activa || anual[s.id]);
  const anualMes = useMemo(() => anualPersonasMes(datos, mes.slice(0, 4)), [datos, mes]);
  const filasMes = filasDe(anualMes);

  const invalidas = Object.values(grilla).filter((v) => v !== "" && cantidadValida(v) == null).length;
  const patch = patchDotacion(guardada, grilla, mes);
  const sucio = patch.upsert.length + patch.remove.length > 0;

  const cambiarMes = (m) => {
    if (m === mes || m > mesActual) return;
    if (sucio && !window.confirm("Hay cambios sin guardar en este mes. ¿Descartarlos?")) return;
    setMes(m);
  };

  const setCelda = (sucId, g, raw) =>
    setGrilla((p) => ({ ...p, [celda(sucId, g)]: raw === "" ? "" : cantidadValida(raw) ?? raw }));

  const guardar = () =>
    startGuardar(async () => {
      const r = await saveDotacionAction(patch);
      if (!r.ok) {
        toast.show({ kind: "error", title: "No se guardó la dotación", body: r.error });
        return;
      }
      toast.show({ kind: "success", title: `Dotación de ${monthLabelShort(mes)} guardada` });
      router.refresh();
    });

  return (
    <div className="prt-stack-md">
      <SectionHead
        eyebrow="Vital"
        title="Dotación"
        sub="Personas que trabajaron en cada sucursal en el mes, por género. Se cuenta a todas, sin importar el tipo de contrato (propios y contratistas)."
        right={
          vista === "mes" && (
            <Btn kind="primary" icon="check" onClick={guardar} disabled={!sucio || invalidas > 0 || guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Btn>
          )
        }
      />

      <div className="prt-row" style={{ gap: 8 }}>
        <Btn kind={vista === "mes" ? "primary" : "ghost"} onClick={() => setVista("mes")}>
          Mes
        </Btn>
        <Btn
          kind={vista === "anio" ? "primary" : "ghost"}
          onClick={() => {
            setAnioVista(Number(mes.slice(0, 4)));
            setVista("anio");
          }}
        >
          Año
        </Btn>
      </div>

      {vista === "mes" ? (
        <>
          <div className="prt-row" style={{ gap: 8, alignItems: "center" }}>
            <Btn kind="ghost" icon="chevron_left" title="Mes anterior" onClick={() => cambiarMes(prevMonthKey(mes))} />
            <div style={{ width: 180 }}>
              <MonthPicker value={mes} onChange={cambiarMes} max={mesActual} />
            </div>
            <Btn
              kind="ghost"
              icon="chevron_right"
              title="Mes siguiente"
              disabled={nextMonthKey(mes) > mesActual}
              onClick={() => cambiarMes(nextMonthKey(mes))}
            />
            {invalidas > 0 && (
              <span className="prt-hint" style={{ color: "var(--rc-danger, #b42318)" }}>
                Solo enteros mayores o iguales a 0.
              </span>
            )}
          </div>

          <Card flush>
            <div style={{ overflowX: "auto" }}>
              <table className="prt-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 180 }}>Sucursal</th>
                    {GENEROS.map((g) => (
                      <th key={g} style={R}>{g}</th>
                    ))}
                    <th style={R}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filasMes.map((s) => (
                    <tr key={s.id}>
                      <td>{s.nombre}</td>
                      {GENEROS.map((g) => {
                        const v = grilla[celda(s.id, g)];
                        const mala = v !== "" && v != null && cantidadValida(v) == null;
                        return (
                          <td key={g} style={R}>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              aria-label={`${s.nombre} · ${g}`}
                              className={"prt-input" + (mala ? " error" : "")}
                              style={{ width: 90, textAlign: "right" }}
                              value={v ?? ""}
                              onChange={(e) => setCelda(s.id, g, e.target.value)}
                            />
                          </td>
                        );
                      })}
                      <td style={{ ...R, fontWeight: 600 }}>
                        {num(sumar(GENEROS.map((g) => grilla[celda(s.id, g)])))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    {GENEROS.map((g) => (
                      <th key={g} style={R}>
                        {num(sumar(filasMes.map((s) => grilla[celda(s.id, g)])))}
                      </th>
                    ))}
                    <th style={R}>
                      {num(sumar(filasMes.flatMap((s) => GENEROS.map((g) => grilla[celda(s.id, g)]))))}
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <VistaAnio
          datos={datos}
          anio={anioVista}
          filasDe={filasDe}
          onAnio={setAnioVista}
          puedeAvanzar={anioVista < anioActual}
          onMes={(m) => {
            cambiarMes(m);
            setVista("mes");
          }}
        />
      )}
    </div>
  );
}

/** Sucursal (con sus 5 géneros debajo) × los 12 meses del año. Solo lectura. */
function VistaAnio({ datos, anio, filasDe, onAnio, puedeAvanzar, onMes }) {
  const meses = Array.from({ length: 12 }, (_, i) => monthKey(anio, i + 1));
  const porMes = useMemo(() => meses.map((m) => grillaDelMes(datos, m)), [datos, anio]); // eslint-disable-line react-hooks/exhaustive-deps
  const anual = useMemo(() => anualPersonasMes(datos, anio), [datos, anio]);
  const filas = filasDe(anual);
  const v = (i, s, g) => porMes[i][celda(s, g)];

  return (
    <>
      <div className="prt-row" style={{ gap: 8, alignItems: "center" }}>
        <Btn kind="ghost" icon="chevron_left" title="Año anterior" onClick={() => onAnio(anio - 1)} />
        <div className="prt-h3" style={{ minWidth: 60, textAlign: "center" }}>{anio}</div>
        <Btn kind="ghost" icon="chevron_right" title="Año siguiente" disabled={!puedeAvanzar} onClick={() => onAnio(anio + 1)} />
      </div>
      <div className="prt-hint" style={{ maxWidth: 720 }}>
        La última columna suma los meses: son <b>personas-mes</b>, no personas (50 personas todo
        el año = 600). No la copies al DAE como dotación. Clic en un mes para editarlo.
      </div>

      <Card flush>
        <div style={{ overflowX: "auto" }}>
          <table className="prt-table">
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>Sucursal / género</th>
                {meses.map((m) => (
                  <th key={m} style={{ ...R, cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => onMes(m)}>
                    {monthLabelShort(m)}
                  </th>
                ))}
                <th style={{ ...R, whiteSpace: "nowrap" }}>Total personas-mes</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((s) => (
                <SucursalAnio key={s.id} s={s} meses={meses} v={v} a={anual[s.id]} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function SucursalAnio({ s, meses, v, a }) {
  const totalMes = (i) => {
    const xs = GENEROS.map((g) => v(i, s.id, g));
    return xs.every((x) => x == null) ? "" : sumar(xs);
  };
  return (
    <>
      <tr style={{ fontWeight: 600 }}>
        <td>{s.nombre}</td>
        {meses.map((m, i) => (
          <td key={m} style={R}>{num(totalMes(i))}</td>
        ))}
        <td style={R}>{a ? num(a.total) : ""}</td>
      </tr>
      {GENEROS.map((g) => (
        <tr key={g} className="prt-muted">
          <td style={{ paddingLeft: 28 }}>{g}</td>
          {meses.map((m, i) => (
            <td key={m} style={R}>{num(v(i, s.id, g))}</td>
          ))}
          <td style={R}>{a ? num(a.porGenero[g] || 0) : ""}</td>
        </tr>
      ))}
    </>
  );
}
