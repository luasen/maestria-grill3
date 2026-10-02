-- ==============================================================================
-- MAESTRIA GRILL - ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Instruções:
-- 1. Acesse o seu painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione seu projeto e vá em "SQL Editor" no menu lateral esquerdo
-- 3. Cole todo este código e clique em "RUN" (Executar)
-- ==============================================================================

-- 1. Habilitar extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. TABELA: PROFILES (Perfis de Usuários conectados com Auth)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'motoboy', 'admin', 'superadmin')),
  address JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS e políticas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public profiles insert" ON public.profiles;
CREATE POLICY "Public profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
CREATE POLICY "Public profiles update" ON public.profiles FOR UPDATE USING (true);

-- ------------------------------------------------------------------------------
-- 3. TABELA: CATEGORIES (Categorias do Cardápio)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories allow all read" ON public.categories;
CREATE POLICY "Categories allow all read" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories allow all insert" ON public.categories;
CREATE POLICY "Categories allow all insert" ON public.categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Categories allow all update" ON public.categories;
CREATE POLICY "Categories allow all update" ON public.categories FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Categories allow all delete" ON public.categories;
CREATE POLICY "Categories allow all delete" ON public.categories FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 4. TABELA: PRODUCTS (Produtos do Cardápio)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  image TEXT,
  category_id TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products allow all read" ON public.products;
CREATE POLICY "Products allow all read" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Products allow all insert" ON public.products;
CREATE POLICY "Products allow all insert" ON public.products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Products allow all update" ON public.products;
CREATE POLICY "Products allow all update" ON public.products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Products allow all delete" ON public.products;
CREATE POLICY "Products allow all delete" ON public.products FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 5. TABELA: ORDERS (Pedidos do Sistema)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  address TEXT,
  complement TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  subtotal NUMERIC(10, 2) DEFAULT 0.00,
  delivery_fee NUMERIC(10, 2) DEFAULT 0.00,
  total NUMERIC(10, 2) DEFAULT 0.00,
  tipo_pedido TEXT,
  forma_entrega TEXT,
  endereco JSONB,
  items JSONB DEFAULT '[]'::jsonb,
  user_id TEXT,
  horario_pedido TEXT,
  cupom TEXT,
  desconto NUMERIC(10, 2) DEFAULT 0.00,
  motoboy_id TEXT,
  status_entrega TEXT,
  mercadopago_payment_id TEXT,
  mercadopago_status TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders allow all read" ON public.orders;
CREATE POLICY "Orders allow all read" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Orders allow all insert" ON public.orders;
CREATE POLICY "Orders allow all insert" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Orders allow all update" ON public.orders;
CREATE POLICY "Orders allow all update" ON public.orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Orders allow all delete" ON public.orders;
CREATE POLICY "Orders allow all delete" ON public.orders FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 6. TABELA: SETTINGS (Configurações Gerais do Restaurante)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  name TEXT,
  description TEXT,
  delivery_fee NUMERIC(10, 2) DEFAULT 7.00,
  phone TEXT,
  address TEXT,
  whatsapp TEXT,
  email TEXT,
  maintenance_mode BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings allow all read" ON public.settings;
CREATE POLICY "Settings allow all read" ON public.settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Settings allow all write" ON public.settings;
CREATE POLICY "Settings allow all write" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. TABELA: ORDER_MESSAGES (Chat em Tempo Real de Pedidos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  read_by JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages allow all read" ON public.order_messages;
CREATE POLICY "Messages allow all read" ON public.order_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Messages allow all write" ON public.order_messages;
CREATE POLICY "Messages allow all write" ON public.order_messages FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 8. ATIVAR REALTIME DO SUPABASE
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 9. CARGA INICIAL DE DADOS (SEEDS)
-- ------------------------------------------------------------------------------
-- Categorias iniciais
INSERT INTO public.categories (id, name, slug, image)
VALUES
  ('cat-1', 'Pratos', 'pratos', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'),
  ('cat-2', 'Lanches', 'lanches', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'),
  ('cat-3', 'Bebidas', 'bebidas', 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80'),
  ('cat-4', 'Sobremesas', 'sobremesas', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

-- Produtos iniciais
INSERT INTO public.products (id, name, description, price, image, category_id, active)
VALUES
  ('prod-1', 'Filé Mignon Grelhado', 'Medalhão de filé mignon grelhado na brasa, servido com arroz biro-biro, batatas rústicas douradas e molho chimichurri caseiro.', 68.90, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', 'cat-1', true),
  ('prod-2', 'Risoto de Cogumelos', 'Arroz arbóreo italiano cremoso cozido com mix de cogumelos frescos, queijo parmesão e azeite de trufas.', 54.00, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=80', 'cat-1', true),
  ('prod-3', 'Smash Burger Duplo', 'Dois smash burgers de 90g de carne angus, queijo cheddar derretido, cebola caramelizada e picles no pão brioche.', 34.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', 'cat-2', true),
  ('prod-4', 'Chicken Club Sandwich', 'Sanduíche de peito de frango grelhado e desfiado, bacon crocante, queijo prato e maionese verde.', 29.90, 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80', 'cat-2', true),
  ('prod-5', 'Suco Natural de Maracujá', 'Suco feito na hora com a polpa fresca de maracujá batido com gelo.', 12.00, 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80', 'cat-3', true),
  ('prod-6', 'Refrigerante Lata', 'Coca-Cola Original ou Zero açúcar lata 350ml bem gelada.', 6.50, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', 'cat-3', true),
  ('prod-7', 'Petit Gâteau Clássico', 'Bolinho de chocolate quente, servido com sorvete de creme artesanal e calda de chocolate belga.', 24.90, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', 'cat-4', true),
  ('prod-8', 'Pudim de Leite Condensado', 'O clássico pudim de leite condensado super cremoso, lisinho e com calda de caramelo dourado.', 15.00, 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&auto=format&fit=crop&q=80', 'cat-4', true)
ON CONFLICT (id) DO NOTHING;

-- Configurações iniciais
INSERT INTO public.settings (id, name, description, delivery_fee, phone, address, whatsapp, email, maintenance_mode, data)
VALUES (
  'main',
  'Maestria Grill',
  'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição e paixão em servir.',
  7.00,
  '(11) 99999-8888',
  'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
  '(11) 99999-8888',
  'contato@maestriagrill.com.br',
  false,
  '{"primaryColor": "#ea580c", "secondaryColor": "#f97316", "backgroundColor": "#fff7f4", "paymentPix": true, "paymentCash": true, "paymentCreditCard": true, "paymentDebitCard": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. SUPABASE STORAGE: BUCKETS E POLÍTICAS DE SEGURANÇA (RLS)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('category-images', 'category-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('restaurant-images', 'restaurant-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- Limpeza de políticas anteriores
DROP POLICY IF EXISTS "Public Read Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Public read storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow update storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete storage" ON storage.objects;

-- Função auxiliar para checar role de admin
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

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated, anon;

-- Políticas RLS em storage.objects
CREATE POLICY "Public Read Image Buckets"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN ('product-images', 'category-images', 'restaurant-images')
);

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
