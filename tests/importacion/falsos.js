// Versiones en memoria de los adaptadores `almacen` y `cuentas`.
// Siguen el mismo contrato que almacenFirestore.js y cuentasFirebase.js.

const MARCA = Symbol("marcaServidor");
const BORRAR = Symbol("campoBorrado");

const copiar = (v) => (v === undefined ? undefined : structuredClone(v));

export function crearAlmacenFalso(datosIniciales = {}, { ahora = new Date("2026-10-28T12:00:00Z") } = {}) {
  const datos = new Map(Object.entries(datosIniciales).map(([r, d]) => [r, copiar(d)]));
  let fallosPendientes = 0;
  let contadorIds = 0;

  const resolver = (valores, base = {}) => {
    const out = { ...base };
    Object.entries(valores).forEach(([k, v]) => {
      if (v === BORRAR) delete out[k];
      else if (v === MARCA) out[k] = new Date(almacen.ahora);
      else out[k] = copiar(v);
    });
    return out;
  };

  const aplicar = (mapa, op) => {
    if (op.tipo === "set") mapa.set(op.ruta, resolver(op.datos));
    else if (op.tipo === "delete") mapa.delete(op.ruta);
    else {
      if (!mapa.has(op.ruta)) throw new Error(`El documento ${op.ruta} no existe`);
      mapa.set(op.ruta, resolver(op.datos, mapa.get(op.ruta)));
    }
  };

  const esHijoDirecto = (ruta, coleccion) => {
    const resto = ruta.slice(coleccion.length + 1);
    return ruta.startsWith(`${coleccion}/`) && resto.length > 0 && !resto.includes("/");
  };

  const cumple = (doc, [campo, op, valor]) => {
    const v = doc[campo];
    if (op === "==") return v === valor;
    if (op === "in") return valor.includes(v);
    if (op === ">=") return v >= valor;
    if (op === "<=") return v <= valor;
    throw new Error(`Operador no soportado: ${op}`);
  };

  const almacen = {
    datos,
    ahora,
    commits: 0,
    fallarCommit(n) {
      fallosPendientes = n;
    },
    async leerTodos(coleccion) {
      return [...datos.entries()]
        .filter(([r]) => esHijoDirecto(r, coleccion))
        .map(([r, d]) => ({ id: r.split("/").pop(), ...copiar(d) }));
    },
    async leer(ruta) {
      return datos.has(ruta) ? copiar(datos.get(ruta)) : null;
    },
    nuevoId(coleccion) {
      contadorIds += 1;
      return `${coleccion.split("/").pop()}-${contadorIds}`;
    },
    lote() {
      const ops = [];
      return {
        set: (ruta, d) => ops.push({ tipo: "set", ruta, datos: d }),
        update: (ruta, d) => ops.push({ tipo: "update", ruta, datos: d }),
        delete: (ruta) => ops.push({ tipo: "delete", ruta }),
        async commit() {
          if (fallosPendientes > 0) {
            fallosPendientes -= 1;
            throw new Error("Fallo simulado de escritura");
          }
          const copia = new Map(datos);
          ops.forEach((op) => aplicar(copia, op));
          datos.clear();
          copia.forEach((v, k) => datos.set(k, v));
          almacen.commits += 1;
        },
      };
    },
    async transaccion(fn) {
      const copia = new Map(datos);
      const tx = {
        leer: async (ruta) => (copia.has(ruta) ? copiar(copia.get(ruta)) : null),
        set: (ruta, d) => aplicar(copia, { tipo: "set", ruta, datos: d }),
        update: (ruta, d) => aplicar(copia, { tipo: "update", ruta, datos: d }),
      };
      const resultado = await fn(tx);
      datos.clear();
      copia.forEach((v, k) => datos.set(k, v));
      return resultado;
    },
    async actualizar(ruta, d) {
      aplicar(datos, { tipo: "update", ruta, datos: d });
    },
    marcaServidor: () => MARCA,
    campoBorrado: () => BORRAR,
    async consultar(coleccion, { donde = [], orden, limite, despuesDe } = {}) {
      let docs = await almacen.leerTodos(coleccion);
      docs = docs.filter((d) => donde.every((c) => cumple(d, c)));
      if (orden) {
        const [campo, dir = "asc"] = orden;
        docs.sort((x, y) => (x[campo] < y[campo] ? -1 : x[campo] > y[campo] ? 1 : 0) * (dir === "desc" ? -1 : 1));
      }
      if (despuesDe) docs = docs.slice(docs.findIndex((d) => d.id === despuesDe) + 1);
      if (limite) docs = docs.slice(0, limite);
      return { docs, ultimo: docs.length ? docs[docs.length - 1].id : null };
    },
  };
  return almacen;
}

export function crearCuentasFalsas({
  existentes = [],
  fallarCon = {},
  fallarBorrado = false,
  fallarRestablecimiento = [],
} = {}) {
  const usados = new Set(existentes.map((c) => c.toLowerCase()));
  let n = 0;
  const cuentas = {
    creadas: [],
    borradas: [],
    restablecimientos: [],
    cierres: 0,
    async crear(correo) {
      if (fallarCon[correo]) throw Object.assign(new Error(fallarCon[correo]), { code: fallarCon[correo] });
      if (usados.has(correo.toLowerCase())) {
        throw Object.assign(new Error("email-already-in-use"), { code: "auth/email-already-in-use" });
      }
      usados.add(correo.toLowerCase());
      n += 1;
      const uid = `uid-${n}`;
      cuentas.creadas.push({ uid, correo });
      return {
        uid,
        async borrar() {
          if (fallarBorrado) throw new Error("No se pudo borrar la cuenta");
          cuentas.borradas.push(uid);
        },
      };
    },
    async enviarRestablecimiento(correo) {
      if (fallarRestablecimiento.includes(correo)) throw new Error("Fallo de correo");
      cuentas.restablecimientos.push(correo);
    },
    async cerrarSecundaria() {
      cuentas.cierres += 1;
    },
  };
  return cuentas;
}
