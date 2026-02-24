import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
//import { motion } from "framer-motion";
import { format, startOfHour, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  //YAxis,
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
import {
  Calendar as CalendarIcon,
  Activity,
  Hourglass,
  Download,
} from "lucide-react";

interface SesionTrabajo {
  id: string;
  horaInicio: string;
  horaFin: string | null;
  tiempoEfectivo: number;
  tiempoTotal: number;
  observaciones: string | null;
  pausas: Array<{
    id: string;
    duracionMinutos: number;
    motivo: string;
  }>;
  maquina: { nombre: string };
  procesoOp: {
    tiempoEstimado: number | null;
    proceso: { nombre: string };
    operacion: {
      operacion: string;
      proyecto: { proyecto: string } | null;
    };
  };
}

interface GetUserData {
  usuario: {
    id: string;
    nombre: string;
    historialSesiones: SesionTrabajo[]; // Cambio de procesosAsignados a historialSesiones
  } | null;
}

type Interval = {
  start: string;
  end: string;
  minutes: number;
  kind: string;
  maquinaNombre: string;
  operacion: string;
  proyecto: string;
  tiempoEstimado: number;
  pausas: Array<{ duracionMinutos: number; motivo: string }>;
};

interface GetUsuariosData {
  usuarios: Array<{
    id: string;
    numero: string;
    nombre: string;
  }>;
}

const GET_USUARIO = gql`
  query GetUsuario($numero: String!) {
    usuario(numero: $numero) {
      id
      nombre
      historialSesiones {
        id
        horaInicio
        horaFin
        tiempoEfectivo
        tiempoTotal
        observaciones
        pausas {
          id
          duracionMinutos
          motivo
        }
        maquina {
          nombre
        }
        procesoOp {
          tiempoEstimado
          proceso {
            nombre
          }
          operacion {
            operacion
            proyecto {
              proyecto
            }
          }
        }
      }
    }
  }
`;

function diffMinutes(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 60000);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function LavorPage() {
  const { data: usersListData } = useQuery<GetUsuariosData>(gql`
    query GetUsuarios {
      usuarios {
        id
        numero
        nombre
      }
    }
  `);

  const [currentSelectedNumero, setCurrentSelectedNumero] =
    useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("ALL_PROJECTS");
  const [date, setDate] = useState<Date | undefined>(new Date());

  const { employees, defaultNumero } = useMemo(() => {
    const list = usersListData?.usuarios ?? [];
    return {
      employees: list,
      defaultNumero: list.length > 0 ? list[0].numero : "",
    };
  }, [usersListData]);

  const selectedEmployeeNumero = currentSelectedNumero || defaultNumero;

  const { data: userData } = useQuery<GetUserData>(GET_USUARIO, {
    variables: {
      numero: selectedEmployeeNumero,
    },
    skip: !selectedEmployeeNumero,
  });

  const timelineData = useMemo(() => {
    const sesiones = userData?.usuario?.historialSesiones;
    if (!sesiones || sesiones.length === 0)
      return { intervals: [], totalWorkMin: 0, totalEstMin: 0, chartData: [] };

    const intervals: Interval[] = [];
    let totalWorkMin = 0;
    let totalEstMin = 0;

    const hourBuckets: Record<string, number> = {};
    for (let i = 6; i <= 22; i++) {
      hourBuckets[`${i.toString().padStart(2, "0")}:00`] = 0;
    }

    sesiones.forEach((sesion) => {
      const start = new Date(sesion.horaInicio);
      const end = sesion.horaFin ? new Date(sesion.horaFin) : new Date();

      // Usamos el tiempo efectivo que descuenta pausas automáticamente
      const minutes = Math.round(sesion.tiempoEfectivo);
      const estimado = sesion.procesoOp.tiempoEstimado ?? 0;

      if (minutes >= 0) {
        const pausasArray = sesion.pausas ?? [];
        intervals.push({
          start: sesion.horaInicio,
          end: sesion.horaFin ?? end.toISOString(),
          minutes,
          kind: "work",
          maquinaNombre: sesion.maquina?.nombre ?? "N/A",
          operacion: sesion.procesoOp.operacion.operacion ?? "N/A",
          proyecto: sesion.procesoOp.operacion.proyecto?.proyecto ?? "N/A",
          tiempoEstimado: estimado,
          pausas: pausasArray.map((p) => ({
            duracionMinutos: p.duracionMinutos,
            motivo: p.motivo,
          })),
        });

        totalWorkMin += minutes;
        totalEstMin += estimado;

        // Lógica para la gráfica de distribución por horas
        let cursor = new Date(start);
        while (cursor < end) {
          const hourKey = format(cursor, "HH:00");
          if (hourBuckets[hourKey] !== undefined) {
            const nextHour = addHours(startOfHour(cursor), 1);
            const limit = end < nextHour ? end : nextHour;
            hourBuckets[hourKey] += diffMinutes(cursor, limit);
          }
          cursor = addHours(startOfHour(cursor), 1);
        }
      }
    });

    const chartData = Object.entries(hourBuckets).map(([hour, mins]) => ({
      hour,
      minutos: Math.round(mins),
    }));

    return { intervals, totalWorkMin, totalEstMin, chartData };
  }, [userData]);

  const filteredIntervals = useMemo(() => {
    if (projectFilter === "ALL_PROJECTS") return timelineData.intervals;
    return timelineData.intervals.filter(
      (itv) => itv.proyecto === projectFilter,
    );
  }, [timelineData.intervals, projectFilter]);

  // Función de Exportación a CSV
  const exportToCSV = () => {
    if (filteredIntervals.length === 0) return;
    const headers = [
      "Inicio",
      "Fin",
      "Estimado (min)",
      "Real (min)",
      "Diferencia (min)",
      "Eficiencia (%)",
      "Proceso",
      "Maquina",
      "Proyecto",
    ];
    const rows = filteredIntervals.map((itv) => {
      const diff = itv.minutes - itv.tiempoEstimado;
      const ef =
        itv.minutes > 0
          ? Math.round((itv.tiempoEstimado / itv.minutes) * 100)
          : 0;

      return [
        formatTime(new Date(itv.start)),
        itv.end === new Date().toISOString()
          ? "En curso"
          : formatTime(new Date(itv.end)),
        itv.tiempoEstimado,
        itv.minutes,
        diff, // Valor numérico para facilitar cálculos en Excel
        `${ef}%`,
        `"${itv.operacion}"`,
        `"${itv.maquinaNombre}"`,
        `"${itv.proyecto}"`,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Reporte_${selectedEmployeeNumero}_${format(
        date || new Date(),
        "yyyy-MM-dd",
      )}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const eficienciaGlobal =
    timelineData.totalWorkMin > 0
      ? Math.round((timelineData.totalEstMin / timelineData.totalWorkMin) * 100)
      : 0;

  function formatDuration(totalMinutes: number): string {
    const roundedMins = Math.round(totalMinutes);
    if (roundedMins < 60) return `${roundedMins}m`;
    const hours = Math.floor(roundedMins / 60);
    const mins = roundedMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Seguimiento por Operador
            </h1>
            <p className="text-sm text-neutral-500">
              Métricas de desempeño real en planta.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Operador</Label>
              <Select
                value={selectedEmployeeNumero}
                onValueChange={setCurrentSelectedNumero}
              >
                <SelectTrigger className="w-52">
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
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-52 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : "Fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[2fr,1.5fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex gap-2">
                <Activity className="h-4 w-4" /> Resumen Diario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <SummaryChip
                  label="Estimado"
                  value={formatDuration(timelineData.totalEstMin)}
                  muted
                />
                <SummaryChip
                  label="Trabajado"
                  value={formatDuration(timelineData.totalWorkMin)}
                  highlight
                />
                <SummaryChip
                  label="Eficiencia"
                  value={`${eficienciaGlobal}%`}
                  warn={eficienciaGlobal < 85}
                />
                <SummaryChip
                  label="WO procesadas"
                  value={timelineData.intervals.length.toString()}
                />
              </div>
              <Progress
                value={(timelineData.totalWorkMin / 540) * 100}
                className="h-2"
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex gap-2">
                <Hourglass className="h-4 w-4 text-blue-500" /> Distribución
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[180px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" fontSize={10} interval={2} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="minutos"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Detalle de Operaciones
              </CardTitle>
              <CardDescription>
                Historial de procesos filtrados.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_PROJECTS">Todos</SelectItem>
                  {Array.from(
                    new Set(timelineData.intervals.map((i) => i.proyecto)),
                  ).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={filteredIntervals.length === 0}
                className="gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Inicio</TableHead>
                  <TableHead className="text-center">Fin</TableHead>
                  <TableHead className="text-center">Estimado</TableHead>
                  <TableHead className="text-center">Real</TableHead>
                  <TableHead className="text-center">Dif.</TableHead>
                  <TableHead className="text-center">Pausas</TableHead>
                  <TableHead className="text-center">Proceso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIntervals.map((itv, i) => {
                  const totalPausasMin = itv.pausas.reduce(
                    (acc, p) => acc + p.duracionMinutos,
                    0,
                  );
                  const diff = itv.minutes - itv.tiempoEstimado;
                  const isOver = diff > 0;

                  return (
                    <TableRow key={i}>
                      <TableCell className="text-center font-mono text-xs">
                        {formatTime(new Date(itv.start))}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {itv.end === new Date().toISOString()
                          ? "En curso"
                          : formatTime(new Date(itv.end))}
                      </TableCell>
                      <TableCell className="text-center text-neutral-400 text-xs">
                        {formatDuration(itv.tiempoEstimado)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-row items-center justify-center gap-2">
                          <span
                            className={cn(
                              "font-bold text-xs whitespace-nowrap",
                              itv.minutes < 2
                                ? "text-amber-600"
                                : itv.minutes > itv.tiempoEstimado
                                  ? "text-red-500"
                                  : "text-emerald-500",
                            )}
                          >
                            {formatDuration(itv.minutes)}
                          </span>
                          {itv.minutes >= 0 && itv.minutes < 2 && (
                            <div className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase shadow-sm border border-amber-600 flex-none">
                              ¡Revisar!
                            </div>
                          )}
                          {itv.minutes >= 2 &&
                            itv.minutes < itv.tiempoEstimado && (
                              <div className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight border border-emerald-200 flex-none">
                                Alta Eficiencia
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {itv.tiempoEstimado > 0 ? (
                          <span
                            className={cn(
                              "font-mono text-xs font-bold",
                              isOver ? "text-red-500" : "text-emerald-500",
                            )}
                          >
                            {isOver
                              ? `+${formatDuration(diff)}`
                              : `-${formatDuration(Math.abs(diff))}`}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <div className="flex flex-row items-center justify-center gap-1">
                          {totalPausasMin > 0 ? (
                            <>
                              <span className="font-semibold text-xs">
                                {formatDuration(totalPausasMin)}
                              </span>
                              <span className="text-[10px] text-neutral-500 mt-1">
                                {itv.pausas.map((p, idx) => (
                                  <div key={idx}>{p.motivo}</div>
                                ))}
                              </span>
                            </>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {itv.operacion}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, highlight, warn, muted }: any) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        highlight && "bg-blue-50 border-blue-200",
        warn && "bg-red-50 border-red-200",
        muted && "bg-neutral-50",
      )}
    >
      <div className="text-[10px] uppercase font-bold opacity-70">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
