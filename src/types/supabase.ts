
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      compras: {
        Row: {
          created_at: string
          descricao: string | null
          equipe_id: string
          id: string
          produto_id: string | null
          quantidade: number | null
          rodada_id: string | null
          tipo: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          equipe_id: string
          id?: string
          produto_id?: string | null
          quantidade?: number | null
          rodada_id?: string | null
          tipo: string
          valor_total: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          equipe_id?: string
          id?: string
          produto_id?: string | null
          quantidade?: number | null
          rodada_id?: string | null
          tipo?: string
          valor_total?: number
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      contadores_jogo: {
        Row: {
          chave: string
          created_at: string
          id: string
          updated_at: string
          valor: number
        }
        Insert: {
          chave: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          chave?: string
          created_at?: string
          id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      equipes: {
        Row: {
          created_at: string
          ganho_total: number
          gasto_total: number
          id: string
          nome: string
          professor_responsavel: string | null
          quantidade_pessoas: number
          saldo_inicial: number
        }
        Insert: {
          created_at?: string
          ganho_total?: number
          gasto_total?: number
          id?: string
          nome: string
          professor_responsavel?: string | null
          quantidade_pessoas?: number
          saldo_inicial?: number
        }
        Update: {
          created_at?: string
          ganho_total?: number
          gasto_total?: number
          id?: string
          nome?: string
          professor_responsavel?: string | null
          quantidade_pessoas?: number
          saldo_inicial?: number
        }
        Relationships: []
      }
      historico_sabores_rodada: {
        Row: {
          created_at: string
          definido_em: string
          definido_por: string | null
          id: string
          ordem: number
          rodada_id: string
          sabor_id: string
        }
        Insert: {
          created_at?: string
          definido_em?: string
          definido_por?: string | null
          id?: string
          ordem: number
          rodada_id: string
          sabor_id: string
        }
        Update: {
          created_at?: string
          definido_em?: string
          definido_por?: string | null
          id?: string
          ordem?: number
          rodada_id?: string
          sabor_id?: string
        }
        Relationships: []
      }
      itens: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco: number
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco: number
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco?: number
          tipo?: string
        }
        Relationships: []
      }
      pedidos_rodada: {
        Row: {
          ativado_em: string | null
          concluido_em: string | null
          created_at: string
          criado_em: string
          equipes_que_entregaram: string[] | null
          id: string
          ordem: number
          pizzas_entregues: number
          rodada_id: string
          sabor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          ativado_em?: string | null
          concluido_em?: string | null
          created_at?: string
          criado_em?: string
          equipes_que_entregaram?: string[] | null
          id?: string
          ordem: number
          pizzas_entregues?: number
          rodada_id: string
          sabor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          ativado_em?: string | null
          concluido_em?: string | null
          created_at?: string
          criado_em?: string
          equipes_que_entregaram?: string[] | null
          id?: string
          ordem?: number
          pizzas_entregues?: number
          rodada_id?: string
          sabor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pizzas: {
        Row: {
          avaliado_por: string | null
          created_at: string
          equipe_id: string
          id: string
          justificativa_reprovacao: string | null
          resultado: string | null
          rodada_id: string
          sabor_id: string | null
          status: string
          tempo_producao_segundos: number | null
          updated_at: string
        }
        Insert: {
          avaliado_por?: string | null
          created_at?: string
          equipe_id: string
          id?: string
          justificativa_reprovacao?: string | null
          resultado?: string | null
          rodada_id: string
          sabor_id?: string | null
          status?: string
          tempo_producao_segundos?: number | null
          updated_at?: string
        }
        Update: {
          avaliado_por?: string | null
          created_at?: string
          equipe_id?: string
          id?: string
          justificativa_reprovacao?: string | null
          resultado?: string | null
          rodada_id?: string
          sabor_id?: string | null
          status?: string
          tempo_producao_segundos?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      produtos_loja: {
        Row: {
          created_at: string
          descricao: string | null
          disponivel: boolean
          durabilidade: number | null
          id: string
          imagem: string | null
          nome: string
          unidade: string
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          durabilidade?: number | null
          id?: string
          imagem?: string | null
          nome: string
          unidade: string
          valor_unitario: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          durabilidade?: number | null
          id?: string
          imagem?: string | null
          nome?: string
          unidade?: string
          valor_unitario?: number
        }
        Relationships: []
      }
      rodadas: {
        Row: {
          created_at: string
          finalizou_em: string | null
          id: string
          iniciou_em: string | null
          numero: number
          status: string
          tempo_limite: number
        }
        Insert: {
          created_at?: string
          finalizou_em?: string | null
          id?: string
          iniciou_em?: string | null
          numero: number
          status?: string
          tempo_limite?: number
        }
        Update: {
          created_at?: string
          finalizou_em?: string | null
          id?: string
          iniciou_em?: string | null
          numero?: number
          status?: string
          tempo_limite?: number
        }
        Relationships: []
      }
      sabor_ingredientes: {
        Row: {
          created_at: string
          id: string
          produto_id: string
          quantidade: number
          sabor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          produto_id: string
          quantidade?: number
          sabor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          produto_id?: string
          quantidade?: number
          sabor_id?: string
        }
        Relationships: []
      }
      sabores_pizza: {
        Row: {
          created_at: string
          descricao: string | null
          disponivel: boolean
          id: string
          imagem: string | null
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id?: string
          imagem?: string | null
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          id?: string
          imagem?: string | null
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_ganho_equipe_pizza_aprovada: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      obter_proximo_numero_rodada: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      resetar_contadores_jogo: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
