import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

export const logActividad = async (modulo, accion, detalles = {}) => {
  try {
    const user = auth.currentUser;
    const email = user ? (user.email || user.uid) : "Sistema";
    await addDoc(collection(db, 'bitacoraactividades'), {
       modulo,
       tipoModificacion: accion,
       usuarioModifico: email,
       fechaRegistro: serverTimestamp(),
       detalles
    });
  } catch(e) {
    console.error("No se pudo registrar actividad:", e);
  }
};
