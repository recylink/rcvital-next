# Registro de Consumos

Herramienta para que empresas registren sus consumos (electricidad, combustible, agua) por sucursal y midan su impacto en emisiones GEI. Prototipo de validación del futuro módulo oficial del software RECYLINK.

## Language

**Sucursal**:
Unidad operativa que consume (planta, oficina, obra), con a lo más una cuenta de servicio por tipo de servicio ante cada proveedor. Un sitio físico con dos empalmes se modela como dos Sucursales. Puede ser permanente o temporal; al cerrarse conserva su historia.
_Avoid_: sede, sitio, local, obra (como término de modelo)

**Número de cliente**:
Identificador de la cuenta de una Sucursal ante un proveedor de servicio. Pertenece a exactamente una Sucursal, lo que permite rutear boletas extraídas a su Sucursal automáticamente.
_Avoid_: cuenta (a secas), N° servicio

**Registro**:
Un consumo documentado de una sucursal: cantidad, costo, tipo, subcategoría, proveedor y fecha, respaldado por una boleta o factura. Es la fuente de verdad del consumo oficial — el dashboard y la huella de emisiones se calculan exclusivamente desde Registros.
_Avoid_: consumo (a secas), record, entrada

**Fecha de Registro**:
Una fecha dentro del mes al que se atribuye el consumo (el mes predominante del período facturado). En Registros extraídos de un Documento es el punto medio del período; en Registros manuales el usuario digita un día del mes de consumo. Nunca es la fecha de emisión, pago ni vencimiento.
_Avoid_: fecha de emisión, fecha de pago, vencimiento, fecha de cierre

**Período facturado**:
El rango desde–hasta que cubre una boleta (período de lectura). Puede cruzar dos meses; su punto medio determina el mes del Registro.
_Avoid_: período de lectura (como término de modelo), ciclo

**Medidor**:
Un punto de medición físico (eléctrico, agua, combustible) asociado a una sucursal. Sirve para control operativo — detectar fugas, validar boletas, submedición — y nunca alimenta el consumo oficial ni la huella.
_Avoid_: meter, remarcador

**Lectura**:
El valor mensual anotado de un Medidor. Dato operativo; no es un Registro y no emite. Regla: los consumos sin boleta no emiten (las Recargas son la excepción declarada).
_Avoid_: reading, marcación

**Subcategoría**:
Variante de un tipo de consumo (diésel, GLP, leña dentro de combustible; potable, gris, riego dentro de agua). Puede venir del catálogo predefinido o ser creada por el cliente para su Sucursal.
_Avoid_: subtipo, categoría

**Documento**:
La boleta o factura del proveedor que respalda un Registro. Un Registro con origen "documento" nació por extracción PDF; uno "manual" fue digitado (con Documento adjunto opcional).
_Avoid_: usar "factura" y "boleta" como conceptos distintos

**Meta**:
Compromiso de reducción de emisiones de la empresa o de una Sucursal: porcentaje relativo contra un año base, o tope absoluto de tCO₂e. Se mide sobre el total absoluto; el sesgo por crecimiento (abrir sucursales sube el total) es aceptado.
_Avoid_: objetivo, target

**Factor de emisión**:
Coeficiente kgCO₂e por unidad de consumo, definido a nivel empresa (un único valor vigente por energético). Al editarlo, el usuario elige si recalcular la historia; se acepta que las vistas históricas puedan cambiar.
_Avoid_: factor de conversión

**Factor de sucursal**:
Override del factor de empresa para una Sucursal específica (ej: generación diésel propia). Queda "pendiente de revisión" cuando el factor de empresa cambia después de creado el override.
_Avoid_: factor local

**Alcance**:
Clasificación GEI de una emisión: 1 (directas — combustible, Recargas), 2 (electricidad), 3 (otras indirectas — agua).
_Avoid_: scope

**Recarga**:
Kilogramos de refrigerante repuestos a equipos de una Sucursal en un mes, declarados por el cliente. No es un consumo: no tiene boleta ni proveedor, y emite directamente por GWP × kg (alcance 1).
_Avoid_: consumo de refrigerante, cuarto tipo de consumo

**Dotación** _(solo Vital)_:
Cantidad de personas que trabajaron en una Sucursal en un mes, por género (Hombre, Mujer, Trans masculino, Trans femenino, Sin informar). Cuenta a todas las personas, sin importar el tipo de contrato (propios y contratistas juntos), como pide el DAE. Un solo valor por Sucursal × mes × género: corregir sobrescribe, sin historial. La Sucursal equivale al "establecimiento" del DAE. La vista anual es la **suma** de los meses y se expresa en **personas-mes**, no en personas (50 personas todo el año = 600): no se copia al DAE como dotación. No es un consumo y no emite.
_Avoid_: trabajadores, headcount, plantilla
