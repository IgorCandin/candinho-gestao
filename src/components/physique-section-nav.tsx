import Link from "next/link";
import { Dumbbell, House, UserRound } from "lucide-react";

type Active = "home" | "athletes" | "training";

export function PhysiqueSectionNav({ active }: { active: Active }) {
  const links = [
    { href: "/physique", label: "Início", icon: House, key: "home" as const },
    { href: "/physique/atletas", label: "Atletas", icon: UserRound, key: "athletes" as const },
    { href: "/physique/fichas", label: "Treinos", icon: Dumbbell, key: "training" as const },
  ];

  return (
    <nav className="physique-ux-nav" aria-label="Navegação do Physique">
      <div className="physique-ux-nav-brand">
        <span>PHYSIQUE</span>
        <strong>ATHLETES</strong>
      </div>

      <div className="physique-ux-nav-links">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              className={active === item.key ? "active" : ""}
              href={item.href}
              key={item.key}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
