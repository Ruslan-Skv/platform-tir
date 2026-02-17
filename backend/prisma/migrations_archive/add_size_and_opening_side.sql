-- Migration: Add size and openingSide fields to products, cart_items, and order_items
-- Run this SQL script if prisma db push didn't work

-- Add sizes and openingSide arrays to products table
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "sizes" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "openingSide" TEXT[] DEFAULT '{}';

-- Add size and openingSide to cart_items table
ALTER TABLE "cart_items"
ADD COLUMN IF NOT EXISTS "size" TEXT,
ADD COLUMN IF NOT EXISTS "openingSide" TEXT;

-- Add size and openingSide to order_items table
ALTER TABLE "order_items"
ADD COLUMN IF NOT EXISTS "size" TEXT,
ADD COLUMN IF NOT EXISTS "openingSide" TEXT;
