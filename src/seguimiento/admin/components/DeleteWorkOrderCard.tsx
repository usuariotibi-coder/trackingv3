import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { sileo } from "sileo";

/* --------------------------------- Interfaces -------------------------------- */
interface DeleteWOResponse {
  eliminarWoPorOperacion: boolean;
}

/* --------------------------------- Componente -------------------------------- */
export function DeleteWorkOrderCard() {
  const [operacion, setOperacion] = useState("");

  const DELETE_WO = gql`
    mutation EliminarWO($codigo: String!) {
      eliminarWoPorOperacion(codigoOperacion: $codigo)
    }
  `;

  const [deleteWo, { loading }] = useMutation<DeleteWOResponse>(DELETE_WO);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();

    // Confirmación de seguridad antes de proceder
    if (
      !window.confirm(
        `¿Estás seguro de eliminar permanentemente la WO '${operacion}'?`,
      )
    ) {
      return;
    }

    try {
      const { data } = await deleteWo({
        variables: { codigoOperacion: operacion },
      });

      if (data?.eliminarWoPorOperacion) {
        sileo.success({
          title: "WO Eliminada",
          description: `La orden ${operacion} ha sido borrada exitosamente.`,
          position: "top-center",
          fill: "black",
          styles: {
            title: "text-white!",
            description: "text-white/75!",
          },
        });
        setOperacion("");
      }
    } catch (e: any) {
      sileo.error({
        title: "Error",
        description: e.message,
        position: "top-center",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
      });
    }
  };

  return (
    <Card className="border-red-500 bg-red-50/50">
      <CardHeader>
        <CardTitle className="text-red-700 flex gap-2">
          <Trash2 className="h-5 w-5" /> Baja de Work Order
        </CardTitle>
        <CardDescription className="text-red-600 font-medium">
          Elimina una orden de trabajo por su número de plano. Esta acción es
          permanente y no se puede deshacer.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plano-delete" className="text-red-900">
              Número de operación de WO a eliminar
            </Label>
            <Input
              id="plano-delete"
              placeholder="Ej. PL-2024-001"
              value={operacion}
              onChange={(e) => setOperacion(e.target.value)}
              required
              className="bg-white border-red-200 focus-visible:ring-red-500"
            />
          </div>

          <div className="w-full justify-center flex items-center pt-2">
            <Button
              type="submit"
              variant="destructive"
              className="w-full md:w-1/2 font-bold shadow-sm"
              disabled={loading || !operacion}
            >
              {loading ? (
                "Eliminando..."
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Eliminar WorkOrder
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
