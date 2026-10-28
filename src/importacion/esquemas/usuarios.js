// Esquema de importación de Usuarios (§4.4 de la especificación). Solo creación.
import { normalizarClave } from "../../utils/validaciones";
import { aTexto, esCorreo, normalizarEncabezado } from "../normalizar";
import { texto } from "./comunes";

// Roles que nunca se asignan por importación
const ROLES_PROHIBIDOS = ["superadmin", "administrador"];

const correo = () => (v) =>
  esCorreo(v) ? { ok: true, valor: aTexto(v).toLowerCase() } : { ok: false, mensaje: "no es un correo válido" };

const rol = () => (v, contexto) => {
  const buscado = normalizarEncabezado(v);
  if (ROLES_PROHIBIDOS.includes(buscado)) return { ok: false, mensaje: "no se puede asignar por importación" };
  const encontrado = (contexto.roles || []).find((r) => normalizarEncabezado(r.nombre) === buscado);
  if (!encontrado) return { ok: false, mensaje: `«${aTexto(v)}» no existe` };
  if (encontrado.estado !== "Activo") return { ok: false, mensaje: `«${encontrado.nombre}» está deshabilitado` };
  return { ok: true, valor: encontrado.nombre };
};

const codigo = () => (v) => ({ ok: true, valor: normalizarClave(v) });

export const usuarios = {
  id: "usuarios",
  nombre: "Usuarios",
  icono: "admin_panel_settings",
  coleccion: "usuarios",
  moduloPermiso: "USUARIOS",
  claveDuplicado: "correo",
  topeFilas: 50,
  soloCreacion: true,
  columnas: [
    { campo: "correo", etiqueta: "Correo", alias: ["email", "correoelectronico", "usuario"], obligatoria: true, convertir: correo() },
    { campo: "nombre", etiqueta: "Nombre", alias: ["nombrecompleto"], obligatoria: true, convertir: texto() },
    { campo: "rol", etiqueta: "Rol", alias: [], obligatoria: true, convertir: rol() },
    { campo: "codigoEmpleado", etiqueta: "Código de empleado", alias: ["codigodeempleado", "codigoempleado", "empleado"], obligatoria: false, convertir: codigo() },
  ],
  // El empleado a vincular debe existir, no tener usuario y no repetirse en el archivo
  validarFila: (v, { contexto, compartido, filaExcel }) => {
    if (!v.codigoEmpleado) return [];
    const empleado = contexto.empleadosPorCodigo?.get(v.codigoEmpleado);
    const error = (mensaje) => [{ campo: "codigoEmpleado", mensaje, valorRecibido: v.codigoEmpleado }];
    if (!empleado) return error(`No existe el empleado ${v.codigoEmpleado}`);
    if (empleado.uid || empleado.usuarioId) return error(`El empleado ${v.codigoEmpleado} ya tiene un usuario`);
    compartido.empleados ??= new Map();
    if (compartido.empleados.has(v.codigoEmpleado)) {
      return error(`El empleado ${v.codigoEmpleado} ya se vincula en la fila ${compartido.empleados.get(v.codigoEmpleado)}`);
    }
    compartido.empleados.set(v.codigoEmpleado, filaExcel);
    return [];
  },
  construirDocumento: (v, contexto) => ({
    correo: v.correo,
    nombre: v.nombre,
    rol: v.rol,
    empleadoId: v.codigoEmpleado ? contexto.empleadosPorCodigo.get(v.codigoEmpleado).id : "",
  }),
};
