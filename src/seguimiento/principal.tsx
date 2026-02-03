import { useMemo, useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { TriangleAlert } from "lucide-react";
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

export function ProjectProgress() {
  const [tick, setTick] = useState(0);

  // Forzar re-renderizado cada minuto para actualizar cronómetros
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const GET_DATOS = gql`
    query GetAvanceProyectos {
      operaciones {
        id
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
          horaInicio
          tiempoEstimado
        }
      }
    }
  `;

  const { loading, error, data } = useQuery<OperacionesQueryResult>(GET_DATOS);

  const rows = useMemo(() => {
    if (!data?.operaciones) return [];

    const proyectosMap = data.operaciones.reduce((acc: any, op: any) => {
      const projectId = op.proyecto.id;
      const cantidadWO = op.workorder.cantidad;

      if (!acc[projectId]) {
        acc[projectId] = {
          nombre: op.proyecto.proyecto,
          piezasTotalesMeta: 0,
          piezasProcesadasReales: 0,
          operaciones: [],
          tieneCuelloBotella: false, // Flag para la cabecera
        };
      }

      let actualOp = 0;
      let metaOp = op.procesos.length * cantidadWO;
      let bottleneckEnOp = false;

      op.procesos.forEach((p: any, idx: number) => {
        actualOp += p.conteoActual;
        // Lógica de Cuello de Botella: el proceso anterior tiene más piezas que el actual
        if (idx > 0 && op.procesos[idx - 1].conteoActual > p.conteoActual) {
          bottleneckEnOp = true;
        }
      });

      acc[projectId].piezasTotalesMeta += metaOp;
      acc[projectId].piezasProcesadasReales += actualOp;

      // Si alguna operación tiene cuello de botella, el proyecto completo se marca
      if (bottleneckEnOp) acc[projectId].tieneCuelloBotella = true;

      acc[projectId].operaciones.push({
        ...op,
        cantidadWO,
        bottleneckEnOp,
      });

      return acc;
    }, {});

    return Object.entries(proyectosMap).map(([id, stats]: [string, any]) => {
      const pct =
        stats.piezasTotalesMeta > 0
          ? Math.min(
              100,
              Math.round(
                (stats.piezasProcesadasReales / stats.piezasTotalesMeta) * 100,
              ),
            )
          : 0;
      return {
        id,
        proyecto: stats.nombre,
        pct,
        operaciones: stats.operaciones,
        tieneCuelloBotella: stats.tieneCuelloBotella,
        color:
          pct >= 80
            ? "bg-emerald-500"
            : pct >= 50
              ? "bg-amber-500"
              : "bg-rose-500",
      };
    });
  }, [data, tick]);

  if (loading)
    return (
      <p className="text-center py-4 text-sm animate-pulse">
        Cargando avance de producción...
      </p>
    );
  if (error)
    return (
      <p className="text-center py-4 text-rose-500 text-sm italic">
        Error: {error.message}
      </p>
    );

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {rows.map((r) => (
        <AccordionItem
          key={r.id}
          value={r.id}
          className={cn(
            "rounded-xl border px-4 overflow-hidden shadow-sm transition-colors",
            r.tieneCuelloBotella
              ? "border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10"
              : "border-neutral-200/70 bg-white/40 dark:border-neutral-800 dark:bg-neutral-900/40",
          )}
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex flex-col w-full pr-4 text-left">
              <div className="mb-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-tight">
                    {r.proyecto}
                  </span>

                  {/* NOTIFICACIÓN EN CABECERA */}
                  {r.tieneCuelloBotella && (
                    <Badge className="h-5 px-1.5 animate-pulse bg-amber-500 hover:bg-amber-600 text-black border-none font-bold text-[9px]">
                      <TriangleAlert className="h-3 w-3 mr-1" />
                      CUELLO DE BOTELLA
                    </Badge>
                  )}
                </div>
                <span className="tabular-nums font-mono text-neutral-500">
                  {r.pct}% Total
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

          <AccordionContent className="pb-4 pt-2">
            {r.operaciones.map((op: any) => (
              <div key={op.id} className="mt-4 first:mt-0">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase mb-2 tracking-widest border-b pb-1">
                  Operación: {op.id} · {op.cantidadWO} Piezas Meta
                </h4>
                <div className="grid gap-3">
                  {op.procesos.map((p: any, idx: number) => {
                    const porcentajeProceso =
                      (p.conteoActual / op.cantidadWO) * 100;

                    // Lógica para detectar si este paso específico es el que está frenando el flujo
                    const piezasAnteriores =
                      idx > 0
                        ? op.procesos[idx - 1].conteoActual
                        : op.cantidadWO;
                    const esCuelloBotella = piezasAnteriores > p.conteoActual;
                    const piezasEnEspera = piezasAnteriores - p.conteoActual;

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg p-3 border transition-all",
                          esCuelloBotella
                            ? "bg-amber-100/40 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800 shadow-sm"
                            : "bg-white/60 dark:bg-neutral-800/40 border-neutral-100 dark:border-neutral-700",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span
                              className={cn(
                                "text-xs font-bold",
                                p.conteoActual === op.cantidadWO
                                  ? "text-emerald-600"
                                  : "text-neutral-800 dark:text-neutral-100",
                              )}
                            >
                              {p.proceso.nombre}
                            </span>
                            {esCuelloBotella && (
                              <span className="text-[10px] text-amber-600 font-bold italic animate-pulse">
                                🚧 {piezasEnEspera} piezas listas para procesar
                              </span>
                            )}
                          </div>
                          <Badge
                            className="font-mono text-[10px] bg-white/80 dark:bg-neutral-900/80 text-neutral-600"
                            variant="outline"
                          >
                            {p.conteoActual} / {op.cantidadWO}
                          </Badge>
                        </div>

                        {/* Barra de progreso por etapa */}
                        <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden dark:bg-neutral-700">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              p.conteoActual === op.cantidadWO
                                ? "bg-emerald-500"
                                : "bg-blue-500",
                              p.estado === "in_progress" && "animate-pulse",
                            )}
                            style={{ width: `${porcentajeProceso}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
