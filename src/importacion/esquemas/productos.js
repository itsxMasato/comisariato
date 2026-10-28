// Esquema de importación de Productos (§4.2 de la especificación)
import { aTexto } from "../normalizar";
import {
  deCatalogo,
  enteroNoNegativo,
  estadoActivoInactivo,
  numeroMayorACero,
  redondear2,
  texto,
} from "./comunes";

// Mismo placeholder que usa Productos.jsx cuando no hay foto
const IMAGEN_POR_DEFECTO = "https://via.placeholder.com/150?text=Sin+Foto";

const precioCredito = (precioContado, contexto) =>
  redondear2(precioContado * (1 + (contexto.porcentajeInteres ?? 15) / 100));

const url = () => (v) => {
  const t = aTexto(v);
  return /^https?:\/\/\S+$/i.test(t) ? { ok: true, valor: t } : { ok: false, mensaje: "debe ser una dirección http(s)" };
};

export const productos = {
  id: "productos",
  nombre: "Productos",
  icono: "inventory_2",
  coleccion: "productos",
  moduloPermiso: "PRODUCTOS",
  claveDuplicado: "productoId",
  topeFilas: 2000,
  soloCreacion: false,
  columnas: [
    { campo: "productoId", etiqueta: "Código", alias: ["codigo", "sku", "idproducto", "codigoproducto"], obligatoria: true, convertir: texto() },
    { campo: "nombre", etiqueta: "Nombre", alias: ["producto", "nombreproducto", "nombredelproducto"], obligatoria: true, convertir: texto() },
    { campo: "categoria", etiqueta: "Categoría", alias: [], obligatoria: true, convertir: deCatalogo("categorias", "las categorías") },
    { campo: "precioContado", etiqueta: "Precio de contado", alias: ["precio", "preciodecontado"], obligatoria: true, convertir: numeroMayorACero() },
    { campo: "stock", etiqueta: "Stock", alias: ["existencia", "existencias", "cantidad"], obligatoria: true, convertir: enteroNoNegativo() },
    { campo: "stockMinimo", etiqueta: "Stock mínimo", alias: ["minimo"], obligatoria: false, convertir: enteroNoNegativo() },
    { campo: "descripcion", etiqueta: "Descripción", alias: [], obligatoria: false, convertir: texto() },
    { campo: "imagenUrl", etiqueta: "URL de imagen", alias: ["imagen", "urlimagen", "foto"], obligatoria: false, convertir: url() },
    { campo: "estado", etiqueta: "Estado", alias: [], obligatoria: false, convertir: estadoActivoInactivo() },
  ],
  construirDocumento: (v, contexto) => ({
    productoId: v.productoId,
    nombre: v.nombre,
    categoria: v.categoria,
    precioContado: v.precioContado,
    precioCredito: precioCredito(v.precioContado, contexto),
    stock: v.stock,
    ...(v.stockMinimo !== undefined && { stockMinimo: v.stockMinimo }),
    descripcion: v.descripcion ?? "",
    imagenUrl: v.imagenUrl ?? IMAGEN_POR_DEFECTO,
    estado: v.estado ?? "Activo",
  }),
  // El precio de crédito se recalcula solo si cambia el precio de contado
  derivarActualizacion: (cambios, contexto) =>
    cambios.precioContado !== undefined ? { precioCredito: precioCredito(cambios.precioContado, contexto) } : {},
};
