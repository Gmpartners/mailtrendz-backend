-- Insert default industries
INSERT INTO industries (name, slug, description) VALUES
  ('E-commerce', 'ecommerce', 'Lojas virtuais, marketplaces e vendas online'),
  ('SaaS', 'saas', 'Software como serviço e aplicações web'),
  ('Educação', 'educacao', 'Escolas, cursos online e plataformas educacionais'),
  ('Saúde', 'saude', 'Clínicas, hospitais e serviços de saúde'),
  ('Fitness', 'fitness', 'Academias, personal trainers e bem-estar'),
  ('Restaurantes', 'restaurantes', 'Restaurantes, delivery e alimentação'),
  ('Imobiliário', 'imobiliario', 'Imobiliárias e corretores'),
  ('Consultoria', 'consultoria', 'Consultores e serviços profissionais'),
  ('Tecnologia', 'tecnologia', 'Empresas de tecnologia e startups'),
  ('Varejo', 'varejo', 'Lojas físicas e comércio em geral'),
  ('Serviços', 'servicos', 'Prestadores de serviços diversos'),
  ('Eventos', 'eventos', 'Organizadores de eventos e entretenimento'),
  ('Turismo', 'turismo', 'Agências de viagem e turismo'),
  ('Beleza', 'beleza', 'Salões, clínicas de estética e cosméticos'),
  ('Automotivo', 'automotivo', 'Concessionárias e serviços automotivos'),
  ('Financeiro', 'financeiro', 'Bancos, fintechs e serviços financeiros'),
  ('Marketing', 'marketing', 'Agências e profissionais de marketing'),
  ('Moda', 'moda', 'Marcas de roupas e acessórios'),
  ('Pets', 'pets', 'Pet shops e serviços para animais'),
  ('Outros', 'outros', 'Outros segmentos não listados')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample templates
INSERT INTO templates (name, description, industry, type, structure, is_premium) VALUES
  (
    'Boas-vindas E-commerce',
    'Template de boas-vindas para novos clientes de e-commerce',
    'ecommerce',
    'transactional',
    '{
      "subject": "Bem-vindo à {{storeName}}!",
      "blocks": [
        {
          "type": "hero",
          "data": {
            "title": "Bem-vindo à nossa loja!",
            "subtitle": "Preparamos ofertas especiais para você"
          }
        }
      ]
    }'::jsonb,
    false
  ),
  (
    'Newsletter SaaS',
    'Template de newsletter para produtos SaaS',
    'saas',
    'newsletter',
    '{
      "subject": "Novidades do {{productName}} - {{month}}",
      "blocks": [
        {
          "type": "header",
          "data": {
            "logo": true,
            "menu": ["Features", "Pricing", "Support"]
          }
        }
      ]
    }'::jsonb,
    false
  ),
  (
    'Promoção Fitness',
    'Template para promoções de academias',
    'fitness',
    'campaign',
    '{
      "subject": "🏋️ Oferta especial: {{discount}}% OFF",
      "blocks": [
        {
          "type": "image",
          "data": {
            "alt": "Promoção Fitness"
          }
        }
      ]
    }'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;