
import { Database } from './supabase';

export type Item = Database['public']['Tables']['itens']['Row']
export type Compra = Database['public']['Tables']['compras']['Row']
export type Sabor = Database['public']['Tables']['sabores_pizza']['Row']
export type Rodada = Database['public']['Tables']['rodadas']['Row']
export type Pizza = Database['public']['Tables']['pizzas']['Row']
export type HistoricoSaboresRodada = Database['public']['Tables']['historico_sabores_rodada']['Row']
export type ProdutoLoja = Database['public']['Tables']['produtos_loja']['Row']
export type SaborPizza = Database['public']['Tables']['sabores_pizza']['Row']
export type Configuracao = Database['public']['Tables']['configuracoes']['Row']

// Extended Pizza type with populated relations for evaluation screen
export type PizzaWithRelations = Pizza & {
  equipe?: { nome: string; emblema?: string };
  rodada?: { numero: number; status: string };
  sabor?: { nome: string };
}

export interface Equipe {
  id: string;
  nome: string;
  saldo_inicial: number;
  gasto_total: number;
  ganho_total: number;
  professor_responsavel?: string;
  cor_tema?: string;
  emblema?: string;
  quantidade_pessoas: number;
  created_at: string;
  ordem?: number; // Adding ordem property to fix TaktTimeChart errors
}

// Adding missing types for loja tables
export interface HistoricoLoja {
  id: string;
  created_at: string;
  // Add other properties as needed
}

export interface VendaLoja {
  id: string;
  created_at: string;
  // Add other properties as needed
}
