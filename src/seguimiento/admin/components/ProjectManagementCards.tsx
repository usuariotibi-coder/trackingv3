import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { FolderPlus, Save, Trash2, AlertTriangle, Plus } from "lucide-react";
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
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Estado para los budgets dinámicos
  const [budgets, setBudgets] = useState([{ area: "corte", tiempo: "" }]);

  const AREAS_OPCIONES = [
    "Manufactura",
    "corte",
    "escuadre",
    "programacion cnc",
    "maquinado cnc",
    "paileria",
    "pintura",
    "calidad",
    "almacen",
  ];

  const CREATE_PROYECTO = gql`
    mutation AgregarNuevoProyecto($input: CrearProyectoInput!) {
      crearProyecto(input: $input) {
        id
        proyecto
      }
    }
  `;

  const [createProject, { loading }] = useMutation(CREATE_PROYECTO);

  // Handlers para las filas
  const addBudgetRow = () =>
    setBudgets([...budgets, { area: "corte", tiempo: "" }]);

  const removeBudgetRow = (index: number) => {
    setBudgets(budgets.filter((_, i) => i !== index));
  };

  const updateBudget = (index: number, field: string, value: string) => {
    const newBudgets = [...budgets];
    newBudgets[index] = { ...newBudgets[index], [field]: value };
    setBudgets(newBudgets);
  };

  const handleSave = async () => {
    try {
      await createProject({
        variables: {
          input: {
            proyecto: nombre,
            descripcion: descripcion,
            // Enviamos los budgets filtrando los que no tienen tiempo
            budgets: budgets
              .filter((b) => b.tiempo !== "")
              .map((b) => ({ area: b.area, tiempo: parseFloat(b.tiempo) })),
          },
        },
      });
      // Limpiar campos tras éxito
      setNombre("");
      setDescripcion("");
      setBudgets([{ area: "corte", tiempo: "" }]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="shadow-md border-neutral-200">
      <CardHeader className="bg-neutral-50/50">
        <CardTitle className="text-xl flex items-center gap-2">
          <FolderPlus className="h-5 w-5 text-blue-600" />
          Nuevo Proyecto
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Campos básicos */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre del Proyecto</Label>
            <Input
              id="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Estructura Torre A"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Descripción</Label>
            <Textarea
              id="desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* Sección de Budgets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Presupuestos por Área (Horas)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBudgetRow}
              className="h-8 gap-1 text-xs"
            >
              <Plus className="h-3 w-3" /> Añadir Fila
            </Button>
          </div>

          <div className="space-y-2">
            {budgets.map((b, index) => (
              <div key={index} className="flex items-center gap-2 group">
                {/* Selector de Área */}
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                  value={b.area}
                  onChange={(e) => updateBudget(index, "area", e.target.value)}
                >
                  {AREAS_OPCIONES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.toUpperCase()}
                    </option>
                  ))}
                </select>

                {/* Input de Tiempo */}
                <Input
                  type="number"
                  placeholder="0.00"
                  className="w-32"
                  value={b.tiempo}
                  onChange={(e) =>
                    updateBudget(index, "tiempo", e.target.value)
                  }
                />

                {/* Botón Eliminar */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-neutral-400 hover:text-red-600"
                  onClick={() => removeBudgetRow(index)}
                  disabled={budgets.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full flex justify-center">
          <Button
            className="w-1/2 bg-blue-600 hover:bg-blue-700 h-11 font-bold"
            onClick={handleSave}
            disabled={loading || !nombre}
          >
            {loading ? (
              <Spinner className="mr-2" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Proyecto y Presupuestos
          </Button>
        </div>
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
