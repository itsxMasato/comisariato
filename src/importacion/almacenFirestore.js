// Adaptador `almacen` sobre Firestore. La lógica de importación solo habla con
// Firestore a través de este objeto, así se puede probar con un almacén en memoria.
// Rutas como texto: "coleccion/id" o "coleccion/id/subcoleccion/id".
import {
  Timestamp,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const ref = (ruta) => doc(db, ...ruta.split("/"));

// Convierte los Timestamp de Firestore en Date, también dentro de objetos y listas
const aDates = (valor) => {
  if (valor instanceof Timestamp) return valor.toDate();
  if (Array.isArray(valor)) return valor.map(aDates);
  if (valor && typeof valor === "object" && valor.constructor === Object) {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, aDates(v)]));
  }
  return valor;
};

const conId = (snap) => ({ id: snap.id, ...aDates(snap.data()) });

export const almacenFirestore = {
  async leerTodos(coleccion) {
    const snap = await getDocs(collection(db, ...coleccion.split("/")));
    return snap.docs.map(conId);
  },
  async leer(ruta) {
    const snap = await getDoc(ref(ruta));
    return snap.exists() ? aDates(snap.data()) : null;
  },
  nuevoId(coleccion) {
    return doc(collection(db, ...coleccion.split("/"))).id;
  },
  lote() {
    const batch = writeBatch(db);
    return {
      set: (ruta, datos) => batch.set(ref(ruta), datos),
      update: (ruta, datos) => batch.update(ref(ruta), datos),
      delete: (ruta) => batch.delete(ref(ruta)),
      commit: () => batch.commit(),
    };
  },
  transaccion(fn) {
    return runTransaction(db, (t) =>
      fn({
        leer: async (ruta) => {
          const snap = await t.get(ref(ruta));
          return snap.exists() ? aDates(snap.data()) : null;
        },
        set: (ruta, datos) => t.set(ref(ruta), datos),
        update: (ruta, datos) => t.update(ref(ruta), datos),
      }),
    );
  },
  actualizar: (ruta, datos) => updateDoc(ref(ruta), datos),
  marcaServidor: () => serverTimestamp(),
  campoBorrado: () => deleteField(),
  // `despuesDe` es el cursor `ultimo` que devolvió la página anterior
  async consultar(coleccion, { donde = [], orden, limite, despuesDe } = {}) {
    const partes = donde.map(([campo, op, valor]) => where(campo, op, valor));
    if (orden) partes.push(orderBy(orden[0], orden[1] || "asc"));
    if (despuesDe) partes.push(startAfter(despuesDe));
    if (limite) partes.push(limit(limite));
    const snap = await getDocs(query(collection(db, ...coleccion.split("/")), ...partes));
    return { docs: snap.docs.map(conId), ultimo: snap.docs[snap.docs.length - 1] || null };
  },
};
