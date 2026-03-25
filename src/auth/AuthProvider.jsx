import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState("Usuario");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          const docRef = doc(db, "usuarios", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.estado !== "Activo" && userData.estado !== "active") {
              await signOut(auth);
              setUser(null);
              setRole(null);
              setUserName("Usuario");
            } else {
              setRole(userData.rol || "Usuario");
              setUserName(userData.nombre || "Administrador");
            }
          } else {
            setRole("Administrador");
            setUserName(currentUser.email.split('@')[0] || "Administrador");
          }
        } catch (error) {
          console.error("Error obteniendo userData:", error);
          setRole("Usuario");
        }
      } else {
        setUser(null);
        setRole(null);
        setUserName("Usuario");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, userName, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
