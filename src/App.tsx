import "./App.css";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import Home from "./home";
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
import AlmacenPage from "./seguimiento/almacen/almacen";

function App() {
  return (
    <BrowserRouter>
      <AppNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<ImpactoPage />} />
        <Route path="/maquinadocnc" element={<EstacionMaquinado />} />
        <Route path="/escaneo" element={<ScanStation />} />
        <Route path="/intake" element={<IntakeDePlanos />} />
        <Route path="/piezas" element={<PiezasDashboard />} />
        <Route path="/pieza/:id" element={<PiezaDashboard />} />
        <Route path="/machines" element={<MaquinasDashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/newentries" element={<NewEntryPage />} />
        <Route path="/lavor" element={<LavorPage />} />
        <Route path="/almacen" element={<AlmacenPage />} />
        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  );
}

export default App;
