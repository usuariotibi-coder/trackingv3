import React, { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

/* ----------------- Tipos ----------------- */
type Estado = "done" | "in_progress" | "pending" | "scrap";
type Paso = { key: string; label: string; minutos: number; estado: Estado };

type Pieza = {
  id: string | number; // 💡 Simplicado: ID numérico para el detalle
  op: string;
  plano: string;
  proyecto: string;
  categoria?: "A" | "B" | "C";
  procesos: Paso[];
  createdAt?: string;
};

interface ProcesoOperacion {
  proceso: {
    nombre: string;
  };
  tiempoEstimado: number | null;
  estado: Estado;
}

interface WorkOrderQueryResult {
  operaciones:
    | {
        id: string | number; // El ID numérico del GraphQL
        operacion: string;
        workorder: {
          plano: string;
          categoria: string;
          proyecto: {
            proyecto: string;
          };
        };
        procesos: ProcesoOperacion[];
      }[]
    | null;
}

/* ----------------- Mocks de ejemplo ----------------- */
const MOCK_PIEZAS: Pieza[] = [
  {
    id: "1",
    op: "OP-3272-0001",
    plano: "3272-A-001",
    proyecto: "3272",
    categoria: "B",
    createdAt: "2025-10-27T09:00:00Z",
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
        label: "Inspección / Limpieza",
        minutos: 0,
        estado: "pending",
      },
      { key: "calidad", label: "Calidad", minutos: 0, estado: "pending" },
    ],
  },
  {
    id: "2",
    op: "OP-5001-0007",
    plano: "5001-B-220",
    proyecto: "5001",
    categoria: "A",
    createdAt: "2025-10-28T15:20:00Z",
    procesos: [
      { key: "corte", label: "Corte", minutos: 20, estado: "done" },
      {
        key: "programacion",
        label: "Programación CNC",
        minutos: 30,
        estado: "done",
      },
      { key: "maquinado", label: "Maquinado CNC", minutos: 90, estado: "done" },
      { key: "paileria", label: "Pailería", minutos: 35, estado: "done" },
      { key: "pintura", label: "Pintura", minutos: 45, estado: "in_progress" },
      { key: "inspeccion", label: "Inspección", minutos: 0, estado: "pending" },
      { key: "calidad", label: "Calidad", minutos: 0, estado: "pending" },
    ],
  },
  {
    id: "3",
    op: "OP-DEMO-0001",
    plano: "1000-Z-015",
    proyecto: "1000",
    categoria: "C",
    createdAt: "2025-10-29T11:10:00Z",
    procesos: [
      { key: "corte", label: "Corte", minutos: 0, estado: "pending" },
      {
        key: "programacion",
        label: "Programación CNC",
        minutos: 0,
        estado: "pending",
      },
      {
        key: "maquinado",
        label: "Maquinado CNC",
        minutos: 0,
        estado: "pending",
      },
      { key: "paileria", label: "Pailería", minutos: 0, estado: "pending" },
      { key: "pintura", label: "Pintura", minutos: 0, estado: "pending" },
      { key: "inspeccion", label: "Inspección", minutos: 0, estado: "pending" },
      { key: "calidad", label: "Calidad", minutos: 0, estado: "pending" },
    ],
  },
  {
    id: "4",
    op: "OP-4200-0033",
    plano: "4200-C-110",
    proyecto: "4200",
    categoria: "B",
    createdAt: "2025-10-22T08:00:00Z",
    procesos: [
      { key: "corte", label: "Corte", minutos: 15, estado: "done" },
      {
        key: "programacion",
        label: "Programación CNC",
        minutos: 20,
        estado: "done",
      },
      { key: "maquinado", label: "Maquinado CNC", minutos: 50, estado: "done" },
      { key: "paileria", label: "Pailería", minutos: 40, estado: "done" },
      { key: "pintura", label: "Pintura", minutos: 30, estado: "done" },
      { key: "inspeccion", label: "Inspección", minutos: 25, estado: "done" },
      { key: "calidad", label: "Calidad", minutos: 15, estado: "done" },
    ],
  },
];

