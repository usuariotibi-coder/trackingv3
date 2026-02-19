import React, { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Wrench, Save, Trash2, AlertTriangle } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { sileo } from "sileo";

type Proceso = { id: number; nombre: string };

const MOCK_PROCESOS: Proceso[] = [
  { id: 1, nombre: "Corte" },
  { id: 2, nombre: "Escuadre" },
  { id: 3, nombre: "Programación CNC" },
  { id: 4, nombre: "Maquinado CNC" },
  { id: 5, nombre: "Pailería" },
  { id: 6, nombre: "Pintura" },
  { id: 7, nombre: "Inspección / Limpieza / Acabados" },
  { id: 8, nombre: "Calidad" },
  { id: 9, nombre: "Enviado a Externos" },
  { id: 10, nombre: "Almacen" },
  { id: 11, nombre: "Planeación" },
];

export function CreateMachineCard() {
  const CREATE_MAQUINA = gql`
    mutation AgregarNuevaMaquina($input: CrearMaquinaInput!) {
      crearMaquina(input: $input) {
        id
        nombre
        proceso {
          nombre
        }
      }
    }
  `;

  const [createMachine, { loading }] = useMutation(CREATE_MAQUINA);
  const [machineData, setMachineData] = useState({ nombre: "", procesoId: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMachine({
        variables: {
          input: {
            nombre: machineData.nombre,
            procesoId: machineData.procesoId || null,
          },
        },
      });
      sileo.success({ title: "Máquina creada", position: "top-center" });
      setMachineData({ nombre: "", procesoId: "" });
    } catch (e: any) {
      sileo.error({
        title: "Error",
        description: e.message,
        position: "top-center",
        fill: "black",
        styles: {
          title: "text-white!",
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench /> Alta de Máquina
        </CardTitle>
        <CardDescription>
          Asigna una nueva máquina a un proceso de producción.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la Máquina</Label>
            <Input
              placeholder="CNC-01, Cortadora, etc."
              value={machineData.nombre}
              onChange={(e) =>
                setMachineData({ ...machineData, nombre: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Proceso Principal</Label>
            <Select
              onValueChange={(v) =>
                setMachineData({ ...machineData, procesoId: v })
              }
              value={machineData.procesoId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona proceso..." />
              </SelectTrigger>
              <SelectContent>
                {MOCK_PROCESOS.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center pt-2">
            <Button type="submit" className="w-1/2 gap-2" disabled={loading}>
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Guardar Máquina
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeleteMachineCard() {
  const DELETE_MAQUINA = gql`
    mutation EliminarMaquina($nombre: String!) {
      eliminarMaquinaPorNombre(nombre: $nombre)
    }
  `;

  const [deleteMachine, { loading }] = useMutation(DELETE_MAQUINA);
  const [nombre, setNombre] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteMachine({ variables: { nombre } });
      sileo.success({
        title: "Máquina eliminada",
        position: "top-center",
        fill: "black",
        styles: {
          title: "text-white!",
        },
      });
      setNombre("");
      setIsOpen(false);
    } catch (e: any) {
      sileo.error({
        title: "Error",
        description: e.message,
        position: "top-center",
        fill: "black",
        styles: {
          title: "text-white!",
        },
      });
    }
  };

  return (
    <Card className="border-red-500 bg-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Trash2 /> Baja de Máquina
        </CardTitle>
        <CardDescription className="text-red-600 font-medium">
          Elimina una máquina de forma permanente del inventario de planta.
        </CardDescription>
      </CardHeader>
      <Separator className="bg-red-200" />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre de la Máquina a eliminar</Label>
            <Input
              placeholder="Ej. CNC-01"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="bg-white border-red-200 focus-visible:ring-red-500"
            />
          </div>
          <div className="flex justify-center pt-2">
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-1/2 gap-2 shadow-sm"
                  disabled={loading || !nombre}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Máquina
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    ¿Confirmar eliminación de equipo?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Estás por eliminar la máquina{" "}
                    <span className="font-bold text-black">{nombre}</span>. Esto
                    borrará permanentemente su configuración y la desconectará
                    de sus procesos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? "Procesando..." : "Confirmar Eliminación"}
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
