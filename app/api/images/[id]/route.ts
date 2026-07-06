import { db } from "@/db";
import { images } from "@/db/schema";
import { eq } from "drizzle-orm";

// Serve an uploaded image stored as bytea in Postgres.
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/images/[id]">,
) {
  const { id } = await ctx.params;
  const imageId = Number(id);
  if (!Number.isInteger(imageId)) {
    return new Response("Not found", { status: 404 });
  }

  const image = await db.query.images.findFirst({
    where: eq(images.id, imageId),
    columns: { data: true, mimeType: true },
  });

  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  // image.data is a Node Buffer; hand its bytes to the Response body.
  const body = new Uint8Array(image.data);

  return new Response(body, {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(body.byteLength),
      // Rows are immutable once written, so cache aggressively.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
