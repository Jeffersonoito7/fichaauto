export type Database = {
  public: {
    Tables: {
      perfis: {
        Row: {
          user_id: string
          nome: string
          email: string | null
          cpf_cnpj: string | null
          saldo_consultas: number
          ativo: boolean
          pode_placa: boolean
          pode_cpf: boolean
          pode_cnpj: boolean
          pode_lote: boolean
          obs_admin: string | null
          plano: string | null
          atualizado_em: string | null
        }
        Insert: Partial<Database['public']['Tables']['perfis']['Row']>
        Update: Partial<Database['public']['Tables']['perfis']['Row']>
      }
      consultas: {
        Row: {
          id: string
          tipo: string
          documento: string
          descricao: string | null
          email: string | null
          status: string | null
          plano: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['consultas']['Row']>
        Update: Partial<Database['public']['Tables']['consultas']['Row']>
      }
      pacotes: {
        Row: {
          id: string
          nome: string
          consultas: number
          preco: number
          destaque: boolean
          ativo: boolean
          economia_texto: string | null
        }
        Insert: Partial<Database['public']['Tables']['pacotes']['Row']>
        Update: Partial<Database['public']['Tables']['pacotes']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
