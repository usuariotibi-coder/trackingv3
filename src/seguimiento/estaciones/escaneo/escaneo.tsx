import { useEffect, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { sileo } from "sileo";
import { CheckCircle2, Clock } from "lucide-react";
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

import { AccionIndirecto } from "./scan-actions/indirecto";
import { AccionScrap } from "./scan-actions/scrap";
import { AccionPausa } from "./scan-actions/pausa";
import { AccionProblema } from "./scan-actions/problema";
import { AccionSetup } from "./scan-actions/setup-time";
import { AccionColaboracion } from "./scan-actions/colaboracion";
import { cn } from "@/lib/utils";

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
    sesiones: Array<{
      id: string;
      horaInicio: string | null;
      horaFin: string | null;
      pausas: Array<{
        id: string;
        horaInicio: string | null;
        horaFin: string | null;
        motivo: string | null;
        duracionMinutos: number | null;
      }>;
    }>;
    horaInicio: string | null;
    conteoActual: number;
    conteoParcial: number;
    operacion: { id: string; workorder: { cantidad: number } };
    proceso: { id: string; nombre: string };
  } | null;
}

interface MaquinasData {
  maquinaPorProceso: Array<{ id: string; nombre: string }>;
}

interface RegistrarSesionRes {
  registrarSesionTrabajo: {
    id: string;
    estado: string;
    procesoOp: {
      id: string;
      estado: string;
      conteoActual: number;
      conteoParcial: number;
    };
  };
}

