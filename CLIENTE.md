# Instancia: Vital

Espejo de esta app para el cliente **Vital**. A diferencia de Level, Ando y Obra Limpia,
**no reemplaza a ningún prototipo Apps Script**: Vital nunca tuvo la versión vieja. La
planilla y las carpetas nacieron con esta app, el 2026-09-14.

Archivo aparte del README a propósito: así traer cambios de la instancia de referencia
(`git fetch upstream && git merge upstream/main`) no choca con lo que es propio de Vital.

## A qué apunta

| Qué | Dónde |
|---|---|
| Planilla | `1KutyLmehapP9vSNzvwm9NRYIrb5AdRk41hmzFVGOb7w` — "BBDD Vital" |
| Carpeta raíz de Drive | `1ITpwBIShzCZyBTHzBQoHAXXvMshsTAcX` — "Vital", **en la unidad compartida `0ADgVGuZngcHNUk9PVA`**. La planilla vive adentro de esta misma carpeta |
| Robot (service account) | `rcando@recylink.iam.gserviceaccount.com`, el mismo que NEXT, Level, Ando y Obra Limpia |
| Columna "Empresa" | `Vital` (`lib/instance.js`) |
| Carpeta vieja / Apps Script | **No existen.** Vital no tuvo prototipo |

Contenido de la planilla al 2026-09-14: **vacía**. Las 9 hojas las creó `setup`, con sus
encabezados. Sin sucursales, sin registros: el cliente las carga desde la app.

## Lo único que cambia respecto de la instancia de referencia

`EMPRESA` en `lib/instance.js`. Todo lo demás son variables de entorno. Si aparece un
segundo cambio de código propio de Vital, anotarlo acá.

No hizo falta cherry-pickear nada: los commits de iframe, `vercel.json` y la tarjeta de
login ya estaban en la instancia de referencia al clonar.

## Ser greenfield cambió tres pasos del playbook

1. **Se cae el Paso 0** (medir encabezados contra `lib/google/headers.js`): no había
   planilla que medir. `setup` las creó alineadas por construcción.
2. **No hubo backfill de ids.** `/api/migracion/columna-id` se corrió igual, pero escribió
   **0 ids**: las hojas nacieron con la etiqueta `ID`. Se corre por una sola razón, y es
   necesaria — es lo único que deja `registrosConId: true` en `Config`, y sin ese flag los
   `append` de la app escriben filas del ancho viejo, sin id.
3. **Se cae el Paso 6 entero** (apagar el prototipo), que era el riesgo abierto de Ando y
   Obra Limpia. Acá no hay un `.gs` con `setMedidores` / `setLecturasMedidor` /
   `setPreciosMedidor` que pueda barrer la planilla sin dar error. `APPS_SCRIPT_URL` queda
   vacía para siempre, y con ella se pierde el correo de "foto pendiente" — es lo único que
   ese backend hacía y que el SDK no replica.

Tampoco hizo falta compartir la planilla con el robot a mano (Paso 2): al estar dentro de
la unidad compartida, ya hereda el acceso. `/api/health` respondió `sdk.ok` a la primera.

## Estado de la puesta en marcha

- [x] Clon de la referencia, `origin` renombrado a `upstream` con push a `no_push`
      (2026-09-14). `npm test`: 61 en verde. `npm run build`: sin errores
- [x] `/api/health`: `sdk.ok`, planilla "BBDD Vital" (2026-09-14)
- [x] `POST /api/migracion/setup?rootFolderId=1ITpwBIShzCZyBTHzBQoHAXXvMshsTAcX` corrido
      limpio (2026-09-14): 9 hojas creadas con su encabezado, 27 carpetas —9 proveedores y
      los 3 respaldos de medidor—, `primeraVez: true` y **todos los `antes` en `null`**, así
      que no pisó nada. El mapa quedó en la clave `driveFolders` de la hoja `Config`
