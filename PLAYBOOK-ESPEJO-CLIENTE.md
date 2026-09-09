# Playbook — copiar esta app para un cliente

Cómo crear un **espejo**: una copia de esta app apuntando a la planilla y las carpetas
que un cliente ya usa, para reemplazar la versión Apps Script que corre hoy.

Escrito el 2026-09-01, después de hacer el primero (**Level**) de punta a punta. Cada
paso de acá se ejecutó y se midió; las trampas del final costaron tiempo de verdad.

> **Es un cambio de interruptor, no una convivencia.** El `.gs` del prototipo todavía
> tiene `setMedidores` / `setLecturasMedidor` / `setPreciosMedidor`, que **borran la hoja
> y la reescriben entera**. Con las dos apps sobre la misma planilla, la vieja puede
> barrer lo que guardó la nueva **sin dar ningún error**. Mientras convivan, el riesgo
> existe todos los días.

---

## Lo que hay que tener antes de empezar

| Dato | Quién lo tiene |
|---|---|
| URL de la planilla del cliente | Domingo |
| URL de la carpeta de Drive del cliente | Domingo |
| Nombre del cliente **tal como aparece en la columna "Empresa"** de la planilla | Mirar la planilla, no suponer |
| Una unidad compartida donde vivan las carpetas | Ver paso 3 |

---

## Paso 0 — Medir antes de tocar (solo lectura, 5 minutos)

Esto decide si el trabajo es "copiar y configurar" o "emparejar planillas primero". Se
hace **sin service account y sin levantar nada**, leyendo la planilla con el MCP de
Google Drive como Domingo:

- `get_file_metadata` sobre la planilla y la carpeta → nombre real del cliente, y **si la
  carpeta está en una unidad compartida o en la Mi unidad de alguien**. Si la respuesta
  trae `owner` con una persona, es Mi unidad.
- `read_file_content` sobre la planilla → los encabezados de cada pestaña. Comparar con
  `lib/google/headers.js`.

Si los encabezados calzan, el resto es configuración. Si no calzan, **parar acá**: hay que
emparejar la planilla antes, y ese es otro trabajo.

---

## Paso 1 — Crear la carpeta

```sh
cd <la carpeta que contiene los repos>
git clone registro-de-consumos-next registro-de-consumos-<cliente>-next
cd registro-de-consumos-<cliente>-next
git remote rename origin upstream
git remote set-url --push upstream no_push
npm install
```

**Clonar, no copiar.** El clon deja fuera exactamente lo que corresponde
(`node_modules/`, `.next/`, `.vercel/`, `.env.local`) y conserva el historial, así los
arreglos futuros se traen con `git fetch upstream && git merge upstream/main`.

**Desarmar el remoto no es opcional.** El clon hereda `origin` apuntando —vía el repo
local— a `recylink/registro-de-consumos-next`, y **pushear ahí despliega producción de
NEXT**.

Después, tres archivos:

1. **`lib/instance.js`** — `EMPRESA = "<Cliente>"`. Es **lo único de código** que cambia
   por cliente. Se usa al escribir y al mostrar, no filtra lecturas, y tiene que coincidir
   letra por letra con lo que ya dice la planilla o el historial queda partido en dos.
2. **`CLIENTE.md`** — copiar el de otro espejo: a qué planilla y carpeta apunta, y la
   lista de puesta en marcha. Va en archivo aparte y no en el README para que traer
   cambios de upstream no choque.
3. **`.env.local`** — desde `.env.local.example`:

   | Clave | Valor |
   |---|---|
   | `SPREADSHEET_ID` / `SPREADSHEET_URL` | los del cliente |
   | `GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_PROJECT_ID` | copiados de otro espejo — hoy todos comparten el robot |
   | `RC_SDK_ACTIONS` | copiado tal cual de `.env.local.example` |
   | `SITE_PASSWORD` | vacía en local; se pone en Vercel |
   | `APPS_SCRIPT_URL` | **vacía** hasta apagar el prototipo |

---

## Paso 2 — Que lea y escriba la planilla

**Acción manual:** compartir la planilla con `GOOGLE_CLIENT_EMAIL` como **Editor**. Un
clic, reversible. Sin esto, toda lectura responde `403 The caller does not have permission`.

Después, en local — **otro puerto**, el 3000 es de la instancia de referencia:

```sh
npm run dev -- -p 3100
curl -s localhost:3100/api/health              # los dos backends
curl -s localhost:3100/api/diagnostico/hojas   # inventario, SOLO LECTURA
```

Buscar `encabezadosDesalineados: []` y `hojasQueLaAppEsperaYNoEstan: []`.

