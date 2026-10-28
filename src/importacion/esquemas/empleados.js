// Esquema de importación de Empleados (§4.3 de la especificación)
import { normalizarClave } from "../../utils/validaciones";
import { aDni, aFecha, aTexto, esCorreo } from "../normalizar";
import { deCatalogo, estadoActivoInactivo, numeroNoNegativo, texto } from "./comunes";

const correo = () => (v) =>
  esCorreo(v) ? { ok: true, valor: aTexto(v).toLowerCase() } : { ok: false, mensaje: "no es un correo válido" };

const codigo = () => (v) => ({ ok: true, valor: normalizarClave(v) });

export const empleados = {
  id: "empleados",
  nombre: "Empleados",
  icono: "badge",
  coleccion: "empleados",
  moduloPermiso: "EMPLEADOS",
  claveDuplicado: "codigoEmpleado",
  topeFilas: 2000,
  soloCreacion: false,
  columnas: [
    { campo: "codigoEmpleado", etiqueta: "Código", alias: ["codigo", "codigodeempleado", "codigoempleado"], obligatoria: false, convertir: codigo() },
    { campo: "nombres", etiqueta: "Nombres", alias: ["nombre"], obligatoria: true, convertir: texto() },
    { campo: "apellidos", etiqueta: "Apellidos", alias: ["apellido"], obligatoria: true, convertir: texto() },
    { campo: "dni", etiqueta: "DNI", alias: ["identidad", "numerodeidentidad"], obligatoria: true, convertir: aDni },
    { campo: "departamento", etiqueta: "Departamento", alias: ["area"], obligatoria: true, convertir: deCatalogo("departamentos", "los departamentos") },
    { campo: "correo", etiqueta: "Correo", alias: ["email", "correoelectronico"], obligatoria: false, convertir: correo() },
    { campo: "telefono", etiqueta: "Teléfono", alias: ["celular"], obligatoria: false, convertir: texto() },
    { campo: "salario", etiqueta: "Salario", alias: ["sueldo"], obligatoria: false, convertir: numeroNoNegativo() },
    { campo: "limiteCredito", etiqueta: "Límite de crédito", alias: ["limitedecredito", "limite"], obligatoria: false, convertir: numeroNoNegativo() },
    { campo: "estado", etiqueta: "Estado", alias: [], obligatoria: false, convertir: estadoActivoInactivo() },
    { campo: "fechaRegistro", etiqueta: "Fecha de ingreso", alias: ["fechadeingreso", "fechaingreso", "fecharegistro"], obligatoria: false, convertir: aFecha },
  ],
  // La fecha histórica de ingreso no se reescribe al actualizar
  camposNoActualizables: ["fechaRegistro"],
  // El DNI no puede repetirse: ni con otro empleado de la base ni dentro del archivo
  validarFila: (v, { contexto, compartido, filaExcel }) => {
    if (!v.dni) return [];
    const errores = [];
    const duenio = contexto.dnis?.get(v.dni);
    const clave = v.codigoEmpleado ? normalizarClave(v.codigoEmpleado) : null;
    if (duenio && duenio !== clave) {
      errores.push({ campo: "dni", mensaje: `El DNI ya pertenece al empleado ${duenio}`, valorRecibido: v.dni });
    }
    compartido.dnis ??= new Map();
    if (compartido.dnis.has(v.dni)) {
      errores.push({ campo: "dni", mensaje: `DNI repetido en la fila ${compartido.dnis.get(v.dni)}`, valorRecibido: v.dni });
    } else compartido.dnis.set(v.dni, filaExcel);
    return errores;
  },
  // codigoEmpleado nulo: se asigna EMP-NNNN al ejecutar; fechaRegistro nula: fecha de la importación
  construirDocumento: (v) => ({
    codigoEmpleado: v.codigoEmpleado ?? null,
    nombres: v.nombres,
    apellidos: v.apellidos,
    dni: v.dni,
    departamento: v.departamento,
    correo: v.correo ?? "",
    telefono: v.telefono ?? "",
    salario: v.salario ?? 0,
    limiteCredito: v.limiteCredito ?? 0,
    estado: v.estado ?? "Activo",
    fechaRegistro: v.fechaRegistro ?? null,
  }),
};
