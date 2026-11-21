// Demo aus der Vorlage, unverändert. Wird nicht gebaut und nicht ausgeliefert (siehe tsconfig "include").
// Hinweis: GlowCard verlangt children; diese Demo übergibt keine und würde unter strict TypeScript einen Fehler melden.
import { GlowCard } from "@/components/ui/spotlight-card";

export function Default(){
  return(
    <div className="w-screen h-screen flex flex-row items-center justify-center gap-10 custom-cursor">
      <GlowCard />
      <GlowCard />
      <GlowCard />
    </div>
  );
};
