import { auth } from '@/lib/auth';
import { prisma } from '@sol/db';

export async function GET() {
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

    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return Response.json(conversations);
  } catch (error) {
    console.error('[Conversations API] Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
