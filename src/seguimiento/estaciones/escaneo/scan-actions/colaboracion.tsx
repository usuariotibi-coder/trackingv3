import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sileo } from "sileo";

interface RegistrarColaboracionData {
  registrarColaboracion: {
    id: string;
    usuario: {
      nombre: string;
    };
  };
}

const REGISTRAR_COLABORACION = gql`
  mutation RegistrarColaboracion($sesionId: ID!, $numero: String!) {
    registrarColaboracion(sesionId: $sesionId, numeroEmpleado: $numero) {
      id
      usuario {
        nombre
      }
    }
  }
`;

export function AccionColaboracion({ sesionId }: { sesionId: string }) {
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState("");

  const [registrar] = useMutation<RegistrarColaboracionData>(
    REGISTRAR_COLABORACION,
    {
      onCompleted: (data) => {
        sileo.success({
          title: "Colaborador añadido",
          description: `${data.registrarColaboracion.usuario.nombre} se ha sumado a la sesión.`,
          fill: "black",
          position: "top-center",
          styles: {
            title: "text-white!",
            description: "text-white/75!",
          },
        });
        setOpen(false);
        setNumero("");
      },
      onError: (e) => {
        sileo.error({ title: "Error", description: e.message, fill: "black" });
      },
    },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full gap-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
        >
          {"+"}
          <Users className="h-4 w-4" /> Colaborador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Colaboración</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Número de Nómina o Escaneo</Label>
            <Input
              autoFocus
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Escanea el carnet del compañero..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && numero) {
                  registrar({ variables: { sesionId, numero } });
                }
              }}
            />
          </div>
          <Button
            className="w-full bg-indigo-600"
            disabled={!numero}
            onClick={() => registrar({ variables: { sesionId, numero } })}
          >
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
