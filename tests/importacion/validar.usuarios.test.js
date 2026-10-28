import { describe, expect, test } from "vitest";
import { usuarios } from "../../src/importacion/esquemas/usuarios";
import { validar } from "../../src/importacion/validar";

const contexto = () => ({
  existentes: new Map([["ADMIN@COMISARIATO.HN", { id: "u-1", correo: "admin@comisariato.hn" }]]),
  roles: [
    { nombre: "EDITOR CREDITOS", estado: "Activo" },
    { nombre: "SUPER ADMIN", estado: "Activo" },
    { nombre: "EDITOR VIEJO", estado: "Deshabilitado" },
  ],
  empleadosPorCodigo: new Map([
    ["EMP-0412", { id: "e-412", codigoEmpleado: "EMP-0412" }],
    ["EMP-0101", { id: "e-101", codigoEmpleado: "EMP-0101", uid: "u-9" }],
  ]),
});

const fila = (filaExcel, { correo = "marta.solis@comisariato.hn", nombre = "Marta Solís", rol = "Editor Creditos", codigo = "" } = {}) => ({
  filaExcel,
  valores: { Correo: correo, Nombre: nombre, Rol: rol, "Código de empleado": codigo },
});

const clasificar = (filas) =>
  validar({ esquema: usuarios, encabezados: Object.keys(filas[0].valores), filas, modo: "nuevos_y_actualizar", contexto: contexto() });

describe("Usuarios", () => {
  test("fila válida vincula al empleado y guarda el rol con su nombre exacto", () => {
    const [f] = clasificar([fila(2, { correo: " Marta.Solis@Comisariato.hn ", codigo: "emp-0412" })]).filas;
    expect(f.estado).toBe("nuevo");
    expect(f.documento).toEqual({
      correo: "marta.solis@comisariato.hn",
      nombre: "Marta Solís",
      rol: "EDITOR CREDITOS",
      empleadoId: "e-412",
    });
  });

  test("existente queda omitido aunque el modo sea actualizar", () => {
    const [f] = clasificar([fila(2, { correo: "admin@comisariato.hn" })]).filas;
    expect(f.estado).toBe("omitido");
  });

  test("correo sin dominio se rechaza", () => {
    const [f] = clasificar([fila(5, { correo: "carlos_pena_sin_dominio" })]).filas;
    expect(f.errores[0].campo).toBe("correo");
  });

  test("no se asigna SUPER ADMIN ni Administrador, ni un rol deshabilitado o inexistente", () => {
    const r = clasificar([
      fila(2, { correo: "a@x.hn", rol: "SUPER ADMIN" }),
      fila(3, { correo: "b@x.hn", rol: "Administrador" }),
      fila(4, { correo: "c@x.hn", rol: "EDITOR VIEJO" }),
      fila(5, { correo: "d@x.hn", rol: "NO EXISTE" }),
    ]);
    expect(r.filas.every((f) => f.estado === "rechazado" && f.errores[0].campo === "rol")).toBe(true);
  });

  test("empleado inexistente o que ya tiene usuario se rechaza", () => {
    const r = clasificar([fila(2, { correo: "a@x.hn", codigo: "EMP-9999" }), fila(3, { correo: "b@x.hn", codigo: "EMP-0101" })]);
    expect(r.filas[0].errores[0].mensaje).toMatch(/No existe el empleado EMP-9999/);
    expect(r.filas[1].errores[0].mensaje).toMatch(/ya tiene un usuario/);
  });

  test("dos filas que vinculan al mismo empleado: la segunda se rechaza", () => {
    const r = clasificar([fila(2, { correo: "a@x.hn", codigo: "EMP-0412" }), fila(3, { correo: "b@x.hn", codigo: "EMP-0412" })]);
    expect(r.filas[0].estado).toBe("nuevo");
    expect(r.filas[1].errores[0].mensaje).toBe("El empleado EMP-0412 ya se vincula en la fila 2");
  });
});
