import { useState } from "react";
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
  // 1. Actualizamos la definición de la Mutación GQL
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

  // 2. Estado inicial con los nuevos campos
  const [projectData, setProjectData] = useState({
    nombre: "",
    descripcion: "",
    budgetManufactura: "",
    budgetEnsamble: "",
  });

  const handleCreate = async () => {
    if (!projectData.nombre) return;
    try {
      await createProject({
        variables: {
          input: {
            proyecto: projectData.nombre,
            descripcion: projectData.descripcion,
            // Convertimos a float para el backend
            budgetManufactura: parseFloat(projectData.budgetManufactura) || 0,
            budgetEnsamble: parseFloat(projectData.budgetEnsamble) || 0,
          },
        },
      });
      // Limpiar formulario y notificar
      setProjectData({
        nombre: "",
        descripcion: "",
        budgetManufactura: "",
        budgetEnsamble: "",
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
    } catch (e: any) {
      sileo.error(e.message || "Error al crear proyecto");
    }
  };

  return (
    <Card className="shadow-lg border-none bg-white/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <FolderPlus className="h-6 w-6 text-blue-600" /> Nuevo Proyecto
        </CardTitle>
        <CardDescription>
          Define el nombre y los presupuestos iniciales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Proyecto</Label>
          <Input
            id="name"
            placeholder="Ej: Mantenimiento Prensa Hidráulica"
            value={projectData.nombre}
            onChange={(e) =>
              setProjectData({ ...projectData, nombre: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desc">Descripción</Label>
          <Textarea
            id="desc"
            placeholder="Detalles adicionales..."
            value={projectData.descripcion}
            onChange={(e) =>
              setProjectData({ ...projectData, descripcion: e.target.value })
            }
          />
        </div>

        {/* SECCIÓN DE PRESUPUESTOS */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label className="text-blue-700 font-semibold">
              Hrs. Manufactura
            </Label>
            <Input
              type="number"
              placeholder="0.0"
              value={projectData.budgetManufactura}
              onChange={(e) =>
                setProjectData({
                  ...projectData,
                  budgetManufactura: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-green-700 font-semibold">
              Hrs. Ensamble
            </Label>
            <Input
              type="number"
              placeholder="0.0"
              value={projectData.budgetEnsamble}
              onChange={(e) =>
                setProjectData({
                  ...projectData,
                  budgetEnsamble: e.target.value,
                })
              }
            />
          </div>
        </div>

        <Button
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 font-bold"
          onClick={handleCreate}
          disabled={loading || !projectData.nombre}
        >
          {loading ? (
            <Spinner className="mr-2" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Crear Proyecto
        </Button>
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
