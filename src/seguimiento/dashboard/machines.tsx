import React, { useEffect, useMemo, useState } from "react";
import { gql, NetworkStatus } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

// -------------------------------
// Tipos y utilidades
// -------------------------------
type MachineStatus = "running" | "idle" | "maintenance" | "paused";

type Machine = {
  id: string;
  name: string;
  piece?: string | null;
  operator?: string | null;
  status: MachineStatus;
  startedAt?: string | null;
  cycleTargetMin?: number;
  operationId?: string;
  area: string;
};

type GetProcesosOperacionQuery = {
  procesosOperacion: Array<{
    id: string;
    operacion: { operacion: string };
    maquina: { nombre: string } | null;
    usuario: {
      nombre: string;
      area: { nombre: string };
    } | null;
    proceso: { nombre: string } | null;
    estado: string;
    tiempoEstimado: number;
    horaInicio?: string | null;
  }>;
};

function minsSince(ts?: string | null) {
  if (!ts) return 0;
  const diffMs = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function formatDuration(totalMinutes: number): string {
  const roundedMins = Math.round(totalMinutes);
  if (roundedMins < 60) return `${roundedMins}m`;
  const hours = Math.floor(roundedMins / 60);
  const mins = roundedMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function barPct(elapsed: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((elapsed / target) * 100));
}

type TimingLevel = "on_time" | "over_25" | "over_50" | "over_50_plus";

function getTimingLevel(elapsed: number, target: number): TimingLevel {
  if (!target || target <= 0) return "on_time";
  const ratio = elapsed / target;
  if (ratio <= 1) return "on_time";
  if (ratio <= 1.25) return "over_25";
  if (ratio <= 1.5) return "over_50";
  return "over_50_plus";
}

function statusColor(machine: Machine) {
  if (machine.status === "paused")
    return {
      bg: "bg-orange-50",
      border: "border-orange-200",
      dot: "bg-orange-500",
      text: "text-orange-700",
      bar: "bg-orange-500",
    };
  if (machine.status === "maintenance")
    return {
      bg: "bg-sky-50",
      border: "border-sky-200",
      dot: "bg-sky-500",
      text: "text-sky-700",
      bar: "bg-sky-500",
    };
  if (machine.status === "idle")
    return {
      bg: "bg-slate-50",
      border: "border-slate-200",
      dot: "bg-slate-400",
      text: "text-slate-700",
      bar: "bg-slate-500",
    };

  // running -> thresholds por TEF
  const elapsed = minsSince(machine.startedAt);
  const X = machine.cycleTargetMin ?? 30;
  const level = getTimingLevel(elapsed, X);
  if (level === "over_50_plus")
    return {
      bg: "bg-rose-100",
      border: "border-rose-300",
      dot: "bg-rose-800",
      text: "text-rose-800",
      bar: "bg-rose-800",
    };
  if (level === "over_50")
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-500",
      text: "text-red-700",
      bar: "bg-red-500",
    };
  if (level === "over_25")
    return {
      bg: "bg-amber-50",
      border: "border-amber-200",
      dot: "bg-amber-500",
      text: "text-amber-700",
      bar: "bg-amber-500",
    };
  return {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  };
}

