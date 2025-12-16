import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Calendar,
  AlertTriangle,
  Activity,
  Timer,
  Hourglass,
} from "lucide-react";

/* ============================
   Tipos GraphQL
================================ */

type ProcesoAsignado = {
  proceso: {
    nombre: string;
  };
  tiempoEstimado?: number | null;
  horaInicio?: string | null; // ISO
  horaFin?: string | null; // ISO
  tiempoRealCalculado?: number | null; // Ya en minutos
  operacion: {
    operacion: string; // Plano de wo
    proyecto?: {
      proyecto: string;
    } | null;
  };
  maquina?: {
    nombre: string;
  } | null;
};

// INTERFAZ PARA GET_USUARIOS
interface GetUsuariosData {
  usuarios: {
    id: string;
    numero: string;
    nombre: string;
  }[];
}

// INTERFAZ PARA GET_USUARIO
interface GetUserData {
  usuario: {
    id: string;
    nombre: string;
    procesosAsignados: ProcesoAsignado[];
  } | null;
}

/* ============================
   Tipos de la Interfaz
================================ */

type IntervalKind = "work" | "break" | "unknown";

type Interval = {
  start: string;
  end: string;
  minutes: number; // ES EL TIEMPO REAL CALCULADO
  kind: IntervalKind;
  maquinaNombre: string;
  operacion: string;
  proyecto: string;
  tiempoEstimado: number;
};

type TimelineResult = {
  intervals: Interval[];
  totalWorkMin: number;
  totalBreakMin: number;
  totalUnknownMin: number;
  unknownLongGaps: Interval[];
  overtimeMin: number;
};

/* ============================
   Config jornada
================================ */

// const SHIFT_END = "17:30";

// function timeStringToMinutes(hhmm: string): number {
//   const [h, m] = hhmm.split(":").map(Number);
//   return h * 60 + m;
// }

// const SHIFT_END_MIN = timeStringToMinutes(SHIFT_END);

/* ============================
   Queries GraphQL
================================ */

const GET_USUARIOS = gql`
  query GetUsuarios {
    usuarios {
      id
      numero
      nombre
    }
  }
`;

const GET_USUARIO = gql`
  query GetUsuario($numero: String!) {
    usuario(numero: $numero) {
      id
      nombre
      procesosAsignados {
        proceso {
          nombre
        }
        tiempoEstimado
        horaInicio
        horaFin
        tiempoRealCalculado
        operacion {
          operacion
          proyecto {
            proyecto
          }
        }
        maquina {
          nombre
        }
      }
    }
  }
`;

/* ============================
   Utilidades de tiempo
================================ */

function diffMinutes(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 60000);
}

// function minutesFromMidnight(d: Date): number {
//   return d.getHours() * 60 + d.getMinutes();
// }

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ============================
   Core: construir timeline desde GraphQL
================================ */

function buildTimelineFromGraphQL(
  data: ProcesoAsignado[] | undefined
): TimelineResult {
  if (!data || data.length === 0) {
    return {
      intervals: [],
      totalWorkMin: 0,
      totalBreakMin: 0,
      totalUnknownMin: 0,
      unknownLongGaps: [],
      overtimeMin: 0,
    };
  }

  const intervals: Interval[] = [];
  let totalWorkMin = 0;

  const startedProcesses = data.filter((p) => p.horaInicio);

  for (const proc of startedProcesses) {
    const start = new Date(proc.horaInicio!);

    const end = proc.horaFin ? new Date(proc.horaFin) : new Date();

    const tiempoReal = proc.tiempoRealCalculado ?? diffMinutes(start, end);

    if (tiempoReal > 0) {
      intervals.push({
        start: proc.horaInicio!,
        end: proc.horaFin ?? end.toISOString(),
        minutes: Math.round(tiempoReal),
        kind: "work",
        maquinaNombre: proc.maquina?.nombre ?? "N/A",
        operacion: proc.operacion.operacion ?? "N/A",
        proyecto: proc.operacion.proyecto?.proyecto ?? "N/A",
        tiempoEstimado: proc.tiempoEstimado ?? 0,
      });

      totalWorkMin += Math.round(tiempoReal);
    }
  }

  intervals.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return {
    intervals,
    totalWorkMin,
    totalBreakMin: 0,
    totalUnknownMin: 0,
    unknownLongGaps: [],
    overtimeMin: 0,
  };
}

/* ============================
   Componente principal
================================ */

