/*
  Warnings:

  - You are about to drop the `brand_management_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `marketplace_management_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permission_management_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_management_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `shipping_management_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_management_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."brand_management_history" DROP CONSTRAINT "brand_management_history_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."brand_management_history" DROP CONSTRAINT "brand_management_history_brand_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."marketplace_management_history" DROP CONSTRAINT "marketplace_management_history_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."marketplace_management_history" DROP CONSTRAINT "marketplace_management_history_marketplace_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."permission_management_history" DROP CONSTRAINT "permission_management_history_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."permission_management_history" DROP CONSTRAINT "permission_management_history_target_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_management_history" DROP CONSTRAINT "product_management_history_brand_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."product_management_history" DROP CONSTRAINT "product_management_history_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."shipping_management_history" DROP CONSTRAINT "shipping_management_history_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."shipping_management_history" DROP CONSTRAINT "shipping_management_history_shipping_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_management_history" DROP CONSTRAINT "user_management_history_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."user_management_history" DROP CONSTRAINT "user_management_history_target_user_id_fkey";

-- DropTable
DROP TABLE "public"."brand_management_history";

-- DropTable
DROP TABLE "public"."marketplace_management_history";

-- DropTable
DROP TABLE "public"."permission_management_history";

-- DropTable
DROP TABLE "public"."product_management_history";

-- DropTable
DROP TABLE "public"."shipping_management_history";

-- DropTable
DROP TABLE "public"."user_management_history";

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "group_sku" TEXT NOT NULL,
    "sub_sku" TEXT,
    "category" TEXT NOT NULL,
    "collection_name" TEXT NOT NULL DEFAULT '',
    "single_set_item" TEXT NOT NULL,
    "brand_real_price" DECIMAL(10,2) NOT NULL,
    "brand_miscellaneous" DECIMAL(10,2) NOT NULL,
    "brand_price" DECIMAL(10,2) NOT NULL,
    "msrp" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "shipping_price" DECIMAL(10,2) NOT NULL,
    "commission_price" DECIMAL(10,2) NOT NULL,
    "profit_margin_price" DECIMAL(10,2) NOT NULL,
    "ecommerce_miscellaneous" DECIMAL(10,2) NOT NULL,
    "ecommerce_price" DECIMAL(10,2) NOT NULL,
    "main_image_url" TEXT,
    "gallery_images" JSONB,
    "attributes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "group_sku" TEXT NOT NULL,
    "sub_sku" TEXT,
    "category" TEXT NOT NULL,
    "collection_name" TEXT NOT NULL DEFAULT '',
    "ship_types" TEXT NOT NULL,
    "single_set_item" TEXT NOT NULL,
    "brand_real_price" DECIMAL(10,2) NOT NULL,
    "brand_miscellaneous" DECIMAL(10,2) NOT NULL,
    "brand_price" DECIMAL(10,2) NOT NULL,
    "msrp" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "shipping_price" DECIMAL(10,2) NOT NULL,
    "commission_price" DECIMAL(10,2) NOT NULL,
    "profit_margin_price" DECIMAL(10,2) NOT NULL,
    "ecommerce_miscellaneous" DECIMAL(10,2) NOT NULL,
    "ecommerce_price" DECIMAL(10,2) NOT NULL,
    "main_image_url" TEXT,
    "gallery_images" JSONB,
    "product_counts" JSONB,
    "attributes" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "inventory_config" JSONB NOT NULL DEFAULT '{"minValue": 3}',
    "own_brand" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" SERIAL NOT NULL,
    "listing_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "sub_sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "eta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_group_sku_key" ON "products"("group_sku");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_ecommerce_price_idx" ON "products"("ecommerce_price");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE INDEX "products_brand_id_category_idx" ON "products"("brand_id", "category");

-- CreateIndex
CREATE INDEX "products_brand_id_ecommerce_price_idx" ON "products"("brand_id", "ecommerce_price");

-- CreateIndex
CREATE INDEX "listings_product_id_idx" ON "listings"("product_id");

-- CreateIndex
CREATE INDEX "listings_brand_id_idx" ON "listings"("brand_id");

-- CreateIndex
CREATE INDEX "listings_category_idx" ON "listings"("category");

-- CreateIndex
CREATE INDEX "listings_ecommerce_price_idx" ON "listings"("ecommerce_price");

-- CreateIndex
CREATE INDEX "listings_created_at_idx" ON "listings"("created_at");

-- CreateIndex
CREATE INDEX "listings_brand_id_category_idx" ON "listings"("brand_id", "category");

-- CreateIndex
CREATE INDEX "listings_brand_id_ecommerce_price_idx" ON "listings"("brand_id", "ecommerce_price");

-- CreateIndex
CREATE INDEX "settings_created_at_idx" ON "settings"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_sub_sku_key" ON "inventory"("sub_sku");

-- CreateIndex
CREATE INDEX "inventory_listing_id_idx" ON "inventory"("listing_id");

-- CreateIndex
CREATE INDEX "inventory_brand_id_idx" ON "inventory"("brand_id");

-- CreateIndex
CREATE INDEX "inventory_sub_sku_idx" ON "inventory"("sub_sku");

-- CreateIndex
CREATE INDEX "inventory_created_at_idx" ON "inventory"("created_at");

-- CreateIndex
CREATE INDEX "inventory_brand_id_sub_sku_idx" ON "inventory"("brand_id", "sub_sku");

-- CreateIndex
CREATE INDEX "brands_name_idx" ON "brands"("name");

-- CreateIndex
CREATE INDEX "brands_created_at_idx" ON "brands"("created_at");

-- CreateIndex
CREATE INDEX "marketplaces_name_idx" ON "marketplaces"("name");

-- CreateIndex
CREATE INDEX "marketplaces_created_at_idx" ON "marketplaces"("created_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_is_revoked_idx" ON "refresh_tokens"("is_revoked");

-- CreateIndex
CREATE INDEX "shipping_companies_name_idx" ON "shipping_companies"("name");

-- CreateIndex
CREATE INDEX "shipping_companies_created_at_idx" ON "shipping_companies"("created_at");

-- CreateIndex
CREATE INDEX "user_brand_access_user_id_brand_id_idx" ON "user_brand_access"("user_id", "brand_id");

-- CreateIndex
CREATE INDEX "user_brand_access_is_active_idx" ON "user_brand_access"("is_active");

-- CreateIndex
CREATE INDEX "user_brand_access_created_at_idx" ON "user_brand_access"("created_at");

-- CreateIndex
CREATE INDEX "user_login_history_user_id_idx" ON "user_login_history"("user_id");

-- CreateIndex
CREATE INDEX "user_login_history_login_time_idx" ON "user_login_history"("login_time");

-- CreateIndex
CREATE INDEX "user_login_history_logout_time_idx" ON "user_login_history"("logout_time");

-- CreateIndex
CREATE INDEX "user_login_history_ip_address_idx" ON "user_login_history"("ip_address");

-- CreateIndex
CREATE INDEX "user_login_history_created_at_idx" ON "user_login_history"("created_at");

-- CreateIndex
CREATE INDEX "user_marketplace_access_user_id_marketplace_id_idx" ON "user_marketplace_access"("user_id", "marketplace_id");

-- CreateIndex
CREATE INDEX "user_marketplace_access_is_active_idx" ON "user_marketplace_access"("is_active");

-- CreateIndex
CREATE INDEX "user_marketplace_access_created_at_idx" ON "user_marketplace_access"("created_at");

-- CreateIndex
CREATE INDEX "user_shipping_access_user_id_shipping_company_id_idx" ON "user_shipping_access"("user_id", "shipping_company_id");

-- CreateIndex
CREATE INDEX "user_shipping_access_is_active_idx" ON "user_shipping_access"("is_active");

-- CreateIndex
CREATE INDEX "user_shipping_access_created_at_idx" ON "user_shipping_access"("created_at");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
