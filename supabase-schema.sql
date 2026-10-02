-- ============================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS SUPABASE (MAESTRIA GRILL)
-- Copie e cole este script no SQL Editor do seu painel Supabase
-- ============================================================

-- 1. TABELA DE CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image TEXT,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'cliente', -- 'cliente', 'motoboy', 'admin', 'superadmin'
    address JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    address TEXT,
    complement TEXT,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending', -- 'awaiting_payment', 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    tipo_pedido TEXT DEFAULT 'entrega',
    forma_entrega TEXT DEFAULT 'Entrega',
    endereco JSONB,
    items JSONB NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    motoboy_id TEXT,
    status_entrega TEXT,
    horario_pedido TEXT,
    cupom TEXT,
    desconto NUMERIC(10,2),
    mercadopago_payment_id TEXT,
    mercadopago_status TEXT,
    mercadopago_payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE MENSAGENS DO CHAT DO PEDIDO
CREATE TABLE IF NOT EXISTS public.order_messages (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id TEXT,
    sender_name TEXT,
    sender_role TEXT,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE CONFIGURAÇÕES GERAIS
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    name TEXT DEFAULT 'Maestria Grill',
    description TEXT,
    logo_url TEXT,
    delivery_fee NUMERIC(10,2) DEFAULT 7.00,
    phone TEXT,
    address TEXT,
    whatsapp TEXT,
    instagram TEXT,
    email TEXT,
    horario_funcionamento TEXT,
    min_order_value NUMERIC(10,2) DEFAULT 30.00,
    maintenance_mode BOOLEAN DEFAULT FALSE,
    data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública
CREATE POLICY "Permitir leitura pública de categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de configurações" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de pedidos" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Permitir criação pública de pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de pedidos" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Permitir leitura de mensagens do chat" ON public.order_messages FOR SELECT USING (true);
CREATE POLICY "Permitir envio de mensagens no chat" ON public.order_messages FOR INSERT WITH CHECK (true);

-- Políticas de Usuário
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem inserir seu perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- DADOS INICIAIS (SEED)
-- ============================================================
INSERT INTO public.categories (id, name, slug, image) VALUES
('cat-1', 'Pratos', 'pratos', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'),
('cat-2', 'Lanches', 'lanches', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'),
('cat-3', 'Bebidas', 'bebidas', 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80'),
('cat-4', 'Sobremesas', 'sobremesas', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, description, price, image, category_id, active) VALUES
('prod-1', 'Filé Mignon Grelhado', 'Medalhão de filé mignon grelhado na brasa, servido com arroz biro-biro, batatas rústicas douradas e molho chimichurri caseiro.', 68.90, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', 'cat-1', true),
('prod-2', 'Risoto de Cogumelos', 'Arroz arbóreo italiano cremoso cozido com mix de cogumelos frescos, queijo parmesão e azeite trufado.', 54.00, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop&q=80', 'cat-1', true),
('prod-3', 'Smash Burger Duplo', 'Dois smash burgers de 90g de carne angus, queijo cheddar derretido, cebola caramelizada e molho secreto no pão de brioche.', 34.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80', 'cat-2', true),
('prod-4', 'Chicken Club Sandwich', 'Sanduíche de peito de frango grelhado e desfiado, bacon crocante, queijo prato, maionese verde e salada.', 29.90, 'https://images.unsplash.com/photo-1521390188846-e2a3a97453a0?w=600&auto=format&fit=crop&q=80', 'cat-2', true),
('prod-5', 'Suco Natural de Maracujá', 'Suco feito na hora com a polpa fresca de maracujá batido com gelo.', 12.00, 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80', 'cat-3', true),
('prod-6', 'Refrigerante Lata', 'Coca-Cola Original ou Zero açúcar lata 350ml bem gelada.', 6.50, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80', 'cat-3', true),
('prod-7', 'Petit Gâteau Clássico', 'Bolinho de chocolate com recheio cremoso quente, servido com bola de sorvete de creme artesanal e calda belga.', 24.90, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', 'cat-4', true),
('prod-8', 'Pudim de Leite Condensado', 'O clássico pudim super cremoso, lisinho e sem furinhos, com calda de caramelo dourado perfeito.', 15.00, 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=600&auto=format&fit=crop&q=80', 'cat-4', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, name, description, delivery_fee, phone, address, whatsapp, email) VALUES
('main', 'Maestria Grill', 'O autêntico sabor da brasa com carnes nobres grelhadas com perfeição e paixão em servir.', 7.00, '(11) 99999-8888', 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP', '(11) 99999-8888', 'contato@maestriagrill.com.br')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SUPABASE STORAGE: BUCKETS E POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('category-images', 'category-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('restaurant-images', 'restaurant-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

DROP POLICY IF EXISTS "Public Read Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Image Buckets" ON storage.objects;
DROP POLICY IF EXISTS "Public read storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow update storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete storage" ON storage.objects;

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
