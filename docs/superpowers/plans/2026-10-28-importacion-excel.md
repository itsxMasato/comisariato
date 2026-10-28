# Importación desde Excel — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** Importación masiva desde Excel a Productos, Empleados y Usuarios, con historial, deshacer dentro de 12 horas y permiso `IMPORT` por módulo. Además, corrección de las fallas 1, 2, 5, 6, 7, 8 y 9 de la §10 de la especificación.

**Arquitectura:** La lógica de importación vive en `src/importacion/` como JavaScript puro que habla con Firestore y Auth **solo a través de dos adaptadores** (`almacen` y `cuentas`). Así toda la lógica se prueba con adaptadores falsos en memoria. Las pantallas de `src/pages/importacion/` adaptan los componentes del mockup `ImportacionExcel/` y solo muestran el estado que producen esas funciones.

**Stack:** React 19, Vite 8, Firebase 12 (Firestore + Auth, plan Spark), Tailwind 3, SheetJS 0.20.3, Vitest, notificaciones con `sileo` (la librería que ya usa el proyecto, `sileo.error({ title, description })` / `sileo.success(...)`).

**Especificación:** `docs/superpowers/specs/2026-10-28-importacion-excel-design.md`. Quien ejecute lee **las dos**: el plan dice qué se decidió y en qué orden; la especificación, el detalle de reglas y textos.

## Restricciones globales

