
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PizzaWithRelations } from '@/types/database';

export const usePizzasParaAvaliacao = (equipeId: string) => {
  const [pizzas, setPizzas] = useState<PizzaWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const fetchPizzasParaAvaliacao = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      let query = supabase
        .from('pizzas')
        .select(`
          *,
          equipes!inner(nome),
          rodadas!inner(numero, status),
          sabores_pizza(nome)
        `)
        .eq('status', 'pronta')
        .is('resultado', null)
        .order('created_at', { ascending: true });

      // Only filter by equipe if equipeId is not empty
      if (equipeId && equipeId.trim() !== '') {
        query = query.eq('equipe_id', equipeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our PizzaWithRelations type
      const transformedData: PizzaWithRelations[] = (data || []).map(item => ({
        ...item,
        equipe: item.equipes ? { nome: item.equipes.nome } : undefined,
        rodada: item.rodadas ? { numero: item.rodadas.numero, status: item.rodadas.status } : undefined,
        sabor: item.sabores_pizza ? { nome: item.sabores_pizza.nome } : undefined
      }));
      
      setPizzas(transformedData);
      setError(null);
      
    } catch (err) {
      console.error('Erro ao carregar pizzas para avaliação:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar pizzas');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const cleanupChannel = () => {
    if (channelRef.current && isSubscribedRef.current) {
      console.log('Removendo canal de pizzas para avaliação');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
    }
  };

  // Single useEffect for real-time subscription - ALWAYS called consistently
  useEffect(() => {
    // Cleanup any existing subscription
    cleanupChannel();

    // Create unique channel name
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `pizzas-avaliacao-${equipeId || 'global'}-${uniqueId}`;
    
    const channelConfig = {
      event: '*',
      schema: 'public',
      table: 'pizzas',
    } as any;

    // Only add filter if equipeId is not empty
    if (equipeId && equipeId.trim() !== '') {
      channelConfig.filter = `equipe_id=eq.${equipeId}`;
    }
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        console.log('Pizza atualizada para avaliação:', payload);
        
        // Verificar se é uma pizza que precisa de avaliação (independente do status da rodada)
        const pizza = payload.new as any;
        if (pizza && pizza.status === 'pronta' && !pizza.resultado) {
          // Nova pizza para avaliação ou pizza que ainda precisa ser avaliada
          fetchPizzasParaAvaliacao(true);
          
          // Disparar evento para notificar outras telas
          window.dispatchEvent(new CustomEvent('nova-pizza-para-avaliacao', {
            detail: {
              pizza,
              equipeId: pizza.equipe_id,
              timestamp: new Date().toISOString()
            }
          }));
        } else if (payload.eventType === 'UPDATE' && pizza?.resultado) {
          // Pizza foi avaliada - remover das pendentes
          fetchPizzasParaAvaliacao(true);
          
          window.dispatchEvent(new CustomEvent('pizza-avaliada', {
            detail: {
              pizza,
              resultado: pizza.resultado,
              timestamp: new Date().toISOString()
            }
          }));
        }
      });

    channelRef.current = channel;

    // Subscribe only once
    if (!isSubscribedRef.current) {
      channel.subscribe((status) => {
        console.log('Status da subscrição de pizzas para avaliação:', status);
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
  }, [equipeId]);

  // Single useEffect for global events - ALWAYS called consistently
  useEffect(() => {
    const handleGlobalDataChange = (event: CustomEvent) => {
      const { table } = event.detail;
      if (table === 'pizzas' || table === 'rodadas') {
        setTimeout(() => {
          fetchPizzasParaAvaliacao(true);
        }, 100);
      }
    };

    const handleNovaPizza = (event: CustomEvent) => {
      const { equipeId: pizzaEquipeId } = event.detail;
      if (!equipeId || equipeId === pizzaEquipeId) {
        fetchPizzasParaAvaliacao(true);
      }
    };

    const handleRodadaFinalizada = () => {
      // Quando uma rodada é finalizada, atualizar para garantir que 
      // pizzas pendentes continuem visíveis para avaliação
      setTimeout(() => {
        fetchPizzasParaAvaliacao(true);
      }, 100);
    };

    window.addEventListener('global-data-changed', handleGlobalDataChange as EventListener);
    window.addEventListener('nova-pizza-para-avaliacao', handleNovaPizza as EventListener);
    window.addEventListener('rodada-finalizada', handleRodadaFinalizada);

    return () => {
      window.removeEventListener('global-data-changed', handleGlobalDataChange as EventListener);
      window.removeEventListener('nova-pizza-para-avaliacao', handleNovaPizza as EventListener);
      window.removeEventListener('rodada-finalizada', handleRodadaFinalizada);
    };
  }, [equipeId]);

  // Single useEffect for initial fetch - ALWAYS called consistently
  useEffect(() => {
    fetchPizzasParaAvaliacao();
  }, [equipeId]);

  return {
    pizzas,
    loading,
    error,
    refetch: () => fetchPizzasParaAvaliacao(false),
    temNovasPizzas: pizzas.length > 0
  };
};
