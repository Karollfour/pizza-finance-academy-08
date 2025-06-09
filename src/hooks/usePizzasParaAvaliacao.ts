
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pizza, Rodada } from '@/types/database';
import { toast } from 'sonner';

export const usePizzasParaAvaliacao = (rodadaAtual?: Rodada | null) => {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const TEMPO_ADICIONAL_SEGUNDOS = 60; // 1 minuto adicional após finalização

  const fetchPizzasParaAvaliacao = async () => {
    try {
      setLoading(true);
      
      // Buscar pizzas prontas para avaliação (status 'pronta' e sem resultado)
      const { data, error } = await supabase
        .from('pizzas')
        .select(`
          *,
          equipes!inner(nome, cor_tema, emblema),
          sabores_pizza(nome)
        `)
        .eq('status', 'pronta')
        .is('resultado', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPizzas((data || []) as Pizza[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pizzas para avaliação');
    } finally {
      setLoading(false);
    }
  };

  const avaliarPizza = async (pizzaId: string, resultado: 'aprovada' | 'reprovada', justificativa?: string) => {
    try {
      const { error } = await supabase
        .from('pizzas')
        .update({
          status: 'avaliada',
          resultado,
          justificativa_reprovacao: resultado === 'reprovada' ? justificativa : null,
          avaliado_por: 'Avaliador',
          updated_at: new Date().toISOString()
        })
        .eq('id', pizzaId);

      if (error) throw error;
      
      // Atualizar lista local removendo a pizza avaliada
      setPizzas(prev => prev.filter(p => p.id !== pizzaId));
      
      // Disparar evento global para notificar outras telas
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pizza-avaliada', {
          detail: {
            pizzaId,
            resultado,
            timestamp: new Date().toISOString()
          }
        }));
        
        window.dispatchEvent(new CustomEvent('global-data-changed', {
          detail: {
            table: 'pizzas',
            action: 'avaliada',
            timestamp: Date.now()
          }
        }));
      }
      
      const emoji = resultado === 'aprovada' ? '✅' : '❌';
      toast.success(`${emoji} Pizza ${resultado}!`, {
        duration: 2000,
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao avaliar pizza');
      throw err;
    }
  };

  // Calcular tempo restante para avaliação após finalização da rodada
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

  // Gerenciar timer do tempo adicional
  useEffect(() => {
    // Limpar interval anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Verificar se a rodada está finalizada e tem tempo adicional
    if (!rodadaAtual || rodadaAtual.status !== 'finalizada' || !rodadaAtual.finalizou_em) {
      setTempoRestante(null);
      return;
    }

    // Calcular tempo inicial
    const tempoInicial = calcularTempoRestante();
    if (tempoInicial === null || tempoInicial <= 0) {
      setTempoRestante(0);
      return;
    }

    setTempoRestante(tempoInicial);

    // Configurar interval para atualizar a cada segundo
    intervalRef.current = setInterval(() => {
      const novoTempo = calcularTempoRestante();
      
      if (novoTempo === null || novoTempo <= 0) {
        setTempoRestante(0);
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

  const cleanupChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  };

  // Escutar mudanças em tempo real
  useEffect(() => {
    fetchPizzasParaAvaliacao();

    // Cleanup any existing subscription
    cleanupChannel();

    // Create unique channel name
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `pizzas-avaliacao-${uniqueId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pizzas'
        },
        (payload) => {
          console.log('Pizza atualizada na avaliação:', payload);
          
          if (payload.eventType === 'INSERT') {
            const novaPizza = payload.new as Pizza;
            
            // Adicionar apenas se estiver pronta e sem resultado
            if (novaPizza.status === 'pronta' && !novaPizza.resultado) {
              fetchPizzasParaAvaliacao(); // Refetch para pegar dados completos com joins
            }
          } else if (payload.eventType === 'UPDATE') {
            const pizzaAtualizada = payload.new as Pizza;
            
            // Remover da lista se foi avaliada ou mudou status
            if (pizzaAtualizada.status === 'avaliada' || pizzaAtualizada.resultado) {
              setPizzas(prev => prev.filter(p => p.id !== pizzaAtualizada.id));
            } else if (pizzaAtualizada.status === 'pronta' && !pizzaAtualizada.resultado) {
              // Adicionar à lista se ficou pronta
              fetchPizzasParaAvaliacao(); // Refetch para pegar dados completos
            }
          } else if (payload.eventType === 'DELETE') {
            const pizzaRemovida = payload.old as Pizza;
            setPizzas(prev => prev.filter(p => p.id !== pizzaRemovida.id));
          }
        }
      );

    channelRef.current = channel;

    // Subscribe only once
    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
        }
      });
    }

    return () => {
      cleanupChannel();
    };
  }, []);

  // Escutar eventos globais
  useEffect(() => {
    const handleGlobalDataChange = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table === 'pizzas') {
        fetchPizzasParaAvaliacao();
      }
    };

    const handlePizzaAvaliada = () => {
      fetchPizzasParaAvaliacao();
    };

    window.addEventListener('global-data-changed', handleGlobalDataChange as EventListener);
    window.addEventListener('pizza-avaliada', handlePizzaAvaliada);

    return () => {
      window.removeEventListener('global-data-changed', handleGlobalDataChange as EventListener);
      window.removeEventListener('pizza-avaliada', handlePizzaAvaliada);
    };
  }, []);

  // Limpar ao desmontar componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      cleanupChannel();
    };
  }, []);

  return {
    pizzas,
    loading,
    error,
    tempoRestante,
    TEMPO_ADICIONAL_SEGUNDOS,
    avaliarPizza,
    refetch: fetchPizzasParaAvaliacao
  };
};
