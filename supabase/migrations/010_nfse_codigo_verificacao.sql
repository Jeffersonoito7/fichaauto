-- Armazena o codigo de verificacao retornado pela prefeitura ao emitir a NFS-e
ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS nfse_codigo_verificacao text;
