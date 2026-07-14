-- Configurações financeiras da plataforma (Oito7 Digital / Ficha Auto)
CREATE TABLE IF NOT EXISTS config_financeiro (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave         text UNIQUE NOT NULL,
  valor         text,
  atualizado_em timestamptz DEFAULT now()
);

-- Chaves iniciais (valores preenchidos pelo admin)
INSERT INTO config_financeiro (chave, valor) VALUES
  ('efi_client_id',        ''),
  ('efi_client_secret',    ''),
  ('efi_sandbox',          'false'),
  ('efi_pix_chave',        ''),
  ('nfse_login',           ''),
  ('nfse_password',        ''),
  ('nfse_cnpj',            ''),
  ('nfse_inscricao_mun',   ''),
  ('nfse_razao_social',    'OITO7 DIGITAL LTDA'),
  ('nfse_municipio_ibge',  '2611101'),
  ('nfse_aliquota',        '5.00'),
  ('nfse_item_lc116',      '1.07'),
  ('boleto_logo_url',      ''),
  ('boleto_instrucoes',    'Pagamento referente a servicos de tecnologia - Ficha Auto')
ON CONFLICT (chave) DO NOTHING;

-- Configurações de cobrança por tenant (credenciais próprias do tenant)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS efi_client_id     text,
  ADD COLUMN IF NOT EXISTS efi_client_secret text,
  ADD COLUMN IF NOT EXISTS efi_pix_chave     text,
  ADD COLUMN IF NOT EXISTS efi_sandbox       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_contato     text,
  ADD COLUMN IF NOT EXISTS telefone          text,
  ADD COLUMN IF NOT EXISTS cnpj              text,
  ADD COLUMN IF NOT EXISTS endereco          text;

-- Cobranças emitidas pelo Ficha Auto para os tenants
CREATE TABLE IF NOT EXISTS cobrancas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE CASCADE,
  descricao       text NOT NULL,
  valor           numeric(10,2) NOT NULL,
  vencimento      date NOT NULL,
  status          text DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido','cancelado')),
  -- Boleto Efí
  boleto_charge_id    text,
  boleto_link         text,
  boleto_linha_dig    text,
  boleto_pdf_url      text,
  -- NFS-e
  nfse_numero         text,
  nfse_xml_url        text,
  nfse_pdf_url        text,
  -- Controle
  enviado_email   boolean DEFAULT false,
  pago_em         timestamptz,
  obs             text,
  criado_em       timestamptz DEFAULT now(),
  atualizado_em   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobrancas_tenant_id ON cobrancas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_status    ON cobrancas(status);
