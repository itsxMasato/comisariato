// Archivo de inicialización de Firebase
// Se utiliza para conectar la app React con los servicios de Firebase

// Importa la funcion principal para inicializar Firebase
import { initializeApp } from "firebase/app";
// Importa el servicio de autenticacion
import { getAuth } from "firebase/auth";
// Importa el servicio de Firestore
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

/* Configuración de Firebase
    Debes reemplazar estos valores con los de tu proyecto de Firebase
    Puedes obtenerlos en la consola de Firebase
*/
export const firebaseConfig = {
  apiKey: "AIzaSyD3mTb3X7pqSHqlm7yIhk6-fn_ue7bT5bc",
  authDomain: "comisariato-adebf.firebaseapp.com",
  projectId: "comisariato-adebf",
  storageBucket: "comisariato-adebf.firebasestorage.app",
  messagingSenderId: "942279272049",
  appId: "1:942279272049:web:a6ff1cd147d27a43cc9dd0",
};

// Inicializa Firebase
export const app = initializeApp(firebaseConfig);

// Secondary app to create accounts without logging out the admin
export const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");

// Inicializa el servicio de autenticacion
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
// Inicializa el servicio de Firestore
export const db = getFirestore(app);
export const storage = getStorage(app);
