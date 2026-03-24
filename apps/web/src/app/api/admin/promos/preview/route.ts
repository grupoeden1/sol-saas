import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { previewCampaignAudience } from '@sol/db';

// ─── Schema ────────────────────────────────────────────────────────────────

const PreviewFiltersSchema = z.object({
  creditsMin: z.number().int().min(0).optional(),
  creditsMax: z.number().int().min(0).optional(),
  inactiveDays: z.number().int().min(0).optional(),
  messagesMin: z.number().int().min(0).optional(),
  messagesMax: z.number().int().min(0).optional(),
});

// ─── POST — preview audience count ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: z.infer<typeof PreviewFiltersSchema>;
  try {
    body = PreviewFiltersSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const count = await previewCampaignAudience(body);
    return NextResponse.json({ count });
  } catch (error) {
    console.error(
      '[Admin/Promos/Preview] POST error:',
      error instanceof Error ? error.message : 'Unknown',
    );
    return NextResponse.json({ error: 'Failed to preview audience' }, { status: 500 });
  }
}
