-- Rooms (cômodos)
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏠',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦'
);

-- Items (mobília, eletrodomésticos, etc.)
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  estimated_price DECIMAL(10,2),
  status TEXT DEFAULT 'desejado' CHECK (status IN ('desejado', 'aprovado', 'comprado')),
  reference_links TEXT[] DEFAULT '{}',
  suggested_by TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item Images
CREATE TABLE item_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price Suggestions (from crawler, manual, or used marketplaces)
CREATE TABLE price_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  url TEXT NOT NULL,
  found_at TIMESTAMPTZ DEFAULT NOW(),
  is_promotion BOOLEAN DEFAULT false,
  condition TEXT DEFAULT 'novo' CHECK (condition IN ('novo', 'usado', 'seminovo'))
);

-- Activity Log
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rooms
INSERT INTO rooms (name, icon, order_index) VALUES
  ('Sala de Estar', '🛋️', 1),
  ('Quarto Principal', '🛏️', 2),
  ('Quarto 2', '🛏️', 3),
  ('Cozinha', '🍳', 4),
  ('Banheiro Social', '🚿', 5),
  ('Banheiro Suíte', '🛁', 6),
  ('Lavanderia', '👕', 7),
  ('Varanda', '🌿', 8),
  ('Escritório', '💻', 9),
  ('Hall/Corredor', '🚪', 10);

-- Insert default categories
INSERT INTO categories (name, icon) VALUES
  ('Móveis', '🪑'),
  ('Eletrodomésticos', '⚡'),
  ('Iluminação', '💡'),
  ('Janelas/Portas', '🪟'),
  ('Decoração', '🎨'),
  ('Revestimentos', '🧱'),
  ('Metais/Louças', '🚰'),
  ('Ar Condicionado', '❄️'),
  ('Cortinas/Persianas', '🪞'),
  ('Outros', '📦');

-- Enable RLS (Row Level Security) - disabled for simplicity since no auth
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth needed)
CREATE POLICY "Allow all" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON item_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON price_suggestions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for images
-- (Run this in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);
