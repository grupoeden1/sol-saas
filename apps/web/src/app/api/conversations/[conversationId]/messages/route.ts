import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';

export async function GET(
  _req: Request,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    // Validate conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.conversationId,
        userId: user.id,
      },
    });

    if (!conversation) {
      return new Response('Conversation not found or access denied', { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: params.conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return Response.json(messages);
  } catch (error) {
    console.error('[Messages API] Error:', error instanceof Error ? error.message : 'Unknown');
    return new Response('Internal server error', { status: 500 });
  }
}
