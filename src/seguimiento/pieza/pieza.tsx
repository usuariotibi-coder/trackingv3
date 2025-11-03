"use client";

import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

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
type Estado = "done" | "in_progress" | "pending";

type Paso = {
  key: string;
  label: string;
  minutos: number; // cuanto tardó (o estimado si pending)
  estado: Estado;
};

type Pieza = {
  op: string;
  plano: string;
  proyecto: string;
  categoria?: "A" | "B" | "C";
  procesos: Paso[];
};

// Simula un fetch por OP
function getMockByOp(op: string): Pieza {
  // Puedes ramificar por OP si quieres diferentes ejemplos
  return {
    op,
    plano: "3272-A-001",
    proyecto: "3272",
    categoria: "B",
    procesos: [
      { key: "corte", label: "Corte", minutos: 18, estado: "done" },
      {
        key: "programacion",
        label: "Programación CNC",
        minutos: 25,
        estado: "done",
      },
      {
        key: "maquinado",
        label: "Maquinado CNC",
        minutos: 60,
        estado: "in_progress",
      },
      { key: "paileria", label: "Pailería", minutos: 0, estado: "pending" },
      { key: "pintura", label: "Pintura", minutos: 0, estado: "pending" },
      {
        key: "inspeccion",
        label: "Inspección / Limpieza / Acabados",
        minutos: 0,
        estado: "pending",
      },
      { key: "calidad", label: "Calidad", minutos: 0, estado: "pending" },
    ],
  };
}

// ---------- Página ----------
export default function PiezaDashboard({ params }: { params: { op: string } }) {
  const GET_DATOS = gql`
    query GetDatos {
      procesos {
        id
        nombre
      }
    }
  `;

  const { loading: loading, error: error, data: data } = useQuery(GET_DATOS);

  const showData = () => {
    console.log(loading);
    console.log(error);
    console.log(data);
  };

  const pieza = useMemo(
    () => getMockByOp(decodeURIComponent(params.op)),
    [params.op]
  );

  const totals = useMemo(() => {
    const doneCount = pieza.procesos.filter((p) => p.estado === "done").length;
    const inProgressCount = pieza.procesos.filter(
      (p) => p.estado === "in_progress"
    ).length;
    const totalSteps = pieza.procesos.length;
    const completedRatio =
      ((doneCount + inProgressCount * 0.5) / totalSteps) * 100;

    const spentMinutes = pieza.procesos
      .filter((p) => p.estado === "done" || p.estado === "in_progress")
      .reduce((acc, p) => acc + p.minutos, 0);

    return {
      doneCount,
      inProgressCount,
      totalSteps,
      completedRatio: Math.round(completedRatio),
      spentMinutes,
    };
  }, [pieza]);

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
              <span className="font-medium">{pieza.op}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{pieza.plano}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proyecto</span>
              <span className="font-medium">{pieza.proyecto}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Categoría</span>
              <Badge variant="outline">{pieza.categoria || "—"}</Badge>
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
              {pieza.procesos.map((p) => {
                const icon =
                  p.estado === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : p.estado === "in_progress" ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  );

                const tone =
                  p.estado === "done"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : p.estado === "in_progress"
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
                          {p.estado === "done" && (
                            <Badge variant="outline">Completado</Badge>
                          )}
                          {p.estado === "in_progress" && (
                            <Badge variant="outline">En proceso</Badge>
                          )}
                          {p.estado === "pending" && (
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
                  <TableHead className="text-right">Minutos</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pieza.procesos.map((p, i) => (
                  <TableRow key={p.key}>
                    <TableCell className="text-center">{i + 1}</TableCell>
                    <TableCell>{p.label}</TableCell>
                    <TableCell className="text-right">{p.minutos}</TableCell>
                    <TableCell className="text-center">
                      {p.estado === "done" && <Badge>Completado</Badge>}
                      {p.estado === "in_progress" && (
                        <Badge variant="secondary">En proceso</Badge>
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
                  <TableCell className="text-right font-medium">
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
