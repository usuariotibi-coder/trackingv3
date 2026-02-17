import React, { useEffect, useMemo, useState } from "react";
import { gql, NetworkStatus } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
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
import { sileo } from "sileo";

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

type GetMonitoreoMaquinasQuery = {
  maquinas: Array<{
    id: string;
    nombre: string;
    proceso: { nombre: string } | null;
    sesionActual: {
      // <-- Cambiado de Array a objeto único
      id: string;
      horaInicio?: string | null;
      usuario?: { nombre: string } | null;
      procesoOp?: {
        conteoActual?: number | null;
        tiempoEstimado?: number | null;
        operacion?: {
          operacion?: string | null;
          workorder?: {
            plano?: string | null;
            cantidad?: number | null;
          } | null;
        } | null;
      } | null;
      pausas: Array<{ id: string; horaFin: string | null }>;
    } | null;
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
  const X = machine.cycleTargetMin ?? 0;
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

export default function MaquinasDashboardPage() {
  const GET_DATOS = gql`
    query GetMonitoreoMaquinas {
      maquinas {
        id
        nombre
        proceso {
          nombre
        }
        sesionActual {
          id
          horaInicio
          usuario {
            nombre
          }
          procesoOp {
            tiempoEstimado
            tiempoRealCalculado
            conteoActual
            operacion {
              operacion
              workorder {
                plano
                cantidad
              }
            }
          }
          pausas {
            id
            horaFin
          }
        }
      }
    }
  `;

  const { data, loading, refetch, networkStatus } =
    useQuery<GetMonitoreoMaquinasQuery>(GET_DATOS, {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MachineStatus>(
    "all",
  );
  const [tick, setTick] = useState(0);

  const desiredOrder = [
    "corte",
    "escuadre",
    "programacion cnc",
    "maquinado cnc",
    "paileria",
    "pintura",
    "calidad",
    "almacen",
  ];

  useEffect(() => {
    const t = setInterval(() => refetch(), 30000);
    return () => clearInterval(t);
  }, [refetch]);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const machines = useMemo(() => {
    if (!data?.maquinas) return [];

    // Función de normalización idéntica a la que usas en Proyectos
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const mapped = data.maquinas.map((mc) => {
      const activeSession = mc.sesionActual ?? null;
      const isPaused = !!activeSession?.pausas?.some((p) => p.horaFin == null);
      const status: MachineStatus = activeSession
        ? isPaused
          ? "paused"
          : "running"
        : "idle";

      return {
        id: mc.id,
        name: mc.nombre,
        piece: activeSession?.procesoOp?.operacion?.operacion || null,
        operator: activeSession?.usuario?.nombre || null,
        status,
        startedAt: activeSession?.horaInicio || null,
        cycleTargetMin: activeSession?.procesoOp?.tiempoEstimado ?? undefined,
        operationId: activeSession?.procesoOp?.operacion?.operacion || "S/N",
        area: mc.proceso?.nombre || "General",
      };
    });

    // ORDENAR: Basado en desiredOrder
    return [...mapped].sort((a, b) => {
      const indexA = desiredOrder.findIndex(
        (d) => normalize(d) === normalize(a.area),
      );
      const indexB = desiredOrder.findIndex(
        (d) => normalize(d) === normalize(b.area),
      );

      // Si no se encuentra en la lista (index -1), se manda al final
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;

      // Si están en la misma área, ordenar alfabéticamente por nombre de máquina
      if (posA === posB) {
        return a.name.localeCompare(b.name);
      }
      return posA - posB;
    });
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

  const groupedMachines = useMemo(() => {
    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // 1. Agrupamos las máquinas filtradas por su área normalizada
    const groups: Record<string, typeof filtered> = {};

    filtered.forEach((m) => {
      const key = normalize(m.area);
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    // 2. Ordenamos las máquinas alfabéticamente dentro de cada grupo
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return groups;
  }, [filtered]);

  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    if (isRefetching || loading) {
      sileo.info({
        duration: 3000,
        title: "Actualizando",
        icon: (
          <RefreshCw className="flex items-center justify-center h-4 w-4 animate-spin" />
        ),
        description: "Sincronizando datos en vivo...",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    }
  }, [isRefetching, loading]);

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard de Máquinas
          </h1>
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

        <div className="mb-4 flex flex-wrap gap-4 text-[12px] font-bold text-neutral-400">
          <LegendDot className="bg-emerald-500" label="En Tiempo" />
          <LegendDot className="bg-amber-500" label="Sobre TEF < 125%" />
          <LegendDot className="bg-red-500" label="Excedente < 150%" />
          <LegendDot className="bg-rose-800" label="Crítico > 150%" />
          <LegendDot className="bg-slate-400" label="Inactivo" />
          <LegendDot className="bg-orange-500" label="Pausado" />
        </div>

        <div className="space-y-10">
          {desiredOrder.map((areaName) => {
            const key = normalize(areaName);
            const machinesInArea = groupedMachines[key];

            // Si no hay máquinas en esta área con los filtros actuales, no mostramos la sección
            if (!machinesInArea || machinesInArea.length === 0) return null;

            return (
              <section key={key} className="space-y-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
                    {areaName}
                  </h2>
                  <div className="h-px flex-1 bg-neutral-200" />
                  <Badge variant="outline" className="text-neutral-400">
                    {machinesInArea.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  {machinesInArea.map((m) => (
                    <MachineCard key={m.id} m={m} />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Sección para máquinas que no están en el desiredOrder */}
          {Object.keys(groupedMachines).some(
            (k) => !desiredOrder.map(normalize).includes(k),
          ) && (
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400">
                  Otros Procesos
                </h2>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {Object.entries(groupedMachines)
                  .filter(([k]) => !desiredOrder.map(normalize).includes(k))
                  .flatMap(([_, machines]) => machines)
                  .map((m) => (
                    <MachineCard key={m.id} m={m} />
                  ))}
              </div>
            </section>
          )}
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
  const X = m.cycleTargetMin ?? 0;
  const pct = barPct(elapsed, X);
  const color = statusColor(m);
  const exceededMin = X > 0 ? Math.max(0, elapsed - X) : 0;
  const timingLevel = getTimingLevel(elapsed, X);

  return (
    <Card
      className={cn(
        "border shadow-sm transition-all pt-2 pb-3",
        color.border,
        color.bg,
      )}
    >
      <CardContent className="pl-3 pr-3 pt-0 space-y-2 text-[12px]">
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
          {X > 0 ? (
            formatDuration(X)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
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
                "mt-1 text-[12px] font-medium leading-tight",
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
              "text-[12px] tracking-tighter h-5",
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
      <span className="text-neutral-400 font-medium text-[12px]">{label}</span>
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
      <div className="text-[12px] font-bold text-neutral-400 tracking-tighter">
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
      <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-56 rounded-md border bg-white p-2 text-[12px] leading-snug text-foreground shadow-xl opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {description}
      </span>
    </span>
  );
}
