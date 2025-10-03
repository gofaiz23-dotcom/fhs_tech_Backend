-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" DROP DEFAULT;

-- CreateTable
CREATE TABLE "user_management_history" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "target_user_id" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_management_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_management_history" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_management_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_management_history" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "marketplace_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_management_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_management_history" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "shipping_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_management_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_management_history" ADD CONSTRAINT "user_management_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_management_history" ADD CONSTRAINT "user_management_history_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_management_history" ADD CONSTRAINT "brand_management_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_management_history" ADD CONSTRAINT "brand_management_history_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_management_history" ADD CONSTRAINT "marketplace_management_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_management_history" ADD CONSTRAINT "marketplace_management_history_marketplace_id_fkey" FOREIGN KEY ("marketplace_id") REFERENCES "marketplaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_management_history" ADD CONSTRAINT "shipping_management_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_management_history" ADD CONSTRAINT "shipping_management_history_shipping_id_fkey" FOREIGN KEY ("shipping_id") REFERENCES "shipping_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
