import "./App.css";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import EstacionMaquinado from "./seguimiento/estaciones/maquinadocnc/maquinadocns";
import IntakeDePlanos from "./seguimiento/planeacion/planeacion";
import PiezaDashboard from "./seguimiento/workorder/pieza";
import PiezasDashboard from "./seguimiento/workorder/piezasdashboard";
import { Toaster } from "sonner";
import AppNav from "./components/ui/appnav";
import ScanStation from "./seguimiento/estaciones/escaneo/escaneo";
import MaquinasDashboard from "./seguimiento/dashboard/machines";
import ImpactoPage from "./seguimiento/principal";
import NewEntryPage from "./seguimiento/newentries";
import LoginPage from "./seguimiento/login";
import LavorPage from "./seguimiento/dashboard/lavor";
import GestionAlmacen from "./seguimiento/almacen/gestionAlmacen";
import { ProtectedRoute } from "./ProtectedRoute";
import AnalyticsAreasPage from "./seguimiento/dashboard/analytics-areas";

function App() {
  return (
    <BrowserRouter>
      <AppNav />
      <Routes>
        <Route path="/" element={<ImpactoPage />} />
        <Route path="/maquinadocnc" element={<EstacionMaquinado />} />
        <Route path="/escaneo" element={<ScanStation />} />
        <Route path="/piezas" element={<PiezasDashboard />} />
        <Route path="/pieza/:id" element={<PiezaDashboard />} />
        <Route path="/machines" element={<MaquinasDashboard />} />
        <Route path="/lavor" element={<LavorPage />} />
        <Route path="/areas" element={<AnalyticsAreasPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/intake" element={<IntakeDePlanos />} />
          <Route path="/almacen" element={<GestionAlmacen />} />
          <Route path="/administracion" element={<NewEntryPage />} />
        </Route>

        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  );
}

export default App;
