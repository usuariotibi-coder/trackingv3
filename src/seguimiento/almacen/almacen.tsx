import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import {
  PackageCheck,
  Search,
  Warehouse,
  History,
  ListFilter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
  totalAlmacen: number;
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

/* ---------- Queries y Mutaciones ---------- */

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
        totalAlmacen
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

const REGISTRAR_ENTRADA = gql`
  mutation RegistrarEntrada($woId: ID!, $opId: ID!, $cant: Int!) {
    registrarEntradaAlmacen(
      workorderId: $woId
      operacionId: $opId
      cantidad: $cant
    ) {
      id
      cantidad
    }
  }
`;

export default function AlmacenPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOpId, setSelectedOpId] = useState<string>("");
  const [cantidadIngreso, setCantidadIngreso] = useState<number>(1);

  // Query para buscar el plano
  const [getWO, { data, loading }] = useLazyQuery<GetWOData, GetWOVariables>(
    GET_WO_DETALLE,
    {
      fetchPolicy: "network-only",
    },
  );

  // Manejamos la lógica de post-carga aquí
  useEffect(() => {
    if (data?.workorderByPlano?.operaciones) {
      const ops = data.workorderByPlano.operaciones;
      if (ops.length === 1) {
        setSelectedOpId(ops[0].id);
      }
    }
  }, [data]);

  // Mutación para guardar
  const [registrarEntrada, { loading: sending }] =
    useMutation(REGISTRAR_ENTRADA);

  const wo = data?.workorderByPlano;
  const operacionSeleccionada = wo?.operaciones?.find(
    (o: any) => o.id === selectedOpId,
  );

  // El último proceso indica cuántas piezas están listas para almacén
  const ultimoProceso =
    operacionSeleccionada?.procesos?.[
      operacionSeleccionada.procesos.length - 1
    ];
  const piezasListas = ultimoProceso?.conteoActual || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    getWO({ variables: { plano: searchTerm } });
    setSelectedOpId(""); // Reset al buscar nuevo
  };

  const handleRegistrarIngreso = async () => {
    if (!wo || !selectedOpId || cantidadIngreso <= 0) {
      return toast.error("Por favor completa todos los campos");
    }

    try {
      await registrarEntrada({
        variables: {
          woId: wo.id,
          opId: selectedOpId,
          cant: cantidadIngreso,
        },
        refetchQueries: [
          { query: GET_WO_DETALLE, variables: { plano: searchTerm } },
        ],
      });

      toast.success(
        `Ingreso de ${cantidadIngreso} piezas registrado correctamente`,
      );
      setCantidadIngreso(1);
    } catch (error: any) {
      toast.error("Error al registrar: " + error.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Warehouse className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestión de Almacén
          </h1>
        </div>
        <p className="text-muted-foreground">
          Registra la entrada física de piezas terminadas desde producción.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Columna Izquierda: Buscador */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Buscador</CardTitle>
              <CardDescription>Ingresa el número de plano</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plano">Número de Plano</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="plano"
                      placeholder="Ej: PL-24001..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Buscando..." : "Buscar Work Order"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {wo && wo.operaciones && wo.operaciones.length > 0 && (
            <Card className="border-blue-100 bg-blue-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <ListFilter className="h-4 w-4" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                    Seleccionar Operación
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Select value={selectedOpId} onValueChange={setSelectedOpId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Elige la orden de trabajo" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* El operador ?? [] asegura que si operaciones es undefined, use un arreglo vacío */}
                    {(wo?.operaciones ?? []).map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.operacion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna Derecha: Detalles e Ingreso */}
        <Card className="md:col-span-2 overflow-hidden shadow-md">
          {operacionSeleccionada ? (
            <>
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      Plano: {wo?.plano}
                    </CardTitle>
                    <CardDescription className="font-medium text-blue-600">
                      Proyecto: {wo?.proyecto?.proyecto || "N/A"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    OP: {operacionSeleccionada.operacion}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-8">
                {/* Resumen de cantidades */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border bg-slate-50 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">
                      Requeridas
                    </p>
                    <p className="text-2xl font-black">{wo?.cantidad}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 text-center">
                    <p className="text-xs text-emerald-600 uppercase font-bold">
                      Procesadas
                    </p>
                    <p className="text-2xl font-black text-emerald-700">
                      {piezasListas}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 text-center">
                    <p className="text-xs text-blue-600 uppercase font-bold">
                      En Almacén
                    </p>
                    <p className="text-2xl font-black text-blue-700">
                      {operacionSeleccionada.totalAlmacen}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Formulario de Ingreso */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold">Registrar Ingreso Físico</h3>
                  </div>

                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="cantidad">
                        Cantidad de piezas que entran
                      </Label>
                      <Input
                        id="cantidad"
                        type="number"
                        min="1"
                        value={cantidadIngreso}
                        onChange={(e) =>
                          setCantidadIngreso(parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <Button
                      onClick={handleRegistrarIngreso}
                      className="bg-blue-600 hover:bg-blue-700 h-10 px-8"
                      disabled={sending}
                    >
                      {sending ? "Registrando..." : "Confirmar Ingreso"}
                    </Button>
                  </div>

                  {cantidadIngreso > piezasListas && (
                    <p className="text-xs text-rose-500 font-medium bg-rose-50 p-2 rounded border border-rose-100 italic">
                      ⚠️ Atención: La cantidad física ({cantidadIngreso}) supera
                      lo registrado en la última etapa de producción (
                      {piezasListas}).
                    </p>
                  )}
                </div>
              </CardContent>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50">
              <History className="h-16 w-16 mb-4 opacity-10" />
              <p className="font-medium text-lg">
                Busca un plano para ver sus operaciones
              </p>
              <p className="text-sm opacity-70">
                Los datos de producción aparecerán aquí
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
