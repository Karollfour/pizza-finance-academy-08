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
      console.log('Pizzas para avaliação carregadas:', data?.length || 0);
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
        async (payload) => {
          console.log('Pizza atualizada na avaliação:', payload);
          
          if (payload.eventType === 'INSERT') {
            const novaPizza = payload.new as Pizza;
            
            // Adicionar imediatamente se estiver pronta e sem resultado
            if (novaPizza.status === 'pronta' && !novaPizza.resultado) {
              // Buscar dados completos da pizza com joins
              const { data: pizzaCompleta } = await supabase
                .from('pizzas')
                .select(`
                  *,
                  equipes!inner(nome, cor_tema, emblema),
                  sabores_pizza(nome)
                `)
                .eq('id', novaPizza.id)
                .single();
              
              if (pizzaCompleta) {
                console.log('Nova pizza adicionada à avaliação:', pizzaCompleta);
                setPizzas(prev => {
                  // Evitar duplicatas
                  const exists = prev.find(p => p.id === pizzaCompleta.id);
                  if (exists) return prev;
                  return [pizzaCompleta as Pizza, ...prev];
                });
                
                // Mostrar toast para o avaliador
                toast.info('🍕 Nova pizza aguardando avaliação!', {
                  duration: 3000,
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const pizzaAtualizada = payload.new as Pizza;
            
            // Se mudou para 'pronta' e não tem resultado, adicionar à lista
            if (pizzaAtualizada.status === 'pronta' && !pizzaAtualizada.resultado) {
              // Buscar dados completos se ficou pronta
              const { data: pizzaCompleta } = await supabase
                .from('pizzas')
                .select(`
                  *,
                  equipes!inner(nome, cor_tema, emblema),
                  sabores_pizza(nome)
                `)
                .eq('id', pizzaAtualizada.id)
                .single();
              
              if (pizzaCompleta) {
                setPizzas(prev => {
                  const exists = prev.find(p => p.id === pizzaAtualizada.id);
                  if (exists) {
                    return prev.map(p => p.id === pizzaAtualizada.id ? pizzaCompleta as Pizza : p);
                  } else {
                    console.log('Pizza ficou pronta, adicionando à avaliação:', pizzaCompleta);
                    toast.info('🍕 Nova pizza pronta para avaliação!', {
                      duration: 3000,
                    });
                    return [pizzaCompleta as Pizza, ...prev];
                  }
                });
              }
            } else if (pizzaAtualizada.status === 'avaliada' || pizzaAtualizada.resultado) {
              // Remover da lista se foi avaliada
              setPizzas(prev => prev.filter(p => p.id !== pizzaAtualizada.id));
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
          console.log('✅ Avaliador: Conectado ao realtime de pizzas');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isSubscribedRef.current = false;
          console.log('❌ Avaliador: Desconectado do realtime de pizzas');
        }
      });
    }

    return () => {
      cleanupChannel();
    };
  }, []);

  // Escutar eventos globais para sincronização adicional
  useEffect(() => {
    const handleGlobalDataChange = (event: CustomEvent) => {
      const { table, action } = event.detail;
      if (table === 'pizzas') {
        console.log('Evento global detectado, atualizando pizzas para avaliação:', action);
        // Delay pequeno para garantir que o banco processou
        setTimeout(() => {
          fetchPizzasParaAvaliacao();
        }, 100);
      }
    };

    const handlePizzaEnviada = (event: CustomEvent) => {
      console.log('Pizza enviada detectada, atualizando lista do avaliador');
      // Aguardar um momento para o banco processar e depois atualizar
      setTimeout(() => {
        fetchPizzasParaAvaliacao();
      }, 200);
    };

    const handlePizzaAvaliada = () => {
      console.log('Pizza avaliada detectada');
      fetchPizzasParaAvaliacao();
    };

    window.addEventListener('global-data-changed', handleGlobalDataChange as EventListener);
    window.addEventListener('pizza-enviada-com-sabor', handlePizzaEnviada as EventListener);
    window.addEventListener('nova-pizza-disponivel', handlePizzaEnviada as EventListener);
    window.addEventListener('pizza-avaliada', handlePizzaAvaliada);
    window.addEventListener('pizza-sabor-selecionado', handlePizzaEnviada as EventListener);

    return () => {
      window.removeEventListener('global-data-changed', handleGlobalDataChange as EventListener);
      window.removeEventListener('pizza-enviada-com-sabor', handlePizzaEnviada as EventListener);
      window.removeEventListener('nova-pizza-disponivel', handlePizzaEnviada as EventListener);
      window.removeEventListener('pizza-avaliada', handlePizzaAvaliada);
      window.removeEventListener('pizza-sabor-selecionado', handlePizzaEnviada as EventListener);
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