/* ----------------- Utilidades ----------------- */
function computeStats(p: Pieza) {
  const doneCount = p.procesos.filter((x) => x.estado === "done").length;
  const inProgressCount = p.procesos.filter(
    (x) => x.estado === "in_progress"
  ).length;
  const total = p.procesos.length;
  const completedRatio = Math.round(
    ((doneCount + inProgressCount * 0.5) / total) * 100
  );
  const spentMinutes = p.procesos
    .filter((x) => x.estado !== "pending")
    .reduce((a, b) => a + b.minutos, 0);

  let estado: Estado = "pending";
  if (inProgressCount > 0) estado = "in_progress";
  if (doneCount === total) estado = "done";

  return { completedRatio, spentMinutes, estado };
}

function estadoBadge(estado: Estado) {
  if (estado === "done") return <Badge>Completado</Badge>;
  if (estado === "in_progress")
    return <Badge variant="secondary">En proceso</Badge>;
  return <Badge variant="outline">Pendiente</Badge>;
}

function categoriaBadge(cat?: Pieza["categoria"]) {
  if (!cat) return <Badge variant="outline">—</Badge>;
  const variants: Record<
    NonNullable<Pieza["categoria"]>,
    React.ComponentProps<typeof Badge>["variant"]
  > = {
    A: "default",
    B: "secondary",
    C: "outline",
  };
  return <Badge variant={variants[cat]}>{cat}</Badge>;
}

