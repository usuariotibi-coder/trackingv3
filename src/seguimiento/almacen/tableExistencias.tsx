import { useState, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, PackageMinus, AlertCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { sileo } from "sileo";
import { Button } from "@/components/ui/button";

interface ExistenciaOperacion {
  id: string;
  operacion: string;
  stockActual: number;
  workorder: {
    plano: string;
    cantidad: number;
  };
  proyecto?: {
    proyecto: string;
  };
}

interface GetExistenciasData {
  existenciasTotales: ExistenciaOperacion[];
}

interface TableProps {
  onSelectAction: (plano: string) => void;
}

const GET_EXISTENCIAS = gql`
  query GetExistenciasTotales {
    existenciasTotales {
      id
      operacion
      stockActual
      workorder {
        plano
        cantidad
      }
      proyecto {
        proyecto
      }
    }
  }
`;

export function TableExistencias({ onSelectAction }: TableProps) {
  const { data, loading, error } = useQuery<GetExistenciasData>(
    GET_EXISTENCIAS,
    {
      pollInterval: 30000,
    },
  );

  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    if (!data?.existenciasTotales) return [];

    return data?.existenciasTotales.filter((op: any) => {
      // Solo mostramos lo que tiene stock físico > 0
      if (op.stockActual <= 0) return false;

      // Filtro de búsqueda
      const term = filter.toLowerCase();
      return (
        op.workorder.plano.toLowerCase().includes(term) ||
        op.operacion.toLowerCase().includes(term) ||
        op.proyecto?.proyecto.toLowerCase().includes(term)
      );
    });
  }, [data, filter]);

  /* --- FUNCIÓN DE EXPORTACIÓN --- */
  const exportToExcel = () => {
    // 1. Mapeamos los datos a un formato plano para el Excel
    const dataToExport = rows.map((op) => ({
      Plano: op.workorder.plano,
      Proyecto: op.proyecto?.proyecto || "S/P",
      Operacion: op.operacion,
      "Stock Fisico": op.stockActual,
      "Meta WO": op.workorder.cantidad,
      Estatus: op.stockActual >= op.workorder.cantidad ? "COMPLETO" : "PARCIAL",
      "Fecha de Reporte": new Date().toLocaleDateString(),
    }));

    // 2. Creamos el libro y la hoja
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Existencias Almacen");

    // 3. Descargamos el archivo
    XLSX.writeFile(
      workbook,
      `Inventario_Tracking_${new Date().toISOString().split("T")[0]}.xlsx`,
    );

    sileo.success({
      title: "Archivo Excel generado con éxito",
      duration: 3000,
      fill: "black",
      styles: {
        title: "text-white!",
      },
      position: "top-center",
    });
  };

  if (loading)
    return (
      <div className="py-10 text-center animate-pulse text-sm">
        Cargando inventario...
      </div>
    );
  if (error)
    return (
      <div className="py-10 text-center text-rose-500">
        Error: {error.message}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex w-full items-center justify-between mt-2">
        {/* Contenedor del Buscador */}
        <div className="relative w-1/4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por plano o proyecto..."
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* Contenedor del Botón alineado a la derecha */}
        <Button
          variant="outline"
          onClick={exportToExcel}
          className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plano / Proyecto</TableHead>
              <TableHead className="text-center">Stock Físico</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((op: any) => (
              <TableRow key={op.id}>
                <TableCell>
                  <div className="font-bold">{op.workorder.plano}</div>
                  <div className="text-xs text-muted-foreground">
                    {op.proyecto?.proyecto}
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-blue-600">
                  {op.stockActual}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                    onClick={() => onSelectAction(op.workorder.plano)}
                  >
                    <PackageMinus className="h-4 w-4" />
                    Baja
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Resumen simple al pie de tabla */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-slate-50 p-2 rounded">
        <AlertCircle className="h-3.5 w-3.5" />
        <span>Mostrando solo operaciones con saldo positivo en almacén.</span>
      </div>
    </div>
  );
}
