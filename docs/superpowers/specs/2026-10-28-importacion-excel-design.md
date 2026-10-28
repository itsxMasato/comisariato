# Importación desde Excel — Especificación de diseño

- **Fecha:** 2026-10-28
- **Estado:** Aprobado en conversación, pendiente de revisión escrita
- **Rama:** `feature/importacion-excel`
- **Referencia visual:** carpeta `ImportacionExcel/` (mockup interactivo, no se usa como código final)

## 1. Objetivo

Permitir la carga masiva de registros desde archivos Excel a **Productos**, **Empleados** y **Usuarios**, tanto para la migración inicial de datos como para cargas recurrentes (productos nuevos, empleados de temporada, ajustes de precio y stock).

### Criterios de éxito

1. Un rol autorizado importa un `.xlsx`/`.xls` desde la pantalla del módulo o desde el historial, siguiendo el asistente de 4 pasos del mockup.
2. Antes de escribir, la vista previa muestra cada fila clasificada (nuevo / a actualizar / sin cambios / rechazado) con el motivo de rechazo por campo.
3. Ninguna falla (de red, de cuota, de cierre del navegador o de Auth) deja datos en un estado que no se pueda explicar desde el historial.
4. Cada importación queda registrada en el historial con folio único, responsable, conteos y detalle por fila.
5. Solo los roles con la acción `IMPORT` explícita en el módulo pueden importar. SUPER ADMIN la trae por defecto.
6. Una importación se puede deshacer durante las 12 horas siguientes a su fin, sin borrar registros que ya se usan en otra parte ni pisar cambios hechos después de la importación.

### Fuera de alcance

