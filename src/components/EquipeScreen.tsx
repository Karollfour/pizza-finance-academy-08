
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptimizedRodadas } from '@/hooks/useOptimizedRodadas';
import { useSynchronizedTimer } from '@/hooks/useSynchronizedTimer';
import { usePizzas } from '@/hooks/usePizzas';
import { useEquipes } from '@/hooks/useEquipes';
import { useCompras } from '@/hooks/useCompras';
import { useHistoricoRodadas } from '@/hooks/useHistoricoRodadas';
import { useAppState } from '@/hooks/useAppState';
import FilaProducao from './FilaProducao';
import { toast } from 'sonner';

interface EquipeScreenProps {
  teamName: string;
  teamId?: string;
}

const EquipeScreen = ({ teamName, teamId }: EquipeScreenProps) => {
  const [equipeAtual, setEquipeAtual] = useState<any>(null);
  
  // ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL RETURNS
  const { rodadaAtual, lastUpdate } = useOptimizedRodadas();
  const { equipes, loading: equipesLoading } = useEquipes();
  const { appState, updateSelectedTeam } = useAppState();
  
  // Use equipeAtual?.id with fallback to prevent hooks from being called conditionally
  const { pizzas, refetch: refetchPizzas } = usePizzas(equipeAtual?.id || '', rodadaAtual?.id);
  const { compras } = useCompras(equipeAtual?.id || '');
  const { rodadas: historicoRodadas } = useHistoricoRodadas(equipeAtual?.id || '');

  // Timer sincronizado
  const {
    timeRemaining,
    formattedTime,
    timeColor,
    progressPercentage
  } = useSynchronizedTimer(rodadaAtual, {
    onTimeUp: () => {
      toast.info('⏰ Tempo da rodada esgotado!', {
        duration: 5000,
      });
    },
    onWarning: (secondsLeft) => {
      if (secondsLeft === 30) {
        toast.warning('⚠️ Atenção: 30 segundos restantes!', {
          duration: 4000,
        });
      } else if (secondsLeft === 10) {
        toast.error('🚨 Últimos 10 segundos!', {
          duration: 3000,
        });
      }
    },
    warningThreshold: 30
  });

  // Encontrar a equipe pelo ID (prioritário) ou nome
  useEffect(() => {
    if (!equipes.length) return;
    
    let equipe;
    if (teamId) {
      equipe = equipes.find(e => e.id === teamId);
    } else {
      equipe = equipes.find(e => e.nome === teamName);
    }
    
    if (equipe) {
      setEquipeAtual(equipe);
      // Atualizar estado persistente
      updateSelectedTeam(equipe.nome, equipe.id);
    }
  }, [equipes, teamName, teamId, updateSelectedTeam]);

  // Escutar eventos globais de rodada para feedback instantâneo
  useEffect(() => {
    const handleRodadaIniciada = () => {
      toast.success('🚀 Nova rodada iniciada! Boa sorte!', {
        duration: 4000,
      });
    };

    const handleRodadaPausada = () => {
      toast.warning('⏸️ Rodada pausada!', {
        duration: 4000,
      });
    };

    const handleRodadaFinalizada = () => {
      toast.info('🏁 Rodada finalizada!', {
        duration: 4000,
      });
    };

    const handleRodadaCriada = (event: CustomEvent) => {
      const { rodada } = event.detail;
      toast.info(`🎯 Nova rodada ${rodada.numero} criada e aguardando início`, {
        duration: 3000,
      });
    };

    const handlePizzaAvaliada = (event: CustomEvent) => {
      const { resultado } = event.detail;
      const emoji = resultado === 'aprovada' ? '✅' : '❌';
      toast.info(`${emoji} Sua pizza foi ${resultado}!`, {
        duration: 4000,
      });
      refetchPizzas(); // Atualizar lista de pizzas imediatamente
    };

    window.addEventListener('rodada-iniciada', handleRodadaIniciada);
    window.addEventListener('rodada-pausada', handleRodadaPausada);
    window.addEventListener('rodada-finalizada', handleRodadaFinalizada);
    window.addEventListener('rodada-criada', handleRodadaCriada as EventListener);
    window.addEventListener('pizza-avaliada', handlePizzaAvaliada as EventListener);

    return () => {
      window.removeEventListener('rodada-iniciada', handleRodadaIniciada);
      window.removeEventListener('rodada-pausada', handleRodadaPausada);
      window.removeEventListener('rodada-finalizada', handleRodadaFinalizada);
      window.removeEventListener('rodada-criada', handleRodadaCriada as EventListener);
      window.removeEventListener('pizza-avaliada', handlePizzaAvaliada as EventListener);
    };
  }, [refetchPizzas]);

  const handlePizzaEnviada = () => {
    refetchPizzas();
  };

  // ONLY AFTER ALL HOOKS ARE CALLED, NOW WE CAN HAVE CONDITIONAL RETURNS
  // Mostrar loading se ainda estiver carregando equipes ou se a equipe não foi encontrada
  if (equipesLoading || !equipeAtual) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">
        <Card className="p-8">
          <CardContent>
            <div className="text-center">
              {equipesLoading ? (
                <>
                  <div className="text-4xl mb-4">⏳</div>
                  <h2 className="text-2xl font-bold text-blue-600 mb-2">Carregando...</h2>
                  <p className="text-gray-600">Buscando dados da equipe "{teamName}"</p>
                </>
              ) : (
                <>
                  <div className="text-4xl mb-4">⚠️</div>
                  <h2 className="text-2xl font-bold text-red-600 mb-2">Equipe não encontrada</h2>
                  <p className="text-gray-600">A equipe "{teamName}" não foi encontrada no sistema.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular total gasto em tempo real
  const totalGasto = compras.reduce((sum, c) => sum + c.valor_total, 0);

  // Usar cor e emblema da equipe do banco de dados
  const corEquipe = equipeAtual?.cor_tema || '#3b82f6';
  const emblemaEquipe = equipeAtual?.emblema || '🍕';

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header da Equipe */}
        <div className="text-center mb-6">
          <div 
            className="inline-block px-8 py-4 rounded-lg text-white shadow-lg mb-4"
            style={{ backgroundColor: corEquipe }}
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-4xl">{emblemaEquipe}</span>
              <h1 className="text-3xl font-bold">{teamName}</h1>
            </div>
          </div>
          
          {/* Status da Rodada com sincronização em tempo real */}
          <Card className="shadow-lg border-2 border-yellow-200">
            <CardContent className="p-4">
              {rodadaAtual ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      Rodada {rodadaAtual.numero}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      <Badge 
                        variant={
                          rodadaAtual.status === 'ativa' ? 'default' : 
                          rodadaAtual.status === 'pausada' ? 'secondary' : 
                          'outline'
                        }
                        className={
                          rodadaAtual.status === 'ativa' ? 'bg-green-500' :
                          rodadaAtual.status === 'pausada' ? 'bg-orange-500' :
                          rodadaAtual.status === 'aguardando' ? 'bg-yellow-500' : 
                          'bg-gray-500'
                        }
                      >
                        {rodadaAtual.status === 'ativa' ? 'Ativa' :
                         rodadaAtual.status === 'pausada' ? 'Pausada' :
                         rodadaAtual.status === 'aguardando' ? 'Aguardando' : 'Finalizada'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    {rodadaAtual.status === 'ativa' ? (
                      <div className={`text-3xl font-mono ${timeColor}`}>
                        ⏱️ {formattedTime}
                      </div>
                    ) : (
                      <div className="text-lg text-gray-600">
                        {rodadaAtual.status === 'aguardando' ? 'Aguardando início' : 
                         rodadaAtual.status === 'pausada' ? 'Pausada' : 'Finalizada'}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      R$ {totalGasto.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Gasto</div>
                  </div>
                </div>
              ) : (
                <div className="text-lg text-gray-600 text-center">
                  Nenhuma rodada ativa
                </div>
              )}
              
              {/* Mostrar última sincronização */}
              <div className="mt-2 text-xs text-gray-500 text-center">
                Última sincronização: {lastUpdate.toLocaleTimeString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal - Produção com atualização automática */}
        <div className="space-y-6">
          <FilaProducao 
            equipeId={equipeAtual.id} 
            equipeNome={teamName}
            onPizzaEnviada={handlePizzaEnviada}
          />
        </div>

        {/* Histórico de Rodadas com dados em tempo real */}
        {historicoRodadas.length > 0 && (
          <div className="mt-8">
            <Card className="shadow-lg border-2 border-gray-200">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-gray-600">📈 Histórico de Rodadas</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {historicoRodadas
                    .filter(rodada => rodada.pizzas.length > 0)
                    .map((rodada) => (
                      <Card key={rodada.id} className="border border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg">Rodada {rodada.numero}</h3>
                            <Badge 
                              variant={rodada.status === 'ativa' ? 'default' : 'secondary'}
                              className={
                                rodada.status === 'ativa' ? 'bg-green-500' :
                                rodada.status === 'finalizada' ? 'bg-gray-500' : 'bg-yellow-500'
                              }
                            >
                              {rodada.status === 'ativa' ? 'Ativa' :
                               rodada.status === 'finalizada' ? 'Finalizada' : 'Aguardando'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-xl font-bold text-green-600">
                                {rodada.pizzas_aprovadas}
                              </div>
                              <div className="text-xs text-gray-600">Aprovadas</div>
                            </div>
                            <div>
                              <div className="text-xl font-bold text-red-600">
                                {rodada.pizzas_reprovadas}
                              </div>
                              <div className="text-xs text-gray-600">Reprovadas</div>
                            </div>
                            <div>
                              <div className="text-xl font-bold text-blue-600">
                                {rodada.pizzas.length}
                              </div>
                              <div className="text-xs text-gray-600">Total</div>
                            </div>
                          </div>

                          {rodada.status === 'finalizada' && rodada.finalizou_em && (
                            <div className="mt-2 text-xs text-gray-500">
                              Finalizada: {new Date(rodada.finalizou_em).toLocaleString('pt-BR')}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estatísticas Rápidas com dados atualizados */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">{pizzas.length}</div>
            <div className="text-sm text-gray-600">Pizzas Produzidas</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {pizzas.filter(p => p.resultado === 'aprovada').length}
            </div>
            <div className="text-sm text-gray-600">Aprovadas</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-red-600">
              {pizzas.filter(p => p.resultado === 'reprovada').length}
            </div>
            <div className="text-sm text-gray-600">Reprovadas</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-orange-600">
              R$ {totalGasto.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Gastos Totais</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EquipeScreen;
