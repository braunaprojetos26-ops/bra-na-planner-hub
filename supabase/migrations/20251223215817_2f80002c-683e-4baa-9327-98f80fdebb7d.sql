-- Add is_partner_product column to products table
ALTER TABLE public.products 
ADD COLUMN is_partner_product boolean NOT NULL DEFAULT false;