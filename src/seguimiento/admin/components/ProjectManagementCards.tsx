import React, { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { FolderPlus, Save, Trash2, AlertTriangle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { sileo } from "sileo";

/* ----------------------------------------------------------------------
// SECCIÓN: CREAR PROYECTO (Sin cambios significativos)
// ---------------------------------------------------------------------- */
export function CreateProjectCard() {
  const CREATE_PROYECTO = gql`
    mutation AgregarNuevoProyecto($input: CrearProyectoInput!) {
      crearProyecto(input: $input) {
        id
        proyecto
        descripcion
      }
    }
  `;

  const [createProject, { loading }] = useMutation(CREATE_PROYECTO);
  const [projectData, setProjectData] = useState({
    nombre: "",
    descripcion: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject({
        variables: {
          input: {
            proyecto: projectData.nombre,
            descripcion: projectData.descripcion,
          },
        },
      });
      sileo.success({
        title: "Proyecto creado",
        description: `Proyecto '${projectData.nombre}' creado exitosamente.`,
        position: "top-center",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
      });
      setProjectData({ nombre: "", descripcion: "" });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5" /> Alta de Proyecto
        </CardTitle>
        <CardDescription>
          Define un nuevo proyecto para agrupar Órdenes de Producción.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Proyecto</Label>
            <Input
              placeholder="OP-XXXX • Nombre del dispositivo"
              value={projectData.nombre}
              onChange={(e) =>
                setProjectData({ ...projectData, nombre: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              placeholder="Alcance del proyecto..."
              rows={3}
              value={projectData.descripcion}
              onChange={(e) =>
                setProjectData({ ...projectData, descripcion: e.target.value })
              }
            />
          </div>
          <div className="flex justify-center pt-2">
            <Button type="submit" className="w-1/2 gap-2" disabled={loading}>
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Guardar Proyecto
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------------------
// SECCIÓN: ELIMINAR PROYECTO (Actualizada con AlertDialog)
// ---------------------------------------------------------------------- */
export function DeleteProjectCard() {
  const DELETE_PROYECTO = gql`
    mutation EliminarProyecto($proyecto: String!) {
      eliminarProyectoPorNombre(proyecto: $proyecto)
    }
  `;

  const [deleteProject, { loading }] = useMutation(DELETE_PROYECTO);
  const [nombre, setNombre] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteProject({ variables: { proyecto: nombre } });
      sileo.success({
        title: "Proyecto eliminado",
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
          <Trash2 className="h-5 w-5" /> Baja de Proyecto
        </CardTitle>
        <CardDescription className="text-red-600 font-medium">
          Elimina un proyecto de forma permanente. Ten en cuenta que esto
          afectará a las WorkOrders vinculadas.
        </CardDescription>
      </CardHeader>
      <Separator className="bg-red-200" />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del Proyecto a eliminar</Label>
            <Input
              placeholder="Ej. OP-2024-001"
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
                  type="button"
                  variant="destructive"
                  className="w-1/2 gap-2 shadow-sm font-bold"
                  disabled={loading || !nombre}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar Proyecto
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    ¿Confirmar eliminación de proyecto?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Estás a punto de eliminar permanentemente el proyecto{" "}
                    <span className="font-bold text-black">{nombre}</span>. Esta
                    acción podría eliminar automáticamente las **WorkOrders** y
                    **Operaciones** asociadas en cascada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? "Eliminando..." : "Sí, eliminar ahora"}
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
