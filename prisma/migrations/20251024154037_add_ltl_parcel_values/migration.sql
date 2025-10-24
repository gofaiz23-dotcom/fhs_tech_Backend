-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "ltl_values" JSONB NOT NULL DEFAULT '{"githValue": 166, "weight": 151}',
ADD COLUMN     "parcel_values" JSONB NOT NULL DEFAULT '{"githValue": 165, "weight": 150}',
ALTER COLUMN "shipping_values" DROP NOT NULL,
ALTER COLUMN "shipping_values" DROP DEFAULT;
