import "server-only";
import { prisma } from "@/lib/prisma";
import { toProductCardDTO } from "@/lib/data/products";
import type { ProductCardDTO } from "@/types";

export interface CartLineItemDTO {
  productId: string;
  quantity: number;
  product: ProductCardDTO;
}

export async function getDbCart(userId: string): Promise<CartLineItemDTO[]> {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: { createdAt: "desc" },
  });

  return items
    .filter((i) => i.product.status === "ACTIVE")
    .map((i) => ({ productId: i.productId, quantity: i.quantity, product: toProductCardDTO(i.product) }));
}

export async function addToDbCart(userId: string, productId: string, quantity: number): Promise<void> {
  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: { increment: quantity } },
    create: { userId, productId, quantity },
  });
}

export async function setDbCartItemQuantity(userId: string, productId: string, quantity: number): Promise<void> {
  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
    return;
  }
  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity },
    create: { userId, productId, quantity },
  });
}

export async function removeFromDbCart(userId: string, productId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { userId, productId } });
}
