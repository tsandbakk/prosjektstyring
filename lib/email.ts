import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: "Prosjektstyring <onboarding@resend.dev>",
    to,
    subject: "Tilbakestill passord",
    html: `
      <p>Du har bedt om å tilbakestille passordet ditt.</p>
      <p><a href="${resetUrl}">Klikk her for å velge nytt passord</a></p>
      <p>Lenken er gyldig i 1 time. Hvis du ikke ba om dette kan du ignorere denne e-posten.</p>
    `,
  });
}
