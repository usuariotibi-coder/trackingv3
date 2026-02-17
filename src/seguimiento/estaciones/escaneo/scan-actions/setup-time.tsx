import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { sileo } from "sileo";
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

export function AccionSetup({
  workOrder,
  isOpen,
  setIsOpen,
  onSuccess,
}: SetupTimeProps) {
  const [tiempo, setTiempo] = useState("");
  const [loading, setLoading] = useState(false);

  // Buscamos el proceso de Maquinado relacionado
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
        duration: 3000,
        title: "No se encontró el proceso de Maquinado",
        description: "No se pudo asignar el tiempo de setup.",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    }

    if (isNaN(valorSetup) || valorSetup < 0) {
      return sileo.error({
        duration: 3000,
        title: "Tiempo de setup inválido",
        description: "Ingrese un tiempo de setup válido.",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    }

    setLoading(true);
    try {
      // 1. Asignamos el tiempo al proceso de MAQUINADO (ID 4)
      await updateSetup({
        variables: {
          procesoOpId: maquinadoId, // <-- ID del proceso 4
          tiempoSetup: valorSetup,
        },
      });

      sileo.success({
        duration: 3000,
        title: "✅ Setup asignado a Maquinado",
        description: "Programación finalizada.",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
      setIsOpen(false);
      onSuccess();
    } catch (e: any) {
      sileo.error({
        duration: 3000,
        title: "Error al asignar setup",
        description: e.message,
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar Programación</DialogTitle>
          <DialogDescription>
            El tiempo de setup ingresado se asignará al proceso de{" "}
            <b>Maquinado CNC</b>.
          </DialogDescription>
        </DialogHeader>

        {loadingQuery ? (
          <div className="py-4 text-center">
            Buscando proceso de maquinado...
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="setup" className="text-orange-600 font-bold">
                Tiempo de Setup para Maquinado (Minutos)
              </Label>
              <Input
                id="setup"
                type="number"
                value={tiempo}
                onChange={(e) => setTiempo(e.target.value)}
                placeholder="Ej. 45"
                autoFocus
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-orange-600"
            onClick={handleConfirm}
            disabled={loading || loadingQuery}
          >
            {loading ? "Guardando..." : "Confirmar y Finalizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
