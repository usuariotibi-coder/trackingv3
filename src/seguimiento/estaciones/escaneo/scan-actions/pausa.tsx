import { useMemo, useState, useEffect } from "react";
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
import { sileo } from "sileo";

interface AccionPausaProps {
  sesionId: string;
  pausas: Array<{ id: string; horaFin: string | null }>;
  onActionSuccess: () => void;
  onPausaChange?: (pausado: boolean) => void;
}

const REGISTRAR_PAUSA = gql`
  mutation RegistrarPausa(
    $sesionId: ID!
    $tipoRegistro: TipoRegistroPausa!
    $motivo: String
  ) {
    registrarPausaSesion(
      sesionId: $sesionId
      tipoRegistro: $tipoRegistro
      motivo: $motivo
    ) {
      id
      pausas {
        id
        horaInicio
        horaFin
        motivo
      }
    }
  }
`;

export function AccionPausa({
  sesionId,
  pausas,
  onActionSuccess,
  onPausaChange,
}: AccionPausaProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [registrarPausa] = useMutation(REGISTRAR_PAUSA);

  // Determinar si el estado actual es "EN PAUSA"
  const estaEnPausa = useMemo(() => {
    return pausas.some((p) => p.horaFin === null);
  }, [pausas]);

  const handlePausa = async () => {
    try {
      await registrarPausa({
        variables: {
          sesionId: sesionId,
          tipoRegistro: estaEnPausa ? "FIN" : "INICIO",
          motivo: motivo,
        },
      });
      sileo.success({
        duration: 3000,
        title: estaEnPausa ? "Trabajo reanudado" : "Sesión pausada",
        description: "",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
      setOpen(false);
      setMotivo("");
      onActionSuccess();
    } catch (e: any) {
      sileo.error({
        duration: 3000,
        title: "Error al registrar pausa",
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

  useEffect(() => {
    if (onPausaChange) {
      onPausaChange(estaEnPausa);
    }
  }, [estaEnPausa, onPausaChange]);

  return (
    <>
      <Button
        variant="outline"
        className={`w-full ${estaEnPausa ? "bg-orange-50 text-orange-600 border-orange-200" : ""}`}
        onClick={() => setOpen(true)}
      >
        <PauseCircle className="mr-2 h-4 w-4" />
        {estaEnPausa ? "Finalizar Pausa" : "Pausar Sesión"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {estaEnPausa
                ? "Confirmar Reanudación"
                : "Iniciar Pausa de Trabajo"}
            </DialogTitle>
          </DialogHeader>

          {/* Solo pedimos motivo si se va a INICIAR una pausa */}
          {!estaEnPausa && (
            <Textarea
              placeholder="Describa el motivo de la pausa (ej. Ajuste de máquina)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          )}

          <DialogFooter>
            <Button
              onClick={handlePausa}
              className={estaEnPausa ? "bg-green-600" : "bg-orange-600"}
            >
              {estaEnPausa ? "Reanudar Ahora" : "Pausar Ahora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
