-- Modulos contratados por EMPRESA. Antes so existia por usuario (perfis),
-- o que obrigava reconfigurar a cada pessoa nova da associacao.
-- O usuario herda os modulos da empresa quando nao tem lista propria.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS modulos_liberados text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tenants.modulos_liberados IS
  'Modulos contratados pela empresa, no vocabulario de lib/products.ts (ex: placa_gravame). Vazio = pacote completo.';
