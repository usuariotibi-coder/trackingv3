import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TableExistencias } from "./tableExistencias";
import { FormularioMovimiento } from "./movimientosAlmacen";

export default function GestionAlmacen() {
  const [sharedPlano, setSharedPlano] = useState("");
  const [activeTab, setActiveTab] = useState("existencias");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="existencias">Existencias</TabsTrigger>
          <TabsTrigger value="alta">Alta</TabsTrigger>
          <TabsTrigger value="baja">Baja</TabsTrigger>
        </TabsList>

        <TabsContent value="existencias">
          <TableExistencias
            onSelectAction={(plano) => {
              setSharedPlano(plano);
              setActiveTab("baja");
            }}
          />
        </TabsContent>

        <TabsContent value="alta">
          <FormularioMovimiento
            tipo="INGRESO"
            planoInicial={sharedPlano}
            onPlanoChange={setSharedPlano}
          />
        </TabsContent>

        <TabsContent value="baja">
          <FormularioMovimiento
            tipo="SALIDA"
            planoInicial={sharedPlano}
            onPlanoChange={setSharedPlano}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
