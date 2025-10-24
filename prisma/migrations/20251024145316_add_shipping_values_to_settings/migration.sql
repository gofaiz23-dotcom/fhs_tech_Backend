-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "shipping_values" JSONB NOT NULL DEFAULT '{"githValue": 165, "weight": 150}';
