-- CreateTable
CREATE TABLE "permission_management_history" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "target_user_id" INTEGER NOT NULL,
    "entityType" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_management_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_management_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_management_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "permission_management_history" ADD CONSTRAINT "permission_management_history_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_management_history" ADD CONSTRAINT "permission_management_history_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_management_history" ADD CONSTRAINT "product_management_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_management_history" ADD CONSTRAINT "product_management_history_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
