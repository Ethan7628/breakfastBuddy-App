-- Make the menu-images bucket public for image access
UPDATE storage.buckets
SET public = true
WHERE id = 'menu-images';