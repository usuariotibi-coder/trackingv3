import React, { useEffect, useMemo, useState } from "react";
import { gql } from "@apollo/client";
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

// -------------------------------
// 1. Tipos Locales y Utilerías
// -------------------------------
type MachineStatus = "running" | "idle" | "maintenance" | "paused";

type Machine = {
  id: string;
  name: string; // es el nombre de la maquina
  piece?: string | null; // es la operacion (proceso.nombre)
  operator?: string | null; // es el usuario (usuario.nombre)
  status: MachineStatus;
  startedAt?: string | null; // ISO string; si running (horaInicio)
  cycleTargetMin?: number; // X (minutos) por máquina (tiempoEstimado)
  operationId?: string;
};

// --- Tipos de GraphQL (Deducción basada en el query) ---
type GetProcesosOperacionQuery = {
  procesosOperacion: Array<{
    id: string; // El ID de la operación
    operacion: { operacion: string };
    maquina: { nombre: string };
    usuario: { nombre: string } | null;
    proceso: { nombre: string } | null;
    estado: string; // Estado del proceso (Ej: "in_progress", "pending", etc.)
    tiempoEstimado: number;
    horaInicio?: string | null;
  }>;
};

// El tipo ProcesosOpQueryResult ahora es un alias para la respuesta de la query
type ProcesosOpQueryResult = GetProcesosOperacionQuery;
// --- Fin Tipos de GraphQL ---