- SheetJS: `npm i --save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. **Nunca** `npm i xlsx` (0.18.5, vulnerable). Se importa con `import("xlsx")` dinámico, solo dentro de `leerExcel.js` y `reporte.js`.
- Topes: archivo 15 MB; 2.000 filas en Productos y Empleados; 50 en Usuarios.
- Lotes de escritura: tramos de **200 filas** de Excel; cada tramo es un `writeBatch` con sus registros y su bloque de `filas`.
- Reintentos: 3, con esperas de 1 s, 3 s y 9 s.
- Candado e inactividad: 10 minutos. Plazo para deshacer: 12 horas, con hora del servidor.
- `IMPORT` solo se concede si figura literalmente en la lista del módulo: ni `"*"`, ni acceso total, ni el formato heredado de lista lo conceden.
- Folio: `IMP-AAAA-NNNN`. Código de empleado: `EMP-NNNN` (4 dígitos mínimo, como hoy).
- Campos de auditoría: `tipoModificacion: "Importación Excel"` (o `"Reversión de importación"`), `usuarioModifico`, `fechaModificacion` (en `usuarios`: `fechaActualizacion`), `importacionId`.
- Las pruebas automáticas **nunca** se conectan a Firebase.
- **Ninguna escritura en la base real** (importación, reversión, publicación de reglas o índices) sin confirmación explícita del usuario en ese momento.
- Textos de la interfaz en español; los mensajes de rechazo nombran el campo y el valor recibido.

## Puntos de revisión

1. **Excel con encabezados en otra fila o celdas combinadas** (títulos arriba de la tabla): se espera que el archivo se rechace con "No se encontraron las columnas obligatorias: …", no que se importen filas basura. → prueba en Tarea 8.
2. **Valores que Excel guarda como número y el sistema como texto** (`productoId` 1025, `dni` 801199012345 con cero inicial perdido, teléfono): se espera que el código se compare como texto y que un DNI de 12 dígitos sea rechazado con el mensaje "debe tener 13 dígitos". → pruebas en Tareas 7 y 10.
3. **Misma clave con distinta capitalización o espacios** (`azu-001-st ` vs `AZU-001-ST`): se espera que sea duplicado, tanto dentro del archivo como contra la base. → prueba en Tarea 9.
4. **Cerrar la pestaña o perder conexión durante la ejecución**: se espera que el historial quede *Interrumpida* y que reimportar en "solo nuevos" no duplique. → prueba en Tarea 12.
5. **Un rol sin permiso que entra directo a `/importar/productos` o a `/importaciones`**: se espera 403, y que no se descarguen datos. → prueba en Tarea 2 (permisos) y verificación manual en Tarea 19.

---

## Fase A — Base y correcciones del sistema

### Task 1 (Tarea 1): Vitest y limpieza del repositorio (falla 9)

**Archivos:**
- Modificar: `package.json` (script `"test": "vitest run"`, devDependency `vitest`)
- Modificar: `vite.config.js` (bloque `test: { environment: "node", include: ["tests/**/*.test.js"] }`)
- Crear: `tests/humo.test.js`
- Eliminar del repo: `diff.txt`, `fix_cred.js`, `test.js`, `tmp_original.jsx`, `old_nuevo_credito.txt`, `old_nuevo_credito2.txt`, `npm`

- [ ] **Paso 1:** `npm i -D vitest`.
- [ ] **Paso 2:** Agregar el script y el bloque `test` en `vite.config.js`.
- [ ] **Paso 3:** Crear `tests/humo.test.js` con `expect(1 + 1).toBe(2)`.
- [ ] **Paso 4:** Ejecutar `npm test`. Esperado: 1 prueba PASS.
- [ ] **Paso 5:** `git rm diff.txt fix_cred.js test.js tmp_original.jsx old_nuevo_credito.txt old_nuevo_credito2.txt npm`. Verificar con `git grep -l "tmp_original\|fix_cred\|old_nuevo_credito" -- src` que nada los importe (salida vacía).
- [ ] **Paso 6:** `npm run build`. Esperado: compila.
- [ ] **Paso 7:** Commit `"Agrega Vitest y elimina archivos temporales del repositorio"`.

### Task 2 (Tarea 2): Permisos — `IMPORT`, `IMPORTACIONES` y lista única de módulos (falla 8)

**Archivos:**
- Modificar: `src/utils/roles.js`
- Modificar: `src/pages/Usuarios.jsx` (`ALL_PERMISSIONS`, `ALL_ACTIONS`, `normalizePermissions`, editor de roles)
- Crear: `tests/roles.test.js`

**Interfaces:**
- Produce: `ACTIONS.IMPORT = "IMPORT"`, `MODULES.IMPORTACIONES = "IMPORTACIONES"`, `MODULOS_IMPORTABLES = [MODULES.PRODUCTOS, MODULES.EMPLEADOS, MODULES.USUARIOS]`, `ACCIONES_BASE = [VIEW, CREATE, EDIT, DELETE, EXPORT]` (las que expande el formato heredado), `hasPermission(role, modulo, accion)` con la regla nueva y `modulosConImport(role) → string[]`.

- [ ] **Paso 1: Pruebas que fallan** en `tests/roles.test.js` (usar `setDynamicRoles` para preparar roles):
  - `"IMPORT no se concede con comodín de módulo"`: rol `{ PRODUCTOS: ["*"] }` → `hasPermission(r, "PRODUCTOS", "IMPORT") === false` y `hasPermission(r, "PRODUCTOS", "EDIT") === true`.
  - `"IMPORT no se concede con acceso total"`: rol `{ "*": ["*"] }` → `false`.
  - `"IMPORT no se concede con formato de lista"`: `setDynamicRoles([{ nombre: "X", permisos: ["PRODUCTOS"] }])` → `false`.
  - `"IMPORT explícito sí se concede"`: `{ PRODUCTOS: ["VIEW", "IMPORT"] }` → `true`; y `modulosConImport` devuelve `["PRODUCTOS"]`.
  - `"SUPER ADMIN estático importa en los tres módulos y ve IMPORTACIONES"`.
  - `"rol desconocido o nulo no tiene permisos"`.
- [ ] **Paso 2:** `npm test -- roles`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar en `roles.js`: constantes; en `hasPermission`, si `action === ACTIONS.IMPORT`, devolver `modPerms?.includes("IMPORT") === true` **antes** de evaluar comodines; `ROLE_PERMISSIONS[SUPER_ADMIN]` según §3.4 de la especificación (`PRODUCTOS: ["IMPORT"]`, `EMPLEADOS: ["IMPORT"]`, `USUARIOS: ["*", "IMPORT"]`, `IMPORTACIONES: ["*"]`). `setDynamicRoles` con lista sigue mapeando a `["*"]`, lo que ya excluye `IMPORT` por la regla nueva.
- [ ] **Paso 4:** `npm test -- roles`. Esperado: PASS.
- [ ] **Paso 5:** En `Usuarios.jsx`: `ALL_PERMISSIONS = Object.values(MODULES)` y `ALL_ACTIONS = ACCIONES_BASE` (importados de `roles.js`). En el editor de permisos de cada rol, mostrar la casilla "Importar" (`IMPORT`) **solo** para los módulos de `MODULOS_IMPORTABLES`. `normalizePermissions` con lista expande a `ACCIONES_BASE` (sin `IMPORT`).
- [ ] **Paso 6:** `npm run build` y `npx eslint src/utils/roles.js src/pages/Usuarios.jsx` (solo se acepta el falso positivo preexistente de `motion`).
- [ ] **Paso 7:** Commit `"Permisos: acción IMPORT explícita, módulo IMPORTACIONES y lista única de módulos"`.

### Task 3 (Tarea 3): Sesión segura — cuentas sin documento y fallo al leer roles (fallas 1 y 7)

**Archivos:**
- Crear: `src/auth/sesion.js`
- Modificar: `src/auth/AuthProvider.jsx`
- Crear: `tests/sesion.test.js`

**Interfaces:**
- Produce: `resolverSesion(userData: object | null) → { acceso: boolean, rol: string | null, nombre: string, foto: string, motivo: "sin_documento" | "inactivo" | null }`.

- [ ] **Paso 1: Pruebas que fallan:**
  - `"sin documento no tiene acceso"`: `resolverSesion(null)` → `{ acceso: false, rol: null, motivo: "sin_documento" }`.
  - `"documento inactivo no tiene acceso"`: `{ estado: "Deshabilitado", rol: "ADMIN" }` → `motivo: "inactivo"`.
  - `"Activo y active tienen acceso"` con `rol` tal cual.
  - `"documento sin rol no recibe rol de administrador"`: `{ estado: "Activo" }` → `rol: "Usuario"` (el valor heredado de EMPLEADO), nunca `"Administrador"`.
- [ ] **Paso 2:** `npm test -- sesion`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar `resolverSesion`.
- [ ] **Paso 4:** `npm test -- sesion`. Esperado: PASS.
- [ ] **Paso 5:** En `AuthProvider.jsx`:
  - Usar `resolverSesion`. Si `acceso` es `false`: `signOut(auth)`, limpiar el estado y `sileo.error`: `"Tu cuenta no tiene acceso al sistema"` con la descripción `"No se encontró tu perfil de usuario. Contactá al administrador."` (sin documento) o `"Tu usuario está deshabilitado."` (inactivo).
  - **Mover la suscripción a `roles` adentro de `onAuthStateChanged`**: solo con usuario autenticado. Al cerrar sesión se cancela. Sin sesión, `rolesLoaded` es `true`, para que se vea el login.
  - Agregar el callback de error a `onSnapshot(roles)`: `console.error`, `rolesLoaded = true` y `rolesError = true`. Si `rolesError`, se muestra en lugar de los hijos un mensaje `"No se pudieron cargar los permisos. Revisá tu conexión y recargá la página."` con un botón "Reintentar" (`window.location.reload()`).
- [ ] **Paso 6:** `npm run build`.
- [ ] **Paso 7: Verificación previa obligatoria con el usuario:** antes de hacer merge de esta tarea, el usuario confirma en la consola de Firebase que **su propia cuenta de administrador tiene documento en `usuarios`** con `rol: "SUPER ADMIN"` y `estado: "Activo"`. Si no lo tiene, quedaría sin acceso.
- [ ] **Paso 8:** Commit `"Sesión: una cuenta sin perfil ya no recibe rol de administrador; manejo del error al leer roles"`.

### Task 4 (Tarea 4): Adaptadores `almacen` y `cuentas` y su versión falsa para pruebas

**Archivos:**
- Crear: `src/importacion/almacenFirestore.js`, `src/importacion/cuentasFirebase.js`
- Crear: `tests/importacion/falsos.js` (`crearAlmacenFalso(datosIniciales)`, `crearCuentasFalsas(opciones)`)
- Crear: `tests/importacion/falsos.test.js`

**Interfaces (las usan todas las tareas siguientes):**
- `almacen`, con rutas como texto `"coleccion/id"` o `"coleccion/id/sub/id"`:
  - `leerTodos(coleccion) → Promise<Array<{ id, ...datos }>>`
  - `leer(ruta) → Promise<object | null>`
  - `nuevoId(coleccion) → string`
  - `lote() → { set(ruta, datos), update(ruta, datos), delete(ruta), commit(): Promise<void> }`
  - `transaccion(fn: (tx: { leer(ruta), set(ruta, datos), update(ruta, datos) }) => Promise<T>) → Promise<T>`
  - `actualizar(ruta, datos) → Promise<void>`
  - `marcaServidor() → valor centinela` (en Firestore, `serverTimestamp()`); `leer` devuelve los Timestamp ya convertidos a `Date`
  - `consultar(coleccion, { donde: [[campo, op, valor]], orden: [campo, "desc"], limite, despuesDe }) → Promise<{ docs: Array, ultimo }>`
- `cuentas`:
  - `crear(correo, contrasena) → Promise<{ uid, borrar(): Promise<void> }>` (errores con `code` de Firebase Auth)
  - `enviarRestablecimiento(correo) → Promise<void>`
  - `cerrarSecundaria() → Promise<void>`
- Falsos: `crearAlmacenFalso({ "productos/p1": {...} })` guarda en un `Map`. Expone `.datos` para inspeccionar, `.fallarCommit(n)` (los próximos `n` commits lanzan error) y `.ahora` (Date que usa `marcaServidor`). `crearCuentasFalsas({ existentes: [correos], fallarCon: { [correo]: code } })` expone `.creadas` y `.borradas`.

- [ ] **Paso 1: Pruebas que fallan** (sobre los falsos, porque son la referencia del contrato): `lote` aplica todo o nada cuando `fallarCommit`; `transaccion` lee y escribe; `consultar` filtra con `==` e `in`, ordena y pagina; `cuentas.crear` lanza `{ code: "auth/email-already-in-use" }` para un correo existente.
- [ ] **Paso 2:** `npm test -- falsos`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar los falsos y luego los reales: `almacenFirestore.js` con `doc`, `collection`, `getDocs`, `getDoc`, `writeBatch`, `runTransaction`, `query`, `where`, `orderBy`, `limit`, `startAfter` y `serverTimestamp`; `cuentasFirebase.js` con `createUserWithEmailAndPassword(secondaryAuth, …)`, `user.delete()`, `sendPasswordResetEmail(auth, …)` y `signOut(secondaryAuth)`.
- [ ] **Paso 4:** `npm test -- falsos`. Esperado: PASS. `npm run build`.
- [ ] **Paso 5:** Commit `"Importación: adaptadores de Firestore y Auth con versiones falsas para pruebas"`.

### Task 5 (Tarea 5): Contador de códigos de empleado (falla 5)

**Archivos:**
- Crear: `src/utils/contadores.js`
- Modificar: `src/pages/Empleados.jsx` (cálculo de `nuevoCodigo` y `handleSave`)
- Crear: `tests/contadores.test.js`

**Interfaces:**
- Produce: `formatearCodigoEmpleado(n) → "EMP-0007"`; `maximoCodigoEmpleado(empleados) → number`; `reservarCodigosEmpleado(almacen, cantidad) → Promise<string[]>`; `siguienteFolio(almacen) → Promise<string>` (`IMP-AAAA-NNNN`, contador `contadores/importaciones` que se reinicia al cambiar de año).

- [ ] **Paso 1: Pruebas que fallan:**
  - `formatearCodigoEmpleado(7) === "EMP-0007"` y `(12345) === "EMP-12345"`.
  - `maximoCodigoEmpleado([{codigoEmpleado:"EMP-0009"},{codigoEmpleado:"X"},{}]) === 9`.
  - `"reservar inicializa el contador desde el máximo existente"`: almacén con `EMP-0009` y sin `contadores/empleados` → `reservarCodigosEmpleado(a, 2)` devuelve `["EMP-0010","EMP-0011"]` y el contador queda en 11.
  - `"dos reservas seguidas no se repiten"`.
  - `"folio reinicia al cambiar de año"`: contador `{ anio: 2025, ultimo: 40 }` y `ahora` en 2026 → `"IMP-2026-0001"`.
- [ ] **Paso 2:** `npm test -- contadores`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar. Si el contador no existe, `leerTodos("empleados")` **antes** de la transacción para calcular el máximo, y dentro de la transacción se usa `max(ultimoGuardado ?? maximoLeido, maximoLeido)`.
- [ ] **Paso 4:** `npm test -- contadores`. Esperado: PASS.
- [ ] **Paso 5:** En `Empleados.jsx`: el formulario de alta sigue mostrando el código sugerido, con la nota `"(se confirma al guardar)"`. En `handleSave` de un empleado nuevo, `payload.codigoEmpleado = (await reservarCodigosEmpleado(almacenFirestore, 1))[0]`.
- [ ] **Paso 6:** `npm run build`. Commit `"Empleados: el código EMP se reserva con un contador transaccional"`.

### Task 6 (Tarea 6): SKU único en Productos (falla 6)

**Archivos:**
- Crear: `src/utils/validaciones.js`
- Modificar: `src/pages/Productos.jsx` (`handleSave`)
- Crear: `tests/validaciones.test.js`

**Interfaces:**
- Produce: `normalizarClave(valor) → string` (texto, recorte de espacios y mayúsculas; números convertidos a texto sin decimales); `skuDuplicado(productos, sku, idActual) → producto | null`. `normalizarClave` también la usan los esquemas de la Tarea 9.

- [ ] **Paso 1: Pruebas que fallan:** `skuDuplicado([{id:"a",productoId:"AZU-001"}], " azu-001 ", null)` devuelve el producto `a`; con `idActual: "a"` devuelve `null`; `normalizarClave(1025) === "1025"`.
- [ ] **Paso 2:** `npm test -- validaciones`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar.
- [ ] **Paso 4:** `npm test -- validaciones`. Esperado: PASS.
- [ ] **Paso 5:** En `handleSave` de `Productos.jsx`, antes de escribir: si `skuDuplicado(productos crudos, sku, selectedProduct?.id)`, mostrar `sileo.error({ title: "Código duplicado", description: "Ya existe el producto «<nombre>» con el código <sku>." })` y no guardar. También rechazar SKU vacío, `precioContado` que no sea un número mayor a 0 y `stock` que no sea un entero mayor o igual a 0, con el mismo tipo de mensaje.
- [ ] **Paso 6:** `npm run build`. Commit `"Productos: valida código único, precio y stock antes de guardar"`.

### Task 7 (Tarea 7): Reglas de seguridad de Firestore (falla 2)

**Archivos:**
- Crear: `firestore.rules`
- Modificar: `firebase.json` (agregar `"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }`)
- Crear: `firestore.indexes.json` (`{ "indexes": [], "fieldOverrides": [] }`; lo completa la Tarea 17)
- Crear: `docs/superpowers/firestore-reglas.md` (supuestos y cómo publicarlas)

