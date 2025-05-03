// app/api/scenarios/[id]/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(_: Request, context: { params: { id: string } }) {
  const scenario = await prisma.scenario.findUnique({
    where: { id: Number(context.params.id) }
  });

  if (!scenario) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.json(scenario);
}
