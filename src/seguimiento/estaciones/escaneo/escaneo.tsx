import { useEffect, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { Clock } from "lucide-react";

// Componentes UI
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Componentes de Acción (Importados)
import { AccionIndirecto } from "./scan-actions/indirecto";
import { AccionScrap } from "./scan-actions/scrap";
import { AccionPausa } from "./scan-actions/pausa";
import { AccionProblema } from "./scan-actions/problema";

/* --------------------------------- Interfaces -------------------------------- */
interface UsuarioData {
  usuario: {
    id: string;
    numero: string;
    nombre: string;
    proceso: { id: string; nombre: string };
  } | null;
}

interface ProcesoOpData {
  procesoOpPorOperacionYProceso: {
    id: string;
    estado: string;
    horaInicio: string | null;
    conteoActual: number;
    operacion: { id: string; workorder: { cantidad: number } };
    proceso: { id: string; nombre: string };
  } | null;
}

interface MaquinasData {
  maquinaPorProceso: Array<{ id: string; nombre: string }>;
}

interface RegistrarEscaneoRes {
  registrarEscaneoOperacion: {
    id: string;
    estado: string;
    conteoActual: number;
    operacion: { id: string; workorder: { cantidad: number } };
  };
}

/* --------------------------------- Queries -------------------------------- */
const GET_USUARIO = gql`
  query GetUsuario($numero: String!) {
    usuario(numero: $numero) {
      id
      numero
      nombre
      proceso {
        id
        nombre
      }
    }
  }
`;

const GET_PROCESO = gql`
  query ObtenerProcesoEspecifico($operacion: String!, $procesoId: ID!) {
    procesoOpPorOperacionYProceso(
      operacion: $operacion
      procesoId: $procesoId
    ) {
      id
      estado
      horaInicio
      conteoActual
      operacion {
        id
        workorder {
          cantidad
        }
      }
      proceso {
        id
        nombre
      }
    }
  }
`;

const GET_MAQUINAS = gql`
  query GetMaquinas($procesoId: ID!) {
    maquinaPorProceso(procesoId: $procesoId) {
      id
      nombre
    }
  }
`;

const REGISTRAR_ESCANEO = gql`
  mutation RegistrarEscaneo(
    $procesoOpId: ID!
    $usuarioId: ID!
    $maquinaId: ID
  ) {
    registrarEscaneoOperacion(
      procesoOpId: $procesoOpId
      usuarioId: $usuarioId
      maquinaId: $maquinaId
    ) {
      id
      estado
      conteoActual
      operacion {
        id
        workorder {
          cantidad
        }
      }
    }
  }
`;

const REGISTRAR_OBSERVACION = gql`
  mutation RegistrarObservacion($id: ID!, $tipo: String!, $desc: String!) {
    registrarObservacion(
      procesoOpId: $id
      tipoRegistro: $tipo
      descripcion: $desc
    ) {
      id
      estado
    }
  }
`;

export default function ScanStation() {
  const [employeeId, setEmployeeId] = useState("");
  const [workOrder, setWorkOrder] = useState("");
  const [maquinaSeleccionadaId, setMaquinaSeleccionadaId] = useState<
    string | undefined
  >(undefined);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("00:00:00");

  const woInputRef = useRef<HTMLInputElement>(null);
  const empInputRef = useRef<HTMLInputElement>(null);

  const { data: dataE } = useQuery<UsuarioData>(GET_USUARIO, {
    variables: { numero: employeeId },
    skip: !employeeId,
  });
  const procesoId = dataE?.usuario?.proceso?.id;

  const { data: dataP, refetch: refetchP } = useQuery<ProcesoOpData>(
    GET_PROCESO,
    {
      variables: { operacion: workOrder, procesoId },
      skip: !procesoId || !workOrder,
    },
  );
  const procesoEspecifico = dataP?.procesoOpPorOperacionYProceso;

  const { data: dataM } = useQuery<MaquinasData>(GET_MAQUINAS, {
    variables: { procesoId },
    skip: !procesoId,
  });

  const [registrarEscaneo] =
    useMutation<RegistrarEscaneoRes>(REGISTRAR_ESCANEO);

  const [registrarObs] = useMutation(REGISTRAR_OBSERVACION);

  useEffect(() => {
    let intervalo: ReturnType<typeof setInterval>;
    if (
      procesoEspecifico?.estado === "in_progress" &&
      procesoEspecifico?.horaInicio
    ) {
      const horaInicioStr = procesoEspecifico.horaInicio;
      intervalo = setInterval(() => {
        const diff = new Date().getTime() - new Date(horaInicioStr).getTime();
        const h = Math.floor(diff / 3600000)
          .toString()
          .padStart(2, "0");
        const m = Math.floor((diff % 3600000) / 60000)
          .toString()
          .padStart(2, "0");
        const s = Math.floor((diff % 60000) / 1000)
          .toString()
          .padStart(2, "0");
        setTiempoTranscurrido(`${h}:${m}:${s}`);
      }, 1000);
    } else {
      setTiempoTranscurrido("00:00:00");
    }
    return () => clearInterval(intervalo);
  }, [procesoEspecifico]);

  const handleAction = async () => {
    if (!procesoEspecifico || !dataE?.usuario?.id) return;

    // SI EL PROCESO ESTÁ EN PAUSA, EL BOTÓN REANUDA
    if (procesoEspecifico.estado === "paused") {
      try {
        await registrarObs({
          // Esta es la que causaba el error
          variables: {
            id: procesoEspecifico.id,
            tipo: "PAUSA_FIN",
            desc: "Reanudado desde panel principal",
          },
        });
        toast.success("▶️ Proceso reanudado");
        refetchP();
        return;
      } catch (e: any) {
        toast.error(e.message);
        return;
      }
    }

    try {
      const { data } = await registrarEscaneo({
        variables: {
          procesoOpId: procesoEspecifico.id,
          usuarioId: dataE.usuario.id,
          maquinaId: maquinaSeleccionadaId || null,
        },
      });
      const res = data?.registrarEscaneoOperacion;
      if (res?.estado === "done") toast.success("✅ Completado.");
      else
        toast.info(
          `Avance: ${res?.conteoActual}/${res?.operacion.workorder.cantidad}`,
        );

      setWorkOrder("");
      woInputRef.current?.focus();
      refetchP();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Estación de escaneo: {dataE?.usuario?.proceso?.nombre || "---"}
        </h1>
        {procesoEspecifico?.estado === "in_progress" && (
          <div className="flex items-center gap-2 text-orange-600 font-mono text-xl animate-pulse">
            <Clock className="h-5 w-5" /> <span>{tiempoTranscurrido}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Captura</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-1">
                <span className="font-semibold">Instrucciones:</span>
                <span>1) Escanea el código de la Work Order.</span>
                <span>2) Captura tu número de empleado.</span>
                <span>3) Selecciona una maquina.</span>
                <span>4) Registra.</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1">Work Order / Operación</Label>
              <Input
                ref={woInputRef}
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
                placeholder="Scan QR..."
              />
            </div>
            <div>
              <Label className="mb-1">Número de Empleado</Label>
              <Input
                ref={empInputRef}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Scan carnet..."
              />
              {dataE?.usuario && (
                <p className="text-xs text-green-600 mt-1">
                  {dataE.usuario.nombre}
                </p>
              )}
            </div>
            <div>
              <Label className="mb-1">Máquina</Label>
              <Select
                onValueChange={setMaquinaSeleccionadaId}
                value={maquinaSeleccionadaId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione..." />
                </SelectTrigger>
                <SelectContent>
                  {dataM?.maquinaPorProceso?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="lg"
              className="w-full h-10"
              onClick={handleAction}
              disabled={!procesoEspecifico}
            >
              {!procesoEspecifico
                ? "Esperando Scan..."
                : procesoEspecifico.estado === "pending"
                  ? "Iniciar Proceso"
                  : procesoEspecifico.conteoActual <
                      procesoEspecifico.operacion.workorder.cantidad
                    ? `Registrar Pieza (${procesoEspecifico.conteoActual + 1}/${procesoEspecifico.operacion.workorder.cantidad})`
                    : "Finalizar y Cerrar Orden"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado Actual</CardTitle>
          </CardHeader>
          <CardContent>
            {procesoEspecifico ? (
              <div className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span>
                    Orden: <span className="font-bold">{workOrder}</span>
                  </span>
                  <Badge variant="outline">
                    {procesoEspecifico.estado.toUpperCase()}
                  </Badge>
                </div>
                <Progress
                  value={
                    (procesoEspecifico.conteoActual /
                      procesoEspecifico.operacion.workorder.cantidad) *
                    100
                  }
                />
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg text-center">
                  <div>
                    Meta:{" "}
                    <b>{procesoEspecifico.operacion.workorder.cantidad}</b>
                  </div>
                  <div>
                    Logrado: <b>{procesoEspecifico.conteoActual}</b>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                Escanee una orden para ver detalles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones Secundarias con Componentes Externos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AccionIndirecto usuarioId={dataE?.usuario?.id} />
        {procesoEspecifico && (
          <>
            <AccionScrap
              procesoOpId={procesoEspecifico.id}
              onActionSuccess={refetchP}
            />
            <AccionPausa
              procesoEspecifico={procesoEspecifico}
              onActionSuccess={refetchP}
            />
            <AccionProblema
              procesoOpId={procesoEspecifico.id}
              onActionSuccess={refetchP}
            />
          </>
        )}
      </div>
    </div>
  );
}
