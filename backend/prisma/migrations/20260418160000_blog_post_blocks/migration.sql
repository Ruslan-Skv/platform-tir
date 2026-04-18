-- CreateTable
CREATE TABLE "blog_post_blocks" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "bodyHtml" TEXT NOT NULL,

    CONSTRAINT "blog_post_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_block_images" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "blog_post_block_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_post_blocks_postId_idx" ON "blog_post_blocks"("postId");

-- CreateIndex
CREATE INDEX "blog_post_block_images_blockId_idx" ON "blog_post_block_images"("blockId");

-- AddForeignKey
ALTER TABLE "blog_post_blocks" ADD CONSTRAINT "blog_post_blocks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_block_images" ADD CONSTRAINT "blog_post_block_images_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "blog_post_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
