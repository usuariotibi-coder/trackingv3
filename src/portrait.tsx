import { Link } from "react-router-dom";
import EntradaTitulo from "@/components/ui/start";
import EsferaRebotando from "@/components/ui/sphere";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center font-sans dark:bg-black">
      <EsferaRebotando />
      <main className="flex min-h-screen w-full items-center justify-between bg-transparent dark:bg-black">
        <p className="w-[50%] text-right text-[50px]">Orbit</p>
        <Link to="/intake" className="w-[50%] text-left text-[50px]">
          <EntradaTitulo />
        </Link>
      </main>
    </div>
  );
}
