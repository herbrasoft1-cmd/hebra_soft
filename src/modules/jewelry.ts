import type { IndustryModule } from "./index";

/** Ejemplo de un segundo nicho: muestra cómo escala HEBRA sin tocar el core. */
export const jewelry: IndustryModule = {
  id: "joyeria",
  name: "Bisutería y joyería",
  recipe: {
    menuLabel: "Fórmulas",
    itemLabel: "Fórmula",
    itemPlural: "Fórmulas",
    exampleName: "Aretes de perla",
  },
  timer: { label: "Cronómetro de taller", activeVerb: "Armando" },
  statusLabels: {
    espera: "En lista de espera",
    proceso: "En armado",
    calidad: "Revisión / terminado",
    enviado: "Enviado",
  },
  defaultUnits: ["u", "m", "g"],
  supplyExamples: "Perlas, cadena, broches, alambre…",
};
