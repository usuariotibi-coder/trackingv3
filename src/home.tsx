import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-neutral-100 via-white to-neutral-200 text-neutral-900 dark:from-black dark:via-neutral-950 dark:to-neutral-900 dark:text-neutral-100">
      <main className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 lg:px-12">
        {/* Columna izquierda: título + CTA */}
        <section className="flex flex-col gap-5">
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-br from-indigo-600 via-fuchsia-600 to-cyan-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-fuchsia-400 dark:to-cyan-300">
              Tracking
            </span>
          </h1>
          <p className="max-w-md text-base text-neutral-600 dark:text-neutral-300">
            Aplicación de seguimiento para manufactura
          </p>

          <div>
            <Link
              //to="/seguimiento/intake"
              to="/projects"
              className="group inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
            >
              Empezar ahora
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                width="16"
                height="16"
              >
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </section>

        {/* Columna derecha: gráfico minimalista */}
        <section className="relative">
          <div className="relative overflow-hidden rounded-3xl border border-neutral-200/60 bg-white/70 p-6 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/60">
            <MinimalProcessChart
              stages={[
                "Intake",
                "CNC",
                "Inspección",
                "Ensamble",
                "Empaque",
                "Envío",
              ]}
              currentIndex={1}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function MinimalProcessChart({
  stages,
  currentIndex = 0,
}: {
  stages: string[];
  currentIndex?: number;
}) {
  const radius = 10;
  const gap = 100;
  const paddingX = 24;
  const height = 120;
  const width = paddingX * 2 + gap * (stages.length - 1);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Flujo de manufactura"
        className="mx-auto block w-full max-w-full"
      >
        <line
          x1={paddingX}
          y1={height / 2}
          x2={width - paddingX}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1={paddingX}
          y1={height / 2}
          x2={paddingX + gap * currentIndex}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {stages.map((name, i) => {
          const cx = paddingX + gap * i;
          const cy = height / 2;
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;

          const circleClass = isCurrent
            ? "text-amber-500 dark:text-amber-400"
            : isDone
            ? "text-emerald-500 dark:text-emerald-400"
            : "text-neutral-400 dark:text-neutral-500";

          const labelClass = isCurrent
            ? "fill-neutral-800 dark:fill-neutral-100"
            : "fill-neutral-500 dark:fill-neutral-400";

          return (
            <g key={name}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                className={circleClass}
                fill="currentColor"
                opacity={isCurrent ? 1 : isDone ? 0.9 : 0.6}
              />
              {isCurrent && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius + 6}
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-amber-500/40 dark:text-amber-400/40"
                />
              )}
              <text
                x={cx}
                y={cy + 28}
                textAnchor="middle"
                className={labelClass}
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