/* ----------------- Página ----------------- */
export default function PiezasDashboard() {
  const GET_DATOS = gql`
    query {
      operaciones {
        id
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

  const { loading, error, data } = useQuery<WorkOrderQueryResult>(GET_DATOS);

  // Mapear la data de GraphQL (operaciones) al tipo Pieza
  const apiPiezas: Pieza[] = useMemo(() => {
    if (loading || error || !data?.operaciones) {
      return [];
    }

    return data.operaciones.map((op) => {
      // Mapeamos los procesos
      const procesos: Paso[] = op.procesos.map((pr) => ({
        key: pr.proceso.nombre.toLowerCase().replace(/\s/g, "_"),
        label: pr.proceso.nombre,
        minutos: pr.tiempoEstimado || 0,
        estado: pr.estado,
      }));

      return {
        id: op.id.toString(), // Usamos el ID de la base para el enlace
        op: op.operacion,
        plano: op.workorder.plano,
        proyecto: op.workorder.proyecto.proyecto,
        categoria: op.workorder.categoria as Pieza["categoria"],
        procesos: procesos,
      } as Pieza;
    });
  }, [data, loading, error]);

  // Usar los mocks SOLO si no hay data de la API (y no hay error, si hay error mostramos info)
  const finalPiezas = apiPiezas.length > 0 ? apiPiezas : MOCK_PIEZAS;

  const [search, setSearch] = useState("");
  const [proyecto, setProyecto] = useState<string>("all");
  const [estado, setEstado] = useState<"all" | Estado>("all");
  const [categoria, setCategoria] = useState<"all" | "A" | "B" | "C">("all");
  const [sortBy, setSortBy] = useState<
    "fecha_desc" | "progreso_desc" | "tiempo_desc"
  >("fecha_desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Generar la lista de proyectos únicos desde la data final
  const proyectosUnicos = useMemo(
    () => Array.from(new Set(finalPiezas.map((p) => p.proyecto))).sort(),
    [finalPiezas]
  );

  // Filtrar sobre la data final
  const filtered = useMemo(() => {
    let rows = finalPiezas.map((p) => ({ pieza: p, stats: computeStats(p) }));

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        ({ pieza }) =>
          pieza.op.toLowerCase().includes(q) ||
          pieza.plano.toLowerCase().includes(q)
      );
    }

    if (proyecto !== "all") {
      rows = rows.filter(({ pieza }) => pieza.proyecto === proyecto);
    }

    if (categoria !== "all") {
      rows = rows.filter(({ pieza }) => pieza.categoria === categoria);
    }

    if (estado !== "all") {
      rows = rows.filter(({ stats }) => stats.estado === estado);
    }

    // Ordenamiento
    rows.sort((a, b) => {
      if (sortBy === "fecha_desc") {
        const ad = a.pieza.createdAt ? Date.parse(a.pieza.createdAt) : 0;
        const bd = b.pieza.createdAt ? Date.parse(b.pieza.createdAt) : 0;
        return bd - ad;
      }
      if (sortBy === "progreso_desc") {
        return b.stats.completedRatio - a.stats.completedRatio;
      }
      // tiempo_desc
      return b.stats.spentMinutes - a.stats.spentMinutes;
    });

    return rows;
  }, [search, proyecto, estado, categoria, sortBy, finalPiezas]);

  // Paginación
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  // Manejo de estados de carga y error para el UX
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg text-muted-foreground mt-20"
        >
          Cargando datos de piezas...
        </motion.p>
      </div>
    );
  }

  if (error && apiPiezas.length === 0) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-red-600 mb-4">
          Error de Conexión 🚨
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Hubo un problema al cargar la información: {error.message}
        </p>
        <p className="text-sm text-gray-500">
          Se mostrarán los datos de ejemplo (MOCK_PIEZAS) como fallback.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Piezas
        </motion.h1>
        <p className="text-sm text-muted-foreground">
          Listado general y estado de avance
        </p>
      </div>

      {/* Controles */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros y orden</CardTitle>
          <CardDescription>
            Busca por OP o Plano, filtra y ordena resultados
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Label className="mb-1 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="OP-XXXX o Plano"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Proyecto</Label>
            <Select
              value={proyecto}
              onValueChange={(v) => {
                setProyecto(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {proyectosUnicos.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">Estado</Label>
            <Select
              value={estado}
              onValueChange={(v) => {
                setEstado(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="in_progress">En proceso</SelectItem>
                <SelectItem value="done">Completado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">Categoría</Label>
            <Select
              value={categoria}
              onValueChange={(v) => {
                setCategoria(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block">Ordenar por</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fecha_desc">Fecha (reciente)</SelectItem>
                <SelectItem value="progreso_desc">Progreso (%)</SelectItem>
                <SelectItem value="tiempo_desc">
                  Tiempo acumulado (min)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Resultados</CardTitle>
              <CardDescription>{total} pieza(s) encontradas</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              Limpiar filtros
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">OP</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead className="text-center">Categoría</TableHead>
                  <TableHead className="w-64">Progreso</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Tiempo (min)
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {slice.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <p className="text-sm text-muted-foreground">
                        No hay piezas para los filtros actuales.
                      </p>
                    </TableCell>
                  </TableRow>
                )}

                {slice.map(({ pieza, stats }) => (
                  <TableRow key={pieza.op}>
                    <TableCell className="font-medium">{pieza.op}</TableCell>
                    <TableCell>{pieza.plano}</TableCell>
                    <TableCell>{pieza.proyecto}</TableCell>
                    <TableCell className="text-center">
                      {categoriaBadge(pieza.categoria)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={stats.completedRatio} />
                        <span className="text-sm w-12 text-right">
                          {stats.completedRatio}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {estadoBadge(stats.estado)}
                    </TableCell>
                    <TableCell className="text-right">
                      {stats.spentMinutes}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        {/* Usamos el ID de la base para el enlace */}
                        <Link to={`/pieza/${pieza.id}`}>Ver detalle</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          <Separator className="my-4" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Página <span className="font-medium">{pageSafe}</span> de{" "}
              <span className="font-medium">{totalPages}</span> — {total}{" "}
              resultado(s)
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Por página</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(parseInt(v, 10));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 8, 10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {/* <ChevronLeft className="h-4 w-4" /> */}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {/* <ChevronRight className="h-4 w-4" /> */}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
