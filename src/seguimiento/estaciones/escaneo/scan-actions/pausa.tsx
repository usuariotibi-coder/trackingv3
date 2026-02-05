import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { PauseCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface AccionPausaProps {
  procesoEspecifico: {
    id: string;
    estado: string;
  };
  onActionSuccess: () => void;
}

const REGISTRAR_OBS = gql`
  mutation RegistrarObs($id: ID!, $tipo: String!, $desc: String!) {
    registrarObservacion(
      procesoOpId: $id
      tipoRegistro: $tipo
      descripcion: $desc
    ) {
      id
      estado
    }
  }
`;

export function AccionPausa({
  procesoEspecifico,
  onActionSuccess,
}: AccionPausaProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [registrar] = useMutation(REGISTRAR_OBS);

  const esPausa = procesoEspecifico.estado !== "paused";

  const handleConfirm = async () => {
    try {
      await registrar({
        variables: {
          id: procesoEspecifico.id, // Usamos el ID del objeto pasado
          tipo: esPausa ? "PAUSA_INICIO" : "PAUSA_FIN",
          desc: motivo,
        },
      });
      toast.success(esPausa ? "Pausa iniciada" : "Proceso reanudado");
      setOpen(false);
      setMotivo("");
      onActionSuccess();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className={`w-full ${esPausa ? "text-orange-600" : "text-green-600"}`}
        onClick={() => setOpen(true)}
      >
        <PauseCircle className="mr-2 h-4 w-4" />
        {esPausa ? "Pausar" : "Reanudar"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {esPausa ? "Iniciar Pausa" : "Finalizar Pausa"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describa el motivo..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
