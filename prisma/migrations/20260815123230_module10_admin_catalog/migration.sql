-- AlterTable
ALTER TABLE `product` ADD COLUMN `returnPolicyOverride` TEXT NULL;

-- CreateTable
CREATE TABLE `ProductAttribute` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    INDEX `ProductAttribute_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductAttribute` ADD CONSTRAINT `ProductAttribute_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
