import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { sileo } from "sileo";
import { Settings2 } from "lucide-react"; // Icono sugerido
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const GET_PROCESO_MAQUINADO = gql`
  query ObtenerMaquinado($operacion: String!, $procesoId: ID!) {
    procesoOpPorOperacionYProceso(
      operacion: $operacion
      procesoId: $procesoId
    ) {
      id
      estado
      proceso {
        nombre
      }
    }
  }
`;

const UPDATE_TIEMPO_SETUP = gql`
  mutation UpdateTiempoSetup($procesoOpId: ID!, $tiempoSetup: Float!) {
    updateTiempoSetup(procesoOpId: $procesoOpId, tiempoSetup: $tiempoSetup) {
      id
      tiempoSetup
    }
  }
`;

interface ProcesoMaquinadoData {
  procesoOpPorOperacionYProceso: {
    id: string;
    estado: string;
    proceso: {
      nombre: string;
    };
  } | null;
}

interface SetupTimeProps {
  procesoOpId: string;
  workOrder: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess: () => void;
}

export function AccionSetup({ workOrder, onSuccess }: SetupTimeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tiempo, setTiempo] = useState("");
  const [loading, setLoading] = useState(false);

  // Buscamos el proceso de Maquinado relacionado (ID 4)
  const { data, loading: loadingQuery } = useQuery<ProcesoMaquinadoData>(
    GET_PROCESO_MAQUINADO,
    {
      variables: {
        operacion: workOrder,
        procesoId: "4",
      },
      skip: !isOpen || !workOrder,
    },
  );

  const [updateSetup] = useMutation(UPDATE_TIEMPO_SETUP);

  const handleConfirm = async () => {
    const valorSetup = parseFloat(tiempo);
    const maquinadoId = data?.procesoOpPorOperacionYProceso?.id;

    if (!maquinadoId) {
      return sileo.error({
        title: "No se encontró proceso de Maquinado",
        description: "No hay un proceso ID 4 vinculado a esta WO.",
        fill: "black",
        position: "top-center",
      });
    }

    if (isNaN(valorSetup) || valorSetup < 0) {
      return sileo.error({
        title: "Tiempo inválido",
        description: "Ingrese un número mayor o igual a 0.",
        fill: "black",
        position: "top-center",
      });
    }

    setLoading(true);
    try {
      await updateSetup({
        variables: {
          procesoOpId: maquinadoId,
          tiempoSetup: valorSetup,
        },
      });

      sileo.success({
        title: "✅ Setup Asignado",
        description: "Tiempo guardado en el proceso de Maquinado.",
        fill: "black",
        position: "top-center",
      });

      setIsOpen(false);
      setTiempo("");
      if (onSuccess) onSuccess();
    } catch (e: any) {
      sileo.error({
        title: "Error al guardar",
        description: e.message,
        fill: "black",
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
        >
          <Settings2 className="h-4 w-4" /> Tiempo Setup
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Tiempo de Setup</DialogTitle>
          <DialogDescription>
            El tiempo ingresado se asignará al proceso de <b>Maquinado CNC</b>{" "}
            para esta orden.
          </DialogDescription>
        </DialogHeader>

        {loadingQuery ? (
          <div className="py-4 text-center text-sm text-muted-foreground italic">
            Buscando proceso de maquinado destino...
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="setup" className="text-orange-600 font-bold">
                Minutos de Setup
              </Label>
              <Input
                id="setup"
                type="number"
                value={tiempo}
                onChange={(e) => setTiempo(e.target.value)}
                placeholder="Ej. 45"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={handleConfirm}
            disabled={loading || loadingQuery || !tiempo}
          >
            {loading ? "Guardando..." : "Confirmar Setup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
