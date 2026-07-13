import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Candinho Company",
    short_name: "Candinho Co.",
    description: "Gestão integrada das operações da Candinho Company",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#07090d",
  };
}
