import { useMemo, useState, useEffect } from "react";
import { gql, NetworkStatus } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ProcessCard = {
  id: string;
  name: string;
  completed: number;
  total: number;
  estimated: string;
  real: string;
};

type ProjectCard = {
  id: string;
  code: string;
  estimatedTotal: string;
  realTotal: string;
  progressPct: number;
  processes: ProcessCard[];
};

type OperacionesQueryResult = {
  operaciones: Array<{
    proyecto: { id: string; proyecto: string };
    workorder: { cantidad: number };
    procesos: Array<{
      id: string;
      estado: string;
      conteoActual: number;
      proceso: { nombre: string };
      tiempoEstimado: number | null;
      tiempoRealCalculado: number | null;
    }>;
  }>;
};

function formatDuration(totalMinutes: number): string {
  const roundedMins = Math.round(totalMinutes);
  if (roundedMins < 60) return `${roundedMins}m`;
  const hours = Math.floor(roundedMins / 60);
  const mins = roundedMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const GET_DATOS = gql`
  query GetAvanceProyectos {
    operaciones {
      id
      operacion
      workorder {
        cantidad
      }
      proyecto {
        id
        proyecto
      }
      procesos {
        id
        estado
        conteoActual
        proceso {
          nombre
        }
        tiempoEstimado
        tiempoRealCalculado
      }
    }
  }
`;

export default function ProyectosPage() {
  const [tick, setTick] = useState(0);
  const [sortBy, setSortBy] = useState<"progress" | "name" | "urgency">(
    "urgency",
  );

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const { error, loading, data, refetch, networkStatus } =
    useQuery<OperacionesQueryResult>(GET_DATOS, {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    });

  const isRefetching = networkStatus === NetworkStatus.refetch;

  // Refetch datos en vivo cada minuto
  useEffect(() => {
    const t = setInterval(() => refetch(), 60000);
    return () => clearInterval(t);
  }, [refetch]);

  const projects = useMemo(() => {
    if (!data?.operaciones) return [] as ProjectCard[];

    const proyectosMap = data.operaciones.reduce((acc: any, op: any) => {
      const projectId = op.proyecto.id;
      const cantidadWO = op.workorder.cantidad;

      if (!acc[projectId]) {
        acc[projectId] = {
          nombre: op.proyecto.proyecto,
          totalMeta: 0,
          totalActual: 0,
          totalEstimado: 0,
          totalReal: 0,
          detalleProcesos: {},
        };
      }

      const metaOp = op.procesos.length * cantidadWO;
      acc[projectId].totalMeta += metaOp;

      op.procesos.forEach((p: any) => {
        acc[projectId].totalActual += p.conteoActual;
        acc[projectId].totalEstimado += p.tiempoEstimado || 0;
        acc[projectId].totalReal += p.tiempoRealCalculado || 0;

        const nombreProc = p.proceso.nombre;
        if (!acc[projectId].detalleProcesos[nombreProc]) {
          acc[projectId].detalleProcesos[nombreProc] = {
            actual: 0,
            meta: 0,
            estimado: 0,
            real: 0,
          };
        }
        acc[projectId].detalleProcesos[nombreProc].actual += p.conteoActual;
        acc[projectId].detalleProcesos[nombreProc].meta += cantidadWO;
        acc[projectId].detalleProcesos[nombreProc].estimado +=
          p.tiempoEstimado || 0;
        acc[projectId].detalleProcesos[nombreProc].real +=
          p.tiempoRealCalculado || 0;
      });

      return acc;
    }, {});

    // Orden deseado por el usuario (de izquierda a derecha)
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

    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const result = Object.entries(proyectosMap).map(
      ([id, stats]: [string, any]) => {
        const pct =
          stats.totalMeta > 0
            ? Math.min(
                100,
                Math.round((stats.totalActual / stats.totalMeta) * 100),
              )
            : 0;
        // Construir mapa normalizado de procesos
        const procMap = Object.entries(stats.detalleProcesos).reduce(
          (m: any, [nombre, stat]: any) => {
            m[normalize(nombre)] = { nombre, stat };
            return m;
          },
          {} as Record<string, { nombre: string; stat: any }>,
        );

        const orderedProcesos: Record<string, any> = {};
        // Agregar procesos en el orden deseado
        desiredOrder.forEach((d) => {
          const key = normalize(d);
          if (procMap[key]) {
            const { nombre, stat } = procMap[key];
            orderedProcesos[nombre] = stat;
            delete procMap[key];
          }
        });

        // Agregar el resto en orden alfabético
        const remaining = Object.values(procMap).sort((a: any, b: any) =>
          a.nombre.localeCompare(b.nombre),
        );
        remaining.forEach(({ nombre, stat }: any) => {
          orderedProcesos[nombre] = stat;
        });

        const procesos: ProcessCard[] = Object.entries(orderedProcesos).map(
          ([nombre, stat]: [string, any]) => ({
            id: nombre,
            name: nombre,
            completed: stat.actual,
            total: stat.meta,
            estimated: formatDuration(stat.estimado),
            real: formatDuration(stat.real),
          }),
        );

        return {
          id,
          code: stats.nombre,
          estimatedTotal: formatDuration(Math.round(stats.totalEstimado)),
          realTotal: formatDuration(Math.round(stats.totalReal)),
          progressPct: pct,
          processes: procesos,
        } as ProjectCard;
      },
    );

    return [...result].sort((a, b) => {
      if (sortBy === "urgency") {
        // Menor progreso primero (Atención inmediata)
        return a.progressPct - b.progressPct;
      }
      if (sortBy === "progress") {
        // Mayor progreso primero (Cerca de terminar)
        return b.progressPct - a.progressPct;
      }
      if (sortBy === "name") {
        // Alfabético
        return a.code.localeCompare(b.code);
      }
      return 0;
    });
  }, [data, tick]);

  return (
    <div className="min-h-screen bg-white px-5 py-10 text-neutral-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
          <div className="h-4">
            <div
              className={cn(
                "flex items-center gap-2 text-[12px] font-bold text-blue-600 transition-all duration-500",
                isRefetching || loading
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-1",
              )}
            >
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Sincronizando datos en vivo...</span>
            </div>
          </div>
          <div className="flex w-full items-center justify-between">
            <p className="mt-1 text-sm text-neutral-600">
              Visualizacion en tiempo real de avance y metricas de tiempo por
              proyecto.
            </p>
            <div className="flex items-center gap-2 float-right">
              <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                <FilterButton
                  active={sortBy === "urgency"}
                  label="Urgencia (0-100%)"
                  onClick={() => setSortBy("urgency")}
                />
                <FilterButton
                  active={sortBy === "progress"}
                  label="Avance (100-0%)"
                  onClick={() => setSortBy("progress")}
                />
                <FilterButton
                  active={sortBy === "name"}
                  label="Nombre"
                  onClick={() => setSortBy("name")}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-5">
          {error && (
            <p className="text-center py-10 text-red-500">
              Error: {error.message}
            </p>
          )}
          {!error &&
            projects.map((project) => (
              <ProjectProgressCard key={project.id} project={project} />
            ))}
        </div>
      </div>
    </div>
  );
}

function getProjectAccentClass(project: ProjectCard) {
  const progress = project.progressPct;
  if (progress < 30) return "bg-red-500";
  if (progress < 90) return "bg-orange-500";
  return "bg-emerald-500";
}

function ProjectProgressCard({ project }: { project: ProjectCard }) {
  const accentClass = getProjectAccentClass(project);

  return (
    <section className="relative pl-3">
      <div
        className={`absolute bottom-2 left-0 top-2 w-4 rounded-l-2xl ${accentClass} opacity-95 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.4)]`}
      />

      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_24px_-16px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-4 border-b border-neutral-200 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {project.code}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-neutral-600">
                TEF: <strong>{project.estimatedTotal}</strong>
              </span>
              <span className="text-neutral-600">
                TRF: <strong>{project.realTotal}</strong>
              </span>
            </div>
          </div>

          <div className="w-full max-w-[56rem]">
            <div className="mb-2 flex items-center justify-between text-base">
              <span className="font-semibold">Progreso General</span>
              <span className="font-bold">{project.progressPct}%</span>
            </div>
            <ProgressBar
              value={project.progressPct}
              className="h-6"
              fillClassName={accentClass}
            />
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          {project.processes.map((process) => (
            <ProcessProgressCard key={process.id} process={process} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessProgressCard({ process }: { process: ProcessCard }) {
  const pct =
    process.total > 0
      ? Math.round((process.completed / process.total) * 100)
      : 0;

  return (
    <article className="flex h-20 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h3
          className="truncate whitespace-nowrap text-[10px] font-semibold uppercase tracking-tight text-neutral-600"
          title={process.name}
        >
          {process.name}
        </h3>
        <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-xs font-semibold">
          {process.completed}/{process.total}
        </span>
      </div>

      <div className="text-xs font-semibold">
        <div className="mb-1 flex items-center justify-between text-neutral-700">
          <span>
            TEF: <span className="text-neutral-900">{process.estimated}</span>
          </span>
          <span>
            TRF: <span className="text-emerald-600">{process.real}</span>
          </span>
        </div>
        <ProgressBar value={pct} />
      </div>
    </article>
  );
}

function ProgressBar({
  value,
  className,
  fillClassName,
}: {
  value: number;
  className?: string;
  fillClassName?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-neutral-200 ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${fillClassName ?? "bg-emerald-500"}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
        active
          ? "bg-white text-blue-600 shadow-sm"
          : "text-neutral-500 hover:text-neutral-700",
      )}
    >
      {label}
    </button>
  );
}
