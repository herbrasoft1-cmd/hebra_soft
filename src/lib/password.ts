/** Reglas de complejidad de contraseña — un solo lugar, usado tanto en el checklist visual
 * del formulario de registro como en la validación real del servidor (nunca confiar solo en
 * lo que valide el navegador). */
export type PasswordRule = { id: string; label: string; test: (pw: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "Mínimo 8 caracteres", test: (pw) => pw.length >= 8 },
  { id: "upper", label: "Una letra mayúscula", test: (pw) => /[A-Z]/.test(pw) },
  { id: "number", label: "Un número", test: (pw) => /[0-9]/.test(pw) },
  { id: "special", label: "Un carácter especial (ej. ! @ # $)", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordMeetsAllRules(pw: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(pw));
}
