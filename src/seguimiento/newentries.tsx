import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, FolderPlus, Save, ArrowLeft } from "lucide-react";

// --- Importa tus componentes de shadcn/ui ---
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
// Importaciones de Tabs
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// --- Definiciones de tipos y MOCKS de datos (Se mantienen igual) ---
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
      {" "}
      {/* Se reduce el max-w para el diseño de tabs */}
      <header className="mb-6 flex items-center justify-start">
        <Button asChild variant="ghost" className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </header>
      <h1 className="text-3xl font-bold tracking-tight mb-8">
        Alta de Nuevos Elementos
      </h1>
      {/* === IMPLEMENTACIÓN DE TABS === */}
      <Tabs defaultValue="proyecto" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="proyecto" className="gap-2">
            <FolderPlus className="h-4 w-4 cursor-pointer" />
            Nuevo Proyecto
          </TabsTrigger>
          <TabsTrigger value="usuario" className="gap-2">
            <User className="h-4 w-4 cursor-pointer" />
            Nuevo Usuario
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
      </Tabs>
      {/* === FIN DE IMPLEMENTACIÓN DE TABS === */}
    </div>
  );
}

// ----------------------------------------------------------------------
// COMPONENTES: CREAR USUARIO y CREAR PROYECTO (Se mantienen igual, pero ahora son contenedores de TabsContent)
// ----------------------------------------------------------------------

function CreateUserCard() {
  // Estado para manejar el formulario del usuario
  const [userData, setUserData] = useState({
    numero: "",
    nombre: "",
    email: "",
    areaId: "",
    procesoId: "",
  });

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Datos de usuario a enviar:", userData);
    // 💡 Lógica de envío de datos a tu API
    alert(`Enviando usuario: ${userData.nombre}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" /> Formulario de Usuario
        </CardTitle>
        <CardDescription>
          Ingresa los detalles para dar de alta un nuevo miembro al sistema.
        </CardDescription>
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

          <div className="w-full, justify-center flex items-center">
            <Button type="submit" className="w-1/2 gap-2 mt-4 cursor-pointer">
              <Save className="h-4 w-4" /> Guardar Usuario
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateProjectCard() {
  // Estado para manejar el formulario del proyecto
  const [projectData, setProjectData] = useState({
    nombre: "",
    descripcion: "",
  });

  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Datos de proyecto a enviar:", projectData);
    // 💡 Lógica de envío de datos a tu API
    alert(`Enviando proyecto: ${projectData.nombre}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderPlus className="h-5 w-5" /> Formulario de Proyecto
        </CardTitle>
        <CardDescription>
          Define un nuevo proyecto que agrupará las Órdenes de Producción.
        </CardDescription>
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

          <div className="w-full, justify-center flex items-center">
            <Button
              type="submit"
              variant="secondary"
              className="w-1/2 gap-2 mt-4 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Guardar Proyecto
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
