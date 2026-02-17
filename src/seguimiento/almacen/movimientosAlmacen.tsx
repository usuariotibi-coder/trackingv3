import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useMutation, useLazyQuery } from "@apollo/client/react";
import {
  Search,
  PackageCheck,
  PackageX,
  Package,
  Warehouse,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";

interface Proceso {
  id: string;
  conteoActual: number;
  proceso: {
    nombre: string;
  };
}

interface Operacion {
  id: string;
  operacion: string;
  stockActual: number;
  procesos: Proceso[];
}

interface WorkOrder {
  id: string;
  plano: string;
  cantidad: number;
  proyecto?: {
    proyecto: string;
  };
  operaciones: Operacion[];
}

// Interfaz para el objeto de respuesta de la Query
interface GetWOData {
  workorderByPlano: WorkOrder | null;
}

// Interfaz para las variables de la Query
interface GetWOVariables {
  plano: string;
}

// Reutilizamos la query que ya corregimos
const GET_WO_DETALLE = gql`
  query GetWODetalle($plano: String!) {
    workorderByPlano(plano: $plano) {
      id
      plano
      cantidad
      proyecto {
        proyecto
      }
      operaciones {
        id
        operacion
        stockActual
        procesos {
          id
          conteoActual
          proceso {
            nombre
          }
        }
      }
    }
  }
`;

const REGISTRAR_MOVIMIENTO = gql`
  mutation RegistrarMovimiento(
    $woId: ID!
    $opId: ID!
    $cant: Int!
    $tipo: String!
  ) {
    registrarMovimientoAlmacen(
      workorderId: $woId
      operacionId: $opId
      cantidad: $cant
      tipo: $tipo
    ) {
      id
    }
  }
`;

interface Props {
  tipo: "INGRESO" | "SALIDA";
  planoInicial: string;
  onPlanoChange: (p: string) => void;
}

export function FormularioMovimiento({
  tipo,
  planoInicial,
  onPlanoChange,
}: Props) {
  const [searchTerm, setSearchTerm] = useState(planoInicial);
  const [selectedOpId, setSelectedOpId] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);

  const [getWO, { data }] = useLazyQuery<GetWOData, GetWOVariables>(
    GET_WO_DETALLE,
  );
  const [registrar, { loading: sending }] = useMutation(REGISTRAR_MOVIMIENTO);

  const wo = data?.workorderByPlano;
  const opSel = wo?.operaciones.find((o: any) => o.id === selectedOpId);
  const stockDisponible = opSel?.stockActual || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onPlanoChange(searchTerm);
    getWO({ variables: { plano: searchTerm } });
  };

  const ejecutarAccion = async () => {
    // VALIDACIÓN CRÍTICA PARA BAJA
    if (tipo === "SALIDA" && cantidad > stockDisponible) {
      return sileo.error({
        title: "Error: No hay suficiente stock para realizar la salida.",
        duration: 3000,
        fill: "black",
        styles: { title: "text-white!" },
        position: "top-center",
      });
    }

    try {
      await registrar({
        variables: {
          woId: wo?.id,
          opId: selectedOpId,
          cant: tipo === "SALIDA" ? -cantidad : cantidad,
          tipo: tipo.toLowerCase(),
        },
        refetchQueries: ["GetWODetalle", "GetExistenciasTotales"],
      });
      sileo.success({
        title: "Movimiento registrado con éxito",
        duration: 3000,
        fill: "black",
        styles: { title: "text-white!" },
        position: "top-center",
      });
      setCantidad(1);
    } catch (e: any) {
      sileo.error({
        title: e.message,
        duration: 3000,
        fill: "black",
        styles: { title: "text-white!" },
        position: "top-center",
      });
    }
  };

  useEffect(() => {
    if (planoInicial) {
      setSearchTerm(planoInicial);
      getWO({ variables: { plano: planoInicial } });
    }
  }, [planoInicial]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2 h-[90%]">
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Identificar Plano</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="space-y-2">
            <Label>Número de Plano</Label>
            <div className="flex gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="PL-..."
              />
              <Button size="icon" type="submit">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
          {wo && (
            <div className="space-y-2">
              <Label>Número de operación</Label>
              <Select value={selectedOpId} onValueChange={setSelectedOpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona OP" />
                </SelectTrigger>
                <SelectContent>
                  {wo.operaciones.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.operacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 border-none shadow-none bg-transparent p-0">
        {opSel ? (
          <CardContent className="pt-0 space-y-6">
            {/* Visualizador de Stock con estilo de Kpi */}
            <div className="flex items-center justify-between p-6 bg-white border rounded-2xl shadow-sm">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Warehouse className="h-4 w-4" /> Stock Actual en Almacén
                </p>
                <p className="text-4xl">
                  {stockDisponible} <span className="text-lg">piezas</span>
                </p>
              </div>
              <div
                className={cn(
                  "p-4 rounded-full",
                  tipo === "INGRESO"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-rose-50 text-rose-600",
                )}
              >
                {tipo === "INGRESO" ? (
                  <PackageCheck className="h-8 w-8" />
                ) : (
                  <PackageX className="h-8 w-8" />
                )}
              </div>
            </div>

            {/* Contenedor Principal de Acción */}
            <div className="bg-white border rounded-2xl p-8 shadow-sm space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">
                  {tipo === "INGRESO"
                    ? "Registrar Entrada"
                    : "Registrar Salida"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Indica el volumen de piezas para mover en la operación{" "}
                  <span className="font-mono font-bold text-foreground">
                    {opSel.operacion}
                  </span>
                </p>
              </div>

              <div className="max-w-xs mx-auto space-y-6">
                <div className="space-y-4">
                  <Label
                    htmlFor="cantidad"
                    className="text-base flex justify-center"
                  >
                    Cantidad de piezas
                  </Label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full shrink-0"
                      onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                    >
                      -
                    </Button>
                    <Input
                      id="cantidad"
                      type="number"
                      className="h-10 text-3xl font-bold text-center rounded-xl border-2 focus-visible:ring-offset-2"
                      value={cantidad}
                      onChange={(e) =>
                        setCantidad(parseInt(e.target.value) || 0)
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full shrink-0"
                      onClick={() => setCantidad(cantidad + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <Button
                  className={cn(
                    "w-full h-10 text-lg font-bold shadow-lg transition-all active:scale-95",
                    tipo === "INGRESO"
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-200",
                  )}
                  onClick={ejecutarAccion}
                  disabled={sending}
                >
                  {sending
                    ? "Procesando..."
                    : `Confirmar ${tipo === "INGRESO" ? "Ingreso" : "Salida"}`}
                </Button>
              </div>
            </div>
          </CardContent>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 border-2 border-dashed rounded-2xl">
            <Package className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium italic">
              Selecciona una operación para continuar
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
