import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  FolderPlus,
  Save,
  ArrowLeft,
  Wrench,
  Trash2, // Importar ícono de basura para eliminación
} from "lucide-react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

// --- Importa tus componentes de shadcn/ui (asumo que están en el path correcto) ---
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
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

// --- Definiciones de tipos y MOCKS de datos ---
type Area = { id: number; nombre: string };
type Proceso = { id: number; nombre: string };

const MOCK_AREAS: Area[] = [{ id: 2, nombre: "Manufactura" }];

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

export default function NewEntryPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-start">
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </header>
      <h1 className="text-2xl font-semibold tracking-tight mb-8">
        Alta y Baja de Nuevos Elementos
      </h1>
      {/* === IMPLEMENTACIÓN DE TABS: 3 COLUMNAS === */}
      <Tabs defaultValue="proyecto" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proyecto" className="gap-2">
            <FolderPlus className="h-4 w-4 cursor-pointer" />
            Proyecto
          </TabsTrigger>
          <TabsTrigger value="usuario" className="gap-2">
            <User className="h-4 w-4 cursor-pointer" />
            Usuario
          </TabsTrigger>
          <TabsTrigger value="maquina" className="gap-2">
            <Wrench className="h-4 w-4 cursor-pointer" />
            Máquina
          </TabsTrigger>
        </TabsList>

        {/* Contenido: Proyecto */}
        <TabsContent value="proyecto" className="mt-6">
          <CreateProjectCard />
          <div className="mt-8">
            <DeleteProjectCard />
          </div>
        </TabsContent>

        {/* Contenido: Usuario */}
        <TabsContent value="usuario" className="mt-6">
          <CreateUserCard />
          <div className="mt-8">
            <DeleteUserCard />
          </div>
        </TabsContent>

        {/* Contenido: Máquina */}
        <TabsContent value="maquina" className="mt-6">
          <CreateMachineCard />
          <div className="mt-8">
            <DeleteMachineCard />
          </div>
        </TabsContent>
      </Tabs>
      {/* === FIN DE IMPLEMENTACIÓN DE TABS === */}
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTE: CREAR USUARIO
// ----------------------------------------------------------------------

