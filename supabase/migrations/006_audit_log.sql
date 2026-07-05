-- Tabela de auditoria para operações sensíveis (débito, geração de PDF, login)
CREATE TABLE IF NOT EXISTS audit_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  acao       text        NOT NULL,  -- 'consulta_placa' | 'consulta_cpf' | 'consulta_cnpj' | 'pdf_gerado' | 'login'
  documento  text,                  -- placa / CPF / CNPJ consultado
  custo      numeric(10,2),         -- valor debitado (null se gratuito)
  ip         text,
  sucesso    boolean     NOT NULL DEFAULT true,
  detalhes   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_email_idx     ON audit_logs(email);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
