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
import { sileo } from "sileo";

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
    if (!usuarioId)
      return sileo.error({
        duration: 3000,
        title: "Error",
        description: "Identifique al operario primero",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
    try {
      await crear({ variables: { uId: usuarioId, motivo } });
      sileo.success({
        duration: 3000,
        title: "Tiempo indirecto iniciado",
        description: `Actividad registrada: ${motivo}`,
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
        position: "top-center",
      });
      setOpen(false);
    } catch (e: any) {
      sileo.error({
        duration: 3000,
        title: "Error al registrar tiempo indirecto",
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
