import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Constância",
    short_name: "Constância",
    description: "Controle de hábitos com metas",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#161826",
    theme_color: "#161826",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