interface SesionActivaData {
  sesionActivaPorNomina: {
    id: string;
    procesoOp: {
      id: string;
      operacion: {
        operacion: string;
        workorder: {
          plano: string;
        } | null;
      } | null;
    };
    maquina: {
      nombre: string;
    };
  } | null;
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
      conteoParcial
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
      sesiones {
        id
        horaFin
        pausas {
          id
          horaInicio
          horaFin
          motivo
          duracionMinutos
        }
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

const INICIAR_SESION = gql`
  mutation RegistrarSesion(
    $procesoOpId: ID!
    $usuarioId: ID!
    $maquinaId: ID!
  ) {
    registrarSesionTrabajo(
      procesoOpId: $procesoOpId
      usuarioId: $usuarioId
      maquinaId: $maquinaId
    ) {
      id
      procesoOp {
        id
        conteoActual
        conteoParcial
        estado
      }
    }
  }
`;

const GET_SESION_ACTIVA = gql`
  query GetSesionActiva($numero: String!) {
    sesionActivaPorNomina(numeroEmpleado: $numero) {
      id
      procesoOp {
        id
        operacion {
          operacion
          workorder {
            plano
          }
        }
      }
      maquina {
        nombre
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
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [workOrder, setWorkOrder] = useState("");
  const [maquinaSeleccionadaId, setMaquinaSeleccionadaId] = useState<
    string | undefined
  >(undefined);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("00:00:00");
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [bloqueadoPorPausa, setBloqueadoPorPausa] = useState(false);

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

  const esScrap = procesoEspecifico?.estado === "scrap";

  const botonBloqueado = bloqueadoPorPausa || esScrap || !maquinaSeleccionadaId;

  const { data: dataM } = useQuery<MaquinasData>(GET_MAQUINAS, {
    variables: { procesoId },
    skip: !procesoId,
  });

  const [registrarSesion] = useMutation<RegistrarSesionRes>(INICIAR_SESION, {
    onCompleted: (data) => {
      console.log("Resultado:", data?.registrarSesionTrabajo);
      sileo.success({
        duration: 3000,
        icon: (
          <CheckCircle2 className="flex items-center justify-center h-4 w-4 animate-spin" />
        ),
        title: "Pieza registrada con éxito",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
      setSesionId(data?.registrarSesionTrabajo.id || "");
    },
    onError: (error) => {
      sileo.error({
        duration: 3000,
        title: "Error al registrar la pieza",
        description: error.message,
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    },
  });

  const [consultarSesion, { data }] =
    useLazyQuery<SesionActivaData>(GET_SESION_ACTIVA);

  useEffect(() => {
    if (employeeId.length >= 4) {
      consultarSesion({ variables: { numero: employeeId } });
    }
  }, [employeeId]);

  useEffect(() => {
    if (data?.sesionActivaPorNomina) {
      setSesionId(data.sesionActivaPorNomina.id);
      sileo.info({
        duration: 3000,
        title: "Sesión activa recuperada automáticamente",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    }
  }, [data]);

  const estaTrabajandoPieza = procesoEspecifico
    ? procesoEspecifico.conteoParcial > procesoEspecifico.conteoActual
    : false;

  const numeroPiezaVisual = estaTrabajandoPieza
    ? procesoEspecifico?.conteoParcial
    : (procesoEspecifico?.conteoActual || 0) + 1;

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

    if (procesoEspecifico.estado === "paused") {
      try {
        await registrarObs({
          variables: {
            id: procesoEspecifico.id,
            tipo: "PAUSA_FIN",
            desc: "Reanudado desde panel principal",
          },
        });
        sileo.success({
          duration: 3000,
          title: "Proceso reanudado",
          fill: "black",
          styles: {
            title: "text-white!",
            description: "text-white/75!",
          },
          position: "top-center",
        });
        refetchP();
        return;
      } catch (e: any) {
        sileo.error({
          duration: 3000,
          title: "Error al reanudar proceso",
          description: e.message,
          fill: "black",
          styles: {
            title: "text-white!",
            description: "text-white/75!",
          },
          position: "top-center",
        });
        return;
      }
    }

    await ejecutarRegistroEscaneo();
  };

  const limpiarEstacion = () => {
    setWorkOrder("");
    setMaquinaSeleccionadaId(undefined);
    woInputRef.current?.focus();
  };

  const ejecutarRegistroEscaneo = async () => {
    if (!procesoEspecifico || !dataE?.usuario?.id) return;

    const meta = procesoEspecifico.operacion.workorder.cantidad;

    try {
      const { data: resMutation } = await registrarSesion({
        variables: {
          procesoOpId: procesoEspecifico.id,
          usuarioId: dataE.usuario.id,
          maquinaId: maquinaSeleccionadaId,
        },
      });

      const res = resMutation?.registrarSesionTrabajo;

      if (res) {
        // Lógica numérica: Si mi conteo personal es mayor al global, acabo de INICIAR
        const acabaDeIniciar =
          res.procesoOp.conteoParcial > res.procesoOp.conteoActual;

        if (acabaDeIniciar) {
          sileo.info({
            duration: 3000,
            title: `Pieza #${res.procesoOp.conteoParcial} Iniciada`,
            description:
              "Escanea de nuevo al terminar la unidad para registrarla.",
            fill: "black",
            styles: {
              title: "text-white!",
              description: "text-white/75!",
            },
            position: "top-center",
          });
        } else {
          // Si son iguales, es porque el global alcanzó al parcial (PIEZA FINALIZADA)
          sileo.success({
            duration: 3000,
            title: `Pieza #${res.procesoOp.conteoParcial} Finalizada`,
            description: `Progreso total: ${res.procesoOp.conteoActual} / ${meta}`,
            fill: "black",
            styles: {
              title: "text-white!",
              description: "text-white/75!",
            },
            position: "top-center",
          });
        }
      }

      refetchP();
      // Forzamos la actualización de la sesión activa para que el botón cambie de estado
      consultarSesion({ variables: { numero: employeeId } });
    } catch (e: any) {
      sileo.error({
        duration: 3000,
        title: "Error al registrar escaneo",
        description: e.message,
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">
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
                type="password"
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
            {procesoEspecifico?.proceso.nombre === "Pintura" && sesionId && (
              <AccionColaboracion sesionId={sesionId} />
            )}
            <div>
              <Label className="mb-1">Máquina</Label>
              <Select
                onValueChange={setMaquinaSeleccionadaId}
                value={maquinaSeleccionadaId}
              >
                <SelectTrigger className="w-full">
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
              className={cn(
                "w-full h-10 transition-all disabled:cursor-not-allowed",
                estaTrabajandoPieza
                  ? "bg-amber-600 hover:bg-amber-700 animate-pulse"
                  : "bg-indigo-600 hover:bg-indigo-700",
                procesoEspecifico?.estado === "done" && "bg-green-600",
                esScrap && "bg-red-800",
                bloqueadoPorPausa && "bg-orange-500",
              )}
              onClick={handleAction}
              disabled={
                !procesoEspecifico ||
                procesoEspecifico.estado === "done" ||
                botonBloqueado
              }
            >
              {!procesoEspecifico
                ? "Esperando Scan..."
                : esScrap
                  ? "Scrap"
                  : bloqueadoPorPausa
                    ? "Sesión en Pausa"
                    : procesoEspecifico.estado === "done"
                      ? "Orden Finalizada"
                      : estaTrabajandoPieza
                        ? `Finalizar Pieza #${numeroPiezaVisual}`
                        : `Iniciar Pieza #${numeroPiezaVisual}`}
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
                  <div className="flex gap-2">
                    {estaTrabajandoPieza && (
                      <Badge className="bg-amber-500 animate-bounce ml-1 mr-1">
                        TRABAJANDO UNIDAD
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {procesoEspecifico.estado.toUpperCase()}
                    </Badge>
                  </div>
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

            {data?.sesionActivaPorNomina && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">
                      ¡Atención! Tienes una sesión abierta
                    </p>
                    <p className="text-xs text-amber-700">
                      Máquina:{" "}
                      <span className="font-bold">
                        {data.sesionActivaPorNomina.maquina.nombre}
                      </span>
                    </p>
                    <p className="text-[10px] text-amber-600 mt-1 uppercase">
                      Pieza:
                      {data.sesionActivaPorNomina.procesoOp.operacion?.workorder
                        ?.plano || "N/A"}
                      · OP:
                      {data.sesionActivaPorNomina.procesoOp.operacion
                        ?.operacion || "S/N"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AccionIndirecto usuarioId={dataE?.usuario?.id} />

        {sesionId &&
          procesoEspecifico &&
          (procesoEspecifico.estado === "done" ||
          procesoEspecifico.estado === "scrap" ? (
            // Este bloque se muestra SOLO cuando la orden terminó, ocupando el lugar de los botones
            <div className="col-span-1 md:col-span-3 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300 px-4">
              <p className="text-sm text-slate-500 italic text-center">
                Acciones de sesión deshabilitadas: Orden finalizada
              </p>
            </div>
          ) : (
            // Este bloque muestra los botones mientras la orden esté activa
            <>
              <AccionScrap
                sesionId={sesionId}
                procesoOpId={procesoEspecifico.id}
                onActionSuccess={refetchP}
              />

              <AccionPausa
                sesionId={sesionId}
                pausas={
                  procesoEspecifico?.sesiones.find((s) => s.id === sesionId)
                    ?.pausas || []
                }
                onActionSuccess={refetchP}
                onPausaChange={(pausado) => setBloqueadoPorPausa(pausado)}
              />

              <AccionProblema sesionId={sesionId} onActionSuccess={refetchP} />
            </>
          ))}

        {procesoEspecifico?.proceso.nombre === "Programación CNC" && (
          <AccionSetup
            procesoOpId={procesoEspecifico.id}
            workOrder={workOrder}
            isOpen={isFinalizeModalOpen}
            setIsOpen={setIsFinalizeModalOpen}
            onSuccess={() => {
              limpiarEstacion();
              refetchP();
            }}
          />
        )}
      </div>
    </div>
  );
}
