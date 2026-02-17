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
import { sileo } from "sileo";

const REGISTRAR_SCRAP = gql`
  mutation RegistrarScrapCritico(
    $sesionId: ID!
    $procesoOpId: ID!
    $motivo: String!
  ) {
    registrarScrapCritico(
      sesionId: $sesionId
      procesoOpId: $procesoOpId
      motivo: $motivo
    ) {
      id
      procesoOp {
        id
        estado
      }
    }
  }
`;

export function AccionScrap({
  sesionId,
  procesoOpId,
  onActionSuccess,
}: {
  sesionId: string;
  procesoOpId: string;
  onActionSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [registrar] = useMutation(REGISTRAR_SCRAP);

  const handleConfirm = async () => {
    if (motivo.length < 5)
      return sileo.error({
        duration: 3000,
        title: "Motivo insuficiente",
        description: "Detalle el motivo del scrap.",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });

    try {
      await registrar({
        variables: {
          sesionId,
          procesoOpId,
          motivo,
        },
      });
      sileo.warning({
        duration: 3000,
        title: "Proceso detenido por SCRAP",
        description: "",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
      setOpen(false);
      onActionSuccess();
    } catch (e: any) {
      sileo.error({
        duration: 3000,
        title: "Error al registrar scrap",
        description: e.message,
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
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
