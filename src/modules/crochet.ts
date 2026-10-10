import type { IndustryModule } from "./index";

export const crochet: IndustryModule = {
  id: "crochet",
  name: "Crochet y tejido",
  recipe: {
    menuLabel: "Recetario",
    itemLabel: "Patrón",
    itemPlural: "Patrones",
    exampleName: "Amigurumi Osito",
  },
  timer: { label: "Cronómetro de talento", activeVerb: "Tejiendo" },
  statusLabels: {
    espera: "En lista de espera",
    proceso: "En proceso de tejido",
    calidad: "Control de calidad / terminado",
    enviado: "Enviado",
  },
  defaultUnits: ["g", "m", "u"],
  supplyExamples: "Lana, algodón, ojos de seguridad, relleno…",
};
