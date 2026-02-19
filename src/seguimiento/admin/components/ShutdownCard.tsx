import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { BotOffIcon, AlertTriangle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { sileo } from "sileo";

interface ShutdownResponse {
  shutdownSesionesActivas: number;
}

export function ShutdownCard() {
  const [isOpen, setIsOpen] = useState(false);

  const SHUTDOWN = gql`
    mutation ManualShutdown {
      shutdownSesionesActivas
    }
  `;

  const [triggerShutdown, { loading }] =
    useMutation<ShutdownResponse>(SHUTDOWN);

  const handleConfirmShutdown = async () => {
    try {
      const { data } = await triggerShutdown();
      if (data) {
        sileo.success({
          title: "Shutdown completado",
          description: `Se han finalizado ${data.shutdownSesionesActivas} sesiones activas.`,
          position: "top-center",
          fill: "black",
          styles: {
            title: "text-white!",
            description: "text-white/75!",
          },
        });
        setIsOpen(false);
      }
    } catch (e: any) {
      sileo.error({
        title: "Error en Shutdown",
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
    <Card className="border-orange-500 bg-orange-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <BotOffIcon className="h-5 w-5" /> Shutdown General
        </CardTitle>
        <CardDescription className="text-orange-600 font-medium">
          Finaliza todas las sesiones abiertas de forma inmediata.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-10">
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="h-20 w-60 border-orange-500 text-orange-600 font-black text-2xl hover:bg-orange-600 hover:text-white transition-all shadow-lg"
              disabled={loading}
            >
              {loading ? "..." : "SHUTDOWN"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-orange-200">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                ¿Confirmar pausa general de planta?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-orange-900/80">
                Esta acción forzará el cierre de **todas** las sesiones de
                trabajo que estén activas actualmente en la base de datos. Los
                operadores deberán escanear de nuevo para reiniciar sus labores.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-orange-200 text-orange-700 hover:bg-orange-50">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmShutdown}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                {loading ? "Procesando..." : "Sí, pausar todo"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
