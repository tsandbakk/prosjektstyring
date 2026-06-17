import { NextResponse } from "next/server";

// Open registration is disabled. New users must be invited via /invite/[token].
export async function POST() {
  return NextResponse.json(
    { error: "Registrering er ikke tillatt. Kontakt en administrator for en invitasjon." },
    { status: 403 }
  );
}