**Alcance de esta versión de reglas.** Los documentos de `roles` tienen ID aleatorio y las reglas no pueden buscarlos por nombre, así que **no se replica `hasPermission` en el servidor**. Esta versión cierra los huecos graves sin romper el flujo actual:

| Colección | Lectura | Escritura |
|---|---|---|
| todas | requiere `activo()`: sesión iniciada + `usuarios/{uid}` existe + `estado` en `["Activo","active"]` | — |
| `roles` | `activo()` | solo `superAdmin()` (rol `"SUPER ADMIN"` o `"Administrador"`) |
| `usuarios` | `activo()` | crear/actualizar: `personal()` (activo y rol distinto de `"EMPLEADO"` y `"Usuario"`), y el `rol` resultante solo puede ser `"SUPER ADMIN"` si quien escribe es `superAdmin()`. Actualizar el propio documento: cualquier `activo()`, sin cambiar `rol` ni `estado`. Borrar: `superAdmin()` |
| `parametros` | `activo()` | `superAdmin()` |
| `bitacoraactividades`, `historial_*` | `activo()` | solo crear (`activo()`); nunca actualizar ni borrar |
| `importaciones` (y `filas`), `contadores`, `importaciones_bloqueo` | `activo()` | crear/actualizar: `personal()`; borrar: nunca |
| `productos`, `empleados`, `categorias`, `departamentos`, `creditos`, `cuotas` | `activo()` | crear/actualizar: `activo()` (la app móvil escribe reservas en `creditos`); borrar: `personal()` |
| cualquier otra | denegada | denegada |

