// Carga desde Firestore lo que necesita la validación de cada módulo
import { normalizarClave } from "../utils/validaciones";

const porClave = (docs, campo) => {
  const mapa = new Map();
  docs.forEach((d) => {
    const clave = normalizarClave(d[campo]);
    if (clave && !mapa.has(clave)) mapa.set(clave, d);
  });
  return mapa;
};

// Mismo criterio de nombre que Productos.jsx y DatosVariables.jsx
const nombreDeCatalogo = (d) => d.nombre || d.categoria || d.departamento || d.descripcion || d.id;

const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

export const cargarContexto = async (almacen, esquema) => {
  if (esquema.id === "productos") {
    const [productos, categorias, parametros] = await Promise.all([
      almacen.leerTodos("productos"),
      almacen.leerTodos("categorias"),
      almacen.leer("parametros/general"),
    ]);
    return {
      existentes: porClave(productos, "productoId"),
      categorias: categorias.map(nombreDeCatalogo),
      porcentajeInteres: parametros?.porcentajeInteres ?? 15,
    };
  }

  if (esquema.id === "empleados") {
    const [empleados, departamentos] = await Promise.all([almacen.leerTodos("empleados"), almacen.leerTodos("departamentos")]);
    const dnis = new Map();
    empleados.forEach((e) => {
      const dni = soloDigitos(e.dni);
      if (dni) dnis.set(dni, normalizarClave(e.codigoEmpleado) || e.id);
    });
    return {
      existentes: porClave(empleados, "codigoEmpleado"),
      departamentos: departamentos.map(nombreDeCatalogo),
      dnis,
    };
  }

  if (esquema.id === "usuarios") {
    const [usuarios, roles, empleados] = await Promise.all([
      almacen.leerTodos("usuarios"),
      almacen.leerTodos("roles"),
      almacen.leerTodos("empleados"),
    ]);
    return {
      existentes: porClave(usuarios, "correo"),
      roles: roles.map((r) => ({ nombre: r.nombre, estado: r.estado || "Activo" })),
      empleadosPorCodigo: porClave(empleados, "codigoEmpleado"),
    };
  }

  throw new Error(`Módulo de importación desconocido: ${esquema.id}`);
};
