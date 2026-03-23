import { useAuth } from "./AuthProvider";
import Error403 from "../pages/Error403";

export const AdminRoute = ({ children }) => {
  const { role, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;

  if (role !== "Administrador") {
    return <Error403 />;
  }

  return children;
};
