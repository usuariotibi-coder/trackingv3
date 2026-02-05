import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const REGISTRAR_OBS = gql`
  mutation RegistrarScrap($id: ID!, $tipo: String!, $desc: String!) {
    registrarObservacion(
      procesoOpId: $id
      tipoRegistro: $tipo
      descripcion: $desc
    ) {
      id
      observaciones
    }
  }
`;

export function AccionScrap({
  procesoOpId,
  onActionSuccess,
}: {
  procesoOpId: string;
  onActionSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [registrar] = useMutation(REGISTRAR_OBS);

  const handleConfirm = async () => {
    if (motivo.length < 5)
      return toast.error("Por favor detalle el motivo del rechazo.");
    try {
      await registrar({
        variables: { id: procesoOpId, tipo: "RECHAZO_SCRAP", desc: motivo },
      });
      toast.error("Pieza marcada como SCRAP");
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
        className="text-red-600 w-full"
        onClick={() => setOpen(true)}
      >
        <TriangleAlert className="mr-2 h-4 w-4" /> Scrap
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Rechazo (Scrap)</DialogTitle>
            <DialogDescription>
              Describa por qué la pieza no cumple con los estándares de calidad.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ej: Tolerancia fuera de rango en diámetro..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Confirmar Scrap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
