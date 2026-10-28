import { describe, expect, test } from "vitest";
import {
  formatearCodigoEmpleado,
  maximoCodigoEmpleado,
  reservarCodigosEmpleado,
  siguienteFolio,
} from "../src/utils/contadores";
import { crearAlmacenFalso } from "./importacion/falsos";

describe("códigos de empleado", () => {
  test("formatea con al menos 4 dígitos", () => {
    expect(formatearCodigoEmpleado(7)).toBe("EMP-0007");
    expect(formatearCodigoEmpleado(12345)).toBe("EMP-12345");
  });

  test("máximo ignora códigos que no son EMP-", () => {
    expect(maximoCodigoEmpleado([{ codigoEmpleado: "EMP-0009" }, { codigoEmpleado: "X" }, {}])).toBe(9);
    expect(maximoCodigoEmpleado([])).toBe(0);
  });

  test("reservar inicializa el contador desde el máximo existente", async () => {
    const a = crearAlmacenFalso({ "empleados/e1": { codigoEmpleado: "EMP-0009" } });
    expect(await reservarCodigosEmpleado(a, 2)).toEqual(["EMP-0010", "EMP-0011"]);
    expect((await a.leer("contadores/empleados")).ultimo).toBe(11);
  });

  test("dos reservas seguidas no se repiten", async () => {
    const a = crearAlmacenFalso({ "empleados/e1": { codigoEmpleado: "EMP-0001" } });
    const r1 = await reservarCodigosEmpleado(a, 1);
    const r2 = await reservarCodigosEmpleado(a, 1);
    expect(r1).toEqual(["EMP-0002"]);
    expect(r2).toEqual(["EMP-0003"]);
  });

  test("si el contador quedó atrás de un código creado a mano, salta adelante", async () => {
    const a = crearAlmacenFalso({
      "contadores/empleados": { ultimo: 3 },
      "empleados/e1": { codigoEmpleado: "EMP-0020" },
    });
    expect(await reservarCodigosEmpleado(a, 1)).toEqual(["EMP-0021"]);
  });
});

describe("folio de importación", () => {
  test("primer folio del año", async () => {
    const a = crearAlmacenFalso();
    const ahora = new Date("2026-03-01T12:00:00Z");
    expect(await siguienteFolio(a, ahora)).toBe("IMP-2026-0001");
    expect(await siguienteFolio(a, ahora)).toBe("IMP-2026-0002");
  });

  test("folio reinicia al cambiar de año", async () => {
    const a = crearAlmacenFalso({ "contadores/importaciones": { anio: 2025, ultimo: 40 } });
    expect(await siguienteFolio(a, new Date("2026-01-02T12:00:00Z"))).toBe("IMP-2026-0001");
  });
});