- [ ] **Paso 1:** Escribir `firestore.rules` con las funciones `activo()`, `perfil()`, `superAdmin()` y `personal()`, y la tabla anterior.
- [ ] **Paso 2:** Validar la sintaxis sin publicar: `npx firebase-tools@15 deploy --only firestore:rules --dry-run` (requiere `firebase login` del usuario; si no hay sesión, pedirle que corra `! npx firebase-tools@15 login`). Esperado: "rules file compiled successfully".
- [ ] **Paso 3:** Escribir `docs/superpowers/firestore-reglas.md` con los supuestos. **Pendiente que debe confirmar el usuario:** qué colecciones lee y escribe la **app móvil** (su código no está en este repositorio). Agregar el procedimiento: 1) copiar las reglas que hoy están publicadas en la consola (respaldo); 2) probarlas en el *Rules Playground* de la consola con un usuario EMPLEADO, uno ADMIN y uno sin documento; 3) publicar con `firebase deploy --only firestore:rules`; 4) probar la app web y la móvil; 5) si algo falla, volver a publicar el respaldo.
- [ ] **Paso 4:** **No publicar.** La publicación la hace o la autoriza el usuario después de la Tarea 19.
- [ ] **Paso 5:** Commit `"Agrega reglas de seguridad de Firestore (sin publicar) y su procedimiento"`.

---

## Fase B — Lógica de importación

### Task 8 (Tarea 8): SheetJS, normalización y lectura del archivo

**Archivos:**
- Modificar: `package.json` (SheetJS desde el CDN, ver restricciones globales)
- Crear: `src/importacion/normalizar.js`, `src/importacion/leerExcel.js`
- Crear: `tests/importacion/normalizar.test.js`, `tests/importacion/leerExcel.test.js`