- [x] `POST /api/migracion/columna-id?aplicar=si` (2026-09-14): **0 ids escritos**, 0
      etiquetas escritas, las tres hojas verificaron `ok`. `registrosConId = true`
- [x] `/api/diagnostico/hojas`: `encabezadosDesalineados: []`. Dos detalles que no molestan:
      - `Hoja 1`, vacía, la que trae toda planilla nueva — la app no la conoce y no la toca
      - `Config Sucursales` y `Emisiones` todavía no existen; las crean sus propios setters
        la primera vez que escriben
- [x] Crear / mover / mandar a la papelera verificado con `/api/diagnostico/drive`
      (2026-09-14): veredicto **DESBLOQUEADO**.
      **La limpieza falla, y no es de Vital:** el robot tiene `canTrash: true` y
      `canDelete: false`, porque en una unidad compartida Administrador de contenido manda a
      la papelera y **solo el Administrador borra definitivo**. Quedaron dos archivos
      `ZZ prueba migracion (borrar).txt` en la papelera de la unidad; se purgan solos a los
      30 días. El error que da es `File not found`, no un 403, que es lo que lo hace parecer
      otra cosa
- [ ] **Repo en GitHub** `recylink/registro-de-consumos-vital-next`, privado y **vacío**
      (sin README ni `.gitignore`, o el push choca). `gh` no está instalado acá, así que lo
      crea Domingo por la web
- [ ] **`git push -u origin main`** — lo corre Domingo: el clasificador bloquea el push
- [ ] **Desplegar en Vercel**: `vercel link --yes` (NO `vercel project add`, que crea el
      proyecto sin framework y sirve `public/` como sitio estático — todo 404 sin decirlo).
      Variables de Production: las del `.env.local` + `SITE_PASSWORD` + `FRAME_ANCESTORS=*`
      + `COOKIE_CROSS_SITE=1`. Pelar las comillas de `GOOGLE_PRIVATE_KEY` antes de pasarla,
      o el deploy da `error:1E08010C:DECODER routines::unsupported`
- [ ] **Verificar la URL real**, no suponerla: `registro-de-consumos-obralimpia-next` se
      pasó del largo máximo de subdominio y su alias quedó recortado sin la `t` final
- [ ] **Git conectado.** En Ando y Obra Limpia `vercel git connect` falló por permisos de la
      app de Vercel en GitHub. Hasta que se conecte, desplegar es `vercel --prod` a mano
- [ ] **Escritura de punta a punta**: login en prod y un registro manual de prueba. Sacarlo
      a mano de la planilla: la app no tiene action que borre un registro suelto (solo
      `deleteSucursal`, que borra TODAS las filas de una sucursal)
- [ ] Cargar las sucursales reales de Vital (desde `/configuracion/nueva` o el onboarding)

## Se puede embeber en cualquier sitio

`FRAME_ANCESTORS=*` y `COOKIE_CROSS_SITE=1` en las variables de Vercel, igual que Level,
Ando y Obra Limpia. Decisión del equipo (2026-09-01): en las **copias de cliente** la
restricción de iframe no aporta lo suficiente para el estorbo que genera. **En NEXT no se
toca:** ahí las variables no existen y sigue con `'none'`.

Las dos hacen falta y resuelven cosas distintas: `FRAME_ANCESTORS` decide si el marco
*muestra* la app; la cookie decide si deja *entrar*. Con solo la primera, el login "valida" y
la pantalla vuelve al inicio **sin ningún mensaje de error**.

En el `<iframe>`, `allow="camera"` no es opcional: el flujo "Tomar foto" abre la cámara y
dentro de un marco el navegador la bloquea salvo que la página contenedora la ceda.

Consecuencia esperada de particionar la cookie, no es un bug: **la sesión iniciada dentro del
iframe vale solo ahí**. Abrir la app en una pestaña normal pide la clave otra vez.