- Deshacer una importación más de una vez, o después de las 12 horas.
- Borrar cuentas de Firebase Auth al deshacer (requiere Admin SDK; las cuentas se deshabilitan, ver §6.5).
- Importar a módulos distintos de Productos, Empleados y Usuarios.
- Cloud Functions o cualquier procesamiento en el servidor (el proyecto está en el plan Spark).
- Crear cuentas de la app móvil al importar empleados.
- Actualizar usuarios existentes por importación.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Uso | Carga inicial **y** cargas recurrentes. |
| Duplicados | Se elige en cada importación: **"Solo agregar nuevos"** u **"Agregar nuevos y actualizar existentes"**. En la vista previa, cada fila a actualizar muestra el valor anterior y el nuevo de cada campo que cambia. |
| Usuarios | Solo creación. Los duplicados siempre se omiten, sin importar el modo. |
| Plan de Firebase | Spark: todo corre en el navegador. Las cuentas de Usuarios se crean de a una con `secondaryAuth`. |
| Empleados | La importación **no** crea cuentas de la app móvil. Se crean después importando Usuarios. |
| Permiso | Acción `IMPORT` por módulo. **Debe darse explícitamente**: el comodín `"*"` y el formato heredado de lista de módulos **no** la incluyen. |
| Librería | SheetJS `xlsx` **0.20.3** instalada desde `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. No se usa el paquete `xlsx` de npm (abandonado en 0.18.5, con vulnerabilidades de prototype pollution y ReDoS). Se carga con `import()` dinámico solo dentro del asistente. |
| Deshacer | Disponible 12 horas desde el fin de la importación, una sola vez. Lo puede hacer quien importó (si conserva `IMPORT` en el módulo) o un rol con `IMPORTACIONES: EDIT`. Los usuarios creados se deshabilitan, no se borran (§6.5). |
| Pruebas | Vitest con Firestore simulado para la lógica. La verificación en el sistema se hace con datos reales sobre la base real (ver §9). |

## 3. Arquitectura

La lógica de importación es JavaScript puro, sin React, para poder probarla de forma aislada. Las pantallas solo muestran el estado que la lógica produce.

### 3.1 Lógica — `src/importacion/`

| Archivo | Responsabilidad | Depende de |
|---|---|---|
| `leerExcel.js` | `leerExcel(file) → { hoja, encabezados, filas: [{ filaExcel, valores }] }`. Valida extensión (`.xlsx`, `.xls`), tamaño máximo (15 MB), que haya al menos una hoja con datos y el tope de filas del módulo. Usa la primera hoja. | SheetJS |
| `esquemas/productos.js`, `esquemas/empleados.js`, `esquemas/usuarios.js` | Definición declarativa del módulo: `id`, `nombre`, `coleccion`, `moduloPermiso`, `claveDuplicado`, `topeFilas`, `columnas[]` (con `campo`, `alias[]`, `obligatoria`, `tipo`, `validar`, `normalizar`) y `construirDocumento(fila, contexto)`. **Es el único lugar donde viven las reglas de cada módulo.** | `normalizar.js` |
| `esquemas/index.js` | Registro `ESQUEMAS = { productos, empleados, usuarios }`. | esquemas |
| `normalizar.js` | Funciones compartidas: encabezados sin acentos, mayúsculas ni espacios; números (`"L 1,250.00"` → `1250`); fechas (número de serie de Excel, `dd/mm/aaaa`, `aaaa-mm-dd`, rechazando fechas imposibles); correo; DNI; texto. | — |
| `validar.js` | `validar({ esquema, filas, modo, contexto }) → { filas: [FilaClasificada], resumen }`. Mapea encabezados, valida cada campo, detecta duplicados dentro del archivo y contra `contexto.existentes`, y calcula los cambios campo por campo para las filas a actualizar. Función pura. | esquemas |
| `contexto.js` | `cargarContexto(esquema)`: lee de Firestore los datos necesarios para validar (registros existentes indexados por clave, `categorias`, `departamentos`, `roles`, `parametros/general`, empleados con usuario vinculado). | Firestore |
| `ejecutar.js` | `ejecutarImportacion({ esquema, clasificacion, archivo, usuario, alAvanzar })`. Revalidación, candado, folio, lotes o creación de cuentas, historial y bitácora (§6). | Firestore, Auth, `contexto.js`, `validar.js`, `historial.js` |
| `deshacer.js` | `puedeDeshacer(importacion, usuario, ahoraServidor)` (función pura: plazo, estado y permiso) y `deshacerImportacion({ importacion, usuario, alAvanzar })` (§6.5). | Firestore, `historial.js` |
| `historial.js` | Crear y actualizar `importaciones/{id}`, escribir bloques de `filas`, obtener folio, tomar y liberar el candado, y calcular el estado mostrado (incluida *Interrumpida* por inactividad). | Firestore |
| `reporte.js` | `generarPlantilla(esquema)` y `generarReporteRechazos(filas)`: generan archivos `.xlsx` con SheetJS. La plantilla se genera del esquema para que no se desincronicen. | SheetJS, esquemas |

### 3.2 Pantallas — `src/pages/importacion/`

Se adaptan los componentes del mockup `ImportacionExcel/`: `StepperHeader`, `Step1Selection`, `Step2Preview`, `Step3Confirmation`, `Step4Result`, `ModalCancel`, `ModalConfirm`, `ModalRowDetail` y `HistorialImportaciones`. Se eliminan la barra de simulación, la selección de rol simulado, `alert()`, los datos de `mockData.js` y el folio fijo. `AccesoDenegado` no se usa: el acceso lo controla `RoleRoute` y la página `Error403` existente.

| Archivo | Rol |
|---|---|
| `ImportacionWizard.jsx` | Orquesta los 4 pasos para `:modulo`. Mantiene el estado del archivo, la clasificación, el modo, el progreso y el resultado. |
| `Paso1Seleccion.jsx` | Módulo fijo, columnas requeridas (desde el esquema), descarga de plantilla, selector de modo, selección o arrastre de archivo y errores de archivo. |
| `Paso2VistaPrevia.jsx` | Tabla con filtros (todos / nuevos / a actualizar / sin cambios / rechazados) y búsqueda. Clic en una fila abre `ModalDetalleFila`. |
| `Paso3Confirmacion.jsx` | Resumen: a insertar, a actualizar, omitidos y rechazados. Aviso de acción definitiva. |
| `Paso4Resultado.jsx` | Folio real, conteos finales, descarga del reporte de rechazos y enlaces a historial o a una nueva importación. Muestra el progreso mientras se ejecuta. |
| `ModalDetalleFila.jsx` | Motivo de rechazo por campo, o comparación valor anterior → valor nuevo. |
| `HistorialImportaciones.jsx` | Tabla del historial, filtros, detalle por folio y botón "Nueva importación" con selector de módulo. |
| `ModalDeshacer.jsx` | Confirmación de deshacer: qué se va a borrar, restaurar o deshabilitar, tiempo restante del plazo y resultado final con las filas que no se pudieron revertir. |

### 3.3 Rutas, menú y botones

- `src/routes/AppRoute.jsx`:
  - `/importar/:modulo` → `ImportacionWizard`. Un componente valida que `:modulo` exista en `ESQUEMAS` y que el rol tenga `IMPORT` sobre su `moduloPermiso`; si no, muestra `Error403`.
  - `/importaciones` → `HistorialImportaciones`. Accesible con `IMPORTACIONES: VIEW` o con `IMPORT` en al menos un módulo.
- `src/components/SideBar.jsx`: entrada "Importaciones" con la misma condición de acceso.
- `Productos.jsx`, `Empleados.jsx`, `Usuarios.jsx`: botón "Importar desde Excel" visible solo si `hasPermission(role, MODULO, ACTIONS.IMPORT)`. Navega a `/importar/<modulo>`.

### 3.4 Permisos — `src/utils/roles.js` y `Usuarios.jsx`

- Se agregan `ACTIONS.IMPORT = "IMPORT"` y `MODULES.IMPORTACIONES = "IMPORTACIONES"`.
- `hasPermission`: cuando `action === ACTIONS.IMPORT`, solo devuelve `true` si la lista del módulo contiene `"IMPORT"` literalmente. El comodín `"*"` del módulo y el acceso total `rolePerms["*"]` no la conceden.
- `setDynamicRoles` (formato de lista) y `normalizePermissions` en `Usuarios.jsx` siguen expandiendo a las acciones existentes, sin incluir `IMPORT`.
- `ROLE_PERMISSIONS[SUPER_ADMIN]` agrega `PRODUCTOS: ["IMPORT"]`, `EMPLEADOS: ["IMPORT"]`, `USUARIOS: ["*", "IMPORT"]` e `IMPORTACIONES: ["*"]`. Si el rol SUPER ADMIN existe en la colección `roles`, el cambio debe hacerse también ahí desde la edición de roles.
- `Usuarios.jsx`: las listas de módulos y acciones para editar roles se toman de `MODULES` y `ACTIONS` en `roles.js`, en lugar de la copia local `ALL_PERMISSIONS` (corrige el desfase con `APP_MOVIL`, falla 8). La casilla "Importar" aparece solo en Productos, Empleados y Usuarios.

## 4. Reglas de validación

### 4.1 Reglas comunes

- **Encabezados:** se comparan normalizados (sin acentos, mayúsculas ni espacios, ni signos) contra `campo` y `alias`. Si falta una columna obligatoria, **se rechaza el archivo completo** en el paso 1, con la lista de columnas faltantes. Las columnas no reconocidas se ignoran y se informan como advertencia.
- **Filas vacías:** las que no tienen ningún valor se saltan y no cuentan como recibidas.
- **Texto:** se recorta y los espacios internos repetidos se reducen a uno.
- **Números:** aceptan prefijo `L`, separador de miles `,` y punto decimal. Un valor que no es número rechaza la fila.
- **Fechas:** número de serie de Excel, `dd/mm/aaaa` o `aaaa-mm-dd`. Una fecha imposible (por ejemplo `2026-05-40` o `31/02/2026`) rechaza la fila.
- **Duplicados en el archivo:** gana la primera aparición de la clave. Las siguientes se rechazan con el mensaje "Repetido en la fila N".
- **Tope de filas:** 2.000 para Productos y Empleados (cuota diaria Spark: 20.000 escrituras) y 50 para Usuarios. Si se excede, se rechaza el archivo en el paso 1.
- **Motivo de rechazo:** cada fila rechazada guarda una lista `errores: [{ campo, mensaje, valorRecibido }]`.

### 4.2 Productos — colección `productos`, clave `productoId` (comparación sin distinguir mayúsculas)

| Campo | Obligatorio | Regla |
|---|---|---|
| `productoId` | Sí | No vacío. Alias: Código, SKU, ID Producto. |
| `nombre` | Sí | No vacío. |
| `categoria` | Sí | Debe existir en `categorias` (por `nombre`, sin distinguir mayúsculas ni acentos). Se guarda con el nombre exacto de la categoría existente. |
| `precioContado` | Sí | Número mayor a 0. |
| `stock` | Sí | Entero mayor o igual a 0. |
| `stockMinimo` | No | Entero mayor o igual a 0. Si viene vacío, no se escribe. |
| `descripcion` | No | Texto. Por defecto `""` al crear. |
| `imagenUrl` | No | URL `http(s)`. Por defecto, el placeholder que usa `Productos.jsx`. |
| `estado` | No | `Activo` o `Inactivo`. Por defecto `Activo`. |

Campos calculados: `precioCredito = precioContado × (1 + porcentajeInteres / 100)`, con `porcentajeInteres` de `parametros/general` (15 si no existe, igual que `Productos.jsx`). Si se actualiza `precioContado`, se recalcula `precioCredito`.

### 4.3 Empleados — colección `empleados`, clave `codigoEmpleado`

| Campo | Obligatorio | Regla |
|---|---|---|
| `codigoEmpleado` | No | Si viene vacío, se asigna el siguiente `EMP-NNNN` al ejecutar (§6.2). Si viene, se respeta. |
| `nombres` | Sí | No vacío. |
| `apellidos` | Sí | No vacío. |
| `dni` | Sí | 13 dígitos, con o sin guiones. Se guarda sin guiones. Si el DNI ya pertenece a **otro** empleado (otra clave), se rechaza la fila. |
| `departamento` | Sí | Debe existir en `departamentos`. Se guarda con el nombre exacto existente. |
| `correo` | No | Formato de correo válido. |
| `telefono` | No | Texto. |
| `salario` | No | Número mayor o igual a 0. Por defecto 0. |
| `limiteCredito` | No | Número mayor o igual a 0. Por defecto 0. |
| `estado` | No | `Activo` o `Inactivo`. Por defecto `Activo`. |
| `fechaRegistro` | No | Fecha histórica de ingreso. Si viene vacía, la fecha de la importación. **No** se modifica al actualizar. |

Al crear se asigna `empleadoId = id del documento`, igual que `Empleados.jsx`.

### 4.4 Usuarios — colección `usuarios`, clave `correo` (sin distinguir mayúsculas)

| Campo | Obligatorio | Regla |
|---|---|---|
| `correo` | Sí | Formato válido. No debe existir en `usuarios`. Si Auth responde `email-already-in-use` al crear, la fila queda como duplicada. |
| `nombre` | Sí | No vacío. |
| `rol` | Sí | Debe existir en `roles` y estar `Activo`. Se rechaza `SUPER ADMIN` y el rol heredado `Administrador`. |
| `codigoEmpleado` | No | Si viene, el empleado debe existir y no tener `uid`/`usuarioId`. Dos filas del mismo archivo no pueden vincular al mismo empleado. |

En Usuarios, el modo de importación no aplica: los duplicados siempre se omiten.

### 4.5 Clasificación de filas

| Estado | Condición |
|---|---|
| `nuevo` | Válida y su clave no existe. |
| `actualizar` | Válida, la clave existe, modo "agregar y actualizar", y al menos un campo cambió. Guarda `cambios: [{ campo, anterior, nuevo }]`. |
| `sin_cambios` | Válida, la clave existe y no cambió ningún campo (en modo actualizar). No se escribe. |
| `omitido` | Válida, la clave existe y el modo es "solo agregar nuevos" (o el módulo es Usuarios). No se escribe. |
| `rechazado` | Tiene al menos un error. No se escribe. |

Solo se comparan los campos presentes en el Excel: una columna opcional ausente en el archivo no borra el valor existente.

## 5. Modelo de datos

### 5.1 `importaciones/{id}`

```
folio:            "IMP-2026-0001"
modulo:           "productos" | "empleados" | "usuarios"
modo:             "solo_nuevos" | "nuevos_y_actualizar"
archivo:          { nombre, pesoBytes, hoja }
estado:           "en_proceso" | "completada" | "completada_con_advertencias" | "interrumpida"
                  | "revirtiendo" | "revertida" | "revertida_parcial"
