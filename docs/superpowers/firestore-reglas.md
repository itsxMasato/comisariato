# Reglas de Firestore: supuestos y publicación

Las reglas están en `firestore.rules` y los índices en `firestore.indexes.json`. Las dos se publican **a mano**: el despliegue de GitHub Actions solo publica Hosting.

## Qué protegen

- Sin sesión, sin documento en `usuarios` o con un usuario deshabilitado **no se lee ni se escribe nada**.
- `roles` y `parametros`: solo SUPER ADMIN escribe.
- `usuarios`: escribe el personal administrativo (cualquier rol activo distinto de `EMPLEADO`/`Usuario`). Solo SUPER ADMIN puede dar, quitar o modificar el rol SUPER ADMIN. Cada usuario puede editar su propio documento, salvo `rol` y `estado`.
- `bitacoraactividades` e `historial_*`: solo se agregan registros; nunca se modifican ni se borran.
- `importaciones`, sus `filas`, `contadores` e `importaciones_bloqueo`: escribe el personal administrativo. Las importaciones nunca se borran.
- `productos`, `empleados`, `categorias`, `departamentos`, `creditos`, `cuotas`: lee y escribe cualquier usuario activo (la app móvil crea reservas en `creditos`); solo el personal borra.
- Cualquier otra colección queda denegada.

## Qué NO protegen todavía

Los permisos por módulo y acción (por ejemplo, que EDITOR INVENTARIO no edite empleados, o que solo quien tiene `IMPORT` importe) siguen verificándose en la aplicación. Para llevarlos al servidor, los documentos de `roles` tendrían que guardarse con el nombre del rol como ID.

## Supuestos que hay que confirmar antes de publicar

1. **La app móvil** (su código no está en este repositorio) solo usa las colecciones de la lista de arriba y entra con usuarios que tienen documento en `usuarios` con `estado: "Activo"`. Si lee o escribe alguna otra colección, hay que agregarla antes de publicar.
2. La cuenta de quien administra tiene documento en `usuarios` con `rol: "SUPER ADMIN"` y `estado: "Activo"`.

## Cómo publicarlas

1. **Respaldo:** en la consola de Firebase → Firestore → *Reglas*, copiar las reglas que están publicadas hoy y guardarlas en un archivo.
2. **Probar sin publicar:** en esa misma pantalla, pegar el contenido de `firestore.rules` y usar el *Rules Playground* (simulador) con:
   - un usuario SUPER ADMIN leyendo `roles` y escribiendo `parametros/general` → permitido;
   - un usuario EMPLEADO creando un documento en `creditos` → permitido; escribiendo en `roles` → denegado;
   - un usuario autenticado sin documento en `usuarios` leyendo `productos` → denegado.
3. **Publicar** desde el repositorio:
   ```
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```
4. **Verificar:** entrar a la web con cada rol y abrir la app móvil (iniciar sesión, ver productos, hacer una reserva).
5. **Si algo falla:** volver a pegar el respaldo del paso 1 en la consola y publicarlo.
