import React, { useEffect, useMemo, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Barcode,
  User,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  TriangleAlert,
  PauseCircle,
  Bug,
  Clock,
} from "lucide-react";

// NUEVOS COMPONENTES: Modal (Dialog) y Textarea
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Componentes para el Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { toast } from "sonner";

/* --------------------------------- Tipos ---------------------------------- */
type ScanStatus = "ok" | "error" | "warning";
type ModalActionType =
  | "rechazo"
  | "pausa"
  | "problema"
  | "reanudacion"
  | "indirecto"
  | "";

interface ScanItem {
  id: string; // uuid-like
  employeeId: string;
  workOrder: string;
  ts: string; // ISO timestamp
  status: ScanStatus;
  note?: string;
}

// Tipos para Maquina
interface Maquina {
  id: string;
  nombre: string;
}

interface MaquinasQueryResult {
  maquinaPorProceso: Maquina[]; // Cambiado a List[] en el backend
}

// Tipos de GraphQL (Definidos para mayor seguridad)
interface ProcesoOp {
  id: string;
  operacion: { id: string };
  estado: string;
  horaInicio: string | null;
  horaFin: string | null;
  tiempoRealCalculado: number | null;
  conteoActual: number;
  tiempoEstimado: number | null;
  observaciones: string | null;
  proceso: {
    id: string;
    nombre: string;
  };
}

interface ProcesoOpQueryResult {
  procesoOpPorOperacionYProceso: ProcesoOp | null;
}

interface EmpleadoQueryResult {
  usuario: {
    id: string;
    numero: string;
    nombre: string;
    proceso: {
      id: string; // ID del proceso del usuario (ej: 4 para Maquinado)
      nombre: string;
    };
  } | null;
}

interface GetMaquinadoData {
  getProcesoMaquinado: {
    id: string;
    __typename?: string;
  } | null;
}

interface GetMaquinadoVars {
  operacionId: string;
}

interface RegistrarPiezaResponse {
  registrarPieza: {
    id: string;
    conteoActual: number;
    estado: string;
  };
}

/* ------------------------- Util: persistencia simple ----------------------- */
const LS_KEY = "trackingv2.scanstation.recent";

