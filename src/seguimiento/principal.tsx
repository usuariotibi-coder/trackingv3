import { useMemo, useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/* ---------- Tipos de Datos ---------- */

type OperacionesQueryResult = {
  operaciones: Array<{
    proyecto: {
      id: string;
      proyecto: string;
    };
    workorder: {
      cantidad: number;
    };
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

export default function ImpactoPage() {
  return (
    <div className="min-h-screen w-full bg-neutral-50 px-6 py-12 text-neutral-900 dark:bg-black dark:text-neutral-100 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Seguimiento de Proyectos
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualización en tiempo real de avance y métricas de tiempo por
            proyecto.
          </p>
        </header>

        <section className="space-y-6">
          <ProjectProgress />
        </section>
      </div>
    </div>
  );
}

export function ProjectProgress() {
  const [tick, setTick] = useState(0);

  // Forzar actualización cada minuto para datos de tiempo real
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const { loading, error, data } = useQuery<OperacionesQueryResult>(GET_DATOS);

  const rows = useMemo(() => {
    if (!data?.operaciones) return [];

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
          tieneCuelloBotella: false,
          detalleProcesos: {},
        };
      }

      const metaOp = op.procesos.length * cantidadWO;
      acc[projectId].totalMeta += metaOp;

      op.procesos.forEach((p: any, idx: number) => {
        acc[projectId].totalActual += p.conteoActual;

        // Sumatoria de tiempos global por proyecto
        acc[projectId].totalEstimado += p.tiempoEstimado || 0;
        acc[projectId].totalReal += p.tiempoRealCalculado || 0;

        // Lógica de alerta
        const piezasAnteriores =
          idx > 0 ? op.procesos[idx - 1].conteoActual : cantidadWO;
        if (piezasAnteriores - p.conteoActual > 5) {
          acc[projectId].tieneCuelloBotella = true;
        }

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

    return Object.entries(proyectosMap).map(([id, stats]: [string, any]) => {
      const pct =
        stats.totalMeta > 0
          ? Math.min(
              100,
              Math.round((stats.totalActual / stats.totalMeta) * 100),
            )
          : 0;
      return {
        id,
        proyecto: stats.nombre,
        pct,
        totalEstimado: Math.round(stats.totalEstimado),
        totalReal: Math.round(stats.totalReal),
        tieneCuelloBotella: stats.tieneCuelloBotella,
        procesos: stats.detalleProcesos,
        color:
          pct >= 100
            ? "bg-emerald-500"
            : pct >= 50
              ? "bg-blue-600"
              : "bg-orange-500",
      };
    });
  }, [data, tick]);

  if (loading)
    return (
      <p className="text-center py-10 animate-pulse">Cargando avance...</p>
    );
  if (error)
    return (
      <p className="text-center py-10 text-red-500">Error: {error.message}</p>
    );

  return (
    <div className="grid grid-cols-1 gap-6">
      {rows.map((r) => (
        <Card
          key={r.id}
          className={cn(
            "overflow-hidden border-l-4 shadow-sm transition-all duration-300 hover:shadow-md",
            r.tieneCuelloBotella ? "border-l-orange-500" : "border-l-blue-600",
          )}
        >
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-bold uppercase">
                    {r.proyecto}
                  </CardTitle>
                  {r.tieneCuelloBotella && (
                    <Badge
                      variant="destructive"
                      className="animate-pulse gap-1 text-[10px]"
                    >
                      <AlertTriangle className="h-3 w-3" /> CUELLO DE BOTELLA
                    </Badge>
                  )}
                  {r.pct === 100 && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      Est: <b>{r.totalEstimado}m</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span>
                      Real: <b>{r.totalReal}m</b>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Progreso</span>
                    <span>{r.pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-700",
                        r.color,
                      )}
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(r.procesos).map(
                ([nombre, stat]: [string, any]) => {
                  const procPct = Math.round((stat.actual / stat.meta) * 100);
                  return (
                    <div
                      key={nombre}
                      className="relative p-3 rounded-xl border border-neutral-100 bg-white/50 dark:bg-neutral-900/40 dark:border-neutral-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold uppercase text-neutral-500 tracking-wider">
                          {nombre}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                          {stat.actual}/{stat.meta}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {/* Barra de progreso miniatura */}
                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500/70"
                            style={{ width: `${procPct}%` }}
                          />
                        </div>

                        {/* Tiempos del proceso */}
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t pt-2 dark:border-neutral-800">
                          <div className="flex flex-col">
                            <span>Estimado</span>
                            <span className="font-bold text-neutral-700 dark:text-neutral-300">
                              {Math.round(stat.estimado)}m
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span>Tiempo Real</span>
                            <span
                              className={cn(
                                "font-bold",
                                stat.real > stat.estimado
                                  ? "text-orange-600"
                                  : "text-emerald-600",
                              )}
                            >
                              {Math.round(stat.real)}m
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
