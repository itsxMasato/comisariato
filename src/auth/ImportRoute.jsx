import { useParams } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import Error403 from "../pages/Error403";
import { ACTIONS, hasPermission } from "../utils/roles";
import { ESQUEMAS } from "../importacion/esquemas";

// Protege /importar/:modulo: el módulo debe existir y el rol debe tener IMPORT sobre él
export const ImportRoute = ({ children }) => {
  const { modulo } = useParams();
  const { role, loading } = useAuth();

  if (loading) return <p>Cargando...</p>;

  const esquema = ESQUEMAS[modulo];
  if (!esquema || !hasPermission(role, esquema.moduloPermiso, ACTIONS.IMPORT)) return <Error403 />;

  return children;
};
