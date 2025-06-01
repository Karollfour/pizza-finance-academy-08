
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRodadas } from '@/hooks/useRodadas';
import { usePizzas } from '@/hooks/usePizzas';
import { useEquipes } from '@/hooks/useEquipes';
import { useCompras } from '@/hooks/useCompras';
import FilaProducao from './FilaProducao';
import ConnectionStatus from './ConnectionStatus';

interface EquipeScreenProps {
  teamName: string;
}

const EquipeScreen = ({ teamName }: EquipeScreenProps) => {
  const { rodadaAtual } = useRodadas();
  const { equipes } = useEquipes();
  const [equipeAtual, setEquipeAtual] = useState<any>(null);
  const { pizzas, refetch: refetchPizzas } = usePizzas(equipeAtual?.id, rodadaAtual?.id);
  const { compras } = useCompras(equipeAtual?.id);
  const [tempoRestante, setTempoRestante] = useState(0);

  // Encontrar a equipe pelo nome
  useEffect(() => {
    const equipe = equipes.find(e => e.nome === teamName);
    setEquipeAtual(equipe);
  }, [equipes, teamName]);

  // Timer sincronizado da rodada
  useEffect(() => {
    if (!rodadaAtual || rodadaAtual.status !== 'ativa' || !rodadaAtual.iniciou_em) return;

    const inicioRodada = new Date(rodadaAtual.iniciou_em).getTime();
    const duracaoRodada = rodadaAtual.tempo_limite * 1000;

    const updateTimer = () => {
      const agora = Date.now();
      const tempoDecorrido = agora - inicioRodada;
      const resto = Math.max(0, duracaoRodada - tempoDecorrido);
      
      setTempoRestante(Math.ceil(resto / 1000));
      
      return resto > 0;
    };

    // Atualizar imediatamente
    if (!updateTimer()) return;

    const interval = setInterval(() => {
      if (!updateTimer()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rodadaAtual]);

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePizzaEnviada = () => {
    refetchPizzas();
  };

  // Calcular total gasto em tempo real
  const totalGasto = compras.reduce((sum, c) => sum + c.valor_total, 0);

  // Usar cor e emblema da equipe do banco de dados
  const corEquipe = equipeAtual?.cor_tema || '#3b82f6';
  const emblemaEquipe = equipeAtual?.emblema || '🍕';

  if (!equipeAtual) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
        <Card className="p-8">
          <CardContent>
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Equipe não encontrada</h2>
              <p className="text-gray-600">A equipe "{teamName}" não foi encontrada no sistema.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-orange-100 p-4">
      {/* Status de Conexão */}
      <ConnectionStatus showDetails={true} />
      
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
          
          {/* Status da Rodada */}
          <Card className="shadow-lg border-2 border-yellow-200">
            <CardContent className="p-4">
              {rodadaAtual ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      Rodada {rodadaAtual.numero}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">{rodadaAtual.status}</div>
                  </div>
                  <div>
                    {rodadaAtual.status === 'ativa' ? (
                      <div className="text-3xl font-mono text-red-600">
                        ⏱️ {formatarTempo(tempoRestante)}
                      </div>
                    ) : (
                      <div className="text-lg text-gray-600">
                        {rodadaAtual.status === 'aguardando' ? 'Aguardando início' : 'Finalizada'}
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
                <div className="text-lg text-gray-600 text-center">Nenhuma rodada ativa</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal - Apenas Produção */}
        <div className="space-y-6">
          <FilaProducao 
            equipeId={equipeAtual.id} 
            equipeNome={teamName}
            onPizzaEnviada={handlePizzaEnviada}
          />
        </div>

        {/* Estatísticas Rápidas */}
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
