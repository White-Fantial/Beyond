import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { exportUserData } from "@/services/admin/admin-compliance.service";
import { toCsv, csvResponseHeaders } from "@/lib/export/csv";

export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  await requirePlatformAdmin();

  try {
    const data = await exportUserData(params.userId);

    // Build a flat summary for CSV; include full JSON as well
    const csvRows = [
      { section: "user", id: data.user.id, detail: `${data.user.name} <${data.user.email}>` },
      ...data.orders.map((o) => ({ section: "order", id: o.id, detail: `status=${o.status} total=${o.totalAmount}` })),
      ...data.addresses.map((a) => ({ section: "address", id: a.id, detail: `${a.line1}, ${a.city}, ${a.country}` })),
      ...data.reviews.map((r) => ({ section: "review", id: r.id, detail: `rating=${r.rating}` })),
      ...data.supportTickets.map((t) => ({ section: "ticket", id: t.id, detail: t.subject })),
    ];

    const csv = toCsv(csvRows, [
      { key: "section", label: "Section" },
      { key: "id", label: "ID" },
      { key: "detail", label: "Detail" },
    ]);

    return new Response(csv, {
      headers: csvResponseHeaders(`user-data-${params.userId}.csv`) as HeadersInit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
