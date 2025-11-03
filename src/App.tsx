import "./App.css";
import { Routes, Route, HashRouter } from "react-router-dom";
import Home from "./portrait";
import EstacionMaquinado from "./seguimiento/estaciones/maquinadocnc/maquinadocns";
import IntakeDePlanos from "./seguimiento/intake/intake";
import PiezaDashboard from "./seguimiento/pieza/pieza";
import { Toaster } from "sonner";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/maquinadocnc" element={<EstacionMaquinado />} />
        <Route path="/intake" element={<IntakeDePlanos />} />
        <Route
          path="/pieza"
          element={
            <PiezaDashboard
              params={{
                op: "",
              }}
            />
          }
        />
        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </HashRouter>
  );
}

export default App;
