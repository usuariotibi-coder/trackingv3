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

interface RegistrarObsData {
  registrarObservacionSesion: {
    id: string;
    observaciones: string;
  };
}

const REGISTRAR_OBS = gql`
  mutation RegistrarProblema($id: ID!, $texto: String!) {
    registrarObservacionSesion(sesionId: $id, texto: $texto) {
      id
      observaciones
    }
  }
`;

export function AccionProblema({
  sesionId, // Nota: Asegúrate de pasar el ID de la SESIÓN, no del ProcesoOp
  onActionSuccess,
}: {
  sesionId: string;
  onActionSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [registrar] = useMutation<RegistrarObsData>(REGISTRAR_OBS);

  const handleConfirm = async () => {
    try {
      const res = await registrar({
        variables: {
          id: sesionId,
          texto: desc,
        },
      });

      // Verificamos si existe la respuesta y el ID antes de proceder
      if (res.data?.registrarObservacionSesion?.id) {
        toast.warning("Problema reportado en bitácora");
        setOpen(false);
        setDesc("");
        onActionSuccess();
      }
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
