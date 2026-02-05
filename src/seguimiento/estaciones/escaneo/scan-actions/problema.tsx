import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const REGISTRAR_OBS = gql`
  mutation RegistrarProblema($id: ID!, $tipo: String!, $desc: String!) {
    registrarObservacion(
      procesoOpId: $id
      tipoRegistro: $tipo
      descripcion: $desc
    ) {
      id
    }
  }
`;

export function AccionProblema({
  procesoOpId,
  onActionSuccess,
}: {
  procesoOpId: string;
  onActionSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [registrar] = useMutation(REGISTRAR_OBS);

  const handleConfirm = async () => {
    try {
      await registrar({
        variables: { id: procesoOpId, tipo: "PROBLEMA_TECNICO", desc },
      });
      toast.warning("Problema reportado en bitácora");
      setOpen(false);
      setDesc("");
      onActionSuccess();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Bug className="mr-2 h-4 w-4" /> Problema
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Incidente</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describa la falla o alarma de la máquina..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleConfirm}>Enviar Reporte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
