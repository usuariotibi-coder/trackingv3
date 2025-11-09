import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
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
import { CheckCircle2, Clock, Circle, XCircle } from "lucide-react"; // Importar XCircle para 'scrap'

// ---------- Tipos ----------

type DisplayPaso = {
  key: string;
  label: string;
  minutos: number;
  estado: Estado;
};

type Estado = "pending" | "in_progress" | "done" | "scrap";

interface ProcesoOperacion {
  proceso: {
    nombre: string;
  };
  tiempoEstimado: number | null; // Usamos el campo de tu query
  estado: Estado;
}

// 💡 AJUSTE DE TIPO: Esperamos un objeto 'operacion' en la raíz
interface OperacionQueryResult {
  operacion: {
    // Los campos de la operación en sí
    operacion: string; // Añadido operacion aquí para evitar errores de tipo
    workorder: {
      plano: string;
      categoria: string;
      proyecto: {
        proyecto: string;
      };
    };
    procesos: ProcesoOperacion[];
  } | null;
}

// ---------- Utilidad de Ordenamiento (NUEVO) ----------

/**
 * Asigna un valor de prioridad a cada estado para el ordenamiento:
 * scrap (1) > done (2) > in_progress (3) > pending (4)
 */
function getEstadoOrder(estado: Estado): number {
  switch (estado) {
    case "scrap":
      return 1;
    case "done":
      return 2;
    case "in_progress":
      return 3;
    case "pending":
    default:
      return 4;
  }
}

// ---------- Página ----------
export default function PiezaDashboard() {
  const { id } = useParams();

  const GET_DATOS = gql`
    query GetOperacion($id: ID!) {
      operacion(id: $id) {
        operacion
        workorder {
          plano
          categoria
          proyecto {
            proyecto
          }
        }
        procesos {
          tiempoEstimado
          estado
          proceso {
            nombre
          }
        }
      }
    }
  `;

  const {
    loading: loading,
    error: error,
    data: data,
  } = useQuery<OperacionQueryResult>(GET_DATOS, {
    variables: {
      id: id,
    },
  });

  const operacion = data?.operacion;

  const showData = () => {
    console.log(loading);
    console.log(error);
    console.log(data);
  };

  const displayProcesos: DisplayPaso[] = useMemo(() => {
    if (!operacion || !operacion.procesos) return [];

    const procesos = operacion.procesos.map((p, index) => ({
      key: `${p.proceso.nombre}-${index}`,
      label: p.proceso.nombre,
      minutos: p.tiempoEstimado ? parseFloat(p.tiempoEstimado.toString()) : 0,
      estado: p.estado,
    }));

    // Lógica de ordenamiento:
    procesos.sort((a, b) => {
      return getEstadoOrder(a.estado) - getEstadoOrder(b.estado);
    });

    return procesos;
  }, [operacion]);

  const totals = useMemo(() => {
    const DONECount = displayProcesos.filter((p) => p.estado === "done").length;
    const inProgressCount = displayProcesos.filter(
      (p) => p.estado === "in_progress"
    ).length;
    const totalSteps = displayProcesos.length;

    // Evita división por cero si no hay procesos
    const completedRatio =
      totalSteps > 0
        ? ((DONECount + inProgressCount * 0.5) / totalSteps) * 100
        : 0;

    const spentMinutes = displayProcesos
      .filter((p) => p.estado === "done" || p.estado === "in_progress")
      .reduce((acc, p) => acc + p.minutos, 0);

    return {
      DONECount,
      inProgressCount,
      totalSteps,
      completedRatio: Math.round(completedRatio),
      spentMinutes: Math.round(spentMinutes), // Redondea los minutos totales
    };
  }, [displayProcesos]);

  // Si no hay data para mostrar, se mantiene la UX de carga/error
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg text-muted-foreground mt-20"
        >
          Cargando datos de la operación **{id}**...
        </motion.p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-red-600 mb-4">
          Error de Conexión 🚨
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Hubo un problema al cargar la información: {error.message}
        </p>
      </div>
    );
  }

  // Fallback si no encuentra la operación
  if (!operacion) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">
          Pieza no encontrada 🔎
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          No se encontró la operación con el ID: **{id}**
        </p>
      </div>
    );
  }

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
              <span className="font-medium">{operacion.operacion}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{operacion.workorder.plano}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proyecto</span>
              <span className="font-medium">
                {operacion.workorder.proyecto.proyecto}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Categoría</span>
              <Badge variant="outline">
                {operacion.workorder.categoria || "—"}
              </Badge>
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
                let icon: React.ReactNode;
                let tone: string;
                let badgeText: string;

                if (p.estado === "done") {
                  icon = <CheckCircle2 className="h-4 w-4" />;
                  tone = "bg-emerald-50 border-emerald-200 text-emerald-800";
                  badgeText = "Completado";
                } else if (p.estado === "in_progress") {
                  icon = <Clock className="h-4 w-4" />;
                  tone = "bg-amber-50 border-amber-200 text-amber-800";
                  badgeText = "En proceso";
                } else if (p.estado === "scrap") {
                  icon = <XCircle className="h-4 w-4" />; // Usar XCircle
                  tone = "bg-red-50 border-red-200 text-red-800";
                  badgeText = "Scrap";
                } else {
                  // pending
                  icon = <Circle className="h-4 w-4" />;
                  tone = "bg-muted text-foreground/70 border";
                  badgeText = "Pendiente";
                }

                return (
                  <li key={p.key} className="relative pl-10 py-2">
                    {/* Nodo */}
                    <span
                      className={`absolute left-0 top-[10px] -translate-y-1/2 grid place-items-center h-5 w-5 rounded-full ${
                        p.estado === "done"
                          ? "bg-emerald-500 text-white"
                          : "bg-background border"
                      }`}
                    >
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
                          <Badge variant="outline">{badgeText}</Badge>
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
                      {p.estado === "done" && <Badge>Completado</Badge>}
                      {p.estado === "in_progress" && (
                        <Badge variant="secondary">En proceso</Badge>
                      )}
                      {p.estado === "scrap" && (
                        <Badge variant="destructive">Scrap</Badge> // Usar variante destructiva
                      )}
                      {p.estado === "pending" && (
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
