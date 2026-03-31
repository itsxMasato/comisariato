import { useAuth } from "./AuthProvider";
import Error403 from "../pages/Error403";
import { hasPermission } from "../utils/roles";

export const RoleRoute = ({ moduleName, requiredAction = "VIEW", children }) => {
  const { role, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;

  if (!hasPermission(role, moduleName, requiredAction)) {
    return <Error403 />;
  }

  return children;
};
