-- Tabela de alertas gerados pelo cron de monitoramento
CREATE TABLE IF NOT EXISTS alertas_monitoramento (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoramento_id uuid        NOT NULL REFERENCES monitoramentos(id) ON DELETE CASCADE,
  email            text        NOT NULL,
  documento        text        NOT NULL,
  campo_alterado   text        NOT NULL,  -- ex: 'restricaoRouboFurto'
  valor_anterior   text,
  valor_atual      text,
  lido             boolean     DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alertas_email_idx      ON alertas_monitoramento(email);
CREATE INDEX IF NOT EXISTS alertas_lido_idx       ON alertas_monitoramento(lido);
CREATE INDEX IF NOT EXISTS alertas_created_at_idx ON alertas_monitoramento(created_at DESC);
