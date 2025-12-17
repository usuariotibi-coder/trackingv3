import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { motion } from "framer-motion";
//import { format, startOfHour, addHours, isWithinInterval } from "date-fns";
import { format, startOfHour, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Importación de Recharts para la gráfica
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Calendar as CalendarIcon,
  //AlertTriangle,
  Activity,
  Timer,
  Hourglass,
  // RefreshCcw,
} from "lucide-react";

/* ============================
   Tipos GraphQL y Respuesta
================================ */

type ProcesoAsignado = {
  proceso: { nombre: string };
  tiempoEstimado?: number | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  tiempoRealCalculado?: number | null;
  operacion: {
    operacion: string;
    proyecto?: { proyecto: string } | null;
  };
  maquina?: { nombre: string } | null;
};

interface GetUsuariosData {
  usuarios: { id: string; numero: string; nombre: string }[];
}

interface GetUserData {
  usuario: {
    id: string;
    nombre: string;
    procesosAsignados: ProcesoAsignado[];
  } | null;
}

type Interval = {
  start: string;
  end: string;
  minutes: number;
  kind: "work" | "break" | "unknown";
  maquinaNombre: string;
  operacion: string;
  proyecto: string;
  tiempoEstimado: number;
};

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
  query GetUsuario($numero: String!, $fecha: Date) {
    usuario(numero: $numero, fecha: $fecha) {
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
   Utilidades de Tiempo
================================ */

function diffMinutes(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 60000);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/* ============================
   Componente Principal
================================ */

export default function LavorPage() {
  const {
    data: usersData,
    //loading: usersLoading,
    //error: usersError,
  } = useQuery<GetUsuariosData>(GET_USUARIOS);

  const [currentSelectedNumero, setCurrentSelectedNumero] =
    useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("ALL_PROJECTS");
  const [date, setDate] = useState<Date | undefined>(new Date());

  const { employees, defaultNumero } = useMemo(() => {
    if (usersData?.usuarios) {
      const validUsers = usersData.usuarios.filter(
        (emp) => emp.numero && emp.numero !== ""
      );
      return {
        employees: validUsers,
        defaultNumero: validUsers.length > 0 ? validUsers[0].numero : "",
      };
    }
    return { employees: [], defaultNumero: "" };
  }, [usersData]);

  const selectedEmployeeNumero = currentSelectedNumero || defaultNumero;

  const {
    data: userData,
    //loading: userLoading,
    //error: userError,
  } = useQuery<GetUserData>(GET_USUARIO, {
    variables: {
      numero: selectedEmployeeNumero,
      fecha: date ? format(date, "yyyy-MM-dd") : null,
    },
    skip: !selectedEmployeeNumero,
  });

  const allProcesos = userData?.usuario?.procesosAsignados as
    | ProcesoAsignado[]
    | undefined;

  // 1. Construir Timeline y Métricas por Hora
  const timelineData = useMemo(() => {
    if (!allProcesos || allProcesos.length === 0)
      return { intervals: [], totalWorkMin: 0, chartData: [] };

    const intervals: Interval[] = [];
    let totalWorkMin = 0;

    // Inicializar cubetas de horas (6 AM a 10 PM)
    const hourBuckets: Record<string, number> = {};
    for (let i = 6; i <= 22; i++) {
      hourBuckets[`${i.toString().padStart(2, "0")}:00`] = 0;
    }

    allProcesos
      .filter((p) => p.horaInicio)
      .forEach((proc) => {
        const start = new Date(proc.horaInicio!);
        const end = proc.horaFin ? new Date(proc.horaFin) : new Date();
        const minutes = Math.round(
          proc.tiempoRealCalculado ?? diffMinutes(start, end)
        );

        if (minutes > 0) {
          intervals.push({
            start: proc.horaInicio!,
            end: proc.horaFin ?? end.toISOString(),
            minutes,
            kind: "work",
            maquinaNombre: proc.maquina?.nombre ?? "N/A",
            operacion: proc.operacion.operacion ?? "N/A",
            proyecto: proc.operacion.proyecto?.proyecto ?? "N/A",
            tiempoEstimado: proc.tiempoEstimado ?? 0,
          });
          totalWorkMin += minutes;

          // Repartir minutos en las cubetas de horas
          let cursor = new Date(start);
          while (cursor < end) {
            const hourKey = format(cursor, "HH:00");
            const nextHour = addHours(startOfHour(cursor), 1);
            const limit = end < nextHour ? end : nextHour;
            const minsInThisHour = diffMinutes(cursor, limit);

            if (hourBuckets[hourKey] !== undefined) {
              hourBuckets[hourKey] += minsInThisHour;
            }
            cursor = nextHour;
          }
        }
      });

    const chartData = Object.entries(hourBuckets).map(([hour, mins]) => ({
      hour,
      minutos: Math.round(mins),
    }));

    intervals.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    return { intervals, totalWorkMin, chartData };
  }, [allProcesos]);

  const filteredIntervals = useMemo(() => {
    if (projectFilter === "ALL_PROJECTS") return timelineData.intervals;
    return timelineData.intervals.filter(
      (itv) => itv.proyecto === projectFilter
    );
  }, [timelineData.intervals, projectFilter]);

  // UI rendering ... (omitido por brevedad, se mantiene igual al anterior hasta la sección de cards)

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-10 text-neutral-900 dark:from-black dark:via-neutral-950 dark:to-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Seguimiento por Operador
            </motion.h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Panel de métricas y tiempos reales.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3" /> Operador
              </Label>
              <Select
                value={selectedEmployeeNumero}
                onValueChange={setCurrentSelectedNumero}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Seleccione Operador" />
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

            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" /> Fecha
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-52 justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={es}
                  />
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setDate(new Date())}
                    >
                      Ir a Hoy
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" /> Resumen del Día
              </CardTitle>
              <CardDescription>
                {selectedEmployeeNumero} ·{" "}
                {date ? format(date, "dd MMM yyyy", { locale: es }) : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <SummaryChip
                  label="Min. Trabajados"
                  value={`${timelineData.totalWorkMin}m`}
                  detail={`${(timelineData.totalWorkMin / 60).toFixed(1)}h`}
                  highlight
                />
                <SummaryChip label="Eficiencia" value="92%" warn={false} />
                <SummaryChip label="Gaps" value="15m" muted />
                <SummaryChip
                  label="Procesos"
                  value={timelineData.intervals.length.toString()}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Utilización (Meta: 540 min)</span>
                  <span className="font-medium">
                    {Math.round((timelineData.totalWorkMin / 540) * 100)}%
                  </span>
                </div>
                <Progress value={(timelineData.totalWorkMin / 540) * 100} />
              </div>
            </CardContent>
          </Card>

          {/* Card de Desempeño con Gráfica */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Hourglass className="h-4 w-4 text-blue-500" /> Actividad por
                Hora
              </CardTitle>
              <CardDescription>
                Minutos de trabajo registrados por bloque horario.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="h-[180px] w-full px-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData.chartData}>
                    <defs>
                      <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f0f0f0"
                    />
                    <XAxis
                      dataKey="hour"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={2}
                    />
                    <YAxis hide domain={[0, 60]} />
                    <Tooltip
                      contentStyle={{
                        fontSize: "12px",
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value) => [`${value} min`, "Actividad"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="minutos"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMin)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="p-4 pt-0 text-[10px] text-neutral-500 flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Máximo: 60 min/hora
                </span>
                <span>Turno 06:00 - 22:00</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sección de Tabla Detallada */}
        <section>
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">
                  Detalle de Operaciones
                </CardTitle>
                <CardDescription>
                  Procesos registrados en la fecha seleccionada.
                </CardDescription>
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_PROJECTS">
                    Todos los proyectos
                  </SelectItem>
                  {/* Se asume que uniqueProjects se extrae de timelineData.intervals */}
                  {Array.from(
                    new Set(timelineData.intervals.map((i) => i.proyecto))
                  )
                    .sort()
                    .map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Inicio</TableHead>
                      <TableHead className="text-center">Fin</TableHead>
                      <TableHead className="text-center">Estimado</TableHead>
                      <TableHead className="text-center">Real</TableHead>
                      <TableHead className="text-center">Proceso</TableHead>
                      <TableHead className="text-center">Máquina</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIntervals.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-neutral-500"
                        >
                          Sin registros para esta selección.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredIntervals.map((itv, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-center font-mono text-xs">
                            {formatTime(new Date(itv.start))}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {itv.end === new Date().toISOString()
                              ? "En curso"
                              : formatTime(new Date(itv.end))}
                          </TableCell>
                          <TableCell className="text-center text-neutral-400 font-mono">
                            {itv.tiempoEstimado}m
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            {itv.minutes}m
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium">
                            {itv.operacion}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {itv.maquinaNombre}
                          </TableCell>
                        </TableRow>
                      ))
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

// Subcomponentes auxiliares (SummaryChip, LoadingState, ErrorState) ...
function SummaryChip({ label, value, detail, muted, warn, highlight }: any) {
  let bg =
    "bg-neutral-50 border-neutral-200 text-neutral-800 dark:bg-neutral-900";
  if (muted)
    bg =
      "bg-neutral-100/70 border-neutral-200 text-neutral-700 dark:bg-neutral-900/70";
  if (warn) bg = "bg-amber-50 border-amber-200 text-amber-800";
  if (highlight) bg = "bg-blue-50 border-blue-200 text-blue-800";

  return (
    <div className={`rounded-xl border px-3 py-2 ${bg}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
      {detail && <div className="text-[10px] opacity-60">{detail}</div>}
    </div>
  );
}

// function LoadingState({ text }: { text: string }) {
//   return (
//     <div className="flex h-screen items-center justify-center">
//       <div className="flex flex-col items-center space-y-4">
//         <RefreshCcw className="h-8 w-8 animate-spin text-blue-500" />
//         <p className="text-neutral-500 font-medium">{text}</p>
//       </div>
//     </div>
//   );
// }

// function ErrorState({ message }: { message: string }) {
//   return (
//     <div className="flex h-screen items-center justify-center">
//       <div className="flex flex-col items-center space-y-3 p-6 border border-red-200 rounded-xl bg-red-50 text-red-800">
//         <AlertTriangle className="h-8 w-8" />
//         <p className="font-bold">Error de Datos</p>
//         <p className="text-sm max-w-xs text-center">{message}</p>
//       </div>
//     </div>
//   );
// }
