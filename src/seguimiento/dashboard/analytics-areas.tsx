import { useMemo, useEffect } from "react";
import { gql, NetworkStatus } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import {
  // BarChart,
  // Bar,
  // XAxis,
  // YAxis,
  // CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Users,
  Zap,
  Target,
  Layers,
  RefreshCw,
  PieChart as PieIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================
   Interfaces de TypeScript
================================ */
interface ProcesoOpResult {
  id: string;
  tiempoEstimado: number | null;
  tiempoRealCalculado: number | null;
  estado: string;
  proceso: {
    nombre: string;
  } | null;
}

interface AnalyticsData {
  procesosOperacion: ProcesoOpResult[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f472b6",
];

function formatDuration(totalMinutes: number): string {
  const roundedMins = Math.round(totalMinutes);
  if (roundedMins < 60) return `${roundedMins}m`;
  const hours = Math.floor(roundedMins / 60);
  const mins = roundedMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const GET_ANALYTICS_DATA = gql`
  query GetProduccionPorProcesos {
    procesosOperacion {
      id
      tiempoEstimado
      tiempoRealCalculado
      estado
      proceso {
        nombre
      }
    }
  }
`;

export default function AnalyticsProcesosPage() {
  const { data, loading, refetch, networkStatus } = useQuery<AnalyticsData>(
    GET_ANALYTICS_DATA,
    {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: "cache-and-network",
    },
  );

  const isRefetching = networkStatus === NetworkStatus.refetch;

  useEffect(() => {
    const interval = setInterval(() => refetch(), 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  const stats = useMemo(() => {
    if (!data?.procesosOperacion)
      return { porProceso: [], globales: { est: 0, real: 0, total: 0 } };

    const procesosMap: Record<string, any> = {};
    let gEst = 0,
      gReal = 0;

    data.procesosOperacion.forEach((p) => {
      const procNombre = p.proceso?.nombre || "Otros";
      if (!procesosMap[procNombre]) {
        procesosMap[procNombre] = {
          name: procNombre,
          estimado: 0,
          real: 0,
          count: 0,
        };
      }
      const e = p.tiempoEstimado || 0;
      const r = p.tiempoRealCalculado || 0;
      procesosMap[procNombre].estimado += e;
      procesosMap[procNombre].real += r;
      procesosMap[procNombre].count += 1;
      gEst += e;
      gReal += r;
    });

    const porProceso = Object.values(procesosMap)
      .map((a: any) => ({
        ...a,
        eficiencia: a.real > 0 ? Math.round((a.estimado / a.real) * 100) : 0,
      }))
      .sort((a, b) => b.eficiencia - a.eficiencia);

    return {
      porProceso,
      globales: {
        est: gEst,
        real: gReal,
        total: data.procesosOperacion.length,
      },
    };
  }, [data]);

  if (loading && !isRefetching)
    return (
      <div className="p-12 text-center animate-pulse font-sans font-medium">
        Sincronizando métricas...
      </div>
    );

  return (
    <div className="min-h-screen bg-neutral-50 p-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Sigiloso */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight">
              Métricas por Proceso
            </h1>
            <div
              className={cn(
                "flex items-center gap-2 text-[10px] font-bold transition-all duration-500",
                isRefetching ? "opacity-100" : "opacity-0",
              )}
            >
              <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
              <span className="text-blue-600 uppercase tracking-widest">
                Sincronización activa
              </span>
            </div>
          </div>
          <Badge
            variant="outline"
            className="px-4 py-2 bg-white shadow-sm border-none ring-1 ring-black/5"
          >
            <Clock className="w-3 h-3 mr-2 text-blue-500" />
            Total Real: {formatDuration(stats.globales.real)}
          </Badge>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            title="Eficiencia Global"
            value={`${stats.globales.real > 0 ? Math.round((stats.globales.est / stats.globales.real) * 100) : 0}%`}
            icon={<Zap className="text-amber-500" />}
          />
          <KpiCard
            title="Minutos Estimados"
            value={formatDuration(stats.globales.est)}
            icon={<Target className="text-blue-500" />}
          />
          <KpiCard
            title="Operaciones"
            value={stats.globales.total.toString()}
            icon={<Layers className="text-emerald-500" />}
          />
          <KpiCard
            title="Procesos"
            value={stats.porProceso.length.toString()}
            icon={<Users className="text-purple-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Pastel: Distribución de Carga Real */}
          <Card className="border-none shadow-sm ring-1 ring-black/5">
            <CardHeader className="flex flex-row items-center gap-2">
              <PieIcon className="h-4 w-4 text-neutral-400" />
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Distribución de Tiempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.porProceso}
                      dataKey="real"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {stats.porProceso.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const d = payload[0].payload;
                          const pctTotal = Math.round(
                            (d.real / stats.globales.real) * 100,
                          );
                          return (
                            <div className="bg-white p-3 border-none shadow-2xl rounded-xl text-[10px] ring-1 ring-black/5">
                              <p className="font-black uppercase mb-1">
                                {d.name}
                              </p>
                              <p className="text-neutral-500">
                                Tiempo: <b>{formatDuration(d.real)}</b>
                              </p>
                              <p className="text-blue-600 font-bold">
                                Carga: {pctTotal}% del total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {stats.porProceso.slice(0, 5).map((a, i) => (
                  <div
                    key={a.name}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="font-bold uppercase text-neutral-600 truncate max-w-[120px]">
                        {a.name}
                      </span>
                    </div>
                    <span className="font-mono text-neutral-400">
                      {formatDuration(a.real)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-none shadow-sm ring-1 ring-black/5 overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 bg-neutral-50 rounded-xl">{icon}</div>
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            {title}
          </p>
          <p className="text-lg font-black text-neutral-800 tracking-tight">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
