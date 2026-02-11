import { useEffect, useMemo, useState } from "react";
import { gql, NetworkStatus } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent } from "@/components/ui/card";
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

// -------------------------------
// 1. Tipos y Utilerías
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

function fmtElapsed(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h <= 0 ? `${m}m` : `${h}h ${m}m`;
}

function barPct(elapsed: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((elapsed / target) * 100));
}

function mapStatus(serverStatus: string): MachineStatus {
  const s = serverStatus.toLowerCase();
  return s === "paused" ? "paused" : s === "in_progress" ? "running" : "idle";
}

function statusColor(machine: Machine) {
  if (machine.status === "paused")
    return {
      bg: "bg-orange-50",
      border: "border-orange-200",
      dot: "bg-orange-500",
      bar: "bg-orange-500",
      text: "text-orange-700",
    };

  const elapsed = minsSince(machine.startedAt);
  const X = machine.cycleTargetMin ?? 30;

  if (elapsed > 2 * X)
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-500",
      bar: "bg-red-500",
      text: "text-red-700",
    };
  if (elapsed > X)
    return {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      dot: "bg-yellow-500",
      bar: "bg-yellow-500",
      text: "text-yellow-700",
    };

  return {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  };
}

// -------------------------------
// 2. Componente Principal
// -------------------------------
export default function MaquinasDashboard() {
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

  const { loading, data, refetch, networkStatus } =
    useQuery<GetProcesosOperacionQuery>(GET_DATOS, {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    });

  const isRefetching = networkStatus === NetworkStatus.refetch;
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MachineStatus>(
    "all",
  );

  useEffect(() => {
    const t = setInterval(() => refetch(), 30000);
    return () => clearInterval(t);
  }, [refetch]);

  const machines = useMemo(() => {
    if (!data?.procesosOperacion) return [];
    const activeStatuses = ["in_progress", "paused"];
    return data.procesosOperacion
      .filter(
        (item) =>
          item?.maquina?.nombre &&
          activeStatuses.includes(item.estado?.toLowerCase()),
      )
      .map((item) => ({
        id: item.id,
        name: item.maquina!.nombre,
        piece: item.proceso?.nombre || null,
        operator: item.usuario?.nombre || null,
        status: mapStatus(item.estado),
        startedAt: item.horaInicio || null,
        cycleTargetMin: item.tiempoEstimado,
        operationId: item.operacion?.operacion || "S/N",
        area: item.usuario?.area?.nombre || "General",
      }));
  }, [data]);

  const groupedMachines = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = machines.filter((m) => {
      const okStatus = statusFilter === "all" || m.status === statusFilter;
      const okTerm =
        !term ||
        m.name.toLowerCase().includes(term) ||
        (m.operator ?? "").toLowerCase().includes(term);
      return okStatus && okTerm;
    });

    return filtered.reduce(
      (acc, m) => {
        if (!acc[m.area]) acc[m.area] = [];
        acc[m.area].push(m);
        return acc;
      },
      {} as Record<string, Machine[]>,
    );
  }, [machines, q, statusFilter]);

  if (loading && !isRefetching)
    return (
      <div className="p-8 text-center font-sans">Cargando Dashboard...</div>
    );

  return (
    <div className="min-h-screen bg-neutral-50 p-4 font-sans">
      <header className="mb-6 max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight">
            Dashboard de Máquinas
          </h1>
          <div
            className={cn(
              "flex items-center gap-2 text-[10px] font-medium transition-opacity",
              isRefetching ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-blue-600 uppercase tracking-tighter">
              Actualizando datos...
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Input
            className="max-w-xs h-8 text-xs bg-white"
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger className="w-40 h-8 text-xs bg-white">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las activas</SelectItem>
              <SelectItem value="running">En Proceso</SelectItem>
              <SelectItem value="paused">Pausadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto space-y-10">
        {Object.entries(groupedMachines).map(([area, areaMachines]) => (
          <section key={area} className="space-y-3">
            <div className="flex items-center gap-3 border-b border-neutral-200 pb-1.5">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                {area}
              </h2>
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {areaMachines.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {areaMachines.map((m) => (
                <MachineCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// -------------------------------
// 3. Mini Card (Ajustada)
// -------------------------------
function MachineCard({ m }: { m: Machine }) {
  const elapsed = minsSince(m.startedAt);
  const target = m.cycleTargetMin ?? 0;
  const pct = barPct(elapsed, target);
  const color = statusColor(m);

  return (
    <Card
      className={cn(
        "border transition-all shadow-sm overflow-hidden",
        color.border,
        color.bg,
      )}
    >
      <div className="p-2 border-b bg-white/40 flex items-center justify-between">
        <span className="text-[10px] font-bold truncate uppercase tracking-tight">
          {m.name}
        </span>
        <span
          className={cn(
            "h-2 w-2 rounded-full shadow-sm",
            color.dot,
            m.status === "running" && "animate-pulse",
          )}
        />
      </div>

      <CardContent className="p-2.5 space-y-2 text-[10px]">
        <div className="flex justify-between items-center">
          <span className="text-neutral-400 font-medium">WO:</span>
          <span className="font-mono font-bold text-neutral-800">
            {m.operationId}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-neutral-400 font-medium">OP:</span>
          <span className="font-medium truncate max-w-[80px] text-right">
            {m.operator || "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5">
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-400 uppercase">
              Estimado
            </span>
            <span className="font-bold text-neutral-700">{target}m</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-neutral-400 uppercase">Real</span>
            <span
              className={cn(
                "font-bold",
                m.status === "paused" ? "text-orange-600" : "text-neutral-800",
              )}
            >
              {m.status === "running" ? fmtElapsed(elapsed) : "Pausado"}
            </span>
          </div>
        </div>

        {m.status === "running" && target > 0 && (
          <div className="space-y-1 pt-1">
            <div className="h-1 w-full rounded-full bg-black/5 overflow-hidden">
              <div
                className={cn("h-full transition-all duration-1000", color.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className={cn(
                "flex justify-between text-[9px] font-bold",
                color.text,
              )}
            >
              <span>PROGRESO</span>
              <span>{pct}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