Al terminar el paso, la app abre con los datos del cliente y guarda registros. Todavía no
sube archivos.

---

## Paso 3 — Drive

**Una service account no tiene cuota propia y no puede crear archivos en la Mi unidad de
una persona.** El síntoma es engañoso: guardar datos funciona, subir facturas y fotos
falla, y parece un bug de la app.

Lo que funcionó en Level, y es la vía recomendada: **crear una carpeta raíz NUEVA y vacía
dentro de una unidad compartida**, en vez de mover la del prototipo.

- El prototipo sigue escribiendo en sus carpetas viejas (sus IDs están fijos en
  `proto/sync.jsx` del otro repo) y el espejo en las nuevas. No se pisan.
- Los adjuntos históricos conservan sus links: no hay que migrar nada para que la app
  funcione.

Dar al robot permiso de escritura (`fileOrganizer`) **sobre la carpeta raíz, no sobre cada
subcarpeta**: todo lo de adentro lo hereda, así que las carpetas que cree la provisión no
necesitan nada.

> Si igual hay que **mover** la carpeta vieja: mover no cambia los IDs ni rompe los links.
> Lo que cambia es el dueño, así que quien corra el Apps Script viejo tiene que quedar
> como miembro de la unidad compartida o deja de poder escribir.

Provisión, desde local:

```sh
curl -s  'http://localhost:3100/api/migracion/setup'                    # informe, no escribe
curl -s -X POST 'http://localhost:3100/api/migracion/setup?rootFolderId=<ID>'
```

Crea ~27 carpetas y deja el mapa en la clave `driveFolders` de la hoja `Config` — **en la
planilla, no en el deploy**, que es por qué agregar un proveedor no obliga a redesplegar.

Sobre una instancia ya provisionada responde 409 y hay que repetir con `&forzar=si`. No es
burocracia: **sobre otra raíz `setup` no falla ni avisa** —empareja carpetas por nombre—,
crea un árbol paralelo y deja los adjuntos viejos inalcanzables.

Verificar con `/api/diagnostico/drive`: mide crear, mover y borrar de verdad. **Con el
robot como `fileOrganizer` en unidad compartida limpia sus archivos de prueba**; si no
tiene permiso de borrado, los deja tirados en la papelera.

---

## Paso 4 — Desplegar

1. **Repo en GitHub**, privado, en la org `recylink`. Crearlo **vacío** (sin README ni
   `.gitignore`) o el push choca. Después:
   ```sh
   git remote add origin https://github.com/recylink/<repo>.git
   git push -u origin main
   ```
2. **Proyecto en Vercel.** Usar `vercel link --yes`, que **autodetecta el framework**.
   No reutilizar ningún proyecto existente: `-base`, `-ctec`, `-ando` y `-obralimpia` son
   de otros clientes.
3. **Variables de entorno** en Production: las mismas del `.env.local`, más
   `SITE_PASSWORD`. Ojo con las comillas de la private key (ver trampas).
4. **Conectar Git**, si la app de Vercel tiene permiso sobre el repo nuevo.
5. **Verificar:** la URL debe responder **307 a `/acceso`**. Si abre sin pedir contraseña,
   la variable no quedó puesta.

Los endpoints `/api/migracion/setup` y `/api/diagnostico/drive` responden **404 en
producción** a propósito. Todo el diagnóstico se hace desde local contra la misma planilla.

---

## Paso 5 — Embeber en una página (opcional)

Solo si el cliente la va a mostrar dentro de otro sitio. Dos variables de entorno, las dos
**solo en las copias** — en la instancia de referencia no existen y todo queda cerrado:

| Variable | Para qué |
|---|---|
| `FRAME_ANCESTORS` | Quién puede embeberla. Un origen con esquema (`https://www.recylink.com`) o `*`. Vacía = nadie |
| `COOKIE_CROSS_SITE=1` | La cookie de sesión sale `SameSite=None; Secure; Partitioned` |

**Las dos hacen falta, y resuelven cosas distintas.** `FRAME_ANCESTORS` decide si el marco
puede **mostrar** la app; la cookie decide si deja **entrar**. Confundirlas cuesta una
vuelta entera: con solo la primera, la app se ve, el login "valida" y la pantalla vuelve
al inicio **sin ningún mensaje de error**.

En el `<iframe>`, `allow="camera"` no es opcional: el flujo "Tomar foto" abre la cámara y
dentro de un marco el navegador la bloquea salvo que la página contenedora la ceda.

```html
<iframe src="https://<la-app>" style="width:100%;height:80vh;border:0" allow="camera"></iframe>
```

