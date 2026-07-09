import { NextResponse } from "next/server";
import { runNotificationGeneration } from "@/lib/notification-rules";

// Cron orqali bildirishnoma generatsiyasi (vercel.json crons → har kuni).
// Dashboard ochilishiga bog'liq bo'lmagan holda alertlar yangilanadi (PRD 3).
// Himoya: CRON_SECRET o'rnatilgan bo'lsa "Authorization: Bearer {secret}" talab
// qilinadi (Vercel cron shu headerni avtomatik yuboradi).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Prod'da sirsiz cron endpointini ochiq qoldirmaymiz.
    return new NextResponse("CRON_SECRET is not configured", { status: 503 });
  }

  const result = await runNotificationGeneration();
  return NextResponse.json(result);
}
