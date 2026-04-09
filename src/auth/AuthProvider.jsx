import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, collection } from "firebase/firestore";
import { setDynamicRoles } from "../utils/roles";
import { logActividad } from "../utils/logger";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState("Usuario");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    let unsubscribeDoc = null;
    let unsubscribeRoles = null;

    unsubscribeRoles = onSnapshot(collection(db, "roles"), (snapshot) => {
      const rolesData = snapshot.docs.map(doc => doc.data());
      setDynamicRoles(rolesData);
      setRolesLoaded(true);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);

      if (currentUser) {
        setUser(currentUser);
        try {
          const docRef = doc(db, "usuarios", currentUser.uid);
          
          if (unsubscribeDoc) unsubscribeDoc();
          
          unsubscribeDoc = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              if (userData.estado !== "Activo" && userData.estado !== "active") {
                await signOut(auth);
                setUser(null);
                setRole(null);
                setUserName("Usuario");
                setPhotoURL("");
              } else {
                setRole(userData.rol || "Usuario");
                setUserName(userData.nombre || "Administrador");
                setPhotoURL(userData.fotoURL || currentUser.photoURL || "");
              }
            } else {
              setRole("Administrador");
              setUserName(currentUser.email.split('@')[0] || "Administrador");
              setPhotoURL(currentUser.photoURL || "");
            }
            setLoading(false);
          }, (error) => {
            console.error("Error obteniendo userData:", error);
            setRole("Usuario");
            setLoading(false);
          });
        } catch (error) {
          console.error("Error setting up snapshot:", error);
          setRole("Usuario");
          setLoading(false);
        }
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setUser(null);
        setRole(null);
        setUserName("Usuario");
        setPhotoURL("");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeRoles) unsubscribeRoles();
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

  return (
    <AuthContext.Provider value={{ user, role, userName, photoURL, login, logout, loading }}>
      {rolesLoaded ? children : <div>Cargando...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