conteos:          { recibidos, insertados, actualizados, sinCambios, omitidos, rechazados, noProcesados }
responsable:      { uid, correo, rol }
fechaInicio:      Timestamp
fechaFin:         Timestamp | null
ultimaActividad:  Timestamp     // se actualiza después de cada lote o cuenta
error:            string | null // motivo si quedó interrumpida
reversion:        null | {      // se llena al deshacer
  responsable:    { uid, correo, rol },
  fechaInicio:    Timestamp,
  fechaFin:       Timestamp | null,
  conteos:        { revertidos, parciales, noRevertidos }
}
```

- `completada_con_advertencias`: terminó, pero hubo rechazados, omitidos o correos no enviados.
- Estado mostrado: si `estado === "en_proceso"` y `ultimaActividad` tiene más de 10 minutos, el historial muestra *Interrumpida (sin actividad)*. Esto se calcula en la lectura y no reescribe el documento.

### 5.2 `importaciones/{id}/filas/{bloque}`

Documentos de hasta 200 filas cada uno (para respetar el límite de 1 MB y ahorrar escrituras):

```
desde, hasta: número de fila de Excel
filas: [{
  filaExcel, clave, estado,          // estado final: insertado | actualizado | sin_cambios | omitido | rechazado | no_procesado
  documentoId,                       // id creado o actualizado
  errores: [{ campo, mensaje, valorRecibido }],
  cambios: [{ campo, anterior, nuevo }],
  aviso,                             // p. ej. "Cuenta creada, correo no enviado"
  reversion: null | {                // se llena al deshacer
    estado,                          // revertido | revertido_parcial | no_revertido
    camposNoRevertidos: [campo],
    motivo                           // p. ej. "Usado en el crédito CR-0042"
  }
}]
```

### 5.3 Soporte

- `contadores/importaciones` → `{ anio, ultimo }`. El folio se obtiene con una transacción que reinicia `ultimo` al cambiar de año.
- `contadores/empleados` → `{ ultimo }`. Lo usa la importación para asignar `EMP-NNNN`. Si no existe, se inicializa en la misma transacción con el máximo `EMP-NNNN` existente.
- `importaciones_bloqueo/{modulo}` → `{ importacionId, uid, expira }`.

### 5.4 Campos de auditoría en los registros importados

Al crear: los mismos campos que el formulario manual (`fechaRegistro`, `estado` por defecto), más `tipoModificacion: "Importación Excel"`, `usuarioModifico`, `fechaModificacion` (o `fechaActualizacion` en Usuarios, siguiendo `Usuarios.jsx`) e `importacionId`.
Al actualizar: solo los campos que cambiaron, más los cuatro campos de auditoría.

## 6. Ejecución

### 6.1 Pasos previos (todos los módulos)

1. **Revalidación:** se vuelve a ejecutar `cargarContexto` + `validar` con el archivo ya leído. Si la clasificación cambió respecto de la vista previa (por ejemplo, una fila nueva ahora es duplicada), se cancela la ejecución, se muestra la nueva vista previa con las diferencias resaltadas y se pide confirmar otra vez.
2. **Permiso:** se verifica de nuevo `hasPermission(role, moduloPermiso, IMPORT)` con el rol vigente.
3. **Candado:** transacción sobre `importaciones_bloqueo/{modulo}`. Si existe y no venció, se informa "Hay una importación en curso de este módulo por <correo>" y no se continúa. Vencimiento: 10 minutos desde la última renovación; se renueva junto con `ultimaActividad`.
4. **Folio e historial:** se obtiene el folio y se crea `importaciones/{id}` en `en_proceso`.
5. Se registra `beforeunload` para advertir si se intenta cerrar la pestaña.

### 6.2 Productos y Empleados

- Si hay empleados nuevos sin código, se reservan todos los `EMP-NNNN` necesarios en **una** transacción sobre `contadores/empleados` antes de escribir.
- Las filas clasificadas se recorren en orden de `filaExcel`, en tramos de **200 filas** (de cualquier estado). Cada tramo es un `writeBatch` con los registros a escribir de ese tramo (`nuevo`, `actualizar`; como máximo 200) **y** su bloque de `filas` (que incluye también las filas `rechazado`, `omitido` y `sin_cambios` del tramo). Se confirma todo junto o nada, y así cada bloque de detalle corresponde exactamente a un lote.
- Después de cada lote: se actualizan `conteos` y `ultimaActividad`, se renueva el candado y se llama a `alAvanzar` para la barra de progreso.
- **Fallo de un lote:** hasta 3 reintentos con espera de 1 s, 3 s y 9 s. Si sigue fallando, se detiene: `estado: "interrumpida"`, `error` con el mensaje, y las filas pendientes se registran como `no_procesado` (si ese registro también falla, el conteo `noProcesados` en el documento principal basta para reconstruirlo).
- **Recuperación:** volver a importar el mismo archivo en modo "Solo agregar nuevos" omite lo ya insertado, porque la clave ya existe.

### 6.3 Usuarios

Por cada fila `nuevo`, en orden:

1. Contraseña aleatoria de 20 caracteres con `crypto.getRandomValues`. No se muestra ni se guarda.
2. `createUserWithEmailAndPassword(secondaryAuth, correo, contraseña)`.
3. `setDoc(usuarios/{uid}, …)` con la misma forma que `Usuarios.jsx` (`usuarioId`, `uid`, `empleadoId`, `nombre`, `correo`, `rol`, `estado: "Activo"`, auditoría). Hasta 3 reintentos.
4. **Si el paso 3 falla definitivamente:** `secondaryAuth.currentUser.delete()` para borrar la cuenta recién creada, y la fila queda `rechazado` con el motivo. Si el borrado también falla, la fila queda con el aviso "Cuenta huérfana: eliminar <correo> en la consola de Authentication" y la importación termina como `completada_con_advertencias`.
5. Si viene `codigoEmpleado`: `updateDoc(empleados/{id}, { uid, usuarioId })`. Si falla, la fila queda `insertado` con un aviso.
6. `sendPasswordResetEmail(auth, correo)` para que el usuario establezca su contraseña. Si falla, la fila queda `insertado` con el aviso "Correo no enviado: usar «Restablecer contraseña»".
7. `signOut(secondaryAuth)`.
8. Se actualizan `conteos`, `ultimaActividad` y el bloque de `filas`.

Errores de Auth:
- `auth/email-already-in-use` → fila `omitido` (duplicado en Auth).
- `auth/too-many-requests` o `auth/quota-exceeded` → se detiene ordenadamente; las filas restantes quedan `no_procesado` con "Límite de Firebase alcanzado, reintentar más tarde". Estado `interrumpida`.
- `auth/network-request-failed` → 3 reintentos y luego igual que el caso anterior.

### 6.4 Cierre

1. `estado` final y `fechaFin`.
2. `logActividad("Importaciones", "Importación Excel", { folio, modulo, conteos })`.
3. Se libera el candado (si falla, vence solo a los 10 minutos).
4. Se quita `beforeunload`.

### 6.5 Deshacer una importación

**Condiciones (`puedeDeshacer`)**
- Estado `completada`, `completada_con_advertencias` o `interrumpida` (incluida la *Interrumpida (sin actividad)* de §5.1). Nunca `en_proceso`, `revirtiendo`, `revertida` ni `revertida_parcial`: se deshace una sola vez.
- Plazo: **12 horas** desde `fechaFin`, o desde `ultimaActividad` si `fechaFin` es nulo. La hora actual se toma del servidor: es el `serverTimestamp` que queda escrito al tomar el candado, leído de vuelta. No se usa el reloj del equipo.
- Permiso: (`responsable.uid` es el usuario actual **y** conserva `IMPORT` en el módulo) **o** el rol tiene `IMPORTACIONES: EDIT`.
- Hay al menos una fila `insertado` o `actualizado`.

**Flujo**
1. Se toma el candado del módulo (§6.1, paso 3) y se verifica `puedeDeshacer` otra vez con la hora del servidor.
2. Se marca `estado: "revirtiendo"` y se llena `reversion.responsable` y `reversion.fechaInicio`.
3. Se cargan los datos necesarios para verificar dependencias: la colección `creditos` (que también contiene las reservas) y los registros afectados.
4. Se recorren los bloques de `filas` en orden. Cada bloque es un `writeBatch` con las reversiones de sus filas y el bloque actualizado con el resultado de cada una. Reintentos y corte por falla, igual que en §6.2.
5. Al terminar: `estado: "revertida"` si todas las filas se revirtieron, o `"revertida_parcial"` si alguna quedó `revertido_parcial` o `no_revertido`. Se registra `reversion.fechaFin` y `reversion.conteos`, se anota en la Bitácora (`"Deshacer importación"`, con el folio) y se libera el candado.
6. Si se interrumpe a la mitad, queda `revirtiendo` con `ultimaActividad` vieja. Con la misma regla de inactividad (10 minutos), el historial permite **reanudar** la reversión, que salta las filas que ya tienen `reversion`. El plazo de 12 horas no aplica para reanudar una reversión ya iniciada.

**Qué se hace por fila**

| Módulo y estado de la fila | Acción | No se revierte (`no_revertido`) si… |
|---|---|---|
| Productos — `insertado` | Borrar el documento. | Algún crédito o reserva lo referencia por `productoId` (ID de documento o SKU), en el nivel principal o en `items[]`; o el documento ya no tiene `importacionId` de esta importación o su `tipoModificacion` ya no es `"Importación Excel"` (alguien lo editó después). Si ya no existe, se considera revertido. |
| Empleados — `insertado` | Borrar el documento. | Algún crédito o reserva lo referencia por `empleadoId`; tiene usuario vinculado (`uid`/`usuarioId`); o fue editado después de la importación (misma regla que Productos). |
| Productos o Empleados — `actualizado` | Por cada campo de `cambios`: si el valor actual es igual a `nuevo`, se restaura `anterior`. Si se restaura `precioContado`, se recalcula `precioCredito` con el `porcentajeInteres` vigente. Se escriben los campos de auditoría con `tipoModificacion: "Reversión de importación"`. | Ningún campo conserva el valor importado. Si solo algunos lo conservan, la fila queda `revertido_parcial` con `camposNoRevertidos`. Si el documento ya no existe, `no_revertido`. |
| Usuarios — `insertado` | `estado: "Deshabilitado"` en `usuarios/{uid}` más auditoría; si el empleado vinculado tiene ese `uid`/`usuarioId`, se quitan esos campos para que se le pueda asignar otro usuario. **La cuenta de Auth no se borra**: el sistema ya cierra la sesión de los usuarios no activos. | El documento ya no existe. Si ya estaba deshabilitado, se considera revertido. |

Las filas con otro estado (`rechazado`, `omitido`, `sin_cambios`, `no_procesado`) no se tocan.

**Interfaz**
- En el historial y en el detalle del folio: botón **"Deshacer"** con el tiempo restante ("Disponible por 7 h 20 min") solo cuando `puedeDeshacer` es verdadero. Si no, no se muestra, o se muestra deshabilitado con el motivo (plazo vencido, ya revertida, sin permiso).
- `ModalDeshacer` muestra antes de confirmar cuántos registros se van a borrar, restaurar o deshabilitar, y avisa que la acción no se puede repetir. Al terminar, lista las filas no revertidas con su motivo para corregirlas a mano.
- En la pantalla de resultado (paso 4) se muestra "Podés deshacer esta importación durante las próximas 12 horas desde el historial".

## 7. Historial

- **Tabla:** folio, archivo, módulo, fecha, recibidos, insertados, actualizados, omitidos, rechazados, responsable y estado mostrado. Orden por `fechaInicio` descendente, paginada de 25 en 25 con `limit`/`startAfter`.
- **Filtros:** módulo, estado y rango de fechas.
- **Visibilidad:** con `IMPORTACIONES: VIEW` se ven todas. Sin ese permiso, solo las de los módulos donde el rol tiene `IMPORT` (consulta con `where("modulo", "in", modulosPermitidos)`).
- **Detalle por folio:** lee la subcolección `filas`, la muestra con filtro por estado y permite descargar el reporte de rechazados.
- **Índices:** las consultas que combinan `where` (módulo, estado, fechas) con `orderBy("fechaInicio")` necesitan índices compuestos. Se versionan en `firestore.indexes.json` (referenciado desde `firebase.json`) y se publican con `firebase deploy --only firestore:indexes`, disponible en el plan Spark.

## 8. Interfaz y manejo de errores visibles

- **Paso 1:** errores de archivo (formato, tamaño, hoja vacía, columnas faltantes, tope de filas) como banner rojo del mockup, con la lista concreta de lo que falta. El botón Siguiente queda deshabilitado mientras haya error o se esté leyendo.
- **Paso 2:** si `cargarContexto` falla (por ejemplo, sin conexión), se muestra un error con "Reintentar" y no se avanza.
- **Paso 3 → ejecutar:** el modal de confirmación del mockup muestra los conteos reales. Si no hay filas para escribir, Confirmar queda deshabilitado con el mensaje "No hay registros nuevos ni cambios para aplicar".
- **Durante la ejecución:** barra de progreso; se deshabilitan Cancelar y Atrás.
- **Cancelar:** solo disponible antes de ejecutar. Descarta el archivo y vuelve al módulo de origen.
- **Resultado:** según el estado final. *Interrumpida* explica qué entró, qué no y cómo recuperarse (§6.2).
- Las notificaciones usan `sonner`, que ya usa el proyecto.

## 9. Pruebas

### 9.1 Automáticas (Vitest)

- Se agrega `vitest` como `devDependency` y el script `"test": "vitest run"`.
- **Nunca se conectan a Firebase.** Firestore y Auth se simulan con `vi.mock`.
- `normalizar.test.js`: números, fechas (serie de Excel, formatos válidos e imposibles), encabezados con acentos, DNI y correo.
- `leerExcel.test.js`: libros generados en la prueba con SheetJS (`.xlsx` y `.xls`); hoja vacía, columnas faltantes, tope de filas, filas vacías intermedias.
- `validar.test.js`, por cada esquema: los casos del mockup (precio negativo, nombre vacío, stock negativo, estado no reconocido, departamento vacío, fecha `2026-05-40`, correo sin `@`), duplicado en el archivo, duplicado contra la base en ambos modos, `sin_cambios`, DNI de otro empleado, categoría o departamento inexistente, rol inexistente, inactivo o SUPER ADMIN, empleado ya vinculado.
- `ejecutar.test.js`: tramos de 200 filas con su bloque de detalle, reintento exitoso, interrupción tras 3 fallos con `no_procesado`, candado ocupado, revalidación con cambios, reserva de códigos `EMP-NNNN`; Usuarios con borrado de la cuenta si falla `setDoc`, `email-already-in-use`, `too-many-requests` a mitad de archivo y correo de restablecimiento fallido.
- `deshacer.test.js`: `puedeDeshacer` en el límite de las 12 horas (11:59 sí, 12:01 no), con `fechaFin` nulo, por estado (ya revertida, en proceso) y por permiso (responsable con y sin `IMPORT`, otro usuario con y sin `IMPORTACIONES: EDIT`); borrado de insertados; bloqueo por crédito que referencia por ID, por SKU y dentro de `items[]`; empleado con usuario vinculado; registro editado después de la importación; restauración parcial campo por campo con recálculo de `precioCredito`; usuario deshabilitado y desvinculado del empleado; reanudación de una reversión interrumpida que salta las filas ya revertidas.
- `roles.test.js`: `IMPORT` no se concede con `"*"`, con acceso total ni con formato de lista; sí se concede cuando está explícita.

### 9.2 En el sistema — datos reales sobre la base real

Se usan archivos Excel reales con datos que el negocio necesita. Lo importado queda como dato definitivo.

1. **Ninguna importación real se ejecuta sin confirmación explícita del responsable en ese momento.** Si la ejecuta Claude desde el navegador, pregunta antes de cada una.
2. Por módulo, primero un archivo real **pequeño (10 a 20 filas)** en modo "Solo agregar nuevos". Después, archivos completos y el modo actualizar.
3. Orden: Productos → Empleados → Usuarios.
4. Usuarios al final, con 2 o 3 cuentas reales, porque crea accesos y envía correos.
5. Tras cada importación se revisa el folio en el historial y los registros en la pantalla del módulo antes de continuar.
6. **Deshacer** se prueba con una importación pequeña hecha para eso (por ejemplo, 3 productos reales que después se vuelven a importar), también con confirmación previa, porque borra o restaura datos reales.
7. Lista de verificación por rol: SUPER ADMIN (importa los tres módulos desde el historial), un rol con `IMPORT` en un solo módulo (ve solo su botón y su historial), un rol sin `IMPORT` (no ve botones y recibe 403 en `/importar/*`).

## 10. Fallas del sistema encontradas — pendientes de decisión

Reportadas durante el diseño. **No se modifican como parte de esta especificación**, salvo lo indicado en la última columna.

| # | Severidad | Falla | Ubicación | Cambio sugerido | ¿Lo cubre este diseño? |
|---|---|---|---|---|---|
| 1 | Crítica | Una cuenta de Auth sin documento en `usuarios` recibe el rol `"Administrador"` (equivale a SUPER ADMIN). | `src/auth/AuthProvider.jsx` | Tratarla como sin acceso y cerrar sesión. | Parcial: la importación borra la cuenta si falla el guardado, pero el riesgo existe para cuentas creadas por otras vías. |
| 2 | Crítica | No hay reglas de Firestore versionadas; todos los permisos se verifican solo en el navegador. | `firebase.json` | Versionar `firestore.rules` con validación de rol por colección, incluida la acción `IMPORT`. | No |
| 3 | Crítica | Contraseñas predecibles: `<parte del correo>2026` y `<primer nombre>2026`. | `src/pages/Usuarios.jsx`, `src/pages/Empleados.jsx` | Contraseña aleatoria + `sendPasswordResetEmail`. | Solo para la importación |
| 4 | Importante | El correo de la app móvil se arma con el primer nombre; el segundo empleado con el mismo nombre se queda sin cuenta. | `src/pages/Empleados.jsx` | Usar nombre + apellido y sufijo numérico si existe. | No |
| 5 | Importante | El siguiente `EMP-NNNN` se calcula con la lista cargada en pantalla; dos altas simultáneas generan el mismo código. | `src/pages/Empleados.jsx` | Usar `contadores/empleados` con transacción. | Solo para la importación |
| 6 | Importante | No se valida que `productoId` sea único al crear productos a mano. | `src/pages/Productos.jsx` | Validar antes de guardar. | No |
| 7 | Importante | Si falla la lectura de `roles`, la app queda en "Cargando..." indefinidamente. | `src/auth/AuthProvider.jsx` | Manejar el error del `onSnapshot` y mostrar un mensaje. | No |
| 8 | Menor | `ALL_PERMISSIONS` duplica `MODULES` y ya no incluye `APP_MOVIL`. | `src/pages/Usuarios.jsx` | Usar `MODULES` y `ACTIONS` de `roles.js`. | Sí (§3.4) |
| 9 | Menor | Archivos temporales versionados: `diff.txt`, `fix_cred.js`, `test.js`, `tmp_original.jsx`, `old_nuevo_credito.txt`, `old_nuevo_credito2.txt`, `npm`. | raíz del repo | Eliminarlos del repositorio. | No |