**Interfaces:**
- `normalizarEncabezado(t) → string` (minúsculas, sin acentos, sin espacios ni signos)
- `aTexto(v) → string` (recortado, espacios internos reducidos; números sin `.0`)
- `aNumero(v) → { ok: true, valor } | { ok: false }` (acepta `"L 1,250.00"`, números)
- `aEntero(v)` (igual, y rechaza decimales)
- `aFecha(v) → { ok: true, valor: Date } | { ok: false }` (número de serie de Excel, `dd/mm/aaaa`, `aaaa-mm-dd`; rechaza fechas imposibles)
- `esCorreo(t) → boolean`
- `aDni(v) → { ok: true, valor: "0801199012345" } | { ok: false }`
- `leerExcel(archivo: File | { name, size, arrayBuffer() }, { topeFilas }) → Promise<{ hoja, encabezados: string[], filas: [{ filaExcel, valores: { [encabezadoOriginal]: valor } }] }>`. Lanza `ErrorArchivo` con `{ titulo, mensaje }`.

- [ ] **Paso 1:** Instalar SheetJS desde el CDN. Verificar `node -e "console.log(require('xlsx/package.json').version)"` → `0.20.3`.
- [ ] **Paso 2: Pruebas que fallan, `normalizar.test.js`:** `aNumero("L 1,250.00")` → 1250; `aNumero("abc").ok === false`; `aEntero("12.5").ok === false`; `aFecha(45000)` → 15/03/2023; `aFecha("31/02/2026").ok === false`; `aFecha("2026-05-40").ok === false`; `aDni("0801-1990-12345").valor === "0801199012345"`; `aDni(801199012345).ok === false` (12 dígitos; punto de revisión 2); `aTexto(1025) === "1025"`; `normalizarEncabezado("Código ") === "codigo"`.
- [ ] **Paso 3: Pruebas que fallan, `leerExcel.test.js`** (los libros se generan en la prueba con `XLSX.utils.aoa_to_sheet` + `XLSX.write`, tipo `xlsx` y `biff8`):
  - lee `.xlsx` y `.xls` con `filaExcel` empezando en 2;
  - salta las filas vacías intermedias sin alterar el `filaExcel` de las siguientes;
  - extensión `.pdf` → `ErrorArchivo` con título `"Archivo no admitido"`;
  - tamaño mayor a 15 MB (objeto con `size: 16 * 1024 * 1024`) → `"Archivo demasiado grande"`;
  - hoja sin filas de datos → `"El archivo no tiene datos"`;
  - 2.001 filas con `topeFilas: 2000` → `"Demasiadas filas"`, con el tope en el mensaje;
  - título en la fila 1 y encabezados en la fila 3 (punto de revisión 1) → **se detecta como fila de encabezados la primera fila con al menos 2 celdas no vacías de texto**. Si después la validación no encuentra las columnas, el error de columnas faltantes lo da la Tarea 9.
- [ ] **Paso 4:** `npm test -- normalizar leerExcel`. Esperado: FAIL.
- [ ] **Paso 5:** Implementar. `leerExcel` usa `XLSX.read(buffer, { type: "array", cellDates: false })` y `sheet_to_json(hoja, { header: 1, raw: true, defval: "" })`.
- [ ] **Paso 6:** `npm test`. Esperado: PASS. `npm run build`: SheetJS tiene que quedar en un chunk aparte (revisar la salida de Vite).
- [ ] **Paso 7:** Commit `"Importación: lectura de Excel con SheetJS 0.20.3 y normalización de valores"`.

### Task 9 (Tarea 9): Validación genérica y esquema de Productos

**Archivos:**
- Crear: `src/importacion/validar.js`, `src/importacion/esquemas/productos.js`, `src/importacion/esquemas/index.js`
- Crear: `tests/importacion/validar.productos.test.js`

**Interfaces:**
- Esquema: `{ id, nombre, icono, coleccion, moduloPermiso, claveDuplicado, topeFilas, soloCreacion, columnas: [{ campo, etiqueta, alias: [], obligatoria, convertir(valor, contexto) → { ok, valor, mensaje } }], construirDocumento(valores, contexto) → object, camposComparables: [] }`
- `validarEncabezados(esquema, encabezados) → { mapa: { [encabezadoOriginal]: campo }, faltantes: [etiqueta], ignorados: [encabezado] }`
- `validar({ esquema, filas, modo: "solo_nuevos" | "nuevos_y_actualizar", contexto }) → { filas: [FilaClasificada], resumen: { recibidos, nuevos, actualizar, sinCambios, omitidos, rechazados } }`
- `FilaClasificada = { filaExcel, clave, estado: "nuevo"|"actualizar"|"sin_cambios"|"omitido"|"rechazado", valores, documento, existenteId, cambios: [{ campo, anterior, nuevo }], errores: [{ campo, mensaje, valorRecibido }] }`
- `contexto = { existentes: Map<claveNormalizada, { id, ...datos }>, categorias: [nombre], departamentos: [nombre], roles: [{ nombre, estado }], porcentajeInteres, empleadosPorCodigo: Map, dnis: Map<dni, claveEmpleado> }`

- [ ] **Paso 1: Pruebas que fallan** (casos del mockup y de la §4 de la especificación):
  - columnas faltantes: `validarEncabezados` sin `precioContado` → `faltantes: ["precioContado"]`; alias `"SKU"` y `"Código"` → `productoId`;
  - precio `-15` → rechazado, `errores[0].campo === "precioContado"`;
  - nombre vacío → rechazado;
  - stock `-10` y estado `"Pendiente_Revision"` → rechazado con **2** errores;
  - categoría inexistente → rechazado; `"granos y cereales"` se guarda como `"Granos y Cereales"`;
  - clave repetida en el archivo, `" azu-001-st"` y `"AZU-001-ST"` (punto de revisión 3) → la segunda queda rechazada con `"Repetido en la fila 2"`;
  - existente en modo `solo_nuevos` → `omitido`; en `nuevos_y_actualizar` con precio distinto → `actualizar`, con `cambios` que incluyen `precioContado` y `precioCredito`; sin diferencias → `sin_cambios`;
  - columna opcional ausente en el archivo (`stockMinimo`) → no aparece en `cambios`;
  - `precioCredito === 820 * 1.15` con `porcentajeInteres: 15`.