// -------------------------------
// -------------------------------
// Componente principal de página
// -------------------------------
export default function MaquinasDashboardPage() {
  const GET_DATOS = gql`
    query GetProcesosOperacion {
      procesosOperacion {
        id
        operacion {
          operacion
        }
        maquina {
          nombre
        }
        usuario {
          nombre
          area {
            nombre
          }
        }
        proceso {
          nombre
        }
        estado
        tiempoEstimado
        horaInicio
      }
    }
  `;

  const { data, refetch, networkStatus } = useQuery<GetProcesosOperacionQuery>(
    GET_DATOS,
    {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    },
  );

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MachineStatus>(
    "all",
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => refetch(), 30000);
    return () => clearInterval(t);
  }, [refetch]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const machines = useMemo(() => {
    if (!data?.procesosOperacion) return [];
    const activeStatuses = ["in_progress", "paused", "maintenance", "idle"];
    return data.procesosOperacion
      .filter(
        (item) =>
          item?.maquina?.nombre &&
          activeStatuses.includes(item.estado?.toLowerCase() || "idle"),
      )
      .map((item) => ({
        id: item.id,
        name: item.maquina!.nombre,
        piece: item.proceso?.nombre || null,
        operator: item.usuario?.nombre || null,
        status: (item.estado.toLowerCase() === "in_progress"
          ? "running"
          : item.estado.toLowerCase()) as MachineStatus,
        startedAt: item.horaInicio || null,
        cycleTargetMin: item.tiempoEstimado,
        operationId: item.operacion?.operacion || "S/N",
        area: item.usuario?.area?.nombre || "General",
      }));
  }, [data, tick]);

  // Filtrado
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return machines.filter((m) => {
      const okStatus =
        statusFilter === "all" ? true : m.status === statusFilter;
      const okTerm =
        term.length === 0 ||
        m.name.toLowerCase().includes(term) ||
        (m.piece ?? "").toLowerCase().includes(term) ||
        (m.operator ?? "").toLowerCase().includes(term);
      return okStatus && okTerm;
    });
  }, [machines, q, statusFilter]);

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard de Máquinas
          </h1>
          <div className="h-4">
            <div
              className={cn(
                "flex items-center gap-2 text-[10px] font-bold text-blue-600 transition-all duration-500",
                isRefetching
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-1",
              )}
            >
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Sincronizando datos en vivo...</span>
            </div>
          </div>
        </header>

        <div className="mb-6 flex flex-col md:flex-row gap-3">
          <Input
            className="flex-1 bg-white"
            placeholder="Buscar máquina, pieza u operador..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger className="w-full md:w-56 bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="running">Trabajando</SelectItem>
              <SelectItem value="idle">Inactivos</SelectItem>
              <SelectItem value="maintenance">Mantenimiento</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 flex flex-wrap gap-4 text-[10px] font-bold text-neutral-400">
          <LegendDot className="bg-emerald-500" label="En Tiempo" />
          <LegendDot className="bg-amber-500" label="Sobre TEF < 125%" />
          <LegendDot className="bg-red-500" label="Excedente < 150%" />
          <LegendDot className="bg-rose-800" label="Crítico > 150%" />
          <LegendDot className="bg-slate-400" label="Inactivo" />
          <LegendDot className="bg-orange-500" label="Pausado" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {filtered.map((m) => (
            <MachineCard key={m.id} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------
// Subcomponentes
// -------------------------------
function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function MachineCard({ m }: { m: Machine }) {
  const elapsed = minsSince(m.startedAt);
  const X = m.cycleTargetMin ?? 30;
  const pct = barPct(elapsed, X);
  const color = statusColor(m);
  const exceededMin = Math.max(0, elapsed - X);
  const timingLevel = getTimingLevel(elapsed, X);

  return (
    <Card
      className={cn("border shadow-sm transition-all", color.border, color.bg)}
    >
      <CardHeader className="p-3 pb-2 border-b bg-white/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold truncate">
            {m.name}
          </CardTitle>
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              color.dot,
              m.status === "running" && "animate-pulse",
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2 text-[12px]">
        <StackedRow label="Pieza">
          {m.piece ? (
            <strong>{m.piece}</strong>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </StackedRow>
        <StackedRow label="Operador">
          {m.operator ? (
            m.operator.toLowerCase()
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </StackedRow>
        <Row label="Inicio">
          {m.status === "running" && m.startedAt ? (
            new Date(m.startedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        <Row
          label={
            <AcronymLabel
              short="TRF"
              description="Tiempo real desde que inició el trabajo."
            />
          }
        >
          {m.status === "running" ? (
            formatDuration(elapsed)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        <Row
          label={
            <AcronymLabel
              short="TEF"
              description="Tiempo estimado de fabricación por planeación."
            />
          }
        >
          {formatDuration(X)}
        </Row>

        {m.status === "running" && X > 0 && (
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-1000", color.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className={cn(
                "mt-1 text-[10px] font-medium leading-tight",
                color.text,
              )}
            >
              {timingLevel === "on_time" && (
                <span className="animate-pulse">
                  Dentro del tiempo estimado
                </span>
              )}
              {timingLevel === "over_25" && (
                <span>Superó TEF por {exceededMin}m</span>
              )}
              {timingLevel === "over_50" && <span>Excedió 25% del TEF</span>}
              {timingLevel === "over_50_plus" && (
                <span className="font-bold">Exceso crítico (+50%)</span>
              )}
            </div>
          </div>
        )}

        <div className="pt-1">
          <Badge
            className={cn(
              "text-[9px] tracking-tighter h-5",
              m.status === "running"
                ? "bg-emerald-600"
                : m.status === "paused"
                  ? "bg-orange-600"
                  : m.status === "maintenance"
                    ? "bg-sky-600"
                    : "bg-slate-500",
            )}
          >
            {m.status === "running" ? "Trabajando" : m.status.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-neutral-400 font-medium text-[9px]">{label}</span>
      <div className="text-right font-bold text-neutral-700">{children}</div>
    </div>
  );
}

function StackedRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-[9px] font-bold text-neutral-400 tracking-tighter">
        {label}
      </div>
      <div className="truncate text-neutral-800 leading-tight">{children}</div>
    </div>
  );
}

function AcronymLabel({
  short,
  description,
}: {
  short: string;
  description: string;
}) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        className="underline decoration-dotted underline-offset-2"
      >
        {short}
      </button>
      <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-56 rounded-md border bg-white p-2 text-[10px] leading-snug text-foreground shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {description}
      </span>
    </span>
  );
}
