import { useMemo, useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { format, startOfHour, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  Settings,
  Zap,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* --------------------------------- Interfaces -------------------------------- */

interface SesionTrabajoMaquina {
  id: string;
  horaInicio: string;
  horaFin: string | null;
  tiempoEfectivo: number;
  tiempoTotal: number;
  pausas: Array<{
    id: string;
    duracionMinutos: number;
    motivo: string;
  }>;
  usuario: {
    nombre: string;
    numero: string;
  };
  procesoOp: {
    tiempoEstimado: number | null;
    operacion: {
      operacion: string;
      proyecto: { proyecto: string } | null;
    };
  };
}

interface GetMaquinaData {
  maquina: {
    id: string;
    nombre: string;
    historialSesiones: SesionTrabajoMaquina[];
  } | null;
}

interface GetMaquinasListData {
  maquinas: Array<{
    id: string;
    nombre: string;
  }>;
}

type IntervalMaquina = {
  start: string;
  end: string;
  minutes: number;
  operadorNombre: string;
  operadorNumero: string;
  operacion: string;
  proyecto: string;
  tiempoEstimado: number;
  pausas: Array<{ duracionMinutos: number; motivo: string }>;
};

/* --------------------------------- Queries -------------------------------- */

const GET_MAQUINAS_LIST = gql`
  query GetMaquinasList {
    maquinas {
      id
      nombre
    }
  }
`;

const GET_HISTORIAL_MAQUINA = gql`
  query GetHistorialMaquina($id: ID!) {
    maquina(id: $id) {
      id
      nombre
      historialSesiones {
        id
        horaInicio
        horaFin
        tiempoEfectivo
        tiempoTotal
        pausas {
          id
          duracionMinutos
          motivo
        }
        usuario {
          nombre
          numero
        }
        procesoOp {
          tiempoEstimado
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

/* --------------------------------- Componente -------------------------------- */

export default function LavorMaquinaPage() {
  const [selectedMaquinaId, setSelectedMaquinaId] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: listData } = useQuery<GetMaquinasListData>(GET_MAQUINAS_LIST);

  const { data: maquinaData } = useQuery<GetMaquinaData>(
    GET_HISTORIAL_MAQUINA,
    {
      variables: { id: selectedMaquinaId },
      skip: !selectedMaquinaId,
    },
  );

  const timelineData = useMemo(() => {
    const sesiones = maquinaData?.maquina?.historialSesiones;
    if (!sesiones || sesiones.length === 0)
      return { intervals: [], totalWorkMin: 0, totalEstMin: 0, chartData: [] };

    const intervals: IntervalMaquina[] = [];
    let totalWorkMin = 0;
    let totalEstMin = 0;

    const hourBuckets: Record<string, number> = {};
    for (let i = 6; i <= 22; i++) {
      hourBuckets[`${i.toString().padStart(2, "0")}:00`] = 0;
    }

    sesiones.forEach((sesion) => {
      const start = new Date(sesion.horaInicio);
      const end = sesion.horaFin ? new Date(sesion.horaFin) : new Date();

      const minutes = Math.round(sesion.tiempoEfectivo);
      const estimado = sesion.procesoOp.tiempoEstimado ?? 0;

      if (minutes >= 0) {
        intervals.push({
          start: sesion.horaInicio,
          end: sesion.horaFin ?? end.toISOString(),
          minutes,
          operadorNombre: sesion.usuario.nombre,
          operadorNumero: sesion.usuario.numero,
          operacion: sesion.procesoOp.operacion.operacion,
          proyecto: sesion.procesoOp.operacion.proyecto?.proyecto ?? "N/A",
          tiempoEstimado: estimado,
          pausas: sesion.pausas.map((p) => ({
            duracionMinutos: p.duracionMinutos,
            motivo: p.motivo,
          })),
        });

        totalWorkMin += minutes;
        totalEstMin += estimado;

        // Distribución horaria
        let cursor = new Date(start);
        while (cursor < end) {
          const hourKey = format(cursor, "HH:00");
          if (hourBuckets[hourKey] !== undefined) {
            const nextHour = addHours(startOfHour(cursor), 1);
            const limit = end < nextHour ? end : nextHour;
            const diff = Math.max(
              0,
              (limit.getTime() - cursor.getTime()) / 60000,
            );
            hourBuckets[hourKey] += diff;
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
  }, [maquinaData]);

  const eficienciaGlobal =
    timelineData.totalWorkMin > 0
      ? Math.round((timelineData.totalEstMin / timelineData.totalWorkMin) * 100)
      : 0;

  const totalOperadores = useMemo(() => {
    return new Set(timelineData.intervals.map((i) => i.operadorNumero)).size;
  }, [timelineData.intervals]);

  function formatDuration(mins: number) {
    const r = Math.round(mins);
    if (r < 60) return `${r}m`;
    return `${Math.floor(r / 60)}h ${r % 60}m`;
  }

  const totalPages = Math.ceil(timelineData.intervals.length / itemsPerPage);
  const paginatedIntervals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return timelineData.intervals.slice(start, start + itemsPerPage);
  }, [timelineData.intervals, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMaquinaId]);

  return (
    <div className="min-h-screen bg-neutral-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Rendimiento por Máquina
            </h1>
            <p className="text-sm text-neutral-500">
              Historial de uso y eficiencia del equipo.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Máquina</Label>
              <Select
                value={selectedMaquinaId}
                onValueChange={setSelectedMaquinaId}
              >
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {listData?.maquinas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-52 justify-start font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : "Elegir día"}
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
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" /> Capacidad Utilizada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <SummaryChip
                  label="Tiempo Activa"
                  value={formatDuration(timelineData.totalWorkMin)}
                  highlight
                />
                <SummaryChip
                  label="Eficiencia"
                  value={`${eficienciaGlobal}%`}
                  warn={eficienciaGlobal < 80}
                />
                <SummaryChip
                  label="Operadores"
                  value={totalOperadores.toString()}
                />
              </div>
              <Progress
                value={(timelineData.totalWorkMin / 540) * 100}
                className="h-2"
              />
              <p className="text-[10px] text-neutral-400 text-center uppercase tracking-tighter">
                Saturación basada en turno de 9h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Intensidad de Uso
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
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Log de Actividades</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Reporte Técnico
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Proyecto / OT</TableHead>
                  <TableHead className="text-center">Estimado</TableHead>
                  <TableHead className="text-center">Real (Neto)</TableHead>
                  <TableHead className="text-center">Dif.</TableHead>
                  <TableHead className="text-center">Pausas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIntervals?.map((itv, i) => {
                  const totalPausas = itv.pausas.reduce(
                    (acc, p) => acc + p.duracionMinutos,
                    0,
                  );
                  const diff = itv.minutes - itv.tiempoEstimado;
                  const isOver = diff > 0;
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-[10px]">
                        {format(new Date(itv.start), "HH:mm")} -{" "}
                        {itv.end === new Date().toISOString()
                          ? "..."
                          : format(new Date(itv.end), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase">
                            {itv.operadorNombre}
                          </span>
                          <span className="text-[9px] text-neutral-400">
                            ID: {itv.operadorNumero}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{itv.proyecto}</div>
                        <div className="text-neutral-500">{itv.operacion}</div>
                      </TableCell>
                      <TableCell className="text-center text-neutral-400 text-xs">
                        {itv.tiempoEstimado > 0
                          ? formatDuration(itv.tiempoEstimado)
                          : "—"}
                      </TableCell>

                      {/* Columna: Real (Neto) */}
                      <TableCell className="text-center">
                        <div className="flex flex-row items-center justify-center gap-2">
                          <span
                            className={cn(
                              "font-bold text-xs",
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
                            <Badge className="bg-amber-500 text-white text-[9px] h-4">
                              ¡REVISAR!
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Columna: Diferencia */}
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
                          <span className="text-neutral-300 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">
                        {totalPausas > 0 ? (
                          formatDuration(totalPausas)
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, highlight, warn }: any) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        highlight && "bg-amber-50 border-amber-200",
        warn && "bg-red-50 border-red-200",
      )}
    >
      <div className="text-[10px] uppercase font-bold opacity-70 text-neutral-500">
        {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