- [ ] **Paso 2:** `npm test -- validar.productos`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar `validar.js` (genérico; no menciona ningún módulo) y el esquema de productos según §4.2 de la especificación.
- [ ] **Paso 4:** `npm test`. Esperado: PASS.
- [ ] **Paso 5:** Commit `"Importación: validación genérica y esquema de Productos"`.

### Task 10 (Tarea 10): Esquemas de Empleados y Usuarios

**Archivos:**
- Crear: `src/importacion/esquemas/empleados.js`, `src/importacion/esquemas/usuarios.js` (registrarlos en `index.js`)
- Crear: `tests/importacion/validar.empleados.test.js`, `tests/importacion/validar.usuarios.test.js`

- [ ] **Paso 1: Pruebas que fallan, Empleados (§4.3):** departamento vacío y fecha `2026-05-40` → 2 errores; DNI de otro empleado → rechazado con `"El DNI ya pertenece al empleado EMP-0101"`; DNI de 12 dígitos → rechazado; `codigoEmpleado` vacío → `nuevo` con `clave: null` (se asigna al ejecutar); dos filas sin código **no** son duplicadas entre sí; `fechaRegistro` existente no entra en `cambios`; `estado` por defecto `"Activo"`.
- [ ] **Paso 2: Pruebas que fallan, Usuarios (§4.4):** `soloCreacion: true` → un existente queda `omitido` incluso en `nuevos_y_actualizar`; correo `"carlos_pena_sin_dominio"` → rechazado; rol `"SUPER ADMIN"` o `"Administrador"` → rechazado; rol inactivo → rechazado; `codigoEmpleado` de un empleado con `uid` → rechazado; dos filas con el mismo `codigoEmpleado` → la segunda rechazada.
- [ ] **Paso 3:** `npm test -- validar`. Esperado: FAIL.
- [ ] **Paso 4:** Implementar los dos esquemas.
- [ ] **Paso 5:** `npm test`. Esperado: PASS.
- [ ] **Paso 6:** Commit `"Importación: esquemas de Empleados y Usuarios"`.

### Task 11 (Tarea 11): Contexto, historial y candado

**Archivos:**
- Crear: `src/importacion/contexto.js`, `src/importacion/historial.js`
- Crear: `tests/importacion/historial.test.js`

**Interfaces:**
- `cargarContexto(almacen, esquema) → Promise<contexto>` (lee solo lo que el esquema necesita)
- `tomarCandado(almacen, modulo, { importacionId, uid, correo }) → Promise<{ ahora: Date }>`. Si está ocupado y no venció, lanza `ErrorCandado` con `{ correo }`.
- `renovarCandado(almacen, modulo)`, `liberarCandado(almacen, modulo)`
- `crearImportacion(almacen, { folio, modulo, modo, archivo, responsable, conteos }) → Promise<id>`
- `actualizarImportacion(almacen, id, cambios)` (siempre agrega `ultimaActividad: marcaServidor()`)
- `bloquesDeFilas(filasClasificadas) → [{ id: "b0001", desde, hasta, filas }]` (tramos de 200)
- `estadoMostrado(importacion, ahora) → string` (`"interrumpida_sin_actividad"` si `en_proceso` o `revirtiendo` y `ultimaActividad` tiene más de 10 minutos)

- [ ] **Paso 1: Pruebas que fallan:** candado libre → se toma; ocupado por otro → `ErrorCandado`; vencido hace 11 minutos → se toma; `bloquesDeFilas` con 450 filas → 3 bloques de 200, 200 y 50, con `desde`/`hasta` correctos; `estadoMostrado` con 9 y 11 minutos de inactividad.
- [ ] **Paso 2:** `npm test -- historial`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar.
- [ ] **Paso 4:** `npm test`. Esperado: PASS.
- [ ] **Paso 5:** Commit `"Importación: contexto, historial y candado por módulo"`.

### Task 12 (Tarea 12): Ejecución para Productos y Empleados

**Archivos:**
- Crear: `src/importacion/ejecutar.js`, `src/importacion/esperar.js` (`esperar(ms)`; en las pruebas se reemplaza con `vi.useFakeTimers` o se inyecta)
- Crear: `tests/importacion/ejecutar.test.js`

**Interfaces:**
- `ejecutarImportacion({ almacen, cuentas, esquema, filas: [filasLeidas], clasificacion, modo, archivo, usuario: { uid, correo, rol }, alAvanzar(progreso), esperarMs = esperar }) → Promise<{ id, folio, estado, conteos }>`. Si la revalidación cambia la clasificación, lanza `ErrorRevalidacion` con `{ clasificacionNueva }`.
- `progreso = { procesadas, total, conteos }`

- [ ] **Paso 1: Pruebas que fallan** (almacén y cuentas falsos):
  - 450 filas válidas nuevas → 3 commits; `conteos.insertados === 450`; 3 bloques de `filas`; estado `completada`; candado liberado; una entrada en `bitacoraactividades`;
  - documentos creados con `importacionId`, `tipoModificacion: "Importación Excel"`, `fechaRegistro` y `estado: "Activo"`;
  - actualización: escribe **solo** los campos de `cambios` más los de auditoría;
  - `fallarCommit(2)` → el reintento funciona y el resultado es `completada`;
  - `fallarCommit(4)` en el segundo tramo → `interrumpida`, primer tramo escrito, `conteos.noProcesados === 250`, `error` con el mensaje (punto de revisión 4);
  - reimportar el mismo archivo después de la interrupción en `solo_nuevos` → las 200 ya escritas quedan `omitido` y no se duplica nada (punto de revisión 4);
  - candado ocupado → `ErrorCandado` y no se crea historial;
  - un registro creado en la base entre la vista previa y la ejecución → `ErrorRevalidacion`;
  - 3 empleados nuevos sin código → una sola transacción de reserva y códigos consecutivos;
  - con rechazados u omitidos → `completada_con_advertencias`.
