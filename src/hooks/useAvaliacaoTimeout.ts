
import { useState, useEffect, useRef } from 'react';
import { useOptimizedRodadas } from './useOptimizedRodadas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAvaliacaoTimeout = () => {
  const { rodadaAtual } = useOptimizedRodadas();
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const [estaNoTempoAdicional, setEstaNoTempoAdicional] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tempoAdicionalProcessadoRef = useRef<Set<string>>(new Set());

  const TEMPO_ADICIONAL_SEGUNDOS = 60; // 1 minuto adicional

  // Calcular tempo restante para avaliação
  const calcularTempoRestante = () => {
    if (!rodadaAtual || rodadaAtual.status !== 'finalizada' || !rodadaAtual.finalizou_em) {
      return null;
    }

    const agora = new Date().getTime();
    const fimRodada = new Date(rodadaAtual.finalizou_em).getTime();
    const fimTempoAdicional = fimRodada + (TEMPO_ADICIONAL_SEGUNDOS * 1000);
    
    const tempoRestanteMs = fimTempoAdicional - agora;
    
    if (tempoRestanteMs <= 0) {
      return 0;
    }
    
    return Math.ceil(tempoRestanteMs / 1000);
  };

  // Reprovar pizzas automaticamente
  const reprovarPizzasNaoAvaliadas = async (rodadaId: string) => {
    try {
      console.log('Reprovando pizzas não avaliadas da rodada:', rodadaId);
      
      // Buscar pizzas que ainda estão prontas e não foram avaliadas
      const { data: pizzasPendentes, error: selectError } = await supabase
        .from('pizzas')
        .select('id, equipe_id')
        .eq('rodada_id', rodadaId)
        .eq('status', 'pronta')
        .is('resultado', null);

      if (selectError) {
        console.error('Erro ao buscar pizzas pendentes:', selectError);
        return;
      }

      if (!pizzasPendentes || pizzasPendentes.length === 0) {
        console.log('Nenhuma pizza pendente encontrada');
        return;
      }

      console.log(`Reprovando ${pizzasPendentes.length} pizzas não avaliadas`);

      // Reprovar todas as pizzas pendentes
      const { error: updateError } = await supabase
        .from('pizzas')
        .update({
          status: 'avaliada',
          resultado: 'reprovada',
          justificativa_reprovacao: 'Tempo de avaliação esgotado - reprovação automática',
          avaliado_por: 'Sistema - Timeout',
          updated_at: new Date().toISOString()
        })
        .eq('rodada_id', rodadaId)
        .eq('status', 'pronta')
        .is('resultado', null);

      if (updateError) {
        console.error('Erro ao reprovar pizzas:', updateError);
        return;
      }

      // Notificar sobre a reprovação automática
      toast.warning(`${pizzasPendentes.length} pizza(s) foram reprovadas automaticamente por tempo esgotado`, {
        duration: 5000,
      });

      // Disparar evento global para atualizar outras telas
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pizzas-reprovadas-automaticamente', {
          detail: {
            rodadaId,
            quantidadeReprovadas: pizzasPendentes.length,
            timestamp: new Date().toISOString()
          }
        }));
        
        window.dispatchEvent(new CustomEvent('global-data-changed', {
          detail: {
            table: 'pizzas',
            action: 'auto-reprovacao',
            timestamp: Date.now()
          }
        }));
      }

    } catch (error) {
      console.error('Erro no processo de reprovação automática:', error);
    }
  };

  // Efeito principal para gerenciar o timeout
  useEffect(() => {
    // Limpar interval anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Verificar se a rodada está finalizada
    if (!rodadaAtual || rodadaAtual.status !== 'finalizada') {
      setTempoRestante(null);
      setEstaNoTempoAdicional(false);
      return;
    }

    const rodadaId = rodadaAtual.id;

    // Verificar se já processamos esta rodada
    if (tempoAdicionalProcessadoRef.current.has(rodadaId)) {
      setTempoRestante(0);
      setEstaNoTempoAdicional(false);
      return;
    }

    setEstaNoTempoAdicional(true);

    // Calcular tempo inicial
    const tempoInicial = calcularTempoRestante();
    if (tempoInicial === null) return;

    if (tempoInicial <= 0) {
      // Tempo já esgotado
      reprovarPizzasNaoAvaliadas(rodadaId);
      tempoAdicionalProcessadoRef.current.add(rodadaId);
      setTempoRestante(0);
      setEstaNoTempoAdicional(false);
      return;
    }

    setTempoRestante(tempoInicial);

    // Configurar interval para atualizar a cada segundo
    intervalRef.current = setInterval(() => {
      const novoTempo = calcularTempoRestante();
      
      if (novoTempo === null || novoTempo <= 0) {
        // Tempo esgotado - reprovar pizzas
        reprovarPizzasNaoAvaliadas(rodadaId);
        tempoAdicionalProcessadoRef.current.add(rodadaId);
        setTempoRestante(0);
        setEstaNoTempoAdicional(false);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        setTempoRestante(novoTempo);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rodadaAtual?.id, rodadaAtual?.status, rodadaAtual?.finalizou_em]);

  // Limpar ao desmontar componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    tempoRestante,
    estaNoTempoAdicional,
    TEMPO_ADICIONAL_SEGUNDOS
  };
};
