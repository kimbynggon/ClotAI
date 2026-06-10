-- AlterTable: password_hash nullable (소셜 로그인 사용자는 비밀번호 없음)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: 소셜 로그인 provider 컬럼 추가
ALTER TABLE "users" ADD COLUMN "provider" VARCHAR(20) NOT NULL DEFAULT 'local';
ALTER TABLE "users" ADD COLUMN "provider_id" VARCHAR(255);

-- CreateIndex: provider + provider_id 복합 유니크
CREATE UNIQUE INDEX "users_provider_provider_id_key" ON "users"("provider", "provider_id");

-- CreateTable: favorites
CREATE TABLE "favorites" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "outfit_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: 한 사용자가 같은 outfit을 중복 즐겨찾기 방지
CREATE UNIQUE INDEX "favorites_user_id_outfit_id_key" ON "favorites"("user_id", "outfit_id");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
