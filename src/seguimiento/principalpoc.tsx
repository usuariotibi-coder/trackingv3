import { useMemo, useEffect } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

// Sugerencia: Instalar recharts para la visualización
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// --- Constantes de Agrupación ---
const ALLOWED_CODES = [
  "3300",
  "3332",
  "3336",
  "3355",
  "3370",
  "3354",
  "3375",
  "3380",
  "3378",
  "3376",
];

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

// --- Query Optimizada ---

const GET_DATOS = gql`
  query GetAvanceProyectos {
    proyectosAvance {
      id
      proyecto
      estimatedTotalMins
      realTotalMins
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

export default function ProyectosPagePOC() {
  const { data, refetch } = useQuery<GetAvanceProyectosQuery>(GET_DATOS, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    const t = setInterval(() => refetch(), 180000);
    return () => clearInterval(t);
  }, [refetch]);

  // --- Lógica de Agrupación para la Gráfica ---
  const chartData = useMemo(() => {
    if (!data?.proyectosAvance) return [];

    // 1. Inicializar el acumulador
    const groups: Record<
      string,
      { group: string; tef: number; trf: number; budget: number }
    > = {};

    ALLOWED_CODES.forEach((code) => {
      groups[code] = { group: code, tef: 0, trf: 0, budget: 0 };
    });

    // 2. Agrupar y procesar unidades
    data.proyectosAvance.forEach((p: ProyectoAvance) => {
      const codeMatch = p.proyecto.substring(0, 4);

      if (groups[codeMatch]) {
        // Estos vienen en MINUTOS -> Convertimos a HORAS
        groups[codeMatch].tef += (p.estimatedTotalMins || 0) / 60;
        groups[codeMatch].trf += (p.realTotalMins || 0) / 60;

        // El budget ya se captura en HORAS -> Sumamos directo
        const totalBudgetHours =
          p.budgets?.reduce((acc, b) => acc + (b.tiempo || 0), 0) || 0;
        groups[codeMatch].budget += totalBudgetHours;
      }
    });

    // 3. Formatear para la gráfica (redondeo opcional a 2 decimales para precisión)
    return Object.values(groups).map((g) => ({
      ...g,
      tef: Number(g.tef.toFixed(2)),
      trf: Number(g.trf.toFixed(2)),
      budget: Number(g.budget.toFixed(2)),
    }));
  }, [data]);

  return (
    <div className="min-h-screen bg-white px-5 py-10 text-neutral-900 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">POCs</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Comparativa de Tiempo Estimado (TEF) vs Tiempo Real (TRF) en horas
            por clave.
          </p>
        </header>

        <div className="h-[500px] w-full bg-neutral-50 p-4 rounded-xl border border-neutral-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e5e5"
              />
              <XAxis dataKey="group" axisLine={false} tickLine={false} />
              <YAxis
                label={{
                  value: "Horas Totales",
                  angle: -90,
                  position: "insideLeft",
                  offset: -5,
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Legend verticalAlign="top" align="right" />

              {/* Columna 1: Budget (puedes usar un tono gris o neutro para la base) */}
              <Bar
                name="Presupuesto"
                dataKey="budget"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />

              {/* Columna 2: TEF */}
              <Bar
                name="TEF (Estimado)"
                dataKey="tef"
                fill="#6e0f78"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />

              {/* Columna 3: TRF */}
              <Bar
                name="TRF (Real)"
                dataKey="trf"
                fill="#CD0037"
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
