import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Trash2, AlertTriangle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const [isOpen, setIsOpen] = useState(false); // Control del Dialog

  const DELETE_WO = gql`
    mutation EliminarWO($codigo: String!) {
      eliminarWoPorOperacion(codigoOperacion: $codigo)
    }
  `;

  const [deleteWo, { loading }] = useMutation<DeleteWOResponse>(DELETE_WO);

  const handleConfirmDelete = async () => {
    try {
      const { data } = await deleteWo({
        variables: { codigo: operacion },
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
        setIsOpen(false);
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
          Elimina una orden de trabajo por su número de operación. Esta acción
          es permanente.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plano-delete" className="text-red-900">
              Número de operación de WO a eliminar
            </Label>
            <Input
              id="plano-delete"
              placeholder="Ej. WO-XXXX-26..."
              value={operacion}
              onChange={(e) => setOperacion(e.target.value)}
              required
              className="bg-white border-red-200 focus-visible:ring-red-500"
            />
          </div>

          <div className="w-full justify-center flex items-center pt-2">
            {/* Implementación de AlertDialog como confirmación */}
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full md:w-1/2 font-bold shadow-sm"
                  disabled={loading || !operacion}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar WorkOrder
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    ¿Confirmar eliminación permanente?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Estás a punto de borrar la operación{" "}
                    <span className="font-bold text-black">{operacion}</span>.
                    Esto eliminará también el archivo PDF y todo el historial de
                    procesos vinculado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  >
                    {loading ? "Borrando..." : "Sí, eliminar ahora"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