function minsSince(ts?: string | null) {
  if (!ts) return 0;
  const diffMs = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function fmtElapsed(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

function barPct(elapsed: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((elapsed / target) * 100));
}

function mapStatus(serverStatus: string): MachineStatus {
  const lowerStatus = serverStatus.toLowerCase();
  if (lowerStatus.includes("mantenimiento")) return "maintenance";
  if (lowerStatus.includes("paused") || lowerStatus.includes("pausado"))
    return "paused";
  if (
    lowerStatus.includes("activo") ||
    lowerStatus.includes("trabajando") ||
    lowerStatus.includes("in_progress")
  )
    return "running";
  return "idle"; // Mapea cualquier otro estado a inactivo
}

function statusColor(machine: Machine) {
  if (machine.status === "maintenance")
    return {
      bg: "bg-sky-100",
      border: "border-sky-200",
      dot: "bg-sky-500",
      text: "text-sky-700",
      bar: "bg-sky-500",
    };
  if (machine.status === "paused")
    return {
      bg: "bg-orange-50",
      border: "border-orange-200",
      dot: "bg-orange-500",
      text: "text-orange-700",
      bar: "bg-orange-500",
    };
  if (machine.status === "idle")
    return {
      bg: "bg-slate-50",
      border: "border-slate-200",
      dot: "bg-slate-400",
      text: "text-slate-700",
      bar: "bg-slate-500",
    };

  // running -> depende de thresholds
  const elapsed = minsSince(machine.startedAt);
  const X = machine.cycleTargetMin ?? 30; // default 30 min
  if (elapsed > 2 * X)
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      dot: "bg-red-500",
      text: "text-red-700",
      bar: "bg-red-500",
    };
  if (elapsed > X)
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
// 2. Función de Transformación de Datos (CON FILTRO POR ESTADO)
// -------------------------------
function transformDataToMachines(data: ProcesosOpQueryResult): Machine[] {
  if (!data?.procesosOperacion) return [];

  const activeStatuses = ["in_progress", "paused"];
  return data.procesosOperacion
    .filter(
      (item) => item && activeStatuses.includes(item.estado?.toLowerCase()),
    )
    .map((item) => {
      // Verificación de nulidad para evitar el error de 'nombre'
      const machineName = item.maquina?.nombre || "Máquina no asignada"; //
      const operatorName = item.usuario?.nombre || null; //
      const pieceName = item.proceso?.nombre || null; //

      const status = mapStatus(item.estado || "idle");

      return {
        id: item.id,
        name: machineName, // Ahora es seguro acceder
        piece: pieceName,
        operator: operatorName,
        status: status,
        startedAt: item.horaInicio || null,
        cycleTargetMin: item.tiempoEstimado,
        operationId: item.operacion?.operacion || "S/N", // Protección para operacion
      };
    });
}

// -------------------------------
// 3. Componente principal de página
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
        }
        proceso {
          nombre
        }
        estado
        tiempoEstimado
        horaInicio
        horaFin
        tiempoRealCalculado
      }
    }
  `;

  // El useQuery usa el tipo ProcesosOpQueryResult
  const { loading, error, data, refetch } =
    useQuery<ProcesosOpQueryResult>(GET_DATOS);

  // Transformar los datos del query al tipo Machine
  const machines = useMemo(() => {
    return data ? transformDataToMachines(data) : [];
  }, [data]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MachineStatus>(
    "all", // Cambiado el filtro inicial a 'running' ya que solo cargamos estos
  );
  const [tick, setTick] = useState(0); // para re-renderizar el elapsed cada 30s

  // Refresh de tiempos y data (refetch)
  useEffect(() => {
    const t = setInterval(() => {
      setTick((n) => n + 1);
      refetch(); // Refresca los datos reales del servidor
    }, 30000);
    return () => clearInterval(t);
  }, [refetch]);

  // Filtrado
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return machines.filter((m) => {
      // El filtro del dashboard se aplicará AHORA sobre los resultados ya filtrados por 'in_progress'
      const okStatus =
        statusFilter === "all" ? true : m.status === statusFilter;
      const okTerm =
        term.length === 0 ||
        m.name.toLowerCase().includes(term) ||
        (m.piece ?? "").toLowerCase().includes(term) ||
        (m.operator ?? "").toLowerCase().includes(term);
      return okStatus && okTerm;
    });
  }, [machines, q, statusFilter, tick]); // tick para forzar re-evaluación del tiempo transcurrido

  if (loading)
    return (
      <div className="p-8 text-center text-lg">
        Cargando Dashboard de Máquinas...
      </div>
    );
  if (error)
    return (
      <div className="p-8 text-center text-red-600">
        Error al cargar las máquinas: {error.message}
      </div>
    );

  // El resto del componente permanece igual...

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-7xl p-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard de Máquinas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vista en vivo de máquinas con pieza (operación), operador, inicio y
            tiempo transcurrido.
          </p>
        </header>

        {/* Controles */}
        <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1">
            <Input
              placeholder="Buscar por máquina, pieza u operador…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="w-full md:w-56">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos (Activas/Inactivas)</SelectItem>
                <SelectItem value="running">Trabajando</SelectItem>
                <SelectItem value="idle">Inactivos</SelectItem>
                <SelectItem value="maintenance">Mantenimiento</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <LegendDot className="bg-emerald-500" label="En tiempo (≤ X)" />
          <LegendDot className="bg-amber-500" label="Retraso leve (&gt; X)" />
          <LegendDot
            className="bg-red-500"
            label="Retraso severo (&gt; 2× X)"
          />
          <LegendDot className="bg-slate-400" label="Inactivo" />
          <LegendDot className="bg-sky-500" label="Mantenimiento" />
          <LegendDot className="bg-orange-500" label="Pausado" />
        </div>

        {/* Grid de máquinas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <MachineCard key={m.id} m={m} />
          ))}
        </div>

        {filtered.length === 0 && machines.length > 0 && (
          <div className="text-center text-slate-500 mt-8">
            No se encontraron máquinas con esos filtros.
          </div>
        )}
        {machines.length === 0 && !loading && (
          <div className="text-center text-slate-500 mt-8">
            No hay máquinas trabajando actualmente.
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------
// Subcomponentes (Mantenidos)
// -------------------------------
function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function MachineCard({ m }: { m: Machine }) {
  const elapsed = minsSince(m.startedAt);
  const X = m.cycleTargetMin ?? 30;
  const pct = barPct(elapsed, X);
  const color = statusColor(m);

  return (
    <Card className={`border ${color.border} ${color.bg}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Maquina: {m.name}
          </CardTitle>
          <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {/* <Row label="Operación">
          {m.piece ? (
            <strong>{m.piece}</strong>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row> */}
        <Row label="Operación (WO)">
          {m.operationId ? (
            <strong>{m.operationId}</strong>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        <Row label="Operador">
          {m.operator ? (
            m.operator
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
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
        <Row label="Transcurrido">
          {m.status === "running" ? (
            fmtElapsed(elapsed)
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        <Row label="Objetivo X">
          {X ? `${X} min` : <span className="text-muted-foreground">—</span>}
        </Row>

        {/* Barra de progreso solo cuando está corriendo y hay objetivo */}
        {m.status === "running" && X > 0 && (
          <div className="mt-2">
            <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className={`h-2 ${color.bar}`}
                style={{ width: `${pct}%` }}
                aria-label={`Progreso ${pct}%`}
              />
            </div>
            <div className={`mt-1 text-[11px] ${color.text}`}>{pct}% de X</div>
          </div>
        )}

        {/* Badges de estado */}
        <div className="pt-1">
          {m.status === "running" && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              Trabajando
            </Badge>
          )}
          {m.status === "idle" && (
            <Badge
              variant="outline"
              className="text-slate-700 border-slate-300"
            >
              Inactivo
            </Badge>
          )}
          {m.status === "maintenance" && (
            <Badge className="bg-sky-600 hover:bg-sky-600">Mantenimiento</Badge>
          )}
          {m.status === "paused" && (
            <Badge className="bg-orange-600 hover:bg-orange-600">Pausado</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
