// src/lib/scoring.ts

import { prisma } from '@/lib/prisma';

export async function getScoringItemStatus(conversationId: number) {
  const allScoringItems = await prisma.scoringItem.findMany();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        include: {
          scoringItems: true
        }
      }
    }
  });

  if (!conversation) return { scoredItems: [], missedItems: [] };

  const scoredSet = new Set<number>();
  for (const msg of conversation.messages) {
    for (const item of msg.scoringItems) {
      scoredSet.add(item.id);
    }
  }

  const scoredItems = allScoringItems
    .filter(item => scoredSet.has(item.id))
    .map(({ id, code, category, subcategory, score }) => ({ id, code, category, subcategory, score }));

  const missedItems = allScoringItems
    .filter(item => !scoredSet.has(item.id))
    .map(({ id, code, category, subcategory, score }) => ({ id, code, category, subcategory, score }));

  return { scoredItems, missedItems };
}
