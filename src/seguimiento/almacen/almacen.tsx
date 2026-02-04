import React, { useState } from "react";
import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";
import {
  PackageCheck,
  Search,
  Warehouse,
  ArrowRightLeft,
  History,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface ProcesoAlmacen {
  proceso: {
    nombre: string;
  };
  conteoActual: number;
  estado: string;
}

interface WorkOrderAlmacen {
  id: string;
  plano: string;
  cantidad: number;
  proyecto: {
    proyecto: string;
  };
  operacion: {
    id: string;
    procesos: ProcesoAlmacen[];
  };
}

interface GetWOAlmacenData {
  workorder: WorkOrderAlmacen;
}

/* ---------- Query para buscar la WO y sus procesos ---------- */
const GET_WO_ALMACEN = gql`
  query GetWOAlmacen($plano: String!) {
    workorder(plano: $plano) {
      id
      plano
      cantidad
      proyecto {
        proyecto
      }
      operacion {
        id
        procesos {
          proceso {
            nombre
          }
          conteoActual
          estado
        }
      }
    }
  }
`;

export default function AlmacenPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cantidadIngreso, setCantidadIngreso] = useState<number>(1);

  const [getWO, { data, loading }] = useLazyQuery<GetWOAlmacenData>(
    GET_WO_ALMACEN,
    {
      fetchPolicy: "network-only",
    },
  );

  const wo = data?.workorder;

  // Calculamos el avance del último proceso (ej: Calidad o el último en la lista)
  // para saber cuántas piezas están "listas" para entrar.
  const ultimoProceso =
    wo?.operacion?.procesos[wo.operacion.procesos.length - 1];
  const piezasListas = ultimoProceso?.conteoActual || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    getWO({ variables: { plano: searchTerm } });
  };

  const handleRegistrarIngreso = () => {
    if (cantidadIngreso <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    // Aquí irá la mutación mañana
    toast.success(`Ingreso registrado: ${cantidadIngreso} piezas al almacén.`);
    setSearchTerm("");
  };

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center gap-3">
        <Warehouse className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Entrada de Almacén
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra el ingreso físico de piezas terminadas
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buscador */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Buscar Orden</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plano">Número de Plano / WO</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="plano"
                    placeholder="Ej. PL-8823"
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Panel de Detalles e Ingreso */}
        <Card className="md:col-span-2">
          {wo ? (
            <>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{wo.plano}</CardTitle>
                    <CardDescription>
                      {wo.proyecto?.proyecto || "Sin Proyecto"}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Orden Activa
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comparativa de Cantidades */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-neutral-50 rounded-lg border">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">
                      Requeridas
                    </p>
                    <p className="text-2xl font-black">{wo.cantidad}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-[10px] uppercase font-bold text-blue-600">
                      Procesadas
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                      {piezasListas}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-[10px] uppercase font-bold text-amber-600">
                      En Almacén
                    </p>
                    <p className="text-2xl font-black text-amber-700">0</p>
                  </div>
                </div>

                <Separator />

                {/* Formulario de Ingreso */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Registrar Entrada</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cantidad a ingresar</Label>
                      <Input
                        type="number"
                        value={cantidadIngreso}
                        onChange={(e) =>
                          setCantidadIngreso(parseInt(e.target.value))
                        }
                        max={piezasListas}
                        min={1}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleRegistrarIngreso}
                        className="w-full gap-2"
                      >
                        Confirmar Ingreso
                      </Button>
                    </div>
                  </div>
                  {cantidadIngreso > piezasListas && (
                    <p className="text-xs text-rose-500 font-medium">
                      ⚠️ Atención: Estás ingresando más piezas de las
                      registradas en producción ({piezasListas}).
                    </p>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-20" />
              <p>Busca una Work Order para registrar movimientos</p>
            </div>
          )}
        </Card>
      </div>

      {/* Informativo de Flujo */}
      <footer className="rounded-xl border bg-slate-50 p-4 text-xs text-slate-500 flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Badge variant="secondary">1</Badge> Producción termina piezas
        </div>
        <ArrowRightLeft className="h-4 w-4" />
        <div className="flex items-center gap-1">
          <Badge variant="secondary">2</Badge> Almacén valida cantidad física
        </div>
        <ArrowRightLeft className="h-4 w-4" />
        <div className="flex items-center gap-1">
          <Badge variant="secondary">3</Badge> Se actualiza inventario
        </div>
      </footer>
    </div>
  );
}
