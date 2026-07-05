export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: {
          user_id:           string
          nome:              string
          email:             string | null
          cpf_cnpj:          string | null
          saldo_veiculo:     number
          saldo_cpf:         number
          creditos_credito:  number
          ativo:             boolean
          role:              string | null
          plano:             string | null
          pode_placa:        boolean
          pode_cpf:          boolean
          pode_cnpj:         boolean
          pode_lote:         boolean
          pode_credito:      boolean
          preco_veiculo:     number | null
          preco_cpf:         number | null
          modulos_liberados: string[] | null
          obs_admin:         string | null
          tenant_id:         string | null
          tenant_role:       string | null
          atualizado_em:     string | null
          created_at:        string | null
        }
        Insert: Partial<Database['public']['Tables']['perfis']['Row']>
        Update: Partial<Database['public']['Tables']['perfis']['Row']>
      }
      consultas: {
        Row: {
          id:          string
          email:       string | null
          tipo:        string
          documento:   string
          descricao:   string | null
          status:      string | null
          plano:       string | null
          token:       string | null
          resultado:   unknown | null
          expires_at:  string | null
          created_at:  string
        }
        Insert: Partial<Database['public']['Tables']['consultas']['Row']>
        Update: Partial<Database['public']['Tables']['consultas']['Row']>
      }
      transacoes_pix: {
        Row: {
          id:          string
          email:       string
          txid:        string
          valor:       number
          produto:     string
          quantidade:  number | null
          status:      string
          loc_id:      string | null
          created_at:  string
          pago_em:     string | null
        }
        Insert: Partial<Database['public']['Tables']['transacoes_pix']['Row']>
        Update: Partial<Database['public']['Tables']['transacoes_pix']['Row']>
      }
      tenants: {
        Row: {
          id:              string
          slug:            string
          nome:            string
          nome_fantasia:   string | null
          dominio:         string | null
          logo_url:        string | null
          cor_primaria:    string
          cor_secundaria:  string
          cor_texto:       string
          ativo:           boolean
          created_at:      string
        }
        Insert: Partial<Database['public']['Tables']['tenants']['Row']>
        Update: Partial<Database['public']['Tables']['tenants']['Row']>
      }
      planos_recarga: {
        Row: {
          id:          string
          nome:        string
          produto:     string
          valor:       number
          quantidade:  number | null
          destaque:    boolean
          ativo:       boolean
          created_at:  string
        }
        Insert: Partial<Database['public']['Tables']['planos_recarga']['Row']>
        Update: Partial<Database['public']['Tables']['planos_recarga']['Row']>
      }
      cache_placas: {
        Row: {
          placa:      string
          resultado:  unknown
          created_at: string
          expires_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['cache_placas']['Row']>
        Update: Partial<Database['public']['Tables']['cache_placas']['Row']>
      }
      monitoramentos: {
        Row: {
          id:           string
          email:        string
          tipo:         string
          documento:    string
          descricao:    string | null
          ativo:        boolean
          ultimo_hash:  string | null
          ultimo_check: string | null
          created_at:   string
        }
        Insert: Partial<Database['public']['Tables']['monitoramentos']['Row']>
        Update: Partial<Database['public']['Tables']['monitoramentos']['Row']>
      }
      api_keys: {
        Row: {
          id:              string
          email:           string
          nome:            string
          chave:           string
          ativa:           boolean
          consultas_usadas: number
          created_at:      string
        }
        Insert: Partial<Database['public']['Tables']['api_keys']['Row']>
        Update: Partial<Database['public']['Tables']['api_keys']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
