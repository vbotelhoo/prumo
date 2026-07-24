import { Hero } from "./_components/hero";

// Landing page (SETUP-03): nenhum import de banco/auth — garante o
// edge case "home renderiza mesmo com o banco fora do ar" (spec.md, Edge
// Cases). LAND-01/02: hero com proposta de valor, tagline, CTAs e mockup.
export default function Home() {
  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <Hero />
    </main>
  );
}
