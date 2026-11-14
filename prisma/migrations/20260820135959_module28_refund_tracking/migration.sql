-- AlterTable
ALTER TABLE `payment` ADD COLUMN `razorpayRefundId` VARCHAR(191) NULL,
    ADD COLUMN `refundInitiatedAt` DATETIME(3) NULL,
    ADD COLUMN `refundStatus` ENUM('PENDING', 'PROCESSED', 'FAILED') NULL,
    ADD COLUMN `refundedAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `refundedAt` DATETIME(3) NULL;
