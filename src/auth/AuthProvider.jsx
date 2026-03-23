import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para buscar el rol en la colección "usuarios" de Firestore
  const getRole = async (email) => {
    try {
      const q = query(collection(db, "usuarios"), where("email", "==", email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return userData.rol;
      }
      return "Usuario";
    } catch (error) {
      console.error("Error obteniendo rol:", error);
      return "Usuario";
    }
  };

  useEffect(() => {
    // --- MODO TEMPORAL SIN FIREBASE ---
    // (Descomenta el código comentado más abajo cuando quieras usar Firebase real de nuevo)
    setLoading(true);
    // Asignamos directamente un usuario simulado
    setUser({ email: "admin@temporal.com" });
    setRole("Administrador"); // Le ponemos Administrador para que tengas acceso a todo
    setLoading(false);

    /*
    // --- Código original de Firebase (Comentado) ---
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        // Buscamos el rol real en Firestore usando el email del login
        const userRole = await getRole(currentUser.email);
        setRole(userRole);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
    */
  }, []);

  const login = async (email, password) => {
    // --- MODO TEMPORAL SIN FIREBASE ---
    return new Promise((resolve) => {
      setTimeout(() => {
        setUser({ email });
        setRole("Administrador");
        resolve();
      }, 500); // Simulamos pequeño tiempo de red
    });

    // Código original:
    // return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    // --- MODO TEMPORAL SIN FIREBASE ---
    setUser(null);
    setRole(null);
    
    // Código original:
    // return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
