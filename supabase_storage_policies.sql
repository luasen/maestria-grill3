-- ==============================================================================
-- MAESTRIA GRILL - POLÍTICAS DE SEGURANÇA (RLS) DO SUPABASE STORAGE
-- ==============================================================================
-- Instruções:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá no menu lateral em "SQL Editor"
-- 3. Cole todo este código e clique em "RUN"
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CRIAÇÃO E GARANTIA DOS TRÊS BUCKETS DE IMAGENS PÚBLICAS
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'product-images',
    'product-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'category-images',
    'category-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'restaurant-images',
    'restaurant-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  )
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- ------------------------------------------------------------------------------
-- 2. LIMPEZA DE POLÍTICAS ANTERIORES CONFLITANTES OU INSEGURAS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Image Buckets" ON storage.objects;

-- Remoção de políticas genéricas legadas para evitar brechas de segurança:
DROP POLICY IF EXISTS "Public read storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow update storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO AUXILIAR DE VERIFICAÇÃO DE ADMINISTRADOR (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Permite checar a role do usuário em public.profiles de forma rápida,
-- estável e segura, sem bloqueios de RLS recursivos.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id::text = auth.uid()::text 
      AND profiles.role IN ('admin', 'superadmin')
  );
$$;

-- Concede privilégio de execução da função para usuários autenticados e anônimos
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS ROW LEVEL SECURITY (RLS) PARA storage.objects
-- ------------------------------------------------------------------------------

-- POLÍTICA 1: LEITURA PÚBLICA (SELECT)
-- Qualquer visitante, cliente ou motoboy pode visualizar fotos de produtos, categorias e banners.
CREATE POLICY "Public Read Image Buckets"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN ('product-images', 'category-images', 'restaurant-images')
);

-- POLÍTICA 2: UPLOAD / INSERÇÃO (INSERT)
-- Apenas usuários autenticados cuja role em public.profiles seja 'admin' ou 'superadmin'.
-- Clientes, motoboys e anônimos são ESTRITAMENTE BLOQUEADOS.
CREATE POLICY "Admin Upload Image Buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('product-images', 'category-images', 'restaurant-images')
  AND (
    public.is_admin_user() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id::text = auth.uid()::text 
        AND profiles.role IN ('admin', 'superadmin')
    )
  )
);

-- POLÍTICA 3: ATUALIZAÇÃO (UPDATE)
-- Apenas administradores ou superadministradores autenticados podem alterar arquivos existentes.
CREATE POLICY "Admin Update Image Buckets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('product-images', 'category-images', 'restaurant-images')
  AND (
    public.is_admin_user() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id::text = auth.uid()::text 
        AND profiles.role IN ('admin', 'superadmin')
    )
  )
)
WITH CHECK (
  bucket_id IN ('product-images', 'category-images', 'restaurant-images')
  AND (
    public.is_admin_user() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id::text = auth.uid()::text 
        AND profiles.role IN ('admin', 'superadmin')
    )
  )
);

-- POLÍTICA 4: EXCLUSÃO (DELETE)
-- Apenas administradores ou superadministradores autenticados podem deletar imagens dos buckets.
CREATE POLICY "Admin Delete Image Buckets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('product-images', 'category-images', 'restaurant-images')
  AND (
    public.is_admin_user() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id::text = auth.uid()::text 
        AND profiles.role IN ('admin', 'superadmin')
    )
  )
);
