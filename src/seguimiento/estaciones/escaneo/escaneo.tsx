import React, { useEffect, useMemo, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

/* --------------------------------- Tipos ---------------------------------- */
type ScanStatus = "ok" | "error" | "warning";

interface ScanItem {
  id: string; // uuid-like
  employeeId: string;
  workOrder: string;
  ts: string; // ISO timestamp
  status: ScanStatus;
  note?: string;
}

// Tipos de GraphQL (Definidos para mayor seguridad)
interface ProcesoOp {
  id: string;
  estado: string;
  horaInicio: string | null;
  horaFin: string | null;
  tiempoRealCalculado: number | null;
  tiempoEstimado: number | null;
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
    id: string; // Añadido ID aquí para las mutaciones
    numero: string;
    nombre: string;
    proceso: {
      id: string; // ID del proceso del usuario (ej: 4 para Maquinado)
      nombre: string;
    };
  } | null;
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
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState(""); // Número de empleado (Input)
  const [locked, setLocked] = useState(false); // Operador bloqueado
  const [workOrder, setWorkOrder] = useState(""); // Número de Operación (Input)
  const [recent, setRecent] = useState<ScanItem[]>(() => readScans());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const woInputRef = useRef<HTMLInputElement | null>(null);
  const empInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Query de Usuario (Basado en el input del empleado)
  const GET_USUARIO = gql`
    query GetUsuario($numero: String!) {
      usuario(numero: $numero) {
        id # Necesitamos el ID para las mutaciones
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
    refetch: refetchE,
  } = useQuery<EmpleadoQueryResult>(GET_USUARIO, {
    variables: { numero: employeeId },
    //skip: !employeeId || !locked, // Solo buscar si está bloqueado y hay ID
    fetchPolicy: "cache-and-network",
  });

  const procesoIdStr = dataE?.usuario?.proceso?.id; // String ID o undefined
  const proceso: number = parseInt(procesoIdStr || "0");
  const operacion = workOrder; // Usamos el workOrder escaneado como ID de la Operacion

  // 2. Query de Proceso Específico (Se ejecuta automáticamente al tener IDs válidos)
  const GET_PROCESO = gql`
    query ObtenerProcesoEspecifico($operacion: String!, $procesoId: ID!) {
      procesoOpPorOperacionYProceso(
        operacion: $operacion
        procesoId: $procesoId
      ) {
        id
        estado
        horaInicio
        horaFin
        tiempoEstimado
        tiempoRealCalculado
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
      procesoId: proceso,
    },
    // Solo se ejecuta si el operador está bloqueado y tenemos ambos IDs válidos
    skip: !locked || !operacion || !proceso,
    fetchPolicy: "network-only", // Siempre obtener la data más fresca
  });

  const procesoEspecifico = dataP?.procesoOpPorOperacionYProceso;

  // 3. Mutación de INICIO
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

  const [iniciarProcesoOp, { loading: loadingI, error: errorI }] =
    useMutation(INICIAR_PROCESO);

  // 4. Mutación de FINALIZACIÓN
  const FINALIZAR_PROCESO = gql`
    mutation FinalizarProceso($procesoOpId: ID!, $estado: String!) {
      finalizarProcesoOp(procesoOpId: $procesoOpId, nuevoEstado: $estado) {
        id
        estado
        horaFin
        tiempoRealCalculado
      }
    }
  `;

  const [finalizarProcesoOp, { loading: loadingF, error: errorF }] =
    useMutation(FINALIZAR_PROCESO);

  // ------------------------- Lógica de Scaneo y Flujo -------------------------

  const handleScanAction = async () => {
    // Pre-validación de datos esenciales
    if (!dataE?.usuario?.id || !procesoEspecifico?.id) {
      addScan(
        "error",
        "Datos de usuario o proceso no encontrados o inválidos."
      );
      return;
    }

    const { estado } = procesoEspecifico;
    const procesoOpId = procesoEspecifico.id;
    const usuarioId = dataE.usuario.id;

    // Simulación de ID de máquina, ajustar según tu necesidad (ej: por QR de máquina)
    const maquinaId = "1";

    try {
      if (estado === "pending") {
        // --- INICIAR PROCESO ---
        await iniciarProcesoOp({
          variables: {
            procesoOpId: procesoOpId,
            usuarioId: usuarioId,
            nuevoEstado: "in_progress",
            maquinaId: maquinaId,
          },
        });
        addScan("ok", `Proceso iniciado: ${procesoEspecifico.proceso.nombre}`);
      } else if (estado === "in_progress") {
        // --- FINALIZAR PROCESO ---
        await finalizarProcesoOp({
          variables: {
            procesoOpId: procesoOpId,
            nuevoEstado: "done",
          },
        });
        addScan(
          "ok",
          `Proceso finalizado: ${procesoEspecifico.proceso.nombre}`
        );
      } else if (estado === "done") {
        addScan("warning", "El proceso ya está completado.");
      } else if (estado === "scrap") {
        addScan("warning", "El proceso fue marcado como SCRAP.");
      } else {
        addScan("error", `Estado desconocido: ${estado}.`);
      }

      // Después de la mutación, refetch para actualizar la vista (aunque network-only ya ayuda)
      refetchP();
    } catch (e: any) {
      console.error("Error en la mutación:", e);
      addScan("error", `Error en servidor: ${e.message.split(":")[0]}`);
    }
  };

  const handleLockOperator = () => {
    if (!employeeId || loadingE) {
      return alert("Número de empleado no válido o cargando.");
    }
    if (errorE) {
      return alert("Error al buscar empleado. Verifica el número.");
    }
    if (!dataE?.usuario) {
      return alert("Empleado no encontrado.");
    }
    if (!dataE.usuario.proceso) {
      return alert(
        `Empleado ${dataE.usuario.nombre} no tiene un Proceso de trabajo asignado.`
      );
    }

    setLocked(true);
    setTimeout(() => woInputRef.current?.focus(), 0);
  };

  function handleChangeOperator() {
    setLocked(false);
    setWorkOrder(""); // Limpiar WO al cambiar operador
    setTimeout(() => empInputRef.current?.focus(), 0);
  }

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
    if (!proceso) {
      addScan("error", "El empleado no tiene un Proceso de trabajo asignado.");
      return;
    }

    // 3. Si ya tenemos un ProcesoOp cargado (dataP) y no está cargando (loadingP), ejecutamos la acción.
    if (!loadingP && !errorP) {
      if (procesoEspecifico) {
        handleScanAction();
      } else {
        // No se encontró el ProcesoOp específico para la Operación/Proceso
        addScan(
          "error",
          `Proceso no encontrado para la Operación ${workOrder}.`
        );
      }
    } else if (loadingP) {
      addScan("warning", "Datos del proceso en carga, intente de nuevo.");
    } else {
      addScan("error", `Error al buscar ProcesoOp: ${errorP?.message}`);
    }
  }

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

  function showData() {
    console.log("--- DEBUG DATA START ---");
    console.log("1. Input Actual (employeeId, workOrder):", {
      employeeId,
      workOrder,
    });
    console.log("2. Resultado de Query Empleado (dataE):", dataE);
    //console.log("Datos de usuario para debug:", dataE?.usuario?.proceso.id);
    console.log("Datos de usuario para debug:", proceso);
    console.log("3. Resultado de Query Proceso Específico (dataP):", dataP);
    console.log("4. Proceso a actuar (procesoEspecifico):", procesoEspecifico);
  }

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
          Estación de Escaneo
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
              Primero captura tu número de empleado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmitScan}>
              {/* Sección de Operador */}
              <div>
                <Label>Número de empleado</Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={empInputRef}
                    inputMode="numeric"
                    disabled={locked || loadingE}
                    placeholder="Ej. 1234"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.trim())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLockOperator();
                    }}
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
                    4–8 dígitos · Presiona Enter para continuar
                  </p>
                )}
              </div>

              <Separator />

              {/* Sección de Work Order */}
              <div>
                <Label>Work Order (Operación ID)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={woInputRef}
                    placeholder="WO-123456 o ID de Operación"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value.trim())}
                    // disabled={!locked || loadingI || loadingF}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitScan();
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Captura ID y presiona Enter
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                {!locked ? (
                  <Button
                    type="button"
                    onClick={handleLockOperator}
                    disabled={loadingE || !employeeId}
                  >
                    Continuar
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      disabled={!workOrder || loadingP || loadingI || loadingF}
                    >
                      {loadingI || loadingF ? "Procesando..." : "Registrar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChangeOperator}
                    >
                      Cambiar operador
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
            {/* ... (Footer de historial) ... */}
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
            <CardTitle>Estado del Proceso ({proceso || "N/A"})</CardTitle>
            <CardDescription>
              {proceso
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
                Error: {errorP.message}
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
                            procesoEspecifico.horaInicio
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

            {!procesoEspecifico && workOrder && !loadingP && !errorP && (
              <p className="text-center py-4 text-orange-600">
                No se encontró el paso **{dataE?.usuario?.proceso?.nombre}**
                para la Operación **{workOrder}**.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Panel de Historial (Resto de la tabla) */}
        <Card className="lg:col-span-3">
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
                    <TableHead className="whitespace-nowrap">
                      Empleado
                    </TableHead>
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
                        <TableCell className="font-mono">
                          {r.workOrder}
                        </TableCell>
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
      </div>

      {/* Acciones rápidas (opcional) */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Regresar
        </Button>
      </div>

      {/* Indicador visual simple del flujo */}
      <div className="mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Flujo</CardTitle>
            <CardDescription>
              1) Captura empleado · 2) Captura WO · 3) Enter para registrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={locked ? (workOrder ? 90 : 60) : 30} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
