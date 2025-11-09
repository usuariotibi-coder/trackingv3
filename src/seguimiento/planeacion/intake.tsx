import { useMemo, useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Printer, QrCode, PlusCircle, Trash2, TimerReset } from "lucide-react";

/**
 * Sistema de Seguimiento — Página de recepción de planos
 *
 * Qué hace este componente:
 * - Captura los metadatos del plano liberado por Diseño
 * - Permite seleccionar procesos y asignar tiempos (minutos)
 * - Genera No. de operación (editable)
 * - Genera un QR con los datos clave para rastreo en piso
 * - Muestra una vista de impresión en formato hoja para pegar al plano
 *
 * Requisitos:
 * - shadcn/ui instalado
 * - tailwind
 * - paquetes: framer-motion, qrcode.react, sonner
 *
 * Sugerencia de ruta: app/seguimiento/intake/page.tsx
 */

// Catálogos básicos
const TIPOS = [
  { value: "Maquinado", label: "Maquinado" },
  { value: "Estructura", label: "Estructura" },
  { value: "Maquinado/Estructura", label: "Mixto (Maquinado/Estructura)" },
];

const MATERIALES = [
  { value: "Acero", label: "Acero" },
  { value: "Aluminio", label: "Aluminio" },
  { value: "RedPlank", label: "RedPlank" },
  { value: "Uretano", label: "Uretano" },
];

const CATEGORIAS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
];

// Procesos estándar (puedes ajustar el orden)
const PROCESOS_PRESET = [
  { key: 1, enabled: false, label: "Corte", minutos: 0 },
  { key: 2, enabled: false, label: "Escuadre", minutos: 0 },
  { key: 3, enabled: false, label: "Programación CNC", minutos: 0 },
  { key: 4, enabled: false, label: "Maquinado CNC", minutos: 0 },
  { key: 5, enabled: false, label: "Pailería", minutos: 0 },
  { key: 6, enabled: false, label: "Pintura", minutos: 0 },
  {
    key: 7,
    enabled: false,
    label: "Inspección / Limpieza / Acabados",
    minutos: 0,
  },
  { key: 8, enabled: false, label: "Calidad", minutos: 0 },
  { key: 9, enabled: false, label: "Enviado a Externos", minutos: 0 },
  { key: 10, enabled: false, label: "Custom", minutos: 0 },
] as const;

type ProcesoKey = (typeof PROCESOS_PRESET)[number]["key"];

type Proceso = {
  key: ProcesoKey | number;
  label: string;
  enabled: boolean;
  minutos: string; // vacío hasta que el usuario defina
};

// ----------------------------------------
// TIPOS Y QUERY DE PROYECTOS (Añadido/Definido)
// ----------------------------------------
type Proyecto = {
  id: string;
  proyecto: string;
  descripcion: string;
};

// Se asume que este es el tipo de resultado de tu query.
type ProjectQueryResult = {
  proyectos: Proyecto[];
};

function nuevaOperacionSugerida(proyecto: string) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  // OP-<Proyecto>-YYMMDD-<ms>
  return `WO-${proyecto || "XXXX"}-${String(d.getFullYear()).slice(2)}${pad(
    d.getMonth() + 1
  )}${pad(d.getDate())}-${d.getHours()}${pad(d.getMinutes())}`;
}