export default function LavorPage() {
  const {
    data: usersData,
    loading: usersLoading,
    error: usersError,
  } = useQuery<GetUsuariosData>(GET_USUARIOS);

  const [selectedEmployeeNumero, setSelectedEmployeeNumero] =
    useState<string>("");
  const [date, setDate] = useState<string>("2025-12-10");
  const [projectFilter, setProjectFilter] = useState<string>("");

  // 🛑 Lógica robusta de filtro e inicialización
  const employees = useMemo(() => {
    if (usersData?.usuarios) {
      // 1. Filtrar solo usuarios con un número de empleado válido (no nulo, no cadena vacía)
      const validUsers = usersData.usuarios.filter(
        (emp) => emp.numero && emp.numero !== ""
      );

      // 2. Si el estado no está seteado y tenemos usuarios válidos, inicializar con el primero
      if (!selectedEmployeeNumero && validUsers.length > 0) {
        setSelectedEmployeeNumero(validUsers[0].numero);
      }

      return validUsers; // Retornamos solo los válidos
    }
    return [];
  }, [usersData, selectedEmployeeNumero]);

  const {
    data: userData,
    loading: userLoading,
    error: userError,
  } = useQuery<GetUserData>(GET_USUARIO, {
    variables: { numero: selectedEmployeeNumero },
    skip: !selectedEmployeeNumero,
  });

  const allProcesos = userData?.usuario?.procesosAsignados as
    | ProcesoAsignado[]
    | undefined;

  const timeline = useMemo(
    () => buildTimelineFromGraphQL(allProcesos),
    [allProcesos]
  );

  const employeeName =
    userData?.usuario?.nombre ??
    employees.find((e) => e.numero === selectedEmployeeNumero)?.nombre ??
    "—";

  const uniqueProjects = useMemo(() => {
    const projects = new Set<string>();
    timeline.intervals.forEach((itv) => {
      if (itv.proyecto && itv.proyecto !== "N/A") {
        projects.add(itv.proyecto);
      }
    });
    return Array.from(projects).sort();
  }, [timeline.intervals]);

  const filteredIntervals = useMemo(() => {
    if (!projectFilter) return timeline.intervals;
    return timeline.intervals.filter((itv) => itv.proyecto === projectFilter);
  }, [timeline.intervals, projectFilter]);

  const shiftDurationMin = 9 * 60;
  const utilizationPct =
    shiftDurationMin > 0
      ? Math.round((timeline.totalWorkMin / shiftDurationMin) * 100)
      : 0;

  if (usersLoading) return <LoadingState text="Cargando operadores..." />;
  if (usersError)
    return (
      <ErrorState
        message={`Error al cargar operadores: ${usersError.message}`}
      />
    );

  if (userLoading)
    return (
      <LoadingState
        text={`Cargando procesos de ${selectedEmployeeNumero}...`}
      />
    );
  if (userError)
    return (
      <ErrorState message={`Error al cargar procesos: ${userError.message}`} />
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-10 text-neutral-900 dark:from-black dark:via-neutral-950 dark:to-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Seguimiento diario por operador
            </motion.h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Actividades y métricas de desempeño.
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Filtro Operador */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" /> Operador
              </Label>
              <Select
                value={selectedEmployeeNumero}
                onValueChange={setSelectedEmployeeNumero}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.numero}>
                      {emp.numero} · {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Fecha (Desactivado/Dummy) */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1 opacity-50">
                <Calendar className="h-3 w-3" /> Fecha (Dummy)
              </Label>
              <Input
                type="date"
                className="w-40 opacity-50"
                value={date}
                disabled
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Resumen del día */}
        <section className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Resumen de procesos
              </CardTitle>
              <CardDescription>
                {selectedEmployeeNumero} · {employeeName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <SummaryChip
                  label="Minutos totales de procesos"
                  value={`${(timeline.totalWorkMin / 60).toFixed(2)} h`}
                  detail={`${timeline.totalWorkMin} min`}
                />

                <SummaryChip label="Pausa / comida" value={`N/A`} muted />
                <SummaryChip
                  label="Tiempo desconocido"
                  value={`N/A`}
                  warn={false}
                />
                <SummaryChip
                  label="Min extras (trabajados)"
                  value={`N/A`}
                  highlight={false}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Utilización aproximada (Cálculo teórico)</span>
                  <span className="font-medium">{utilizationPct}%</span>
                </div>
                <Progress value={utilizationPct} />
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Total de tiempo de procesos registrados contra una jornada de{" "}
                  {shiftDurationMin / 60} h.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bloque de “alertas” (Ahora es métricas adicionales) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Hourglass className="h-4 w-4 text-sky-500" />
                Métricas de desempeño
              </CardTitle>
              <CardDescription>
                Comparación de tiempo estimado vs. tiempo real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-neutral-500 dark:text-neutral-400">
                Las métricas de gaps/overtime no se pueden calcular solo con los
                procesos asignados. La tabla de abajo muestra la comparación por
                cada proceso.
              </p>

              <Separator />

              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <Timer className="h-3 w-3" />
                <span>
                  Solo se consideran procesos que tienen una hora de inicio
                  registrada.
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Línea de tiempo detallada */}
        <section>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Detalle de Procesos Asignados
              </CardTitle>
              <CardDescription>
                Procesos donde el operador ha registrado inicio o fin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtro de Proyecto */}
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-xs flex items-center gap-1">
                  Filtrar por Proyecto:
                </Label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todos los proyectos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los proyectos</SelectItem>
                    {uniqueProjects.map((proj) => (
                      <SelectItem key={proj} value={proj}>
                        {proj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin (Real / Actual)</TableHead>
                      <TableHead className="text-right">
                        Duración Real
                      </TableHead>
                      <TableHead className="text-right">
                        Duración Estimada
                      </TableHead>
                      <TableHead>Proceso</TableHead>
                      <TableHead>Work Order</TableHead>
                      <TableHead>WorkStation</TableHead>
                      <TableHead>Project</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIntervals.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-sm text-neutral-500"
                        >
                          No hay procesos registrados para este operador
                          {projectFilter
                            ? ` en el proyecto ${projectFilter}`
                            : ""}
                          .
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredIntervals.map((itv, idx) => {
                        const start = new Date(itv.start);
                        const end = new Date(itv.end);

                        let durationStyle = "";
                        if (itv.minutes > 0 && itv.tiempoEstimado > 0) {
                          if (itv.minutes < itv.tiempoEstimado) {
                            durationStyle = "text-emerald-600 font-medium";
                          } else if (itv.minutes > itv.tiempoEstimado * 1.1) {
                            durationStyle = "text-red-600 font-medium";
                          }
                        }

                        return (
                          <TableRow key={idx}>
                            <TableCell className="whitespace-nowrap">
                              {formatTime(start)}
                            </TableCell>

                            <TableCell className="whitespace-nowrap">
                              {itv.end === new Date().toISOString()
                                ? "En Curso"
                                : formatTime(end)}
                            </TableCell>

                            <TableCell
                              className={`text-right font-mono ${durationStyle}`}
                            >
                              {itv.minutes.toFixed(0)} min
                            </TableCell>

                            <TableCell className="text-right text-neutral-500 font-mono">
                              {itv.tiempoEstimado
                                ? `${itv.tiempoEstimado.toFixed(0)} min`
                                : "N/A"}
                            </TableCell>

                            <TableCell className="text-sm text-neutral-600 dark:text-neutral-300">
                              {itv.operacion}
                            </TableCell>

                            <TableCell className="text-sm text-neutral-600 dark:text-neutral-300">
                              {itv.operacion}
                            </TableCell>

                            <TableCell className="text-sm text-neutral-600 dark:text-neutral-300">
                              {itv.maquinaNombre}
                            </TableCell>

                            <TableCell className="text-sm text-neutral-600 dark:text-neutral-300">
                              {itv.proyecto}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

/* ============================
   Subcomponente de resumen (SummaryChip)
================================ */
function SummaryChip({
  label,
  value,
  detail,
  muted,
  warn,
  highlight,
}: {
  label: string;
  value: string;
  detail?: string;
  muted?: boolean;
  warn?: boolean;
  highlight?: boolean;
}) {
  let bg =
    "bg-neutral-50 border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-100";
  if (muted) {
    bg =
      "bg-neutral-100/70 border-neutral-200 text-neutral-700 dark:bg-neutral-900/70 dark:border-neutral-800 dark:text-neutral-300";
  }
  if (warn) {
    bg =
      "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/70 dark:text-amber-100";
  }
  if (highlight) {
    bg =
      "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/70 dark:text-emerald-100";
  }

  return (
    <div className={`rounded-xl border px-3 py-2 ${bg}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
      {detail && (
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
          {detail}
        </div>
      )}
    </div>
  );
}

/* ============================
   Componentes de Estado
================================ */

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-3 text-lg font-medium text-neutral-600 dark:text-neutral-300">
        <svg
          className="animate-spin h-6 w-6 text-indigo-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {text}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-3 p-6 border border-red-300 rounded-lg bg-red-50 text-red-800">
        <AlertTriangle className="h-6 w-6" />
        <p className="text-lg font-medium">Error de Carga</p>
        <p className="text-sm text-center">{message}</p>
      </div>
    </div>
  );
}
