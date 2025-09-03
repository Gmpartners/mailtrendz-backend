-- ✅ TRIGGER: Auto-atualizar updated_at em projetos
-- Este trigger garante que updated_at seja sempre atualizado quando um projeto é modificado

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para tabela projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ✅ COMENTÁRIO: Este trigger será executado automaticamente
-- sempre que qualquer campo do projeto for atualizado,
-- garantindo que updated_at reflita a última modificação