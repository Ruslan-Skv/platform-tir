-- CreateTable
CREATE TABLE "blog_post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "likerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_post_likes_postId_idx" ON "blog_post_likes"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_likes_postId_likerId_key" ON "blog_post_likes"("postId", "likerId");

-- AddForeignKey
ALTER TABLE "blog_post_likes" ADD CONSTRAINT "blog_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
