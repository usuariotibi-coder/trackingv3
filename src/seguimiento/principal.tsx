import { useMemo, useState, useEffect, memo, useCallback, useRef } from "react";
import { gql, NetworkStatus } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { sileo } from "sileo";

// --- Tipos de Datos (Frontend) ---

type ProcessCardData = {
  nombre: string;
  conteoActual: number;
  metaTotal: number;
  tiempoEstimado: number;
  tiempoReal: number;
};

type BudgetData = {
  id: string;
  area: string;
  tiempo: number;
  tiempoReal: number;
  tiempoRestante: number;
};

type ProyectoAvance = {
  id: string;
  proyecto: string;
  estimatedTotalMins: number;
  realTotalMins: number;
  progressPct: number;
  budgets: BudgetData[];
  procesosAgrupados: ProcessCardData[];
  budgetEspecifico?: BudgetData;
};

type GetAvanceProyectosQuery = {
  proyectosAvance: ProyectoAvance[];
};

// --- Helpers ---

const formatDuration = (totalMinutes: number): string => {
  const roundedMins = Math.round(totalMinutes);
  if (roundedMins < 60) return `${roundedMins}m`;
  const hours = Math.floor(roundedMins / 60);
  const mins = roundedMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const DESIRED_PROCESS_ORDER = [
  "corte",
  "escuadre",
  "programacion cnc",
  "maquinado cnc",
  "paileria",
  "pintura",
  "calidad",
  "almacen",
];

// --- Query Optimizada ---

const GET_DATOS = gql`
  query GetAvanceProyectos {
    proyectosAvance {
      id
      proyecto
      estimatedTotalMins
      progressPct
      budgets {
        id
        area
        tiempo
        tiempoReal
        tiempoRestante
      }
      procesosAgrupados {
        nombre
        conteoActual
        metaTotal
        tiempoEstimado
        tiempoReal
        budgetEspecifico {
          id
          tiempo
          tiempoReal
          tiempoRestante
        }
      }
    }
  }
`;

export default function ProyectosPage() {
  const [sortBy, setSortBy] = useState<"progress" | "name" | "urgency">(
    "progress",
  );
  const notificationShownRef = useRef(false);

  const { error, data, refetch, networkStatus } =
    useQuery<GetAvanceProyectosQuery>(GET_DATOS, {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    });

  const isRefetching = networkStatus === NetworkStatus.refetch;

  useEffect(() => {
    const t = setInterval(() => refetch(), 180000);
    return () => clearInterval(t);
  }, [refetch]);

  // --- Lógica de Negocio Simplificada ---

  const projects = useMemo(() => {
    if (!data?.proyectosAvance) return [];

    const formatted = data.proyectosAvance.map((p) => {
      // 1. Mapeamos los procesos que vienen del servidor
      const mappedProcesses = p.procesosAgrupados.map((pr: any) => ({
        id: `${p.id}-${pr.nombre}`,
        name: pr.nombre,
        completed: pr.conteoActual,
        total: pr.metaTotal,
        estimated: formatDuration(pr.tiempoEstimado),
        realTotal: formatDuration(p.realTotalMins),
        budgetEspecifico: pr.budgetEspecifico,
      }));

      // 2. Ordenamos los procesos según DESIRED_PROCESS_ORDER
      const sortedProcesses = [...mappedProcesses].sort((a, b) => {
        const indexA = DESIRED_PROCESS_ORDER.indexOf(normalize(a.name));
        const indexB = DESIRED_PROCESS_ORDER.indexOf(normalize(b.name));

        // Si no encuentra el proceso en la lista, lo manda al final (999)
        const posA = indexA === -1 ? 999 : indexA;
        const posB = indexB === -1 ? 999 : indexB;

        return posA - posB;
      });

      return {
        id: p.id,
        code: p.proyecto,
        estimatedTotal: formatDuration(p.estimatedTotalMins),
        real: formatDuration(p.realTotalMins),
        progressPct: p.progressPct,
        budgets: p.budgets,
        processes: sortedProcesses,
      };
    });

    return [...formatted].sort((a, b) => {
      if (sortBy === "progress") return b.progressPct - a.progressPct;
      if (sortBy === "urgency") return a.progressPct - b.progressPct;
      return a.code.localeCompare(b.code);
    });
  }, [data, sortBy]);

  // Notificación de Sincronización
  useEffect(() => {
    if (isRefetching && !notificationShownRef.current) {
      notificationShownRef.current = true;
      sileo.info({
        duration: 3000,
        title: "Sincronizando datos en vivo",
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        fill: "black",
        position: "top-center",
      });
    } else if (!isRefetching) {
      notificationShownRef.current = false;
    }
  }, [isRefetching]);

  const handleSortChange = useCallback(
    (newSort: "progress" | "name" | "urgency") => {
      setSortBy(newSort);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-white px-5 py-10 text-neutral-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Proyectos</h1>
          <div className="flex w-full items-center justify-between">
            <p className="mt-1 text-sm text-neutral-600">
              Visualización en tiempo real de avance y métricas de tiempo por
              proyecto.
            </p>
            <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200">
              <FilterButton
                active={sortBy === "progress"}
                label="Avance"
                onClick={() => handleSortChange("progress")}
              />
              <FilterButton
                active={sortBy === "urgency"}
                label="Urgencia"
                onClick={() => handleSortChange("urgency")}
              />
              <FilterButton
                active={sortBy === "name"}
                label="Nombre"
                onClick={() => handleSortChange("name")}
              />
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
              <ProjectProgressCard
                key={project.id}
                project={project}
                budgets={project.budgets}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

// --- Subcomponentes ---

function getProjectAccentClass(progress: number): string {
  if (progress < 30) return "bg-red-500";
  if (progress < 90) return "bg-orange-500";
  return "bg-emerald-500";
}

const ProjectProgressCard = memo(function ProjectProgressCard({
  project,
  budgets,
}: {
  project: any;
  budgets?: BudgetData[];
}) {
  const accentClass = getProjectAccentClass(project.progressPct);
  const budgetMantenimiento = useMemo(() => {
    return budgets?.find(
      (b: any) =>
        b.area.toLowerCase().includes("manufactura") ||
        b.area.toLowerCase().includes("mantenimiento"),
    );
  }, [budgets]);

  return (
    <section className="relative pl-3">
      <div
        className={`absolute bottom-2 left-0 top-2 w-4 rounded-l-2xl ${accentClass} opacity-95`}
      />
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-neutral-200 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              {project.code}
            </h2>
            <div className="mt-2 flex gap-4 text-sm text-neutral-600">
              <span>
                TEF: <strong>{project.estimatedTotal}</strong>
              </span>
              <span>
                TRF: <strong>{project.realTotal}</strong>
              </span>
            </div>
          </div>
          <div className="w-full max-w-[56rem]">
            <div className="mb-2 flex justify-between font-semibold">
              <span>Progreso General</span>
              <span>{project.progressPct}%</span>
            </div>
            <ProgressBar
              value={project.progressPct}
              className="h-6"
              fillClassName={accentClass}
            />
            <div className="flex">
              {budgetMantenimiento && (
                <div className="mt-2 rounded-2xl bg-neutral-50 border border-neutral-100 p-3">
                  <div className="flex mb-1">
                    <span className="flex w-full items-center gap-1 justify-center">
                      <p className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                        Budget {budgetMantenimiento.area}:
                      </p>
                      <p className="text-[10px] font-black uppercase text-black tracking-wider ml-2">
                        {budgetMantenimiento.tiempo}h
                      </p>
                    </span>
                  </div>

                  <div className="flex text-[10px] font-medium text-neutral-500">
                    <span
                      className={
                        "text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
                      }
                    >
                      Uso: <b>{budgetMantenimiento.tiempoReal}h</b>
                    </span>
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full ml-3",
                        budgetMantenimiento.tiempoRestante < 0 // Asegúrate que sea CamelCase
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      restante: {budgetMantenimiento.tiempoRestante}h
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
          {project.processes.map((process: any) => (
            <ProcessProgressCard key={process.id} process={process} />
          ))}
        </div>
      </div>
    </section>
  );
});

const ProcessProgressCard = memo(function ProcessProgressCard({
  process,
}: {
  process: any;
}) {
  const pct =
    process.total > 0
      ? Math.round((process.completed / process.total) * 100)
      : 0;

  const bgtEspecífico = process.budgetEspecifico;

  const esExceso = bgtEspecífico && bgtEspecífico.tiempoRestante < 0;

  const showDataE = () => {
    console.log(bgtEspecífico);
  };

  return (
    <article className="flex h-auto flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 shadow-sm">
      <div className="flex justify-between items-center gap-2">
        <h3
          className="truncate text-[10px] font-black uppercase text-neutral-400 tracking-tight"
          onClick={showDataE}
        >
          {process.name}
        </h3>

        {/* Muestra el budget del proceso solo si existe */}
        {bgtEspecífico && (
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
              esExceso
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-emerald-50 border-emerald-200 text-emerald-600",
            )}
          >
            {/* Si es negativo aparecerá con el menos automáticamente por el backend */}
            budget: {bgtEspecífico.tiempoRestante}h
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold text-neutral-600">
          <span>TEF: {process.estimated}</span>
          <span className="text-emerald-600 font-black">
            TRF: {process.real}
          </span>
        </div>

        <ProgressBar value={pct} className="h-1.5" />

        <div className="flex justify-between items-center text-[8px] font-medium text-neutral-400">
          <span>
            {process.completed} de {process.total} piezas
          </span>
          {/* Si hay budget, mostramos la meta asignada al proceso */}
          {bgtEspecífico && <span>Meta: {bgtEspecífico.tiempo}h</span>}
        </div>
      </div>
    </article>
  );
});

const ProgressBar = memo(({ value, className, fillClassName }: any) => (
  <div
    className={cn(
      "h-2 w-full rounded-full bg-neutral-200 overflow-hidden",
      className,
    )}
  >
    <div
      className={cn(
        "h-full transition-all duration-500 bg-emerald-500",
        fillClassName,
      )}
      style={{ width: `${value}%` }}
    />
  </div>
));

const FilterButton = memo(({ active, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
      active ? "bg-white text-blue-600 shadow-sm" : "text-neutral-500",
    )}
  >
    {label}
  </button>
));
