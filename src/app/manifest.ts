import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Candinho Gestão",
    short_name: "Candinho",
    description: "Gestão operacional da Candinho Suplementos",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07090d",
    theme_color: "#07090d",
  };
}
