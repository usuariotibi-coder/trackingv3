import * as React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
// Ajusta esta ruta si no tienes alias "@"
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Proyectos" },
  { href: "/machines", label: "Maquinas" },
  { href: "/piezas", label: "WorkOrder" },
  { href: "/escaneo", label: "Escaneo" },
  { href: "/areas", label: "Areas" },
  { href: "/lavor", label: "Labor" },
  { href: "/lavor-maquina", label: "Labor Maq." },
  { href: "/intake", label: "Planeación" },
  { href: "/almacen", label: "Almacen" },
  { href: "/administracion", label: "Administracion" },
];

export default function AppNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false); // cierra el menú al cambiar de ruta
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Marca */}
        <Link to="/" className="font-semibold tracking-tight">
          Tracking
        </Link>

        {/* Desktop nav */}
        <nav className="hidden gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.href}
              to={l.href}
              className={({ isActive }) =>
                [
                  "rounded-xl px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                ].join(" ")
              }
              end={l.href === "/"}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Botón móvil */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Overlay móvil */}
      <div
        className={[
          "fixed inset-0 z-50 bg-black/30 transition-opacity md:hidden",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      {/* Panel móvil */}
      <aside
        className={[
          "fixed right-0 top-0 z-50 h-full w-72 border-l bg-background p-4 shadow-xl transition-transform md:hidden",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Navegación"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="font-semibold">Navegación</div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="grid gap-2">
          {links.map((l) => (
            <NavLink
              key={l.href}
              to={l.href}
              className={({ isActive }) =>
                [
                  "rounded-xl px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                ].join(" ")
              }
              end={l.href === "/"}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </header>
  );
}
