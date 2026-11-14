import "server-only";
import { prisma } from "@/lib/prisma";
import type { Address } from "@prisma/client";
import type { AddressInput } from "@/lib/validations/address";

export type AddressDTO = Address;

export async function getUserAddresses(userId: string): Promise<AddressDTO[]> {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAddressById(userId: string, addressId: string): Promise<AddressDTO | null> {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) return null;
  return address;
}

export async function createAddress(userId: string, input: AddressInput): Promise<AddressDTO> {
  if (input.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.create({ data: { ...input, userId } });
}

export async function updateAddress(userId: string, addressId: string, input: AddressInput): Promise<AddressDTO | null> {
  const existing = await getAddressById(userId, addressId);
  if (!existing) return null;

  if (input.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.update({ where: { id: addressId }, data: input });
}

export async function deleteAddress(userId: string, addressId: string): Promise<boolean> {
  const existing = await getAddressById(userId, addressId);
  if (!existing) return false;
  await prisma.address.delete({ where: { id: addressId } });
  return true;
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
  const existing = await getAddressById(userId, addressId);
  if (!existing) return false;
  await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } });
  return true;
}
