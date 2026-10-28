// Adaptador `cuentas` sobre Firebase Auth. Las cuentas se crean con la app
// secundaria para no cerrar la sesión de quien importa (igual que Usuarios.jsx).
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth, secondaryAuth } from "../firebase/firebase";

export const cuentasFirebase = {
  async crear(correo, contrasena) {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, correo, contrasena);
    return {
      uid: cred.user.uid,
      // Solo puede borrar la cuenta recién creada: la app secundaria tiene su sesión
      borrar: () => cred.user.delete(),
    };
  },
  enviarRestablecimiento: (correo) => sendPasswordResetEmail(auth, correo),
  cerrarSecundaria: () => signOut(secondaryAuth),
};