function CreateUserCard() {
  const CREATE_USUARIO = gql`
    mutation AgregarNuevoUsuario($input: CrearUsuarioInput!) {
      crearUsuario(input: $input) {
        id
        nombre
        email
        area {
          nombre
        }
        proceso {
          nombre
        }
      }
    }
  `;

  const [
    createUser,
    { data: dataNewUser, loading: loadingNewUser, error: errorNewUser },
  ] = useMutation(CREATE_USUARIO);

  const [userData, setUserData] = useState({
    numero: "",
    nombre: "",
    email: "",
    areaId: "",
    procesoId: "",
  });

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Datos de usuario a enviar:", userData);

    try {
      await createUser({
        variables: {
          input: {
            numero: userData.numero,
            nombre: userData.nombre,
            email: userData.email,
            areaId: userData.areaId || null,
            procesoId: userData.procesoId || null,
          },
        },
      });
      // Mensaje de éxito/limpieza
      toast.success(`Usuario '${userData.nombre}' creado exitosamente.`);
      setUserData({
        numero: "",
        nombre: "",
        email: "",
        areaId: "",
        procesoId: "",
      });
    } catch (e) {
      console.error(e);
      console.log(dataNewUser);
      toast.error(
        errorNewUser?.message ||
          "Hubo un problema de conexión al crear el usuario."
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" /> Formulario de Usuario (Alta)
        </CardTitle>
        <CardDescription>
          Ingresa los detalles para dar de alta un nuevo miembro al sistema.
        </CardDescription>
        {(errorNewUser || loadingNewUser) && (
          <div
            className={`text-sm mt-2 p-2 rounded ${
              loadingNewUser
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {loadingNewUser
              ? "Guardando..."
              : `Error: ${errorNewUser?.message}`}
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <form onSubmit={handleSubmitUser} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-nombre">Nombre completo</Label>
              <Input
                id="user-nombre"
                placeholder="Juan Pérez"
                value={userData.nombre}
                onChange={(e) =>
                  setUserData({ ...userData, nombre: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-numero">Número de empleado</Label>
              <Input
                id="user-numero"
                placeholder="1024"
                value={userData.numero}
                onChange={(e) =>
                  setUserData({ ...userData, numero: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="juan.perez@empresa.com"
              value={userData.email}
              onChange={(e) =>
                setUserData({ ...userData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-area">Área</Label>
              <Select
                onValueChange={(v) => setUserData({ ...userData, areaId: v })}
                value={userData.areaId}
              >
                <SelectTrigger id="user-area">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_AREAS.map((area) => (
                    <SelectItem key={area.id} value={String(area.id)}>
                      {area.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-proceso">Proceso asignado</Label>
              <Select
                onValueChange={(v) =>
                  setUserData({ ...userData, procesoId: v })
                }
                value={userData.procesoId}
              >
                <SelectTrigger id="user-proceso">
                  <SelectValue placeholder="Selecciona un proceso" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_PROCESOS.map((proceso) => (
                    <SelectItem key={proceso.id} value={String(proceso.id)}>
                      {proceso.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full justify-center flex items-center">
            <Button
              type="submit"
              className="w-1/2 gap-2 mt-4 cursor-pointer"
              disabled={loadingNewUser}
            >
              {loadingNewUser ? (
                <>
                  <Spinner /> Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Guardar Usuario
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// COMPONENTE NUEVO: ELIMINAR USUARIO
// ----------------------------------------------------------------------

function DeleteUserCard() {
  const DELETE_USUARIO = gql`
    mutation EliminarUsuario($numero: String!) {
      eliminarUsuarioPorNumero(numero: $numero)
    }
  `;

  const [deleteUser, { loading: loadingDeleteUser, error: errorDeleteUser }] =
    useMutation(DELETE_USUARIO);

  const [numeroToDelete, setNumeroToDelete] = useState("");

  const handleSubmitDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeroToDelete) return;

    // Pedir confirmación antes de eliminar
    if (
      !window.confirm(
        `¿Estás seguro de eliminar al usuario con número '${numeroToDelete}'? Esta acción es irreversible.`
      )
    ) {
      return;
    }

    try {
      const { data } = await deleteUser({
        variables: {
          numero: numeroToDelete,
        },
      });

      if (data) {
        toast.success(
          `Usuario con número '${numeroToDelete}' eliminado exitosamente.`
        );
        setNumeroToDelete("");
      } else {
        // Esto captura el caso donde la mutación retorna 'false' (si el backend lo hiciera),
        // aunque el backend de Python debe lanzar una excepción si no lo encuentra.
        alert(
          `Error: No se pudo eliminar el usuario con número '${numeroToDelete}'.`
        );
      }
    } catch (e) {
      console.error("Error de eliminación:", e);
      toast.error(
        `Error al eliminar usuario: ${
          errorDeleteUser?.message || "Hubo un problema de conexión."
        }`
      );
    }
  };

  return (
    <Card className="border-red-500 bg-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Trash2 className="h-5 w-5" /> Formulario de Usuario (Baja)
        </CardTitle>
        <CardDescription className="text-red-600">
          **ADVERTENCIA**: Elimina un usuario de forma permanente usando su
          número de empleado (único).
        </CardDescription>
        {errorDeleteUser && (
          <div className="text-sm mt-2 p-2 rounded bg-rose-100 text-rose-700">
            {`Error: ${errorDeleteUser.message}`}
          </div>
        )}
      </CardHeader>

      <Separator className="bg-red-200" />

      <CardContent className="pt-6">
        <form onSubmit={handleSubmitDeleteUser} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-user-numero">
              Número de empleado a eliminar
            </Label>
            <Input
              id="delete-user-numero"
              placeholder="1024"
              value={numeroToDelete}
              onChange={(e) => setNumeroToDelete(e.target.value)}
              required
            />
          </div>

          <div className="w-full justify-center flex items-center">
            <Button
              type="submit"
              variant="destructive"
              className="w-1/2 gap-2 mt-4 cursor-pointer"
              disabled={loadingDeleteUser}
            >
              {loadingDeleteUser ? (
                <>
                  <Spinner /> Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Eliminar Usuario
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// COMPONENTE: CREAR PROYECTO
// ----------------------------------------------------------------------

function CreateProjectCard() {
  const CREATE_PROYECTO = gql`
    mutation AgregarNuevoProyecto($input: CrearProyectoInput!) {
      crearProyecto(input: $input) {
        id
        proyecto
        descripcion
      }
    }
  `;

  const [
    createProject,
    {
      data: dataNewProyect,
      loading: loadingNewProyect,
      error: errorNewProyect,
    },
  ] = useMutation(CREATE_PROYECTO);

  const [projectData, setProjectData] = useState({
    nombre: "",
    descripcion: "",
  });

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Datos de proyecto a enviar:", projectData);

    try {
      await createProject({
        variables: {
          input: {
            proyecto: projectData.nombre,
            descripcion: projectData.descripcion,
          },
        },
      });
      // Mensaje de éxito/limpieza
      toast.success(`Proyecto '${projectData.nombre}' creado exitosamente.`);
      setProjectData({
        nombre: "",
        descripcion: "",
      });
    } catch (e) {
      console.error(e);
      console.log(dataNewProyect);
      toast.error(
        `Error al crear proyecto: ${
          errorNewProyect?.message || "Hubo un problema de conexión."
        }`
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5" /> Formulario de Proyecto (Alta)
        </CardTitle>
        <CardDescription>
          Define un nuevo proyecto que agrupará las Órdenes de Producción.
        </CardDescription>
        {(errorNewProyect || loadingNewProyect) && (
          <div
            className={`text-sm mt-2 p-2 rounded ${
              loadingNewProyect
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {loadingNewProyect
              ? "Guardando..."
              : `Error: ${errorNewProyect?.message}`}
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <form onSubmit={handleSubmitProject} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-nombre">Nombre del Proyecto</Label>
            <Input
              id="project-nombre"
              placeholder="OP-XXXX • Nombre del dispositivo"
              value={projectData.nombre}
              onChange={(e) =>
                setProjectData({ ...projectData, nombre: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-descripcion">Descripción</Label>
            <Textarea
              id="project-descripcion"
              placeholder="Breve descripción del objetivo o alcance del proyecto..."
              rows={4}
              value={projectData.descripcion}
              onChange={(e) =>
                setProjectData({ ...projectData, descripcion: e.target.value })
              }
            />
          </div>

          <div className="w-full justify-center flex items-center">
            <Button
              type="submit"
              variant="secondary"
              className="w-1/2 gap-2 mt-4 cursor-pointer"
              disabled={loadingNewProyect}
            >
              {loadingNewProyect ? (
                <>
                  <Spinner /> Guardando...
                </>
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

// ----------------------------------------------------------------------
// COMPONENTE NUEVO: ELIMINAR PROYECTO
// ----------------------------------------------------------------------

function DeleteProjectCard() {
  const DELETE_PROYECTO = gql`
    mutation EliminarProyecto($proyecto: String!) {
      eliminarProyectoPorNombre(proyecto: $proyecto)
    }
  `;

  const [
    deleteProject,
    { loading: loadingDeleteProject, error: errorDeleteProject },
  ] = useMutation(DELETE_PROYECTO);

  const [projectNameToDelete, setProjectNameToDelete] = useState("");

  const handleSubmitDeleteProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNameToDelete) return;

    // Pedir confirmación antes de eliminar
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el proyecto '${projectNameToDelete}'? Esta acción eliminará también todas sus operaciones asociadas y es irreversible.`
      )
    ) {
      return;
    }

    try {
      const { data } = await deleteProject({
        variables: {
          proyecto: projectNameToDelete,
        },
      });

      if (data) {
        toast.success(
          `Proyecto '${projectNameToDelete}' eliminado exitosamente.`
        );
        setProjectNameToDelete("");
      } else {
        alert(
          `Error: No se pudo eliminar el proyecto '${projectNameToDelete}'.`
        );
      }
    } catch (e) {
      console.error("Error de eliminación:", e);
      toast.error(
        `Error al eliminar proyecto: ${
          errorDeleteProject?.message || "Hubo un problema de conexión."
        }`
      );
    }
  };

  return (
    <Card className="border-red-500 bg-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Trash2 className="h-5 w-5" /> Formulario de Proyecto (Baja)
        </CardTitle>
        <CardDescription className="text-red-600">
          **ADVERTENCIA**: Elimina un proyecto de forma permanente usando su
          nombre (único). Esto puede eliminar **WorkOrders y Operaciones
          asociadas**.
        </CardDescription>
        {errorDeleteProject && (
          <div className="text-sm mt-2 p-2 rounded bg-rose-100 text-rose-700">
            {`Error: ${errorDeleteProject.message}`}
          </div>
        )}
      </CardHeader>

      <Separator className="bg-red-200" />

      <CardContent className="pt-6">
        <form onSubmit={handleSubmitDeleteProject} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-project-nombre">
              Nombre del Proyecto a eliminar
            </Label>
            <Input
              id="delete-project-nombre"
              placeholder="OP-XXXX • Nombre del dispositivo"
              value={projectNameToDelete}
              onChange={(e) => setProjectNameToDelete(e.target.value)}
              required
            />
          </div>

          <div className="w-full justify-center flex items-center">
            <Button
              type="submit"
              variant="destructive"
              className="w-1/2 gap-2 mt-4 cursor-pointer"
              disabled={loadingDeleteProject}
            >
              {loadingDeleteProject ? (
                <>
                  <Spinner /> Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Eliminar Proyecto
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------
// COMPONENTE: CREAR MÁQUINA
// ----------------------------------------------------------------------

function CreateMachineCard() {
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

  const [
    createMachine,
    {
      data: dataNewMachine,
      loading: loadingNewMachine,
      error: errorNewMachine,
    },
  ] = useMutation(CREATE_MAQUINA);

  const [machineData, setMachineData] = useState({
    nombre: "",
    procesoId: "",
  });

  const handleSubmitMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Datos de máquina a enviar:", machineData);

    try {
      await createMachine({
        variables: {
          input: {
            nombre: machineData.nombre,
            procesoId: machineData.procesoId || null,
          },
        },
      });
      // Mensaje de éxito/limpieza
      toast.success(`Máquina '${machineData.nombre}' creada exitosamente.`);
      setMachineData({
        nombre: "",
        procesoId: "",
      });
    } catch (e) {
      console.error(e);
      console.log(dataNewMachine);
      toast.error(
        `Error al crear máquina: ${
          errorNewMachine?.message || "Hubo un problema de conexión."
        }`
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" /> Formulario de Máquina (Alta)
        </CardTitle>
        <CardDescription>
          Dar de alta una nueva máquina y asignarle su proceso de producción
          principal.
        </CardDescription>
        {(errorNewMachine || loadingNewMachine) && (
          <div
            className={`text-sm mt-2 p-2 rounded ${
              loadingNewMachine
                ? "bg-amber-100 text-amber-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {loadingNewMachine
              ? "Guardando..."
              : `Error: ${errorNewMachine?.message}`}
          </div>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-6">
        <form onSubmit={handleSubmitMachine} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine-nombre">Nombre de la Máquina</Label>
            <Input
              id="machine-nombre"
              placeholder="CNC-01, Cortadora Láser, etc."
              value={machineData.nombre}
              onChange={(e) =>
                setMachineData({ ...machineData, nombre: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine-proceso">Proceso Principal</Label>
            <Select
              onValueChange={(v) =>
                setMachineData({ ...machineData, procesoId: v })
              }
              value={machineData.procesoId}
            >
              <SelectTrigger id="machine-proceso">
                <SelectValue placeholder="Selecciona el proceso que realiza" />
              </SelectTrigger>
              <SelectContent>
                {MOCK_PROCESOS.map((proceso) => (
                  <SelectItem key={proceso.id} value={String(proceso.id)}>
                    {proceso.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full justify-center flex items-center">
            <Button
              type="submit"
              variant="default"
              className="w-1/2 gap-2 mt-4 cursor-pointer"
              disabled={loadingNewMachine}
            >
              {loadingNewMachine ? (
                <>
                  <Spinner /> Guardando...
                </>
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

// ----------------------------------------------------------------------
// COMPONENTE NUEVO: ELIMINAR MÁQUINA
// ----------------------------------------------------------------------

function DeleteMachineCard() {
  const DELETE_MAQUINA = gql`
    mutation EliminarMaquina($nombre: String!) {
      eliminarMaquinaPorNombre(nombre: $nombre)
    }
  `;

  const [
    deleteMachine,
    { loading: loadingDeleteMachine, error: errorDeleteMachine },
  ] = useMutation(DELETE_MAQUINA);

  const [machineNameToDelete, setMachineNameToDelete] = useState("");

  const handleSubmitDeleteMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineNameToDelete) return;

    // Pedir confirmación antes de eliminar
    if (
      !window.confirm(
        `¿Estás seguro de eliminar la máquina '${machineNameToDelete}'? Esta acción es irreversible.`
      )
    ) {
      return;
    }

    try {
      const { data } = await deleteMachine({
        variables: {
          nombre: machineNameToDelete,
        },
      });

      if (data) {
        toast.success(
          `Máquina '${machineNameToDelete}' eliminada exitosamente.`
        );
        setMachineNameToDelete("");
      } else {
        toast.error(
          `Error: No se pudo eliminar la máquina '${machineNameToDelete}'.`
        );
      }
    } catch (e) {
      console.error("Error de eliminación:", e);
      toast.error(
        `Error al eliminar máquina: ${
          errorDeleteMachine?.message || "Hubo un problema de conexión."
        }`
      );
    }
  };

  return (
    <Card className="border-red-500 bg-red-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <Trash2 className="h-5 w-5" /> Formulario de Máquina (Baja)
        </CardTitle>
        <CardDescription className="text-red-600">
          **ADVERTENCIA**: Elimina una máquina de forma permanente usando su
          nombre (único).
        </CardDescription>
        {errorDeleteMachine && (
          <div className="text-sm mt-2 p-2 rounded bg-rose-100 text-rose-700">
            {`Error: ${errorDeleteMachine.message}`}
          </div>
        )}
      </CardHeader>

      <Separator className="bg-red-200" />

      <CardContent className="pt-6">
        <form onSubmit={handleSubmitDeleteMachine} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="delete-machine-nombre">
              Nombre de la Máquina a eliminar
            </Label>
            <Input
              id="delete-machine-nombre"
              placeholder="CNC-01, Cortadora Láser, etc."
              value={machineNameToDelete}
              onChange={(e) => setMachineNameToDelete(e.target.value)}
              required
            />
          </div>

          <div className="w-full justify-center flex items-center">
            <Button
              type="submit"
              variant="destructive"
              className="w-1/2 gap-2 mt-4 cursor-pointer"
              disabled={loadingDeleteMachine}
            >
              {loadingDeleteMachine ? (
                <>
                  <Spinner /> Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Eliminar Máquina
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
