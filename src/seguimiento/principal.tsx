import { useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function ImpactoPage() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-neutral-100 via-white to-neutral-200 px-6 py-12 text-neutral-900 dark:from-black dark:via-neutral-950 dark:to-neutral-900 dark:text-neutral-100 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Seguimiento en tiempo real
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Cada proceso se muestra en su flujo actual
            </p>
          </div>
        </header>

        {/* ===== Flujo animado ===== */}
        <section className="relative overflow-hidden rounded-3xl border border-neutral-200/70 bg-white/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
          <FlowImpactChart />
        </section>

        {/* ===== Tarjetas KPI resumidas ===== */}
        {/* <div className="grid gap-2 text-xs text-neutral-600 dark:text-neutral-400 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200/70 bg-white/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="text-[11px]">Rendimiento actual</div>
            <div className="text-lg font-semibold">86%</div>
          </div>
          <div className="rounded-lg border border-neutral-200/70 bg-white/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="text-[11px]">Retraso máximo en</div>
            <div className="text-lg font-semibold">+28% de CNC</div>
          </div>
          <div className="rounded-lg border border-neutral-200/70 bg-white/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
            <div className="text-[11px]">Piezas/Hora</div>
            <div className="text-lg font-semibold">17 piezas</div>
          </div>
        </div> */}

        {/* ===== NUEVO: Avance por proyecto (barras horizontales) ===== */}
        <section className="rounded-3xl border border-neutral-200/70 bg-white/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
          <h2 className="mb-4 text-xl font-semibold tracking-tight">
            Avance por proyecto
          </h2>
          <ProjectProgress
            data={[
              { proyecto: "OP-3272 • Jig Lateral", maquinadas: 46, total: 60 },
              { proyecto: "OP-3281 • Gripper XYZ", maquinadas: 22, total: 40 },
              {
                proyecto: "OP-3290 • Mesa Indexada",
                maquinadas: 73,
                total: 80,
              },
              { proyecto: "OP-3298 • End Effector", maquinadas: 9, total: 30 },
              {
                proyecto: "OP-3301 • Transportador",
                maquinadas: 55,
                total: 100,
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}

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
  const { width, height, paddingX, yTop, yBottom, paths } = useMemo(() => {
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

/* ---------- Barras horizontales: avance por proyecto ---------- */
type Proyecto = { proyecto: string; maquinadas: number; total: number };

// Tipos de resultados del query (se mantienen)
type OperacionesQueryResult = {
  operaciones: Array<{
    proyecto: {
      id: string;
      proyecto: string; // Ejemplo: "OP-3272 • Jig Lateral"
    };
    procesos: Array<{
      estado: string; // Ejemplo: "done", "in_progress", "pending"
      proceso: {
        nombre: string;
      };
    }>;
  }>;
};

function ProjectProgress({ data: initialData }: { data: Proyecto[] }) {
  // ... (Query GET_DATOS y useQuery se mantienen igual)
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
        }
      }
    }
  `;

  const {
    loading: loadingOpP,
    error: errorOpP,
    data: dataOpP,
  } = useQuery<OperacionesQueryResult>(GET_DATOS);

  // === CÓDIGO CLAVE: Mapeo de los datos del query ===
  const rows = useMemo(() => {
    if (!dataOpP?.operaciones) {
      // Lógica de fallback para initialData (se mantiene)
      return initialData.map((d) => {
        const pct =
          d.total > 0
            ? Math.min(100, Math.round((d.maquinadas / d.total) * 100))
            : 0;
        const color =
          pct >= 80
            ? "bg-emerald-500"
            : pct >= 50
            ? "bg-amber-500"
            : "bg-rose-500";
        return { ...d, pct, color };
      });
    }

    // 1. Agrupar operaciones por ID de proyecto, acumulando conteos de procesos
    const proyectosMap = dataOpP.operaciones.reduce(
      (acc, op) => {
        const projectId = op.proyecto.id;
        const projectName = op.proyecto.proyecto;

        if (!acc[projectId]) {
          acc[projectId] = {
            nombre: projectName,
            totalProcesos: 0,
            completedProcesosWeighted: 0, // Suma ponderada de procesos
          };
        }

        // Obtener conteos de procesos para la operación actual
        const totalProcesosOp = op.procesos.length;
        const doneCount = op.procesos.filter((x) => x.estado === "done").length;
        const inProgressCount = op.procesos.filter(
          (x) => x.estado === "in_progress"
        ).length;

        // Fórmula de avance ponderado: Done + (In_Progress * 0.5)
        const completedProcesosWeightedOp = doneCount + inProgressCount * 0.5;

        // Acumular los totales en el mapa del proyecto
        acc[projectId].totalProcesos += totalProcesosOp;
        acc[projectId].completedProcesosWeighted += completedProcesosWeightedOp;

        return acc;
      },
      {} as Record<
        string,
        {
          nombre: string;
          totalProcesos: number;
          completedProcesosWeighted: number;
        }
      >
    );

    // 2. Convertir el mapa a un array de Proyecto[] calculando el porcentaje
    return Object.entries(proyectosMap).map(([, stats]) => {
      const maquinadas = Math.round(stats.completedProcesosWeighted); // Redondeamos para mostrar
      const total = stats.totalProcesos;

      const pct =
        total > 0
          ? Math.min(
              100,
              Math.round((stats.completedProcesosWeighted / total) * 100)
            )
          : 0;

      // Lógica de color (se mantiene)
      const color =
        pct >= 80
          ? "bg-emerald-500"
          : pct >= 50
          ? "bg-amber-500"
          : "bg-rose-500";

      return {
        proyecto: stats.nombre,
        maquinadas, // Ahora es el CONTEO PONDERADO (Done + 0.5*In_Progress)
        total, // Ahora es el CONTEO TOTAL DE PROCESOS
        pct,
        color,
      };
    });
  }, [dataOpP, initialData]);
  // === FIN CÓDIGO CLAVE ===

  if (loadingOpP) {
    return <p className="text-center py-4">Cargando avance de proyectos...</p>;
  }

  if (errorOpP) {
    return (
      <p className="text-center py-4 text-rose-500">
        Error al cargar los datos: {errorOpP.message}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-center py-4 text-neutral-500">
        No hay proyectos para mostrar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <div
          key={r.proyecto}
          className="rounded-xl border border-neutral-200/70 p-4 dark:border-neutral-800"
        >
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="font-medium">{r.proyecto}</div>
            <div className="tabular-nums text-neutral-500 dark:text-neutral-400">
              {r.maquinadas}/{r.total} &nbsp;•&nbsp; {r.pct}%
            </div>
          </div>

          {/* Barra */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800/70">
            <div
              className={`h-full ${r.color}`}
              style={{
                width: `${r.pct}%`,
                transition: "width 800ms cubic-bezier(.22,1,.36,1)",
                boxShadow: "0 0 12px rgba(0,0,0,0.08) inset",
              }}
              aria-valuenow={r.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>
        </div>
      ))}
      {/* Leyenda simple */}
      <div className="flex flex-wrap gap-3 text-xs text-neutral-600 dark:text-neutral-400">
        <LegendTag className="bg-emerald-500" label="≥ 80% (en rango)" />
        <LegendTag className="bg-amber-500" label="50–79% (en seguimiento)" />
        <LegendTag className="bg-rose-500" label="< 50% (crítico)" />
      </div>
    </div>
  );
}

function LegendTag({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}