export default function IntakeDePlanos() {
  const GET_DATOS = gql`
    query GetProyectos {
      proyectos {
        id
        proyecto
        descripcion
      }
    }
  `;

  const { loading, error, data } = useQuery<ProjectQueryResult>(GET_DATOS);
  const proyectos = data?.proyectos || [];

  const [noPlano, setNoPlano] = useState("");
  // noProyecto ahora almacena el ID (string) del proyecto seleccionado
  const [noProyecto, setNoProyecto] = useState("");
  const [tipo, setTipo] = useState<string | undefined>(undefined);
  const [material, setMaterial] = useState<string | undefined>(undefined);
  const [categoria, setCategoria] = useState<string | undefined>(undefined);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [observaciones, setObservaciones] = useState("");

  const [noOperacion, setNoOperacion] = useState("");
  const [procesos, setProcesos] = useState<Proceso[]>(
    PROCESOS_PRESET.map((p) => ({
      key: p.key,
      label: p.label,
      enabled: p.enabled, // false por defecto
      minutos: p.minutos === 0 ? "" : p.minutos,
    }))
  );

  const printRef = useRef<HTMLDivElement | null>(null);

  // Totales y payload del QR
  const totalMin = useMemo(
    () =>
      procesos.reduce(
        (acc, p) => acc + (p.enabled && p.minutos ? parseFloat(p.minutos) : 0),
        0
      ),
    [procesos]
  );

  const payloadQR = useMemo(() => {
    const activos = procesos
      .filter((p) => p.enabled)
      .map((p) => ({
        key: p.key,
        label: p.label,
        min: Number(p.minutos || 0),
      }));

    // Para el QR, usamos el ID del proyecto (noProyecto)
    return {
      op: noOperacion || nuevaOperacionSugerida(noProyecto),
      plano: noPlano,
      proyecto: noProyecto,
      tipo: tipo || null,
      material: material || null,
      categoria: categoria || null,
      procesos: activos,
      totalMin,
      ts: Date.now(),
    };
  }, [
    noOperacion,
    noPlano,
    noProyecto,
    tipo,
    material,
    categoria,
    procesos,
    totalMin,
  ]);

  const handleToggleProceso = (key: number, enabled: boolean) => {
    setProcesos((arr) =>
      arr.map((p) => {
        // Encuentra el proceso por su 'key'
        if (p.key === key) {
          return {
            ...p,
            enabled: enabled, // Establece el valor del checkbox (true o false)
            // Si se deshabilita, limpiamos los minutos
            minutos: enabled ? p.minutos : "",
          };
        }
        return p;
      })
    );
  };

  const handleMinutosChange = (key: number | string, value: string) => {
    // 1. Permite dígitos (0-9) y un punto decimal (.). Elimina cualquier otro carácter.
    let asNum = value.replace(/[^\d.]/g, "");

    // 2. Asegura que solo haya un punto decimal.
    const parts = asNum.split(".");
    if (parts.length > 2) {
      // Si hay más de un punto, usa el primer punto y descarta los demás.
      asNum = parts[0] + "." + parts.slice(1).join("");
    }

    // 3. Mejora la UX: Si el usuario escribe solo un punto, lo convertimos a "0."
    if (asNum === ".") {
      asNum = "0.";
    }

    setProcesos((arr) =>
      arr.map((p) => (p.key === key ? { ...p, minutos: asNum } : p))
    );
  };

  const addProcesoCustom = () => {
    // Generar una clave única (ej: timestamp o UUID simplificado)
    const nuevoKey = Date.now();

    setProcesos((arr) => [
      ...arr,
      {
        key: nuevoKey, // Asignar la clave única
        label: "Proceso personalizado",
        enabled: true,
        minutos: "",
      },
    ]);
  };

  const removeProceso = (key: number) => {
    setProcesos((arr) => arr.filter((p) => p.key !== key));
  };

  const sugerirOperacion = () => {
    const sug = nuevaOperacionSugerida(noProyecto);
    setNoOperacion(sug);
    toast.success("No. de operación sugerido generado");
  };

  const resetForm = () => {
    setNoPlano("");
    setNoProyecto("");
    setTipo(undefined);
    setMaterial(undefined);
    setCategoria(undefined);
    setArchivo(null);
    setObservaciones("");
    setNoOperacion("");
    setProcesos(
      PROCESOS_PRESET.map((p) => ({
        key: p.key,
        label: p.label,
        enabled: false,
        minutos: "",
      }))
    );
  };

  const handleSubmit = async () => {
    // 1. Prepara la lista de ProcesoPlano
    const procesos_operacion = procesos
      .filter((p) => p.enabled === true && p.minutos)
      .map((proceso) => ({
        // Usamos .key, que son los IDs de Proceso
        proceso: proceso.key,
        tiempo_estimado: parseFloat(proceso.minutos || "0"),
      }));

    // 2. Construir la data de la única Operacion
    const operacionData = {
      operacion: noOperacion,
      // La lista de procesos_plano va anidada DENTRO de la Operacion.
      procesos: procesos_operacion,
    };

    // 3. Prepara los datos finales (JSON payload)
    const jsonPayload = {
      // Campo de búsqueda del proyecto: Ahora es el ID del proyecto
      proyecto_num: noProyecto,

      // Campos que van al modelo Plano
      plano: noPlano,
      tipo: tipo,
      material: material,
      categoria: categoria,
      observaciones: observaciones,

      operacion_data: operacionData,
    };

    // 4. Construir el objeto FormData
    const formData = new FormData();

    if (archivo) {
      formData.append("archivo", archivo, archivo.name);
    }

    // Añadir el JSON payload como string.
    formData.append("data", JSON.stringify(jsonPayload));

    try {
      const response = await fetch(
        "https://tracking00-production.up.railway.app/api/workorder/",
        //"http://localhost:8000/api/workorder/",
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        toast.success("Plano y procesos guardados exitosamente");
        // resetForm();
      } else {
        const errorData = await response.json();
        console.error("Error del servidor (DRF):", errorData);
        toast.error("Error al guardar");
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      toast.error("Ocurrió un error de conexión.");
    }
  };

  const onPrint = () => {
    handleSubmit();
    if (!noPlano || !noProyecto) {
      toast.error(
        "Completa al menos No. de Plano y No. de Proyecto antes de imprimir"
      );
      return;
    }
    window.print();
  };

  const showData = () => {
    console.log("Payload QR:", payloadQR);
    console.log("Procesos:", procesos);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            Recepción de Planos — Manufactura
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Captura el plano liberado por Diseño, asigna procesos y tiempos, y
            genera la hoja con QR para seguimiento.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Columna izquierda: Formulario */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Datos del plano</CardTitle>
              <CardDescription>
                Los campos marcados con <span className="text-red-500">*</span>{" "}
                son obligatorios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="noPlano">No. de Plano *</Label>
                  <Input
                    id="noPlano"
                    placeholder="3272-A-001"
                    value={noPlano}
                    onChange={(e) => setNoPlano(e.target.value)}
                  />
                </div>
                {/* INICIO DEL CAMBIO: Select para No. de Proyecto */}
                <div>
                  <Label htmlFor="noProyecto">No. de Proyecto *</Label>
                  {loading ? (
                    <Input disabled placeholder="Cargando proyectos..." />
                  ) : error ? (
                    <Input disabled placeholder="Error al cargar proyectos" />
                  ) : (
                    <Select
                      value={noProyecto}
                      onValueChange={setNoProyecto} // noProyecto se establece al ID del proyecto
                    >
                      <SelectTrigger id="noProyecto">
                        <SelectValue placeholder="Selecciona un proyecto (ej: 3272)" />
                      </SelectTrigger>
                      <SelectContent>
                        {proyectos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.proyecto} — {p.descripcion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {/* FIN DEL CAMBIO: Select para No. de Proyecto */}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Material</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="A / B / C" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="archivo">Plano (PDF)</Label>
                  <Input
                    id="archivo"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  />
                  {archivo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {archivo.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label>No. de operación</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="WO-XXXX-YYMMDD-HHMM"
                      value={noOperacion}
                      onChange={(e) => setNoOperacion(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={sugerirOperacion}
                      disabled={!noProyecto} // Deshabilitar si no hay proyecto seleccionado
                    >
                      <TimerReset className="h-4 w-4 mr-1" /> Sugerir
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  placeholder="Notas para producción, material alterno, tolerancias críticas, etc."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Procesos y tiempos</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Total: {totalMin} min</Badge>
                    <Button size="sm" type="button" onClick={addProcesoCustom}>
                      <PlusCircle className="h-4 w-4 mr-1" /> Agregar proceso
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {procesos.map((p) => (
                    <div
                      // Usamos p.key, que ahora incluye tanto las claves numéricas (presets) como las claves de string (custom)
                      key={p.key}
                      className="rounded-2xl border bg-white p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* El Checkbox debe usar el estado 'p.enabled' de nuestro array 'procesos' */}
                        <Checkbox
                          checked={p.enabled}
                          onCheckedChange={(v) =>
                            handleToggleProceso(p.key, Boolean(v))
                          }
                          id={`chk-${p.key}`}
                        />
                        <Label
                          htmlFor={`chk-${p.key}`}
                          className="cursor-pointer"
                        >
                          {p.label}
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          className="w-28"
                          placeholder="min"
                          inputMode="decimal"
                          // Mostramos el valor del estado y manejamos el cambio con handleMinutosChange
                          value={p.minutos}
                          onChange={(e) =>
                            handleMinutosChange(p.key, e.target.value)
                          } // Usamos p.key, no p.label
                          disabled={!p.enabled}
                        />
                        <span className="text-sm text-muted-foreground">
                          min
                        </span>
                        {/* ⚠️ Esto se puede mejorar. Ver explicación a continuación */}
                        {(p.key === 10 || p.key >= 100000) && ( // Si la clave es '10' o es un proceso personalizado (usando un key grande)
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeProceso(p.key as number)}
                            aria-label="Eliminar proceso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground" onClick={showData}>
                Sugerencia: no todos los planos requieren todos los procesos.
                Activa solo lo necesario y asigna el tiempo.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={resetForm}>
                  Limpiar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!noProyecto || !noPlano}
                >
                  <Printer className="h-4 w-4 mr-1" /> Imprimir hoja
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Columna derecha: QR & vista previa */}
          <Card>
            <CardHeader>
              <CardTitle>QR & Resumen</CardTitle>
              <CardDescription>
                Contenido del código y vista de impresión.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="qr">
                <TabsContent value="qr" className="pt-2">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <QRCodeSVG
                      value={JSON.stringify(payloadQR)}
                      size={180}
                      level="H"
                    />
                    <div className="text-center">
                      <div className="font-medium">{payloadQR.op}</div>
                      <div className="text-xs text-muted-foreground">
                        {noPlano || "No de Plano"}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="print" className="pt-2">
                  <div ref={printRef} className="p-3">
                    <HojaImpresion
                      op={payloadQR.op}
                      plano={noPlano}
                      proyecto={noProyecto}
                      tipo={tipo}
                      material={material}
                      categoria={categoria}
                      procesos={payloadQR.procesos}
                      totalMin={totalMin}
                      observaciones={observaciones}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="justify-between">
              <div className="text-xs text-muted-foreground">
                Verifica los datos antes de imprimir.
              </div>
              <Button
                variant="outline"
                type="button"
                onClick={onPrint}
                disabled={!noProyecto || !noPlano}
              >
                <QrCode className="h-4 w-4 mr-1" /> Imprimir
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Estilos para impresión: solo la hoja */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #hoja-impresion, #hoja-impresion * { visibility: visible; }
          #hoja-impresion { position: absolute; inset: 0; margin: 0; }
        }
      `}</style>
    </div>
  );
}

function HojaImpresion({
  op,
  plano,
  proyecto,
  tipo,
  material,
  categoria,
  procesos,
  totalMin,
  observaciones,
}: {
  op: string;
  plano: string;
  proyecto: string;
  tipo?: string;
  material?: string;
  categoria?: string;
  procesos: { key: number; label: string; min: number }[];
  totalMin: number;
  observaciones: string;
}) {
  return (
    <div
      id="hoja-impresion"
      className="bg-white rounded-2xl border shadow-sm p-6"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold">Hoja de Seguimiento</h2>
          <p className="text-sm text-muted-foreground">
            Manufactura — Planeación
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <div>
              <span className="font-medium">Operación:</span> {op}
            </div>
            <div>
              {/* Mostramos el ID del proyecto que viene de 'noProyecto' */}
              <span className="font-medium">Proyecto:</span> {proyecto || "—"}
            </div>
            <div>
              <span className="font-medium">Plano:</span> {plano || "—"}
            </div>
            <div>
              <span className="font-medium">Tipo:</span> {tipo || "—"}
            </div>
            <div>
              <span className="font-medium">Material:</span> {material || "—"}
            </div>
            <div>
              <span className="font-medium">Categoría:</span> {categoria || "—"}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <QRCodeSVG
            // El QR sigue usando los datos clave, incluyendo el ID del proyecto
            value={JSON.stringify({ op, plano, proyecto })}
            size={140}
          />
          <div className="text-xs text-muted-foreground mt-2">{op}</div>
        </div>
      </div>

      <Separator className="my-4" />

      <div>
        <h3 className="font-medium mb-2">Procesos</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">#</th>
              <th className="py-2">Proceso</th>
              <th className="py-2">Minutos</th>
              <th className="py-2">Firma / Fecha</th>
            </tr>
          </thead>
          <tbody>
            {procesos.map((p, i) => (
              <tr key={p.key} className="border-b last:border-0">
                <td className="py-2 pr-4 w-8">{i + 1}</td>
                <td className="py-2 pr-4">{p.label}</td>
                <td className="py-2 pr-4">{p.min || 0}</td>
                <td className="py-2 pr-4">_______________________________</td>
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-4 font-medium" colSpan={2}>
                Total estimado
              </td>
              <td className="py-2 pr-4 font-medium">{totalMin}</td>
              <td className="py-2 pr-4" />
            </tr>
          </tbody>
        </table>
      </div>

      {observaciones && (
        <div className="mt-4">
          <h3 className="font-medium mb-1">Observaciones</h3>
          <div className="text-sm whitespace-pre-wrap border rounded-lg p-3 bg-neutral-50">
            {observaciones}
          </div>
        </div>
      )}

      <div className="mt-6 text-[11px] text-muted-foreground">
        * Esta hoja debe acompañar al plano durante todo el flujo. Escanea el QR
        en cada estación para actualizar estatus.
      </div>
    </div>
  );
}
