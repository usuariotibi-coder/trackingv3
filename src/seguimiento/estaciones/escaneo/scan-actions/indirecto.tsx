import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CREAR_INDIRECTO = gql`
  mutation CrearIndirecto($uId: ID!, $motivo: String!) {
    crearIndirecto(input: { usuarioId: $uId, motivo: $motivo }) {
      id
    }
  }
`;

export function AccionIndirecto({
  usuarioId,
}: {
  usuarioId: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [crear] = useMutation(CREAR_INDIRECTO);

  const handleConfirm = async () => {
    if (!usuarioId) return toast.error("Identifique al operario primero");
    try {
      await crear({ variables: { uId: usuarioId, motivo } });
      toast.success(`Tiempo indirecto iniciado: ${motivo}`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full text-blue-500"
        onClick={() => setOpen(true)}
        disabled={!usuarioId}
      >
        <Clock className="mr-2 h-4 w-4" /> Indirecto
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Labor Indirecta</DialogTitle>
          </DialogHeader>
          <Select onValueChange={setMotivo}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione actividad..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Limpieza">Limpieza de Estación</SelectItem>
              <SelectItem value="Mantenimiento">
                Mantenimiento Preventivo
              </SelectItem>
              <SelectItem value="Junta">Junta / Capacitación</SelectItem>
              <SelectItem value="Inventario">Conteo de Inventario</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={handleConfirm} disabled={!motivo}>
              Iniciar Actividad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
