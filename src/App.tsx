import "./App.css";
import { Routes, Route, HashRouter } from "react-router-dom";
import Home from "./home";
import EstacionMaquinado from "./seguimiento/estaciones/maquinadocnc/maquinadocns";
import IntakeDePlanos from "./seguimiento/planeacion/intake";
import PiezaDashboard from "./seguimiento/workorder/pieza";
import PiezasDashboard from "./seguimiento/workorder/piezasdashboard";
import { Toaster } from "sonner";
import AppNav from "./components/ui/appnav";
import ScanStation from "./seguimiento/estaciones/escaneo/escaneo";
import MaquinasDashboard from "./seguimiento/dashboard/machines";
import ImpactoPage from "./seguimiento/principal";
import NewEntryPage from "./seguimiento/newentries";

function App() {
  return (
    <HashRouter>
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
        <Route path="/newentries" element={<NewEntryPage />} />
        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </HashRouter>
  );
}

export default App;
