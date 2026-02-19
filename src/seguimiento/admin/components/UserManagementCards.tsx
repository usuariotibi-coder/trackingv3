import React, { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { User, Save, Trash2, AlertTriangle } from "lucide-react";
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

/* --------------------------------- Mocks & Types -------------------------------- */

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

/* ----------------------------------------------------------------------
// SECCIÓN 1: CREAR USUARIO (ALTA)
// ---------------------------------------------------------------------- */

export function CreateUserCard() {
  const CREATE_USUARIO = gql`
    mutation AgregarNuevoUsuario($input: CrearUsuarioInput!) {
      crearUsuario(input: $input) {
        id
        nombre
        email
      }
    }
  `;

  const [createUser, { loading }] = useMutation(CREATE_USUARIO);
  const [userData, setUserData] = useState({
    numero: "",
    nombre: "",
    email: "",
    areaId: "",
    procesoId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      sileo.success({
        title: "Usuario creado",
        description: `Usuario '${userData.nombre}' creado exitosamente.`,
        position: "top-center",
        fill: "black",
        styles: {
          title: "text-white!",
          description: "text-white/75!",
        },
      });
      setUserData({
        numero: "",
        nombre: "",
        email: "",
        areaId: "",
        procesoId: "",
      });
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
          <User /> Formulario de Usuario (Alta)
        </CardTitle>
        <CardDescription>
          Ingresa los detalles para dar de alta un nuevo miembro.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={userData.nombre}
                onChange={(e) =>
                  setUserData({ ...userData, nombre: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Número de empleado</Label>
              <Input
                value={userData.numero}
                onChange={(e) =>
                  setUserData({ ...userData, numero: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={userData.email}
              onChange={(e) =>
                setUserData({ ...userData, email: e.target.value })
              }
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select
                onValueChange={(v) => setUserData({ ...userData, areaId: v })}
                value={userData.areaId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_AREAS.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proceso asignado</Label>
              <Select
                onValueChange={(v) =>
                  setUserData({ ...userData, procesoId: v })
                }
                value={userData.procesoId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
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
          </div>
          <div className="flex justify-center pt-4">
            <Button type="submit" className="w-1/2 gap-2" disabled={loading}>
              {loading ? (
                <Spinner />
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

/* ----------------------------------------------------------------------
// SECCIÓN 2: ELIMINAR USUARIO (BAJA)
// ---------------------------------------------------------------------- */

export function DeleteUserCard() {
  const DELETE_USUARIO = gql`
    mutation EliminarUsuario($numero: String!) {
      eliminarUsuarioPorNumero(numero: $numero)
    }
  `;

  const [deleteUser, { loading }] = useMutation(DELETE_USUARIO);
  const [numero, setNumero] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      await deleteUser({ variables: { numero } });
      sileo.success({
        title: "Usuario eliminado",
        position: "top-center",
        fill: "black",
        styles: {
          title: "text-white!",
        },
      });
      setNumero("");
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
          <Trash2 /> Formulario de Usuario (Baja)
        </CardTitle>
        <CardDescription className="text-red-600 font-medium">
          Elimina un usuario de forma permanente usando su número de nómina.
        </CardDescription>
      </CardHeader>
      <Separator className="bg-red-200" />
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Número de empleado a eliminar</Label>
            <Input
              placeholder="Ej. 1024"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
              className="bg-white border-red-200 focus-visible:ring-red-500"
            />
          </div>
          <div className="flex justify-center pt-4">
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-1/2 gap-2 shadow-sm font-bold"
                  disabled={loading || !numero}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar Usuario
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    ¿Confirmar baja de personal?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Estás por eliminar al usuario con número de nómina{" "}
                    <span className="font-bold text-black">{numero}</span>. Esta
                    acción borrará permanentemente su acceso y su historial de
                    sesiones activas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? "Eliminando..." : "Sí, eliminar permanentemente"}
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
