// Registro de los módulos importables, por id de ruta (/importar/:modulo)
import { empleados } from "./empleados";
import { productos } from "./productos";
import { usuarios } from "./usuarios";

export const ESQUEMAS = { productos, empleados, usuarios };
