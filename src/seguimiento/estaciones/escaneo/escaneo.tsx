import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Barcode,
  User,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

/* --------------------------------- Tipos ---------------------------------- */
type ScanStatus = "ok" | "error" | "warning";

interface ScanItem {
  id: string; // uuid-like
  employeeId: string;
  workOrder: string;
  ts: string; // ISO timestamp
  status: ScanStatus;
  note?: string;
}

/* ------------------------- Util: persistencia simple ----------------------- */
const LS_KEY = "trackingv2.scanstation.recent";

function readScans(): ScanItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScans(items: ScanItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ----------------------------- Componente Page ----------------------------- */
export default function ScanStation() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [locked, setLocked] = useState(false); // operador bloqueado una vez capturado
  const [workOrder, setWorkOrder] = useState("");
  const [recent, setRecent] = useState<ScanItem[]>(() => readScans());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5; // <— Requerido: paginación de 5

  const woInputRef = useRef<HTMLInputElement | null>(null);
  const empInputRef = useRef<HTMLInputElement | null>(null);

  // Enfoque inicial
  useEffect(() => {
    if (!locked) empInputRef.current?.focus();
    else woInputRef.current?.focus();
  }, [locked]);

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    writeScans(recent);
  }, [recent]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return recent.filter((r) => new Date(r.ts).toDateString() === today).length;
  }, [recent]);

  const totalPages = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return recent
      .slice()
      .sort((a, b) => +new Date(b.ts) - +new Date(a.ts))
      .slice(start, start + PAGE_SIZE);
  }, [recent, pageSafe]);

  function validateEmployee(id: string) {
    // Reglas ejemplo: 4–8 dígitos. Ajusta a tu lógica real (API/regex)
    return /^\d{4,8}$/.test(id);
  }

  function validateWorkOrder(wo: string) {
    // Alfanumérica con guiones. Ajusta a tu lógica real
    return /^[A-Za-z0-9\-]{3,}$/i.test(wo);
  }

  function handleLockOperator() {
    if (!validateEmployee(employeeId)) {
      return alert("Número de empleado inválido (4–8 dígitos).");
    }
    setLocked(true);
    setTimeout(() => woInputRef.current?.focus(), 0);
  }

  function handleChangeOperator() {
    setLocked(false);
    setEmployeeId("");
    setTimeout(() => empInputRef.current?.focus(), 0);
  }

  function addScan(status: ScanStatus, note?: string) {
    const item: ScanItem = {
      id: uuid(),
      employeeId,
      workOrder,
      ts: new Date().toISOString(),
      status,
      note,
    };
    setRecent((prev) => [item, ...prev].slice(0, 200)); // mantener histórico razonable
    setWorkOrder("");
    setPage(1);
    setTimeout(() => woInputRef.current?.focus(), 0);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!locked) {
      return handleLockOperator();
    }
    if (!validateWorkOrder(workOrder)) {
      addScan("error", "Formato de Work Order inválido");
      return;
    }
    // Aquí iría tu validación real contra API/ERP (existencia, estado, etc.)
    // Simulamos OK si empieza con WO o OP; warning si otra cosa
    const isOk = /^(WO|OP)/i.test(workOrder);
    if (isOk) addScan("ok");
    else addScan("warning", "WO no estándar (se registró igualmente)");
  }

  function clearHistory() {
    if (!confirm("¿Borrar historial local de escaneos?")) return;
    setRecent([]);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Estación de Escaneo
        </motion.h1>
        <p className="text-sm text-muted-foreground">
          Captura de operador y Work Order · Pagina las últimas 5
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Panel de captura */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Operador & Work Order</CardTitle>
            <CardDescription>
              Primero captura tu número de empleado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label>Número de empleado</Label>
                <div className="mt-1 flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={empInputRef}
                    inputMode="numeric"
                    disabled={locked}
                    placeholder="Ej. 1234"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value.trim())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLockOperator();
                    }}
                  />
                </div>
                {!locked && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    4–8 dígitos · Presiona Enter para continuar
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <Label>Work Order</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Barcode className="h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={woInputRef}
                    placeholder="WO-123456 o OP-XXXX"
                    value={workOrder}
                    onChange={(e) => setWorkOrder(e.target.value.trim())}
                    disabled={!locked}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmit();
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Captura y presiona Enter
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                {!locked ? (
                  <Button type="button" onClick={handleLockOperator}>
                    Continuar
                  </Button>
                ) : (
                  <>
                    <Button type="submit">Registrar</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleChangeOperator}
                    >
                      Cambiar operador
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span>
                Escaneos hoy:{" "}
                <span className="font-medium text-foreground">
                  {todayCount}
                </span>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={clearHistory}
            >
              <Trash2 className="h-4 w-4" /> Limpiar historial
            </Button>
          </CardFooter>
        </Card>

        {/* Listado reciente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Últimas Work Orders</CardTitle>
            <CardDescription>
              Historial local (recientes primero) — paginado de 5
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      Fecha/Hora
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Empleado
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Work Order
                    </TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead>Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slice.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Aún no hay escaneos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    slice.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">
                          {new Date(r.ts).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.employeeId}
                        </TableCell>
                        <TableCell className="font-mono">
                          {r.workOrder}
                        </TableCell>
                        <TableCell className="text-center">
                          {r.status === "ok" && (
                            <Badge className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> OK
                            </Badge>
                          )}
                          {r.status === "warning" && (
                            <Badge variant="secondary" className="gap-1">
                              <AlertCircle className="h-3 w-3" /> Aviso
                            </Badge>
                          )}
                          {r.status === "error" && (
                            <Badge variant="outline" className="gap-1">
                              <AlertCircle className="h-3 w-3" /> Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.note || ""}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <Separator className="my-4" />

            {/* Paginación */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Página <span className="font-medium">{pageSafe}</span> de{" "}
                <span className="font-medium">{totalPages}</span> —{" "}
                {recent.length} registro(s)
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={pageSafe <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={pageSafe >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas (opcional) */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Regresar
        </Button>
      </div>

      {/* Indicador visual simple del flujo */}
      <div className="mt-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Flujo</CardTitle>
            <CardDescription>
              1) Captura empleado · 2) Captura WO · 3) Enter para registrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={locked ? (workOrder ? 90 : 60) : 30} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