- [ ] **Paso 2:** `npm test -- ejecutar`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar siguiendo §6.1, §6.2 y §6.4 de la especificación. El permiso se revalida en la interfaz, que es donde está el rol (Tarea 15). Esta función recibe `usuario` ya autorizado.
- [ ] **Paso 4:** `npm test`. Esperado: PASS.
- [ ] **Paso 5:** Commit `"Importación: ejecución por tramos atómicos con reintentos, interrupción y revalidación"`.

### Task 13 (Tarea 13): Ejecución para Usuarios

**Archivos:**
- Modificar: `src/importacion/ejecutar.js` (rama `esquema.id === "usuarios"`)
- Crear: `src/importacion/contrasena.js` (`generarContrasena(largo = 20) → string` con `crypto.getRandomValues`)
- Modificar: `tests/importacion/ejecutar.test.js`

- [ ] **Paso 1: Pruebas que fallan** (§6.3):
  - 3 filas → 3 cuentas creadas, 3 documentos `usuarios/{uid}`, 3 restablecimientos enviados, `cerrarSecundaria` llamada 3 veces;
  - falla definitiva al escribir el documento → `cuentas.borradas` contiene el uid y la fila queda `rechazado`;
  - falla del documento **y** del borrado → aviso `"Cuenta huérfana: eliminar <correo> en la consola de Authentication"` y `completada_con_advertencias`;
  - `email-already-in-use` → `omitido`;
  - `too-many-requests` en la fila 2 de 4 → `interrumpida`, 1 insertado y 3 `no_procesado`;
  - falla de `enviarRestablecimiento` → `insertado`, con el aviso de correo no enviado;
  - `generarContrasena()` tiene 20 caracteres y dos llamadas dan resultados distintos.
- [ ] **Paso 2:** `npm test -- ejecutar`. Esperado: FAIL.
- [ ] **Paso 3:** Implementar.
- [ ] **Paso 4:** `npm test`. Esperado: PASS.
- [ ] **Paso 5:** Commit `"Importación: creación de usuarios de a uno, con borrado de cuentas huérfanas"`.

### Task 14 (Tarea 14): Deshacer y reportes Excel

**Archivos:**
- Crear: `src/importacion/deshacer.js`, `src/importacion/reporte.js`
- Crear: `tests/importacion/deshacer.test.js`, `tests/importacion/reporte.test.js`

**Interfaces:**
- `puedeDeshacer(importacion, { uid, role }, ahora: Date) → { ok: true, restanteMs } | { ok: false, motivo: "plazo_vencido" | "estado" | "sin_permiso" | "nada_que_revertir" }`. El permiso se calcula con `hasPermission` de `roles.js`.
- `deshacerImportacion({ almacen, importacion, usuario, role, alAvanzar }) → Promise<{ estado, conteos }>`
- `generarPlantilla(esquema) → Promise<Blob>`; `generarReporteRechazos(esquema, filas) → Promise<Blob>` (columnas originales + "Fila", "Motivo")

- [ ] **Paso 1: Pruebas que fallan, `deshacer.test.js`** (los mismos casos de §9.1 de la especificación): 11:59 h → ok; 12:01 h → `plazo_vencido`; `fechaFin` nulo usa `ultimaActividad`; `revertida` → `estado`; responsable sin `IMPORT` → `sin_permiso`; otro usuario con `IMPORTACIONES: EDIT` → ok; producto insertado se borra; producto referenciado por un crédito con `productoId` igual al ID, igual al SKU o dentro de `items[]` → `no_revertido` con `"Usado en el crédito <código>"`; empleado con `uid` → `no_revertido`; registro con `tipoModificacion` distinto → `no_revertido`; actualizado con un campo cambiado después → `revertido_parcial` y `precioCredito` recalculado; usuario → `estado: "Deshabilitado"` y empleado desvinculado; reanudar una reversión `revirtiendo` salta las filas que ya tienen `reversion`.
- [ ] **Paso 2: Pruebas que fallan, `reporte.test.js`:** la plantilla de productos, leída de vuelta con `leerExcel`, tiene exactamente las etiquetas de las columnas del esquema; el reporte de rechazos tiene una fila por rechazo, con su motivo.
- [ ] **Paso 3:** `npm test -- deshacer reporte`. Esperado: FAIL.
- [ ] **Paso 4:** Implementar según §6.5 de la especificación.
- [ ] **Paso 5:** `npm test`. Esperado: PASS.
- [ ] **Paso 6:** Commit `"Importación: deshacer dentro de 12 horas y reportes Excel"`.

---

## Fase C — Interfaz

### Task 15 (Tarea 15): Asistente de importación

**Archivos:**
- Crear: `src/pages/importacion/ImportacionWizard.jsx`, `StepperHeader.jsx`, `Paso1Seleccion.jsx`, `Paso2VistaPrevia.jsx`, `Paso3Confirmacion.jsx`, `Paso4Resultado.jsx`, `ModalCancelar.jsx`, `ModalConfirmar.jsx`, `ModalDetalleFila.jsx`
- Crear: `src/auth/ImportRoute.jsx` (valida `:modulo` en `ESQUEMAS` y `hasPermission(role, esquema.moduloPermiso, ACTIONS.IMPORT)`; si no, `<Error403 />`)
- Modificar: `src/routes/AppRoute.jsx` (ruta `/importar/:modulo`)

Partir del markup de `ImportacionExcel/` (estilos y textos), con estos cambios: quitar la barra de simulación, `simulatedRole`, `alert()` y `mockData`; el módulo sale de `ESQUEMAS[modulo]`; las columnas requeridas, de `esquema.columnas`; agregar el selector de modo en el paso 1 (oculto si `esquema.soloCreacion`); el paso 2 tiene filtros por los 5 estados; la ruta de navegación vuelve al módulo de origen; el paso 4 muestra el progreso mientras corre y el aviso de 12 horas al terminar.

