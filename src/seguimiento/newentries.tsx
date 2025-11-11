import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, FolderPlus, Save, ArrowLeft, Wrench } from "lucide-react"; // Importar Wrench
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

// --- Definiciones de tipos y MOCKS de datos ---
type Area = { id: number; nombre: string };
type Proceso = { id: number; nombre: string };

const MOCK_AREAS: Area[] = [
  { id: 1, nombre: "Planeación" },
  { id: 2, nombre: "Manufactura" },
  { id: 3, nombre: "Calidad" },
];

const MOCK_PROCESOS: Proceso[] = [
  { id: 1, nombre: "Corte" },
  { id: 2, nombre: "Escuadre" },
  { id: 3, nombre: "Programación CNC" },
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
        Alta de Nuevos Elementos
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

        {/* Contenido: Proyecto (por defecto) */}
        <TabsContent value="proyecto" className="mt-6">
          <CreateProjectCard />
        </TabsContent>

        {/* Contenido: Usuario */}
        <TabsContent value="usuario" className="mt-6">
          <CreateUserCard />
        </TabsContent>

        {/* Contenido: Máquina (NUEVO) */}
        <TabsContent value="maquina" className="mt-6">
          <CreateMachineCard />
        </TabsContent>
      </Tabs>
      {/* === FIN DE IMPLEMENTACIÓN DE TABS === */}
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTE: CREAR USUARIO (CORREGIDO)
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
        // CORRECCIÓN CLAVE: Envolver los campos en el objeto 'input'
        variables: {
          input: {
            numero: userData.numero,
            nombre: userData.nombre,
            email: userData.email,
            areaId: userData.areaId || null, // Pasar null si está vacío (si tu backend lo permite)
            procesoId: userData.procesoId || null,
          },
        },
      });
      // Mensaje de éxito/limpieza
      alert(`Usuario '${userData.nombre}' creado exitosamente.`);
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
      alert(
        `Error al crear usuario: ${
          errorNewUser?.message || "Hubo un problema de conexión."
        }`
      );
    }
  };

  // ... (El JSX se mantiene igual)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" /> Formulario de Usuario
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
                "Guardando..."
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
// COMPONENTE: CREAR PROYECTO (CORREGIDO)
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
    createProject, // Renombrado a createProject para evitar conflicto con createUser
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
        // CORRECCIÓN CLAVE: Envolver los campos en el objeto 'input'
        variables: {
          input: {
            proyecto: projectData.nombre, // Usar 'proyecto' para GraphQL
            descripcion: projectData.descripcion,
          },
        },
      });
      // Mensaje de éxito/limpieza
      alert(`Proyecto '${projectData.nombre}' creado exitosamente.`);
      setProjectData({
        nombre: "",
        descripcion: "",
      });
    } catch (e) {
      console.error(e);
      console.log(dataNewProyect);
      alert(
        `Error al crear proyecto: ${
          errorNewProyect?.message || "Hubo un problema de conexión."
        }`
      );
    }
  };

  // ... (El JSX se mantiene igual)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5" /> Formulario de Proyecto
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
                "Guardando..."
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
// COMPONENTE NUEVO: CREAR MÁQUINA
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
      alert(`Máquina '${machineData.nombre}' creada exitosamente.`);
      setMachineData({
        nombre: "",
        procesoId: "",
      });
    } catch (e) {
      console.error(e);
      console.log(dataNewMachine);
      alert(
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
          <Wrench className="h-5 w-5" /> Formulario de Máquina
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
                "Guardando..."
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
