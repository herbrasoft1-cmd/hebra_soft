/** Envío de correos vía Resend. Nunca bloquea la acción que lo llama: si falla
 * (sin RESEND_API_KEY configurada, dominio sin verificar, etc.) solo se registra
 * en consola — crear un pedido o mover su estado no puede depender de que un
 * correo de aviso haya salido bien. */

import { getCloudflareContext } from "@opennextjs/cloudflare";

declare global {
  interface CloudflareEnv {
    RESEND_API_KEY?: string;
  }
}

/** No usar process.env.RESEND_API_KEY directo: en Cloudflare Workers no es confiable (ver
 * docs/bitacora.md para la investigación completa). getCloudflareContext().env lee el binding
 * directo — en el dashboard de Cloudflare, el secret tiene que estar en "Settings → Variables and
 * secrets → Runtime variables and secrets" (no en "Build variables", que es solo para
 * NEXT_PUBLIC_* en build time). */
async function resendApiKey(): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.RESEND_API_KEY) return env.RESEND_API_KEY;
  } catch {}
  return process.env.RESEND_API_KEY;
}

const FROM = "HEBRA <hola@hebrasoft.com>";
const REPLY_TO = "herbrasoft1@gmail.com";
const LOGO_URL = "https://hebrasoft.com/brand/hebra-mark.png";

// Mismos tokens de color que src/app/globals.css (modo claro), para que el correo
// se vea como una extensión de la app y no como una plantilla genérica.
const COLOR = {
  bg: "#f8f5ef",
  surface: "#ffffff",
  border: "#eae3d8",
  ink: "#26221f",
  ink2: "#4d4741",
  muted: "#7a7168",
  primary: "#a4533d",
  primaryHover: "#7e3d2c",
  primarySoft: "#f6e9e2",
  night: "#26221f",
  onNight: "#f3eae0",
  onNightMuted: "#bfb2a4",
  accentLight: "#e2a285",
};

async function send({
  to,
  subject,
  html,
  replyTo = REPLY_TO,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const apiKey = await resendApiKey();
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY no configurada, correo no enviado:", subject);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, reply_to: replyTo, subject, html }),
    });
    if (!res.ok) {
      console.error("[email] Resend respondió", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[email] No se pudo enviar", e instanceof Error ? e.message : e);
  }
}

/** Cascarón visual compartido: franja superior oscura con el logo (mismo patrón que el badge del
 * sidebar en la app), tarjeta clara con el borde/radio de ".card", botón primario terracota, pie
 * con línea divisoria en vez de flotar suelto. Fuentes web-safe (serif/sans) porque Fraunces/Geist
 * no cargan de forma confiable en clientes de correo. */
function layout(bodyHtml: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${COLOR.bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${COLOR.night};border-radius:16px 16px 0 0;padding:22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:${COLOR.onNight};border-radius:9px;width:34px;height:34px;" align="center" valign="middle">
                      <img src="${LOGO_URL}" width="22" height="22" alt="" style="display:block;border:0;" />
                    </td>
                    <td style="padding-left:12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:${COLOR.onNight};letter-spacing:0.01em;">
                      hebra
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:${COLOR.surface};border:1px solid ${COLOR.border};border-top:none;padding:40px 32px;">
                <div style="font-family:Georgia,'Times New Roman',serif;color:${COLOR.ink};">
                  ${bodyHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:${COLOR.surface};border:1px solid ${COLOR.border};border-top:none;border-radius:0 0 16px 16px;padding:0 32px 28px;">
                <div style="border-top:1px solid ${COLOR.border};padding-top:18px;">
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COLOR.muted};">
                    <a href="https://hebrasoft.com" style="color:${COLOR.ink2};font-weight:600;text-decoration:none;">HEBRA</a>
                    &nbsp;·&nbsp; Software de gestión privado.
                  </p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:600;">${text}</h1>`;
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLOR.ink2};">${html}</p>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;background:${COLOR.primary};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:12px;font-family:Arial,Helvetica,sans-serif;font-weight:600;font-size:14px;">${label}</a>`;
}

export async function sendOwnerNotification({
  to,
  subject,
  heading: title,
  bodyHtml,
  ctaHref,
  ctaLabel,
}: {
  to: string[];
  subject: string;
  heading: string;
  bodyHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
}): Promise<void> {
  if (to.length === 0) return;
  const html = layout(`${heading(title)}${paragraph(bodyHtml)}${ctaHref && ctaLabel ? button(ctaHref, ctaLabel) : ""}`);
  await send({ to: to.join(","), subject, html });
}

export async function sendCustomerOrderShipped({
  to,
  customerName,
  orderTitle,
  trackingUrl,
}: {
  to: string;
  customerName: string;
  orderTitle: string;
  trackingUrl: string;
}): Promise<void> {
  const html = layout(
    `${heading(`¡Buenas noticias, ${customerName}! 🧶`)}` +
      paragraph(`Tu pedido <strong>${orderTitle}</strong> ya está listo y en camino. Gracias por tu paciencia y por elegir algo hecho a mano.`) +
      paragraph("Podés ver el detalle y seguir el estado cuando quieras, desde acá:") +
      button(trackingUrl, "Ver mi pedido"),
  );
  await send({ to, subject: `Tu pedido ya salió: ${orderTitle}`, html });
}

export async function sendContactMessage({
  fromEmail,
  fromName,
  message,
}: {
  fromEmail: string;
  fromName: string;
  message: string;
}): Promise<void> {
  const html = layout(
    `${heading("Nuevo mensaje desde hebrasoft.com")}` +
      paragraph(`<strong>${fromName}</strong> (<a href="mailto:${fromEmail}" style="color:${COLOR.primary};">${fromEmail}</a>) escribió:`) +
      `<div style="background:${COLOR.primarySoft};border-radius:14px;padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLOR.ink};white-space:pre-wrap;">${message}</div>`,
  );
  await send({ to: REPLY_TO, subject: `Nuevo mensaje de contacto — ${fromName}`, html, replyTo: fromEmail });
}