- [ ] **Paso 1:** Implementar las pantallas y el estado del asistente (§8 de la especificación). `beforeunload` se registra solo mientras se ejecuta.
- [ ] **Paso 2:** Al confirmar, revalidar el permiso con el `role` actual de `useAuth()`. Si `ejecutarImportacion` lanza `ErrorRevalidacion`, volver al paso 2 con la nueva clasificación y un aviso. Si lanza `ErrorCandado`, `sileo.error` con el correo de quien tiene el candado.
- [ ] **Paso 3:** `npm run build` y `npx eslint src/pages/importacion src/auth/ImportRoute.jsx`.
- [ ] **Paso 4:** Verificación en el navegador (`npm run dev`), **sin confirmar ninguna importación**: con un Excel real cargado, la vista previa clasifica bien y la plantilla se descarga; `/importar/inexistente` y un rol sin `IMPORT` → 403.
- [ ] **Paso 5:** Commit `"Importación: asistente de 4 pasos"`.

### Task 16 (Tarea 16): Historial, deshacer y menú

**Archivos:**
- Crear: `src/pages/importacion/HistorialImportaciones.jsx`, `ModalDeshacer.jsx`, `DetalleImportacion.jsx`
- Modificar: `src/routes/AppRoute.jsx` (ruta `/importaciones` con acceso si `hasPermission(role, IMPORTACIONES, VIEW) || modulosConImport(role).length > 0`)
- Modificar: `src/components/SideBar.jsx` (entrada "Importaciones", ícono `upload_file`, misma condición)

- [ ] **Paso 1:** Tabla según §7 de la especificación, paginada de 25 en 25 con `almacen.consultar`. Sin `IMPORTACIONES: VIEW`, filtrar con `["modulo", "in", modulosConImport(role) en minúsculas]`. "Nueva importación" abre un selector con los módulos que el rol puede importar.
- [ ] **Paso 2:** Detalle por folio (bloques de `filas`, filtro por estado, descarga de rechazados) y botón "Deshacer" con `puedeDeshacer`. La hora del servidor se obtiene de `tomarCandado` al abrir el modal; antes de eso, el tiempo restante se muestra con la hora local, como dato aproximado.
- [ ] **Paso 3:** `npm run build` y lint de los archivos nuevos.
- [ ] **Paso 4:** Commit `"Importación: historial, detalle por folio y deshacer"`.

### Task 17 (Tarea 17): Botones en los módulos e índices de Firestore

**Archivos:**
- Modificar: `src/pages/Productos.jsx`, `src/pages/Empleados.jsx`, `src/pages/Usuarios.jsx` (botón "Importar desde Excel", junto a los botones de exportar o crear que ya existen, visible con `hasPermission(role, MÓDULO, ACTIONS.IMPORT)`; navega a `/importar/<modulo>`)
- Modificar: `firestore.indexes.json` (índices compuestos para `importaciones`: `modulo ASC + fechaInicio DESC`, `estado ASC + fechaInicio DESC`, `modulo ASC + estado ASC + fechaInicio DESC`)

- [ ] **Paso 1:** Agregar los botones. En `Usuarios.jsx`, el botón va en la pestaña de usuarios, no en la de roles.
- [ ] **Paso 2:** Completar `firestore.indexes.json`. **No publicar** (se publica junto con las reglas, con autorización del usuario).
- [ ] **Paso 3:** `npm run build`. Commit `"Importación: botones en Productos, Empleados y Usuarios, e índices de historial"`.

---

## Fase D — Verificación

### Task 18 (Tarea 18): Revisión completa de la rama

- [ ] **Paso 1:** `npm test` (todo PASS), `npm run build` y `npm run lint`. Anotar los errores de lint y separar los que ya existían (comparar con `git stash` / `main`) de los nuevos. **Los nuevos tienen que ser cero.**
- [ ] **Paso 2:** Recorrer la especificación sección por sección y anotar cualquier requisito sin implementar. Corregirlo antes de seguir.
- [ ] **Paso 3:** Revisión de toda la rama con superpowers:requesting-code-review. Aplicar las correcciones confirmadas y hacer commit.

### Task 19 (Tarea 19): Prueba con datos reales (con el usuario)

Todo en esta tarea requiere **confirmación explícita del usuario antes de cada escritura**.

- [ ] **Paso 1:** Confirmar con el usuario lo de la Tarea 3, paso 7 (su cuenta tiene documento SUPER ADMIN).
- [ ] **Paso 2:** El usuario agrega `IMPORT` a SUPER ADMIN en la colección `roles` desde la edición de roles (si el rol existe en la base, ahí manda sobre `ROLE_PERMISSIONS`).
- [ ] **Paso 3:** Productos: archivo real de 10 a 20 filas, modo "solo nuevos" → revisar el folio en el historial y los productos en su pantalla. Después, el archivo completo y el modo actualizar.
- [ ] **Paso 4:** Empleados: igual que el paso 3.
- [ ] **Paso 5:** Deshacer: importar 3 productos reales, deshacer, verificar y volver a importarlos.
- [ ] **Paso 6:** Usuarios: 2 o 3 cuentas reales; verificar que llegue el correo de establecer contraseña y que puedan entrar.
- [ ] **Paso 7:** Lista de verificación por rol (§9.2, punto 7, de la especificación), incluido el punto de revisión 5.
- [ ] **Paso 8:** Con autorización, publicar reglas e índices siguiendo `docs/superpowers/firestore-reglas.md` y repetir una prueba corta de la web y de la app móvil.
- [ ] **Paso 9:** Terminar la rama con superpowers:finishing-a-development-branch. Ojo: el push a `main` publica la web automáticamente por GitHub Actions.