**La alternativa más limpia, si el DNS está disponible:** servir la app desde un subdominio
del sitio que la embebe (`cliente.sudominio.com` → CNAME `cname.vercel-dns.com`). Ahí app y
sitio padre son el mismo sitio, la cookie `lax` de siempre viaja sola y **no hace falta
ninguna de las dos variables**.

---

## Paso 6 — Apagar el prototipo

Recién cuando el cliente ya opere en la app nueva, y **no es opcional** (ver el aviso del
principio).

- Bajar el sitio del repo viejo.
- Archivar la implementación web de su Apps Script.
- **El repo viejo no se edita: se apaga.**
- Recién ahí llenar `APPS_SCRIPT_URL`, si se quiere el correo de "foto pendiente" — es lo
  único que no se pudo migrar, porque `MailApp` no tiene equivalente en el SDK.
- Y recién ahí mover la planilla a la carpeta nueva, si se quiere: lleva el Apps Script
  del prototipo adentro.

---

## Verificación

| Qué | Cómo | Qué tiene que salir |
|---|---|---|
| El clon no arrastra el deploy ajeno | `ls .vercel` | No existe |
| El clon no puede pushear a la referencia | `git remote -v` | `upstream` con push a `no_push` |
| Nada se rompió al copiar | `npm test` | Todo verde |
| Compila | `npm run build` | Sin errores |
| Encabezados reales | `/api/diagnostico/hojas` | `encabezadosDesalineados: []` |
| Backend | `/api/health` | SDK ok, `desconocidas: []` |
| Datos del cliente | Abrir el dashboard | Las sucursales reales |
| Escritura | Registro manual de prueba, y borrarlo | Aparece con la Empresa correcta |
| Drive | `/api/diagnostico/drive` | Crear, mover y borrar en verde, sin dejar basura |
| Muro | `curl -I <url>/` | 307 a `/acceso` |

---

## Las trampas

Todas se midieron. **Ninguna da un error que la nombre.**

**`vercel project add` crea el proyecto sin framework.** Queda como `Other` con salida
`public`. El build de Next corre y termina bien —los logs listan todas las rutas— pero
Vercel sirve `public/` como sitio estático y **todo responde 404**, incluido
`/api/version`. Parece un problema de alias o de dominio. Se ve con
`vercel project inspect`. El repo ya trae `vercel.json` con `"framework": "nextjs"`, que lo
previene; si aun así pasa, usar `vercel link --yes` en vez de `project add`.

**La private key se carga sin las comillas.** En `.env.local` va entre comillas dobles.
Sacar el valor con `cut -d= -f2-` y pasárselo a `vercel env add` las guarda **dentro** del
valor, y el deploy responde `error:1E08010C:DECODER routines::unsupported` — el mismo error
que da un salto de línea real, y que no menciona la causa. Pelarlas antes.

**`vercel git connect` falla en un repo recién creado.** "Failed to connect… Make sure
there aren't any typos": la app de Vercel en la org está instalada sobre repos
seleccionados y el nuevo no está en la lista. Es un permiso en GitHub, no un typo. Y con
dos remotos abre un menú interactivo y se cancela sola: pasarle la URL como argumento.

**Las env vars marcadas *Sensitive* no se pueden releer.** `vercel env pull` devuelve
`[SENSITIVE]`. Si se pierde una contraseña, la única salida es sobrescribirla.

**`SameSite=None` solo no alcanza para el iframe.** Chrome de escritorio bloquea las
cookies de terceros por defecto y la descarta igual. Hace falta además `Partitioned`
(CHIPS), que es lo que hace `COOKIE_CROSS_SITE`. Consecuencia esperada, no bug: **la sesión
del iframe vale solo ahí**; abrir la app en una pestaña normal pide la clave de nuevo.

**El login corta a los 10 fallos por IP en 5 minutos**, y devuelve "Demasiados intentos",
que en pantalla se confunde con contraseña mala. Solo cuenta los fallos.

**Para separar "el servidor rechaza" de "el navegador descarta"** —que a ojo son
idénticos— llamar `ingresarAction` por HTTP desde la misma máquina que falla. Si responde
`{"ok":true,"entro":true}` con su `Set-Cookie`, el servidor está bien y el problema es del
navegador. La receta está en `CONTEXT.md` / las notas de Server Actions por HTTP.

**La pantalla de acceso va arriba, no centrada.** Centrada verticalmente, dentro de un
marco alto el campo de la contraseña cae bajo el pliegue y hay que hacer scroll para
encontrarlo. Ya está corregido en `app/styles/rc-auth.css`.
