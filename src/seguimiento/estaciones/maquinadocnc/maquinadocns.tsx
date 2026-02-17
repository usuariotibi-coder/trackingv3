import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { sileo } from "sileo";
import { ScanLine, CheckCircle2, Camera, Upload } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";

// Import dinámico (solo cliente) del lector
//const QrReader = dynamic(async () => Scanner, { ssr: false });

type QRPayload = {
  op: string;
  plano?: string;
  proyecto?: string;
  tipo?: string | null;
  material?: string | null;
  categoria?: string | null;
  procesos?: { key: string; label: string; min: number }[];
  totalMin?: number;
  ts?: number;
};

export default function EstacionMaquinado() {
  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [raw, setRaw] = useState<string>("");
  const [scanning, setScanning] = useState<boolean>(true);
  const [opManual, setOpManual] = useState<string>("");

  //const procesoActual = "maquinado";

  const procesoEnRuta = useMemo(() => {
    const p = payload?.procesos?.find((x) => x.key.includes("maquinado"));
    return p?.label || "Maquinado CNC";
  }, [payload]);

  function parseAndSet(text: string) {
    try {
      const obj = JSON.parse(text) as QRPayload;
      if (!obj?.op) throw new Error("QR sin campo 'op'");
      setPayload(obj);
      setRaw(text);
      sileo.success({
        duration: 3000,
        title: "QR leído correctamente",
        description: "",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    } catch (e: any) {
      sileo.error({
        duration: 3000,
        title: "Error al leer QR",
        description: "No pude leer el QR como JSON válido",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
      console.error(e);
    }
  }

  async function registrarLlegada() {
    try {
      const body = {
        op: payload?.op || opManual.trim(),
        estacion: "maquinado",
        evento: "checkin",
        at: new Date().toISOString(),
        meta: {
          plano: payload?.plano,
          proyecto: payload?.proyecto,
        },
      };
      if (!body.op) {
        sileo.error({
          duration: 3000,
          title: "Falta el número de operación (OP)",
          description: "Escanea el QR o escribe la OP manual.",
          fill: "black",
          styles: {
            title: "text-white!",
            description: "text-white/75!",
          },
          position: "top-center",
        });
        return;
      }

      const res = await fetch("/api/estaciones/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      sileo.success({
        duration: 3000,
        title: "✅ Llegada registrada",
        description: `Llegada registrada en Maquinado para ${body.op}`,
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    } catch (e: any) {
      sileo.error({
        duration: 3000,
        title: "Error al registrar llegada",
        description: e.message,
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
      console.error(e);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Estación: Maquinado CNC
        </h1>
        <p className="text-sm text-muted-foreground">
          Escanea el código QR del plano para registrar que la pieza ingresó al
          área.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ESCANEO */}
        <Card>
          <CardHeader>
            <CardTitle>
              <ScanLine className="inline h-5 w-5 mr-2" /> Lector QR
            </CardTitle>
            <CardDescription>
              Usa la cámara para leer el QR. También puedes pegar el JSON
              manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl overflow-hidden border bg-black/5 grid place-items-center">
              {/* Solo renderiza el lector si estamos “scanning” */}
              {scanning ? (
                <div className="w-full max-w-md">
                  <Scanner
                    constraints={{ facingMode: "environment" }}
                    onScan={(res) => {
                      if (!!res) {
                        setScanning(false);
                        const text = res.toString();
                        parseAndSet(text);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  <p>Cámara pausada.</p>
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onClick={() => setScanning(true)}
                  >
                    <Camera className="h-4 w-4 mr-1" /> Reanudar escaneo
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Pegar JSON del QR (opcional)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder='{"op":"OP-XXXX","plano":"...","proyecto":"..."}'
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => parseAndSet(raw)}
                >
                  <Upload className="h-4 w-4 mr-1" /> Cargar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Útil si el QR está dañado. Pega exactamente el JSON que viene en
                el código.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                OP manual (fallback)
              </label>
              <Input
                placeholder="OP-3272-..."
                value={opManual}
                onChange={(e) => setOpManual(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <div className="text-xs text-muted-foreground">
              La OP puede venir del QR o escribirse manualmente.
            </div>
            <Button onClick={registrarLlegada}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Registrar llegada
            </Button>
          </CardFooter>
        </Card>

        {/* RESUMEN DE LA PIEZA */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de pieza</CardTitle>
            <CardDescription>Datos extraídos del QR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Operación</span>
              <span className="font-medium">
                {payload?.op || opManual || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-medium">{payload?.plano || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Proyecto</span>
              <span className="font-medium">{payload?.proyecto || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Categoría</span>
              <Badge variant="outline">{payload?.categoria || "—"}</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estación</span>
              <span className="font-medium">{procesoEnRuta}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Tiempo estimado (paso)
              </span>
              <span className="font-medium">
                {payload?.procesos?.find((p) => p.key.includes("maquinado"))
                  ?.min ?? "—"}{" "}
                min
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
