import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import AppRouter from "./routes/AppRoute";
import { Toaster } from "sileo";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
