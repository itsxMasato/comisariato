import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { sileo } from "sileo";
import { setDynamicRoles } from "../utils/roles";
import { logActividad } from "../utils/logger";
import { resolverSesion } from "./sesion";

const AuthContext = createContext();

const MENSAJES_SIN_ACCESO = {
  sin_documento: "No se encontró tu perfil de usuario. Contactá al administrador.",
  inactivo: "Tu usuario está deshabilitado.",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState("Usuario");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [rolesError, setRolesError] = useState(false);

  useEffect(() => {
    let unsubscribeDoc = null;
    let unsubscribeRoles = null;

    const limpiarSesion = () => {
      setUser(null);
      setRole(null);
      setUserName("Usuario");
      setPhotoURL("");
    };

    const cancelarSuscripciones = () => {
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeRoles) unsubscribeRoles();
      unsubscribeDoc = null;
      unsubscribeRoles = null;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      cancelarSuscripciones();

      if (!currentUser) {
        limpiarSesion();
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // La carga termina cuando llegaron el perfil y los roles
      let perfilListo = false;
      let rolesListos = false;
      const marcarListo = () => perfilListo && rolesListos && setLoading(false);

      // Los roles solo se leen con sesión iniciada (las reglas de Firestore lo exigen)
      setRolesError(false);
      unsubscribeRoles = onSnapshot(
        collection(db, "roles"),
        (snapshot) => {
          setDynamicRoles(snapshot.docs.map((d) => d.data()));
          rolesListos = true;
          marcarListo();
        },
        (error) => {
          console.error("Error leyendo roles:", error);
          setRolesError(true);
          setLoading(false);
        },
      );

      unsubscribeDoc = onSnapshot(
        doc(db, "usuarios", currentUser.uid),
        async (docSnap) => {
          const sesion = resolverSesion(docSnap.exists() ? docSnap.data() : null);
          if (!sesion.acceso) {
            cancelarSuscripciones();
            await signOut(auth);
            limpiarSesion();
            sileo.error({
              title: "Tu cuenta no tiene acceso al sistema",
              description: MENSAJES_SIN_ACCESO[sesion.motivo],
            });
          } else {
            setRole(sesion.rol);
            setUserName(sesion.nombre);
            setPhotoURL(sesion.foto || currentUser.photoURL || "");
          }
          perfilListo = true;
          if (sesion.acceso) marcarListo();
          else setLoading(false);
        },
        (error) => {
          console.error("Error obteniendo userData:", error);
          setRole(null);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      cancelarSuscripciones();
    };
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    logActividad("Autenticación", "Inicio de sesión", { email });
    return cred;
  };

  const logout = async () => {
    const userEmail = user?.email || "Usuario";
    await signOut(auth);
    logActividad("Autenticación", "Cierre de sesión", { email: userEmail });
  };

  if (rolesError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gray-50">
        <span className="material-symbols-outlined text-5xl text-red-600">cloud_off</span>
        <p className="text-slate-700 font-semibold max-w-sm">
          No se pudieron cargar los permisos. Revisá tu conexión y recargá la página.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-green-800 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, userName, photoURL, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
