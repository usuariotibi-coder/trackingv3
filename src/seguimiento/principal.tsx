import { useMemo, useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

/* ---------- Gráfico de flujo animado (SVG puro, sin libs) ---------- */
function FlowImpactChart() {
  // Etapas
  const stages = [
    "Planeación",
    "Corte",
    "Escuadre",
    "CNC",
    "Calidad",
    "Almacén",
  ] as const;
  const volumes = [100, 86, 78, 74, 70]; // grosor relativo entre etapas

  // Geometría
  const { width, height, paddingX, paths } = useMemo(() => {
    const width = 1100;
    const height = 320;
    const paddingX = 80;
    const yTop = 110;
    const yBottom = 210;
    const gapX = (width - paddingX * 2) / (stages.length - 1);

    const paths = stages.slice(0, -1).map((_, i) => {
      const x1 = paddingX + gapX * i;
      const x2 = paddingX + gapX * (i + 1);
      const y1 = i % 2 === 0 ? yTop : yBottom;
      const y2 = (i + 1) % 2 === 0 ? yTop : yBottom;
      const dx = (x2 - x1) * 0.55;
      const d = `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
      return { id: `link-${i}`, d, x1, y1, x2, y2 };
    });

    return { width, height, paddingX, yTop, yBottom, paths };
  }, []);

  const thickness = (v: number) => 4 + (v / Math.max(...volumes)) * 16;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block h-[320px] w-full"
        role="img"
        aria-label="Flujo de manufactura con grosor por volumen y partículas animadas"
      >
        <defs>
          {/* Camino lila muy tenue */}
          <linearGradient id="grad-flow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(270 80% 75%)" stopOpacity="0.15" />
            <stop
              offset="50%"
              stopColor="hsl(270 80% 80%)"
              stopOpacity="0.15"
            />
            <stop
              offset="100%"
              stopColor="hsl(270 80% 85%)"
              stopOpacity="0.15"
            />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <text
          x={16}
          y={28}
          className="fill-neutral-500 dark:fill-neutral-400"
          fontSize="12"
          letterSpacing="0.08em"
        >
          Flujo de trabajo
        </text>

        {paths.map((p, i) => {
          const particleColors = [
            "#22c55e",
            "#facc15",
            "#ef4444",
            "#facc15",
            "#22c55e",
          ];
          const color = particleColors[i % particleColors.length];

          return (
            <g key={p.id}>
              <path
                id={p.id}
                d={p.d}
                fill="none"
                stroke="url(#grad-flow)"
                strokeWidth={thickness(volumes[i])}
                strokeLinecap="round"
                className="opacity-50"
                filter="url(#soft-glow)"
              />
              <circle r="6" fill={color} opacity="0.92">
                <animateMotion
                  dur={`${6 + i}s`}
                  repeatCount="indefinite"
                  rotate="auto"
                >
                  <mpath href={`#${p.id}`} />
                </animateMotion>
              </circle>
            </g>
          );
        })}

        {stages.map((name, i) => {
          const x =
            i === 0
              ? paddingX
              : i === stages.length - 1
              ? width - paddingX
              : (paths[i - 1].x2 + (paths[i]?.x1 ?? paths[i - 1].x2)) / 2;
          const y = i % 2 === 0 ? 80 : 250;

          return (
            <g
              key={name}
              transform={`translate(${x}, ${y})`}
              className="text-neutral-600 dark:text-neutral-300"
            >
              <circle r={12} fill="currentColor" opacity="0.15" />
              <text
                textAnchor="middle"
                dy="0.35em"
                className="fill-current"
                fontSize="12"
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- Utilidades de Tiempo (Inspiradas en machines.tsx) ---------- */

// Calcula minutos transcurridos desde una fecha ISO
function minsSince(ts?: string | null) {
  if (!ts) return 0;
  const diffMs = Date.now() - new Date(ts).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

// Formatea minutos a un string legible (ej: 1h 15m)
function fmtElapsed(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/* ---------- Tipos de Datos ---------- */

type OperacionesQueryResult = {
  operaciones: Array<{
    proyecto: {
      id: string;
      proyecto: string;
    };
    procesos: Array<{
      estado: string;
      proceso: { nombre: string };
      horaInicio?: string | null;
      tiempoEstimado?: number | null;
    }>;
  }>;
};

export default function ImpactoPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-12 text-neutral-900 dark:from-black dark:via-neutral-950 dark:to-neutral-900 dark:text-neutral-100 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Seguimiento en tiempo real
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Cada proceso se muestra en su flujo actual
          </p>
        </header>

        {/* ===== Flujo animado ===== */}
        <section className="relative overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
          <FlowImpactChart />
        </section>

        <section className="rounded-3xl border border-neutral-200/70 bg-white/70 p-6 shadow-lg backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
          <h2 className="mb-4 text-xl font-semibold tracking-tight">
            Avance por proyecto
          </h2>
          <ProjectProgress />
        </section>
      </div>
    </div>
  );
}

function ProjectProgress() {
  const [tick, setTick] = useState(0);

  // Efecto para forzar re-renderizado cada minuto y actualizar los cronómetros
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const GET_DATOS = gql`
    query {
      operaciones {
        proyecto {
          id
          proyecto
        }
        procesos {
          estado
          proceso {
            nombre
          }
          horaInicio
          tiempoEstimado
        }
      }
    }
  `;

  const {
    loading,
    error,
    data: dataOpP,
  } = useQuery<OperacionesQueryResult>(GET_DATOS);

  const rows = useMemo(() => {
    if (!dataOpP?.operaciones) return [];

    const proyectosMap = dataOpP.operaciones.reduce((acc, op) => {
      const projectId = op.proyecto.id;
      if (!acc[projectId]) {
        acc[projectId] = {
          nombre: op.proyecto.proyecto,
          total: 0,
          weighted: 0,
          procesosRaw: op.procesos, // Guardamos la lista de procesos para el acordeón
        };
      }

      const totalProcesosOp = op.procesos.length;
      const done = op.procesos.filter((x) => x.estado === "done").length;
      const inProgress = op.procesos.filter(
        (x) => x.estado === "in_progress"
      ).length;

      acc[projectId].total += totalProcesosOp;
      acc[projectId].weighted += done + inProgress * 0.5; // Ponderación: Terminado=1, En curso=0.5
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(proyectosMap).map(([id, stats]) => {
      const pct =
        stats.total > 0
          ? Math.min(100, Math.round((stats.weighted / stats.total) * 100))
          : 0;
      return {
        id,
        proyecto: stats.nombre,
        maquinadas: Math.round(stats.weighted),
        total: stats.total,
        pct,
        procesos: stats.procesosRaw,
        color:
          pct >= 80
            ? "bg-emerald-500"
            : pct >= 50
            ? "bg-amber-500"
            : "bg-rose-500",
      };
    });
  }, [dataOpP, tick]);

  if (loading) return <p className="text-center py-4">Cargando avance...</p>;
  if (error)
    return (
      <p className="text-center py-4 text-rose-500 italic">
        Error: {error.message}
      </p>
    );

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {rows.map((r) => (
        <AccordionItem
          key={r.id}
          value={r.id}
          className="rounded-xl border border-neutral-200/70 px-4 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/40 overflow-hidden shadow-sm"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex flex-col w-full pr-4 text-left">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold">{r.proyecto}</span>
                <span className="tabular-nums text-neutral-500">
                  {r.maquinadas}/{r.total} ({r.pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800/70">
                <div
                  className={cn("h-full transition-all duration-700", r.color)}
                  style={{ width: `${r.pct}%` }}
                />
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pb-4 pt-0">
            <div className="grid gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
              {/* ORDEN CRONOLÓGICO: Prioriza procesos iniciados ordenados por tiempo */}
              {[...r.procesos]
                .sort((a, b) => {
                  if (!a.horaInicio) return 1;
                  if (!b.horaInicio) return -1;
                  return (
                    new Date(a.horaInicio).getTime() -
                    new Date(b.horaInicio).getTime()
                  );
                })
                .map((p, idx) => {
                  const elapsed = minsSince(p.horaInicio);
                  const isRunning = p.estado === "in_progress";
                  const overTime =
                    isRunning && p.tiempoEstimado && elapsed > p.tiempoEstimado;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-neutral-800/40 p-3 text-xs border border-neutral-100 dark:border-neutral-700/50"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                          {p.proceso.nombre}
                        </span>
                        {isRunning && p.horaInicio && (
                          <span
                            className={cn(
                              "flex items-center gap-1 font-medium",
                              overTime
                                ? "text-rose-600 animate-pulse"
                                : "text-neutral-500"
                            )}
                          >
                            <Timer className="h-3 w-3" /> {fmtElapsed(elapsed)}{" "}
                            transcurridos
                            {p.tiempoEstimado && (
                              <span className="opacity-70">
                                / {p.tiempoEstimado}m obj.
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          "px-2 py-0 text-[10px] capitalize font-bold",
                          p.estado === "done"
                            ? "bg-emerald-100 text-emerald-700"
                            : isRunning
                            ? "bg-amber-100 text-amber-700"
                            : "bg-neutral-100 text-neutral-500"
                        )}
                        variant="outline"
                      >
                        {p.estado === "in_progress"
                          ? "Activo"
                          : p.estado === "done"
                          ? "Terminado"
                          : "Pendiente"}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
