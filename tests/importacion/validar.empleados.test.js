import { describe, expect, test } from "vitest";
import { empleados } from "../../src/importacion/esquemas/empleados";
import { validar } from "../../src/importacion/validar";

const existente = {
  id: "e-101",
  codigoEmpleado: "EMP-0101",
  nombres: "Mario René",
  apellidos: "Valenzuela",
  dni: "0801198011111",
  departamento: "Logística",
  estado: "Activo",
  fechaRegistro: new Date(2018, 0, 10),
};

const contexto = () => ({
  existentes: new Map([["EMP-0101", existente]]),
  departamentos: ["Logística", "Recursos Humanos"],
  dnis: new Map([["0801198011111", "EMP-0101"]]),
});

const fila = (filaExcel, v) => ({
  filaExcel,
  valores: {
    Código: v.codigo ?? "",
    Nombres: v.nombres ?? "Ana",
    Apellidos: v.apellidos ?? "Pérez",
    DNI: v.dni ?? "0801-1990-12345",
    Departamento: v.depto ?? "Recursos Humanos",
    "Fecha de ingreso": v.fecha ?? "",
  },
});

const clasificar = (filas, modo = "solo_nuevos") =>
  validar({ esquema: empleados, encabezados: Object.keys(filas[0].valores), filas, modo, contexto: contexto() });

describe("Empleados", () => {
  test("departamento vacío y fecha imposible dan dos errores", () => {
    const [f] = clasificar([fila(5, { depto: "", fecha: "2026-05-40" })]).filas;
    expect(f.estado).toBe("rechazado");
    expect(f.errores.map((e) => e.campo).sort()).toEqual(["departamento", "fechaRegistro"]);
  });

  test("DNI de otro empleado se rechaza nombrando al empleado", () => {
    const [f] = clasificar([fila(2, { codigo: "EMP-0500", dni: "0801-1980-11111" })]).filas;
    expect(f.estado).toBe("rechazado");
    expect(f.errores[0].mensaje).toBe("El DNI ya pertenece al empleado EMP-0101");
  });

  test("DNI de 12 dígitos se rechaza", () => {
    const [f] = clasificar([fila(2, { dni: 801199012345 })]).filas;
    expect(f.errores[0]).toMatchObject({ campo: "dni" });
    expect(f.errores[0].mensaje).toMatch(/13 dígitos/);
  });

  test("DNI repetido dentro del archivo se rechaza en la segunda fila", () => {
    const r = clasificar([fila(2, {}), fila(3, { nombres: "Otra" })]);
    expect(r.filas[1].estado).toBe("rechazado");
    expect(r.filas[1].errores[0].mensaje).toBe("DNI repetido en la fila 2");
  });

  test("sin código queda nuevo con clave nula, y dos filas sin código no son duplicadas entre sí", () => {
    const r = clasificar([fila(2, {}), fila(3, { dni: "0801199099999" })]);
    expect(r.filas.map((f) => [f.estado, f.clave])).toEqual([
      ["nuevo", null],
      ["nuevo", null],
    ]);
    expect(r.filas[0].documento).toMatchObject({
      codigoEmpleado: null,
      nombres: "Ana",
      dni: "0801199012345",
      estado: "Activo",
      salario: 0,
      limiteCredito: 0,
      correo: "",
    });
  });

  test("la fecha de ingreso se respeta al crear y no se actualiza en un existente", () => {
    const nueva = clasificar([fila(2, { codigo: "EMP-0412", fecha: "14/02/2021" })]).filas[0];
    expect(nueva.documento.fechaRegistro).toEqual(new Date(2021, 1, 14));

    const r = clasificar(
      [fila(2, { codigo: "emp-0101", nombres: "Mario René", apellidos: "Valenzuela", dni: "0801198011111", depto: "Logística", fecha: "01/01/2000" })],
      "nuevos_y_actualizar",
    );
    expect(r.filas[0].estado).toBe("sin_cambios");
  });
});
