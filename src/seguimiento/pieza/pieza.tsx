"use client";

import { gql } from "@apollo/client";
import { useQuery, useSubscription } from "@apollo/client/react";
import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Clock, Circle } from "lucide-react";

// ---------- Mock (simulación de datos) ----------
// En el futuro, esto vendrá de tu API usando el parámetro "op".
type Estado = "PENDING" | "IN_PROGRESS" | "DONE";

interface ProcesoProyecto {
  proceso: {
    nombre: string;
  };
  tiempo: number | null; // DecimalField en Python se mapea a number en JS
  estado: Estado; // El ENUM/ChoiceField de tu modelo Django
}

type DisplayPaso = {
  key: string;
  label: string;
  minutos: number;
  estado: Estado;
};

interface ProyectoQueryResult {
  proyecto: {
    id: string;
    plano: string;
    proyecto: string;
    tipo: string;
    material: string;
    categoria: string;
    operacion: string;
    procesos: ProcesoProyecto[];
  } | null;
}

interface ProcesoProyectoSubscription {
  proceso: {
    nombre: string;
  };
  tiempo: number | null;
  estado: Estado; // Asumiendo que 'Estado' ya está definido
}

interface EstadoProcesoSubscriptionResult {
  estadoProcesoActualizado: ProcesoProyectoSubscription | null;
}

// ---------- Página ----------
export default function PiezaDashboard() {
  const { id } = useParams();

  const GET_DATOS = gql`
    query GetProyecto($id: ID!) {
      proyecto(id: $id) {
        id
        plano
        proyecto
        tipo
        material
        categoria
        operacion
        procesos {
          proceso {
            nombre
          }
          tiempo
          estado
        }
      }
    }
  `;

  const {
    loading: loading,
    error: error,
    data: data,
  } = useQuery<ProyectoQueryResult>(GET_DATOS, {
    variables: {
      id: id,
    },
  });

  const ESTADO_SUBSCRIPTION = gql`
    subscription EstadoProcesoActualizado($proyecto: ID!) {
      estadoProcesoActualizado(proyecto: $proyecto) {
        proceso {
          nombre
        }
        tiempo
        estado
      }
    }
  `;

  // En tu componente:
  const { data: subData } = useSubscription<EstadoProcesoSubscriptionResult>(
    ESTADO_SUBSCRIPTION,
    {
      variables: { proyecto: id },
    }
  );

  const mergedProyecto = useMemo(() => {
    let currentProyecto = data?.proyecto;

    if (subData && currentProyecto) {
      const updatedProceso = subData?.estadoProcesoActualizado;

      if (updatedProceso) {
        const updatedProcesos = currentProyecto.procesos.map((p) => {
          if (p.proceso.nombre === updatedProceso.proceso.nombre) {
            return updatedProceso;
          }
          return p;
        });

        return {
          ...currentProyecto,
          procesos: updatedProcesos,
        };
      }
    }

    return currentProyecto;
  }, [data, subData]);

  const proyecto = mergedProyecto;

  const showData = () => {
    console.log(subData);
  };

  const displayProcesos: DisplayPaso[] = useMemo(() => {
    if (!proyecto || !proyecto.procesos) return [];

    return proyecto.procesos.map((p, index) => ({
      key: `${p.proceso.nombre}-${index}`,
      label: p.proceso.nombre,
      // Asegúrate de manejar `null` o convertir a `number`
      minutos: p.tiempo ? parseFloat(p.tiempo.toString()) : 0,
      estado: p.estado,
    }));
  }, [proyecto]);

  const totals = useMemo(() => {
    const DONECount = displayProcesos.filter((p) => p.estado === "DONE").length;
    const inProgressCount = displayProcesos.filter(
      (p) => p.estado === "IN_PROGRESS"
    ).length;
    const totalSteps = displayProcesos.length;

    // Evita división por cero si no hay procesos
    const completedRatio =
      totalSteps > 0
        ? ((DONECount + inProgressCount * 0.5) / totalSteps) * 100
        : 0;

    const spentMinutes = displayProcesos
      .filter((p) => p.estado === "DONE" || p.estado === "IN_PROGRESS")
      .reduce((acc, p) => acc + p.minutos, 0);

    return {
      DONECount,
      inProgressCount,
      totalSteps,
      completedRatio: Math.round(completedRatio),
      spentMinutes: Math.round(spentMinutes), // Redondea los minutos totales
    };
  }, [displayProcesos]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
          onClick={showData}
        >
          Seguimiento de pieza
        </motion.h1>
        <p className="text-sm text-muted-foreground">
          Avance por procesos y tiempos registrados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resumen izquierda */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Información de la pieza</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Operación</span>
              <span className="font-medium">{proyecto?.operacion}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{proyecto?.plano}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proyecto</span>
              <span className="font-medium">{proyecto?.proyecto}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Categoría</span>
              <Badge variant="outline">{proyecto?.categoria || "—"}</Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avance</span>
                <span className="font-medium">{totals.completedRatio}%</span>
              </div>
              <Progress value={totals.completedRatio} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tiempo acumulado</span>
              <span className="font-medium">{totals.spentMinutes} min</span>
            </div>
          </CardContent>
        </Card>

        {/* Timeline + Tabla */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ruta de procesos</CardTitle>
            <CardDescription>Estado actual y tiempos por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Timeline minimalista */}
            <ul className="relative ml-3 mb-6">
              {/* Línea vertical */}
              <div className="absolute left-[10px] top-0 bottom-0 w-[2px] bg-border" />
              {displayProcesos.map((p) => {
                const icon =
                  p.estado === "DONE" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : p.estado === "IN_PROGRESS" ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  );

                const tone =
                  p.estado === "DONE"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : p.estado === "IN_PROGRESS"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-muted text-foreground/70 border";

                return (
                  <li key={p.key} className="relative pl-10 py-2">
                    {/* Nodo */}
                    <span className="absolute left-0 top-[10px] -translate-y-1/2 grid place-items-center h-5 w-5 rounded-full bg-background border">
                      {icon}
                    </span>

                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className={`rounded-xl ${tone} px-3 py-2 border`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">{p.label}</div>
                        <div className="flex items-center gap-2">
                          {p.estado === "DONE" && (
                            <Badge variant="outline">Completado</Badge>
                          )}
                          {p.estado === "IN_PROGRESS" && (
                            <Badge variant="outline">En proceso</Badge>
                          )}
                          {p.estado === "PENDING" && (
                            <Badge variant="outline">Pendiente</Badge>
                          )}
                          <span className="text-sm">{p.minutos} min</span>
                        </div>
                      </div>
                    </motion.div>
                  </li>
                );
              })}
            </ul>

            <Separator className="my-4" />

            {/* Tabla de tiempos */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Proceso</TableHead>
                  <TableHead className="text-center">Minutos</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProcesos.map((p, i) => (
                  <TableRow key={p.key}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell>{p.label}</TableCell>
                    <TableCell className="text-center">{p.minutos}</TableCell>
                    <TableCell className="text-center">
                      {p.estado === "DONE" && <Badge>Completado</Badge>}
                      {p.estado === "IN_PROGRESS" && (
                        <Badge variant="secondary">En proceso</Badge>
                      )}
                      {p.estado === "PENDING" && (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell />
                  <TableCell className="font-medium">
                    Total (completado + en proceso)
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {totals.spentMinutes}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