function readScans(): ScanItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScans(items: ScanItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ----------------------------- Componente Page ----------------------------- */
export default function ScanStation() {
  const [employeeId, setEmployeeId] = useState("");
  const [locked, setLocked] = useState(false);
  const [workOrder, setWorkOrder] = useState("");
  const [recent, setRecent] = useState<ScanItem[]>(() => readScans());
  const [page, setPage] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  // --- NUEVO ESTADO: Máquina seleccionada ---
  const [maquinaSeleccionadaId, setMaquinaSeleccionadaId] = useState<
    string | undefined
  >(undefined);
  // ------------------------------------------

  const PAGE_SIZE = 5;

  // --- NUEVOS ESTADOS para el Modal de Motivos ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalActionType>("");
  const [motivo, setMotivo] = useState("");
  // --------------------------------------------------

  const woInputRef = useRef<HTMLInputElement | null>(null);
  const empInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Query GET_USUARIO
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

  const {
    data: dataE,
    loading: loadingE,
    error: errorE,
  } = useQuery<EmpleadoQueryResult>(GET_USUARIO, {
    variables: { numero: employeeId },
    fetchPolicy: "cache-and-network",
  });

  const procesoId = dataE?.usuario?.proceso?.id;
  const operacion = workOrder;

  // 2. Query GET_PROCESO
  const GET_PROCESO = gql`
    query ObtenerProcesoEspecifico($operacion: String!, $procesoId: ID!) {
      procesoOpPorOperacionYProceso(
        operacion: $operacion
        procesoId: $procesoId
      ) {
        id
        estado
        tiempoEstimado
        horaInicio
        tiempoRealCalculado
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

  const {
    data: dataP,
    loading: loadingP,
    error: errorP,
    refetch: refetchP,
  } = useQuery<ProcesoOpQueryResult>(GET_PROCESO, {
    variables: {
      operacion: operacion,
      procesoId: procesoId,
    },
    // Solo ejecutar el query si tenemos ambos valores
    skip: !procesoId || !operacion,
    fetchPolicy: "network-only",
  });

  const procesoEspecifico = dataP?.procesoOpPorOperacionYProceso;

  // 2. Query GET_PROCESO
  const GET_PROCESO_MAQUINADO = gql`
    query GetProcesoMaquinado($operacionId: ID!) {
      getProcesoMaquinado(operacionId: $operacionId) {
        id
      }
    }
  `;

  // 3. Query GET_MAQUINAS (Corregido y renombrado para ser un Query)
  const GET_MAQUINAS = gql`
    query GetMaquinas($procesoId: ID!) {
      maquinaPorProceso(procesoId: $procesoId) {
        id
        nombre
      }
    }
  `;

  const {
    data: dataM,
    loading: loadingM,
    // error: errorM, // No usado en este fragmento
  } = useQuery<MaquinasQueryResult>(GET_MAQUINAS, {
    variables: {
      procesoId: procesoId,
    },
    // Ejecutar solo si tenemos el ID del proceso
    skip: !procesoId,
    fetchPolicy: "cache-and-network",
  });

  //console.log("proceso id:", procesoId);

  const maquinas = dataM?.maquinaPorProceso;

  // 4. Mutación de INICIO (Se mantiene igual)
  const INICIAR_PROCESO = gql`
    mutation IniciarProceso(
      $procesoOpId: ID!
      $usuarioId: ID!
      $estado: String!
      $maquinaId: ID
    ) {
      iniciarProcesoOp(
        procesoOpId: $procesoOpId
        usuarioId: $usuarioId
        nuevoEstado: $estado
        maquinaId: $maquinaId
      ) {
        id
        estado
        horaInicio
        usuario {
          nombre
        }
        maquina {
          nombre
        }
      }
    }
  `;

  const [iniciarProcesoOp, { loading: loadingI }] =
    useMutation(INICIAR_PROCESO);

  const UPDATE_STATUS = gql`
    mutation UpdateStatus(
      $procesoOpId: ID!
      $estado: String!
      $observaciones: String
    ) {
      actualizarEstadoOp(
        procesoOpId: $procesoOpId
        nuevoEstado: $estado
        observaciones: $observaciones
      ) {
        id
        estado
        horaFin
        tiempoRealCalculado
        observaciones
      }
    }
  `;

  const [
    updateStatus,
    { loading: loadingUpdateStatus, error: errorUpdateStatus },
  ] = useMutation(UPDATE_STATUS, {
    // Asegúrate de recargar la operación y los datos de la máquina tras la pausa
    refetchQueries: ["GetOperacionActual", "GetMaquinaDetail"],
    awaitRefetchQueries: true,
  });

  useEffect(() => {
    if (procesoEspecifico) {
      // Si el estado que viene del servidor es 'paused', establecemos isPaused a true.
      setIsPaused(procesoEspecifico.estado === "paused");
    }
  }, [procesoEspecifico]);

  // 5. Mutación de FINALIZACIÓN (MODIFICADA para incluir observaciones)
  const FINALIZAR_PROCESO = gql`
    mutation FinalizarProceso(
      $procesoOpId: ID!
      $estado: String!
      $observaciones: String
    ) {
      finalizarProcesoOp(
        procesoOpId: $procesoOpId
        nuevoEstado: $estado
        observaciones: $observaciones
      ) {
        id
        estado
        horaFin
        tiempoRealCalculado
        observaciones
      }
    }
  `;

  const [finalizarProcesoOp, { loading: loadingF }] =
    useMutation(FINALIZAR_PROCESO);

  // Mutación de Tiempo Setup para maquinado CNC al finalizar programacion CNC
  const UPDATE_TIEMPO_SETUP = gql`
    mutation UpdateTiempoSetup($procesoOpId: ID!, $tiempoSetup: Float!) {
      updateTiempoSetup(procesoOpId: $procesoOpId, tiempoSetup: $tiempoSetup) {
        id
        tiempoSetup
      }
    }
  `;

  // 6. Mutación de REGISTRO DE OBSERVACIÓN (CORREGIDA)
  const REGISTRAR_OBSERVACION = gql`
    mutation RegistrarObservacion(
      $procesoOpId: ID!
      $tipoRegistro: String!
      $descripcion: String!
    ) {
      registrarObservacion(
        procesoOpId: $procesoOpId
        tipoRegistro: $tipoRegistro
        descripcion: $descripcion
      ) {
        id
        observaciones
      }
    }
  `;

  const REGISTRAR_PIEZA = gql`
    mutation RegistrarPieza($procesoOpId: ID!) {
      registrarPieza(procesoOpId: $procesoOpId) {
        id
        conteoActual
      }
    }
  `;

  const CREAR_INDIRECTO = gql`
    mutation CrearIndirecto($usuarioId: ID!, $motivo: String!) {
      crearIndirecto(input: { usuarioId: $usuarioId, motivo: $motivo }) {
        id
        motivo
        horaInicio
      }
    }
  `;

  const [registrarPieza] = useMutation<RegistrarPiezaResponse>(REGISTRAR_PIEZA);

  const [registrarObservacion, { loading: loadingO, error: errorO }] =
    useMutation(REGISTRAR_OBSERVACION);

  const [tiempoSetupCapturado, setTiempoSetupCapturado] = useState<
    number | null
  >(null);
  const [timeModalOpen, setTimeModalOpen] = useState(false);

  const [estHours, setEstHours] = useState(0);
  const [estMinutes, setEstMinutes] = useState(0);

  const [getMaquinado] = useLazyQuery<GetMaquinadoData, GetMaquinadoVars>(
    GET_PROCESO_MAQUINADO,
  );
  const [updateSetup] = useMutation(UPDATE_TIEMPO_SETUP);

  const confirmTimeModal = () => {
    const totalMinutos = estHours * 60 + estMinutes; //

    if (totalMinutos <= 0) {
      toast.error("El tiempo debe ser mayor a 0");
      return;
    }

    // Actualizamos el estado para la UI, pero pasamos 'totalMinutos' directamente
    setTiempoSetupCapturado(totalMinutos);
    setTimeModalOpen(false);

    // IMPORTANTE: Pasar el valor como argumento aquí
    setTimeout(() => handleScanAction(totalMinutos), 100);
  };

  const [crearIndirecto] = useMutation(CREAR_INDIRECTO);

  // -------- Tiempo estimado helpers --------

  function incHours(delta: number) {
    setEstHours((h) => Math.min(12, Math.max(0, h + delta))); // Límite de 12h
  }

  function incMinutes(delta: number) {
    setEstMinutes((m) => {
      const next = m + delta;
      if (next < 0) return 55; // Salta al final
      if (next > 55) return 0; // Vuelve al inicio
      return next;
    });
  }

  // ------------------------- Lógica de Scaneo y Flujo -------------------------

  const handleScanAction = async (tiempoSetupManual?: number) => {
    if (!procesoEspecifico || !dataE?.usuario) return;
    const procesoId = procesoEspecifico.proceso.id;
    const operacionId = procesoEspecifico.operacion.id;

    try {
      // --- INICIO ---
      if (procesoEspecifico.estado === "pending") {
        await iniciarProcesoOp({
          variables: {
            procesoOpId: procesoEspecifico.id,
            usuarioId: dataE.usuario.id,
            estado: "in_progress",
            maquinaId: maquinaSeleccionadaId,
          },
        });
        addScan("ok", "Proceso iniciado");
        toast.success("▶️ Proceso iniciado.");
      }

      // --- REGISTRO DE PIEZA ---
      else if (procesoEspecifico.estado === "in_progress") {
        if (procesoId === "3" && tiempoSetupManual) {
          const { data: dataMaq } = await getMaquinado({
            variables: { operacionId },
          });
          if (dataMaq?.getProcesoMaquinado) {
            await updateSetup({
              variables: {
                procesoOpId: dataMaq.getProcesoMaquinado.id,
                tiempoSetup: tiempoSetupManual,
              },
            });
          }
        }

        const { data: res } = await registrarPieza({
          variables: { procesoOpId: procesoEspecifico.id },
        });

        if (res?.registrarPieza) {
          const actual = res.registrarPieza.conteoActual;
          const meta = (procesoEspecifico as any).operacion.workorder.cantidad;

          if (res.registrarPieza.estado === "done") {
            addScan("ok", `FINALIZADO: ${actual}/${meta} piezas`);
            toast.success(`✅ Orden completada: ${actual}/${meta}`);
          } else {
            // Aquí guardamos el número de pieza en el historial local
            addScan("ok", `Pieza registrada: ${actual} de ${meta}`);
            toast.info(`🧩 Avance: ${actual}/${meta}`);
          }
        }
      }

      setWorkOrder("");
      refetchP();
    } catch (error: any) {
      toast.error("Error: " + error.message);
      addScan("error", error.message);
    }
  };

  const handlePauseResumeAction = async (observaciones: string) => {
    // Si ya está pausado localmente, la acción es REANUDAR ("in_progress").
    // Si NO está pausado, la acción es PAUSAR ("paused").
    const newState = isPaused ? "in_progress" : "paused";

    try {
      await updateStatus({
        variables: {
          procesoOpId: procesoEspecifico?.id,
          estado: newState, // Usamos el estado dinámico
          observaciones: observaciones,
        },
      });

      // Actualización de estado local y log en historial
      if (newState === "paused") {
        setIsPaused(true);
        addScan(
          "warning",
          `Proceso Pausado. Motivo: ${observaciones.substring(0, 30)}...`,
        );
        toast.success(`⏸️ Proceso Pausado.`);
      } else {
        setIsPaused(false);
        addScan(
          "ok",
          `Proceso Reanudado. Motivo: ${observaciones.substring(0, 30)}...`,
        );
        toast.success(`▶️ Proceso Reanudado.`);
      }
      refetchP(); // Actualizar la vista de la operación
    } catch (e: any) {
      toast.error(`Error en la operación ${newState.toUpperCase()}:`, e);
      addScan(
        "error",
        `Error en servidor (${newState.toUpperCase()}): ${
          e.message.split(":")[0]
        }`,
      );
      console.log(errorUpdateStatus);
    } finally {
      setModalOpen(false);
      setMotivo("");
    }
  };

  const handleLockOperator = () => {
    if (errorE || !dataE?.usuario) {
      // Permitir continuar si hay datos
    }
    setLocked(true);
    setTimeout(() => woInputRef.current?.focus(), 0);
  };

  function addScan(status: ScanStatus, note?: string) {
    const item: ScanItem = {
      id: uuid(),
      employeeId: employeeId,
      workOrder: workOrder,
      ts: new Date().toISOString(),
      status,
      note,
    };

    setRecent((prev) => [item, ...prev].slice(0, 200));
    setWorkOrder("");
    setPage(1);
    // IMPORTANTE: NO limpiamos la maquinaSeleccionadaId aquí si queremos que persista para el siguiente WO
    setTimeout(() => woInputRef.current?.focus(), 0);
  }

  function handleSubmitScan(e?: React.FormEvent) {
    e?.preventDefault();

    if (!locked) return handleLockOperator();

    // 1. Validar el formato de la Operación
    if (!/^[A-Za-z0-9\-]{3,}$/i.test(workOrder)) {
      addScan("error", "Formato de Work Order inválido");
      return;
    }

    // 2. Validar que tengamos el ID de Proceso del Usuario
    if (!procesoId) {
      addScan("error", "El empleado no tiene un Proceso de trabajo asignado.");
      return;
    }

    // 3. Validar selección de máquina si hay máquinas disponibles
    const shouldSelectMachine =
      procesoEspecifico?.estado === "pending" &&
      maquinas &&
      maquinas.length > 0;

    if (shouldSelectMachine && !maquinaSeleccionadaId) {
      addScan("error", "Debe seleccionar una máquina para iniciar el proceso.");
      return;
    }

    if (
      procesoId === "3" &&
      procesoEspecifico?.estado === "in_progress" &&
      tiempoSetupCapturado === null
    ) {
      setTimeModalOpen(true);
      return; // Aquí se detiene y espera al confirmTimeModal
    }

    // 4. Ejecutar la acción si tenemos un ProcesoOp cargado y no está cargando
    if (!loadingP && !errorP) {
      if (procesoEspecifico) {
        handleScanAction();
      } else {
        addScan(
          "error",
          `Proceso no encontrado para la Operación ${workOrder}.`,
        );
      }
    } else if (loadingP) {
      addScan("warning", "Datos del proceso en carga, intente de nuevo.");
    } else {
      addScan("error", `Error al buscar ProcesoOp: ${errorP?.message}`);
    }
  }

  // --- NUEVA LÓGICA DE RECHAZO (SCRAP) ---
  const handleScrapAction = async (observaciones: string) => {
    try {
      await finalizarProcesoOp({
        variables: {
          procesoOpId: procesoEspecifico?.id,
          estado: "scrap",
          observaciones: observaciones,
        },
      });
      addScan(
        "error",
        `Proceso marcado como SCRAP: ${
          procesoEspecifico?.proceso.nombre
        }. Motivo: ${observaciones.substring(0, 30)}...`,
      );
      toast.success(`❌ Operación SCRAP registrada con éxito.`);
      refetchP(); // Actualizar la vista
    } catch (e: any) {
      toast.error("Error en la operación SCRAP:", e);
      addScan("error", `Error en servidor (SCRAP): ${e.message.split(":")[0]}`);
    } finally {
      setModalOpen(false);
      setMotivo("");
    }
  };

  // --- LÓGICA DE REGISTRO DE ACCIÓN GENÉRICA ---
  const handleRegisterAction = async (
    tipoRegistro: string,
    observaciones: string,
  ) => {
    if (!procesoEspecifico?.id) {
      addScan(
        "error",
        "Error: Proceso Op ID no encontrado para registrar la acción.",
      );
      return;
    }

    try {
      await registrarObservacion({
        variables: {
          procesoOpId: procesoEspecifico.id,
          tipoRegistro: tipoRegistro,
          descripcion: observaciones,
        },
      });
      console.log(loadingO);
      // --- NUEVA LÓGICA: ACTUALIZAR ESTADO DE PAUSA ---
      if (tipoRegistro === "PAUSA_INICIO") {
        setIsPaused(true);
      } else if (tipoRegistro === "PAUSA_FIN") {
        setIsPaused(false);
      }
      // -------------------------------------------------

      addScan(
        "warning",
        `${tipoRegistro.replace(
          "_",
          " ",
        )} registrado: ${observaciones.substring(0, 30)}...`,
      );
      toast.success(`📝 ${tipoRegistro.replace("_", " ")} registrado.`);
      refetchP();
    } catch (e: any) {
      console.log(errorO);
      toast.error(`Error en la operación ${tipoRegistro}:`, e);
      addScan(
        "error",
        `Error en servidor (${tipoRegistro}): ${e.message.split(":")[0]}`,
      );
    } finally {
      setModalOpen(false);
      setMotivo("");
    }
  };

  const handleIndirectoAction = async (motivoSeleccionado: string) => {
    if (!dataE?.usuario?.id) return;

    try {
      await crearIndirecto({
        variables: {
          usuarioId: dataE.usuario.id,
          motivo: motivoSeleccionado,
        },
      });
      toast.success(`⏱️ Tiempo de ${motivoSeleccionado} registrado.`);
      addScan("warning", `Inicio de tiempo indirecto: ${motivoSeleccionado}`);
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setModalOpen(false);
    }
  };

  // --- LÓGICA DE MODAL DE ACCIÓN ---
  const openReasonModal = (type: ModalActionType) => {
    setModalType(type);
    setMotivo("");
    setModalOpen(true);

    if (type === "pausa") {
      // 👈 SIMPLIFICAMOS AQUÍ: El modalType debe reflejar la acción real.
      setModalType(isPaused ? "reanudacion" : "pausa");
    } else {
      setModalType(type);
    }

    setMotivo("");
    setModalOpen(true);
  };

  const handleConfirmModal = () => {
    if (motivo.length < 5) {
      toast.message(
        "Por favor, ingresa una descripción o motivo de al menos 5 caracteres.",
      );
      return;
    }

    if (modalType === "rechazo") {
      handleScrapAction(motivo);
    } else if (modalType === "pausa" || modalType === "reanudacion") {
      // 👈 AHORA LLAMA DIRECTAMENTE A LA FUNCIÓN UNIFICADA
      handlePauseResumeAction(motivo);
    } else if (modalType === "problema") {
      handleRegisterAction("PROBLEMA", motivo);
    }
  };

  // Enfoque inicial y Guardar historial
  useEffect(() => {
    if (!locked) empInputRef.current?.focus();
    else woInputRef.current?.focus();
  }, [locked]);

  useEffect(() => {
    writeScans(recent);
  }, [recent]);

  // Resto de la lógica de paginación/cálculo de historial
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recent.filter((r) => new Date(r.ts).toDateString() === today).length;
  }, [recent]);

  const totalPages = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return recent
      .slice()
      .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
      .slice(start, start + PAGE_SIZE);
  }, [recent, pageSafe]);

  function clearHistory() {
    if (!confirm("¿Borrar historial local de escaneos?")) return;
    setRecent([]);
    setPage(1);
  }

  // UX: Color del estado actual
  const estadoActual = procesoEspecifico?.estado;
  let estadoColor = "bg-slate-100 text-slate-600";
  if (estadoActual === "in_progress")
    estadoColor = "bg-amber-100 text-amber-600";
  if (estadoActual === "done" || estadoActual === "scrap")
    estadoColor = "bg-emerald-100 text-emerald-600";

  const isMaquinaRequiredAndMissing =
    procesoEspecifico?.estado === "pending" && // Solo si está pendiente de iniciar
    maquinas &&
    maquinas.length > 0 &&
    !maquinaSeleccionadaId;

  async function showData() {
    console.log("--- DEBUG DATA ---");
    console.log("Usuario actual:", dataE?.usuario);
    console.log("Proceso específico actual:", procesoEspecifico);

    if (procesoEspecifico?.operacion?.id) {
      console.log(
        "Buscando proceso de Maquinado para Operación ID:",
        procesoEspecifico.operacion.id,
      );

      // Ejecutamos el query perezoso manualmente para ver qué devuelve
      const result = await getMaquinado({
        variables: { operacionId: procesoEspecifico.operacion.id },
      });

      console.log(
        "Resultado de Query Maquinado:",
        result.data?.getProcesoMaquinado,
      );

      if (!result.data?.getProcesoMaquinado) {
        console.warn(
          "¡OJO!: No se encontró ningún proceso con ID 4 para esta operación en la base de datos.",
        );
      }
    } else {
      console.warn("No hay una operación cargada para buscar el maquinado.");
    }
  }

  // Renderizado
  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
          onClick={showData}
        >
          Estación de Escaneo: {dataE?.usuario?.proceso?.nombre}
        </motion.h1>
        <p className="text-sm text-muted-foreground">
          Captura de operador y Work Order · Página las últimas 5
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Panel de captura */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Operador & Work Order</CardTitle>
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
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmitScan}>
              <div>
                <Label>Work Order (Operación ID)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={woInputRef}
                    placeholder="WO-123456 o ID de Operación"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value.trim())}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  2. Haz clic en el campo y escanea el código QR con la pistola
                </p>
              </div>

              <Separator />

              <div>
                <Label>Número de empleado</Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={empInputRef}
                    inputMode="numeric"
                    placeholder="Ej. 1234"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.trim())}
                  />
                  {loadingE && (
                    <span className="text-xs text-muted-foreground">
                      Buscando...
                    </span>
                  )}
                </div>
                {locked && dataE?.usuario && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">
                    Operador: {dataE.usuario.nombre} (
                    {dataE.usuario.proceso.nombre})
                  </p>
                )}
                {!locked && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    1. Haz clic en el campo y presenta tu tarjeta en el lector
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="maquina-select">Máquina</Label>
                <Select
                  onValueChange={setMaquinaSeleccionadaId}
                  value={maquinaSeleccionadaId || ""}
                  disabled={loadingM || loadingP}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona una máquina" />
                  </SelectTrigger>
                  <SelectContent>
                    {maquinas?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  3. Selecciona la maquina que vas a ocupar
                </p>
              </div>

              <div className="flex gap-2 pt-1 mb-0">
                <Button
                  type={locked ? "submit" : "button"}
                  onClick={locked ? undefined : handleLockOperator}
                  disabled={
                    !workOrder ||
                    loadingP ||
                    loadingI ||
                    loadingF ||
                    isMaquinaRequiredAndMissing
                  }
                >
                  {loadingI || loadingF ? "Procesando..." : "Continuar"}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                4. Haz clic en continuar para registrar la WO
              </p>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span>
                Escaneos hoy:{" "}
                <span className="font-medium text-foreground">
                  {todayCount}
                </span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={clearHistory}
            >
              <Trash2 className="h-4 w-4" /> Limpiar historial
            </Button>
          </CardFooter>
        </Card>

        {/* Panel de Estado y Lógica */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estado del Proceso ({procesoId || "N/A"})</CardTitle>
            <CardDescription>
              {procesoId
                ? `Buscando estado para el proceso del operador: ${dataE?.usuario?.proceso?.nombre}`
                : "Bloquea un operador para ver su proceso de trabajo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingP && (
              <p className="text-center py-4 text-muted-foreground">
                Buscando Proceso Op...
              </p>
            )}
            {errorP && (
              <p className="text-center py-4 text-red-500">
                Captura el numero de empleado y Work Order válidos para ver el
                estado del proceso.
              </p>
            )}

            {procesoEspecifico && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>
                    Proceso:{" "}
                    <span className="font-semibold">
                      {procesoEspecifico.proceso.nombre}
                    </span>
                  </Label>
                  <Badge className={estadoColor}>
                    {procesoEspecifico.estado.toUpperCase()}
                  </Badge>
                </div>

                <div className="p-3 rounded-lg border">
                  <p className="text-sm font-medium mb-2">Acción requerida:</p>

                  {procesoEspecifico.estado === "pending" && (
                    <p className="text-amber-700">
                      Scanear inicia el proceso y registra la hora de inicio.
                      (Asegura seleccionar la Máquina)
                    </p>
                  )}
                  {procesoEspecifico.estado === "in_progress" && (
                    <p className="text-emerald-700">
                      Scanear finaliza el proceso y registra la hora de fin.
                    </p>
                  )}
                  {procesoEspecifico.estado === "done" && (
                    <p className="text-blue-700">
                      Proceso **Completado**. El siguiente scan no tendrá
                      efecto.
                    </p>
                  )}
                  {procesoEspecifico.estado === "scrap" && (
                    <p className="text-red-700">
                      Proceso **Scrap**. El siguiente scan no tendrá efecto.
                    </p>
                  )}

                  <Separator className="my-3" />
                  <div className="text-xs space-y-1">
                    <p>Estimado: {procesoEspecifico.tiempoEstimado} min</p>
                    <p>
                      Iniciado:{" "}
                      {procesoEspecifico.horaInicio
                        ? new Date(
                            procesoEspecifico.horaInicio,
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                    <p>
                      Tiempo Real:{" "}
                      {procesoEspecifico.tiempoRealCalculado || "0.0"} min
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!procesoEspecifico &&
              workOrder &&
              locked &&
              !loadingP &&
              !errorP && (
                <p className="text-center py-4 text-orange-600">
                  No se encontró el paso **{dataE?.usuario?.proceso?.nombre}**
                  para la Operación **{workOrder}**.
                </p>
              )}
          </CardContent>
        </Card>
      </div>

      {/* --- SECCIÓN DE OTRAS ACCIONES --- */}
      <h2 className="text-sm font-medium text-muted-foreground mt-6 mb-3">
        Otras acciones
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* --- Tiempo Indirecto --- */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            className="w-full gap-2 border-blue-200 bg-blue-200 hover:bg-blue-50 cursor-pointer"
            onClick={() => openReasonModal("indirecto")} // Necesitas agregar "indirecto" a ModalActionType
            disabled={!dataE?.usuario}
          >
            <Clock className="h-4 w-4 text-blue-500" /> Registrar Indirecto
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Actividades fuera de la WO (Limpieza, juntas, etc.)
          </p>
        </div>

        {/* --- Rechazo (SCRAP) --- */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="destructive"
            className="w-full gap-2 cursor-pointer"
            onClick={() => openReasonModal("rechazo")}
            disabled={!procesoEspecifico}
          >
            <TriangleAlert className="h-4 w-4" /> Registrar rechazo
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Usa este botón cuando una pieza no cumple tolerancia o debe
            descartarse.
          </p>
        </div>

        {/* --- Pausa --- */}
        <div className="flex flex-col items-center gap-2">
          <Button
            className={`w-full gap-2 ${
              isPaused
                ? "bg-green-500 hover:bg-green-600"
                : "bg-yellow-500 hover:bg-yellow-600"
            } text-black cursor-pointer`}
            onClick={() => openReasonModal("pausa")} // El modalType será manejado en openReasonModal
            disabled={
              !procesoEspecifico ||
              procesoEspecifico.estado === "done" ||
              procesoEspecifico.estado === "scrap" ||
              loadingUpdateStatus // 👈 Deshabilitar mientras carga la mutación
            }
          >
            <PauseCircle className="h-4 w-4" />{" "}
            {
              loadingUpdateStatus
                ? isPaused
                  ? "Reanudando..."
                  : "Pausando..." // Mostrar loading
                : isPaused
                  ? "Reanudar proceso"
                  : "Registrar pausa" // Mostrar texto normal
            }
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {isPaused
              ? "Confirma la reanudación para registrar el tiempo inactivo."
              : "Registra un tiempo de inactividad por descanso o comida."}
          </p>
        </div>

        {/* --- Problema --- */}
        <div className="flex flex-col items-center gap-2">
          <Button
            variant="outline"
            className="w-full gap-2 cursor-pointer"
            onClick={() => openReasonModal("problema")}
            disabled={!procesoEspecifico || !workOrder} // Permitir reportar problemas aunque no esté en progreso (si hay WO)
          >
            <Bug className="h-4 w-4" /> Registrar problema
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Informa incidentes o alarmas detectadas en la máquina.
          </p>
        </div>
      </div>

      {/* Modal: tiempo estimado de producción CNC (Solo Proceso 3) */}
      <Dialog
        open={timeModalOpen}
        onOpenChange={(open) => {
          // Evita que se cierre al hacer click afuera si no se ha confirmado
          if (!open && tiempoSetupCapturado === null) return;
          setTimeModalOpen(open);
        }}
      >
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="sm:max-w-[400px]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              Tiempo estimado de producción
            </DialogTitle>
            <DialogDescription>
              Captura el tiempo estimado (en horas y minutos) para continuar
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <div className="flex justify-center items-center gap-6">
              {/* CONTROL DE HORAS */}
              <div className="flex flex-col items-center gap-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Horas
                </Label>
                <Button
                  onClick={() => incHours(1)}
                  className="bg-white text-black h-10 w-10 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100"
                >
                  <ChevronRight className="h-5 w-5 -rotate-90" />
                </Button>

                <div className="text-5xl font-black font-mono tracking-tighter tabular-nums py-2">
                  {estHours}
                </div>

                <Button
                  onClick={() => incHours(-1)}
                  className="bg-white text-black h-10 w-10 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100"
                >
                  <ChevronRight className="h-5 w-5 rotate-90" />
                </Button>
              </div>

              <div className="text-4xl font-light text-muted-foreground/50 mt-3">
                :
              </div>

              {/* CONTROL DE MINUTOS */}
              <div className="flex flex-col items-center gap-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Minutos
                </Label>
                <Button
                  onClick={() => incMinutes(5)}
                  className="bg-white text-black h-10 w-10 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100"
                >
                  <ChevronRight className="h-5 w-5 -rotate-90" />
                </Button>

                <div className="text-5xl font-black font-mono tracking-tighter tabular-nums py-2">
                  {estMinutes.toString().padStart(2, "0")}
                </div>

                <Button
                  onClick={() => incMinutes(-5)}
                  className="bg-white text-black h-10 w-10 rounded-lg shadow-sm cursor-pointer hover:bg-gray-100"
                >
                  <ChevronRight className="h-5 w-5 rotate-90" />
                </Button>
              </div>
            </div>

            {/* RESUMEN VISUAL */}
            <div className="mt-3 mx-4 p-3 border rounded-xl flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-tight">
                Tiempo Total
              </span>
              <Badge className="text-lg px-4 py-0.5 font-mono shadow-md">
                {estHours}h {estMinutes.toString().padStart(2, "0")}m
              </Badge>
            </div>
          </div>

          <DialogFooter className="sm:justify-between gap-2 border-t pt-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setTimeModalOpen(false);
                setWorkOrder(""); // Limpiamos para evitar bucles si cancela
              }}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmTimeModal}
              className="hover:bg-blue-700 text-white px-8 shadow-lg cursor-pointer"
            >
              Confirmar y Finalizar
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE MOTIVO --- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {modalType === "rechazo" && "Motivo del rechazo (SCRAP)"}
              {modalType === "pausa" && "Motivo de la pausa (INICIO)"}
              {modalType === "reanudacion" &&
                "Motivo de la reanudación (FIN)"}{" "}
              {modalType === "problema" && "Descripción del problema"}
              {modalType === "indirecto" && "Motivo de tiempo indirecto"}
            </DialogTitle>
            <DialogDescription>
              {modalType === "rechazo" &&
                "Por favor, explica detalladamente por qué la pieza debe ser descartada."}
              {modalType === "pausa" &&
                "Registra brevemente el motivo por el cual la operación se detiene (ej: 'Descanso', 'Comida')."}
              {modalType === "reanudacion" &&
                "Registra el motivo o simplemente presiona Confirmar para cerrar el tiempo de pausa."}{" "}
              {modalType === "problema" &&
                "Describe el incidente o alarma detectada. Un supervisor será notificado."}
              {modalType === "indirecto" && "Selecciona el motivo"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Label htmlFor="motivo-text">
              {modalType === "indirecto"
                ? "Motivo"
                : "Detalles (mín. 5 caracteres)"}
            </Label>
            {modalType === "indirecto" ? (
              <Select onValueChange={setMotivo} value={motivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una actividad..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">Limpieza</SelectItem>
                  <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  <SelectItem value="launch">Comida / Break</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Textarea
                placeholder="Ej: Tolerancia fuera de rango..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={loadingF}
            >
              Cancelar
            </Button>
            <Button
              variant={modalType === "rechazo" ? "destructive" : "default"}
              onClick={
                modalType === "indirecto"
                  ? () => handleIndirectoAction(motivo)
                  : handleConfirmModal
              }
              disabled={
                (modalType !== "indirecto" && motivo.length < 5) || !motivo
              }
            >
              {loadingF
                ? "Procesando..."
                : `Confirmar ${modalType.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel de Historial */}
      <Card className="lg:col-span-3 mt-6">
        <CardHeader>
          <CardTitle>Historial Local</CardTitle>
          <CardDescription>Historial local de escaneos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    Fecha/Hora
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Empleado</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Work Order
                  </TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Aún no hay escaneos.
                    </TableCell>
                  </TableRow>
                ) : (
                  slice.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {new Date(r.ts).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.employeeId}
                      </TableCell>
                      <TableCell className="font-mono">{r.workOrder}</TableCell>
                      <TableCell className="text-center">
                        {r.status === "ok" && (
                          <Badge className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </Badge>
                        )}
                        {r.status === "warning" && (
                          <Badge variant="secondary" className="gap-1">
                            <AlertCircle className="h-3 w-3" /> Aviso
                          </Badge>
                        )}
                        {r.status === "error" && (
                          <Badge variant="outline" className="gap-1">
                            <AlertCircle className="h-3 w-3" /> Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.note || ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Separator className="my-4" />

          {/* Paginación */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Página <span className="font-medium">{pageSafe}</span> de{" "}
              <span className="font-medium">{totalPages}</span> —{" "}
              {recent.length} registro(s)
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicador visual simple del flujo */}
      <div className="mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Flujo</CardTitle>
            <CardDescription>
              1) Captura empleado · 2) Captura WO · 3) Selecciona máquina · 4)
              Enter para registrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={
                locked
                  ? workOrder
                    ? maquinaSeleccionadaId
                      ? 90
                      : 75
                    : 60
                  : 30
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
