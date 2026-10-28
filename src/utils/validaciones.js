// Validaciones compartidas entre los formularios y la importación desde Excel

// Clave comparable: texto, sin espacios en los extremos y en mayúsculas.
// Los números (p. ej. un código leído de Excel como 1025) pasan a texto sin decimales.
export const normalizarClave = (valor) => {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim().toUpperCase();
};

// Producto que ya usa ese código (sin contar el que se está editando)
export const skuDuplicado = (productos, sku, idActual) => {
  const clave = normalizarClave(sku);
  if (!clave) return null;
  return productos.find((p) => p.id !== idActual && normalizarClave(p.productoId) === clave) || null;
};
