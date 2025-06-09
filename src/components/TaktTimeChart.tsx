import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useState, useMemo, useEffect } from 'react';
import { usePizzas } from '@/hooks/usePizzas';
import { useEquipes } from '@/hooks/useEquipes';
import { useTodasRodadas } from '@/hooks/useTodasRodadas';
import { obterConfigRodada, RodadaConfig } from '@/utils/rodadaConfig';

interface TaktTimeChartProps {
  rodadaSelecionada: number | null;
}

const TaktTimeChart = ({ rodadaSelecionada }: TaktTimeChartProps) => {
  const { pizzas } = usePizzas();
  const { equipes } = useEquipes();
  const { rodadas } = useTodasRodadas();
  const [configRodada, setConfigRodada] = useState<RodadaConfig | null>(null);

  console.log('TaktTimeChart - Dados carregados:', {
    totalPizzas: pizzas.length,
    totalEquipes: equipes.length,
    totalRodadas: rodadas.length,
    rodadaFiltro: rodadaSelecionada,
    pizzasComStatus: pizzas.filter(p => p.status === 'avaliada').length,
    pizzasAprovadas: pizzas.filter(p => p.resultado === 'aprovada').length
  });

  // Filtrar apenas rodadas finalizadas que têm pizzas
  const rodadasDisponiveis = useMemo(() => {
    const rodadasComPizzas = rodadas.filter(rodada => {
      const temPizzas = pizzas.some(pizza => pizza.rodada_id === rodada.id);
      const estaFinalizada = rodada.status === 'finalizada';
      console.log(`Rodada ${rodada.numero}: temPizzas=${temPizzas}, finalizada=${estaFinalizada}`);
      return temPizzas && estaFinalizada;
    }).sort((a, b) => b.numero - a.numero);
    console.log('Rodadas disponíveis para Timeline:', rodadasComPizzas.map(r => ({
      id: r.id,
      numero: r.numero,
      status: r.status
    })));
    return rodadasComPizzas;
  }, [rodadas, pizzas]);

  // Usar rodada do filtro global ou a mais recente como padrão
  const rodadaAtual = useMemo(() => {
    if (rodadaSelecionada) {
      const rodadaEncontrada = rodadas.find(r => r.numero === rodadaSelecionada);
      console.log('Usando rodada do filtro global:', rodadaEncontrada?.numero || 'não encontrada');
      return rodadaEncontrada || null;
    }
    
    if (rodadasDisponiveis.length > 0) {
      const rodadaPadrao = rodadasDisponiveis[0];
      console.log('Usando rodada padrão (mais recente):', rodadaPadrao.numero);
      return rodadaPadrao;
    }
    
    console.log('Nenhuma rodada disponível');
    return null;
  }, [rodadaSelecionada, rodadas, rodadasDisponiveis]);

  // Verificar se é a primeira rodada
  const isPrimeiraRodada = rodadaAtual?.numero === 1;

  // Carregar configuração da rodada quando ela muda
  useEffect(() => {
    const carregarConfig = async () => {
      if (rodadaAtual) {
        console.log('Carregando configuração para rodada:', rodadaAtual.numero);
        const config = await obterConfigRodada(rodadaAtual.id);
        setConfigRodada(config);
        console.log('Configuração carregada:', config);
      } else {
        setConfigRodada(null);
      }
    };
    carregarConfig();
  }, [rodadaAtual]);

  // Se for a primeira rodada, não exibir o gráfico
  if (isPrimeiraRodada) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>📊 Takt Time Médio por Equipe</span>
            <div className="text-sm text-gray-600">
              Analisando Rodada {rodadaAtual.numero}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-lg mb-2">📊 Primeira Rodada</p>
            <p className="text-sm">
              O gráfico de Takt Time médio será exibido a partir da segunda rodada, quando houver dados de referência para comparação.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular dados do Takt Time por equipe para gráfico de barras
  const dadosTaktTimePorEquipe = useMemo(() => {
    if (!rodadaAtual || !configRodada) {
      console.log('Sem rodada atual ou configuração para calcular Takt Time');
      return {
        dados: [],
        tempoMedioPorPizza: 0,
        tempoMedioRodada: 0
      };
    }
    console.log('Calculando Takt Time por equipe para rodada:', rodadaAtual.numero);
    console.log('Configuração da rodada:', configRodada);

    // Filtrar pizzas da rodada que foram ENVIADAS para avaliação
    const pizzasDaRodada = pizzas.filter(pizza => pizza.rodada_id === rodadaAtual.id && (pizza.status === 'pronta' || pizza.status === 'avaliada'));
    console.log(`Pizzas enviadas para avaliação na rodada ${rodadaAtual.numero}:`, pizzasDaRodada.length);

    // Obter horário de início da rodada
    const inicioRodada = rodadaAtual.iniciou_em ? new Date(rodadaAtual.iniciou_em).getTime() : null;
    if (!inicioRodada) {
      console.log('Rodada não tem horário de início registrado');
      return {
        dados: [],
        tempoMedioPorPizza: 0,
        tempoMedioRodada: 0
      };
    }

    // Usar o número de pizzas planejadas pelo administrador
    const totalPizzasRodada = configRodada.numeroPizzasPlanejadas;

    // Calcular o tempo médio esperado por pizza (referência da rodada)
    const tempoMedioPorPizza = rodadaAtual.tempo_limite / totalPizzasRodada;
    console.log(`Tempo médio de referência da rodada: ${tempoMedioPorPizza.toFixed(1)}s por pizza`);

    // Agrupar pizzas por equipe e calcular Takt Time médio
    const pizzasPorEquipe: {
      [equipeId: string]: any[];
    } = {};
    const dadosProcessados: any[] = [];

    // Agrupar pizzas por equipe
    pizzasDaRodada.forEach(pizza => {
      if (!pizzasPorEquipe[pizza.equipe_id]) {
        pizzasPorEquipe[pizza.equipe_id] = [];
      }
      const equipe = equipes.find(e => e.id === pizza.equipe_id);
      const tempoEnvio = new Date(pizza.created_at).getTime();
      const tempoDecorrido = Math.max(0, (tempoEnvio - inicioRodada) / 1000);
      pizzasPorEquipe[pizza.equipe_id].push({
        pizza,
        equipe,
        tempoDecorrido,
        tempoEnvio
      });
    });

    // Processar cada equipe
    equipes.forEach(equipe => {
      const pizzasEquipe = pizzasPorEquipe[equipe.id] || [];
      if (pizzasEquipe.length === 0) {
        // Equipe sem pizzas enviadas
        dadosProcessados.push({
          equipeNome: equipe.nome,
          taktTimeMedio: 0,
          pizzasEnviadas: 0,
          corEquipe: equipe.cor_tema || '#3b82f6',
          tempoMedioRodada: tempoMedioPorPizza,
          dentroDoTempo: false,
          desempenho: 'Sem dados',
          ordem: equipe.ordem || 999
        });
        return;
      }

      // Ordenar pizzas por tempo de envio
      pizzasEquipe.sort((a, b) => a.tempoDecorrido - b.tempoDecorrido);

      // Calcular Takt Time relativo para cada pizza
      const taktTimes: number[] = [];
      pizzasEquipe.forEach((pizzaAtual, index) => {
        const numeroPizza = index + 1;
        const tempoIdealInicio = (numeroPizza - 1) * tempoMedioPorPizza;
        const tempoRelativo = pizzaAtual.tempoDecorrido - tempoIdealInicio;
        taktTimes.push(tempoRelativo);
      });

      // Calcular Takt Time médio da equipe
      const taktTimeMedio = taktTimes.reduce((sum, t) => sum + t, 0) / taktTimes.length;

      // Verificar se está dentro do tempo médio da rodada
      const dentroDoTempo = taktTimeMedio <= tempoMedioPorPizza;

      // Classificar desempenho
      let desempenho = '';
      if (taktTimeMedio <= tempoMedioPorPizza * 0.8) {
        desempenho = 'Excelente';
      } else if (taktTimeMedio <= tempoMedioPorPizza) {
        desempenho = 'Bom';
      } else if (taktTimeMedio <= tempoMedioPorPizza * 1.2) {
        desempenho = 'Regular';
      } else {
        desempenho = 'Crítico';
      }
      console.log(`Equipe ${equipe.nome}: Takt Time médio = ${taktTimeMedio.toFixed(1)}s, Desempenho = ${desempenho}`);
      dadosProcessados.push({
        equipeNome: equipe.nome,
        taktTimeMedio: Number(taktTimeMedio.toFixed(1)),
        pizzasEnviadas: pizzasEquipe.length,
        corEquipe: equipe.cor_tema || '#3b82f6',
        tempoMedioRodada: tempoMedioPorPizza,
        dentroDoTempo: dentroDoTempo,
        desempenho: desempenho,
        ordem: equipe.ordem || 999
      });
    });

    // Ordenar dados pelo campo "ordem" (identificador da ordem de equipe)
    dadosProcessados.sort((a, b) => a.ordem - b.ordem);
    console.log('Dados ordenados por ordem da equipe:', dadosProcessados.map(d => ({
      equipe: d.equipeNome,
      ordem: d.ordem
    })));
    return {
      dados: dadosProcessados,
      tempoMedioPorPizza,
      tempoMedioRodada: tempoMedioPorPizza
    };
  }, [rodadaAtual, pizzas, equipes, configRodada]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.pizzasEnviadas === 0) {
        return (
          <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
            <p className="font-semibold">{data.equipeNome}</p>
            <p className="text-red-600">Nenhuma pizza enviada</p>
          </div>
        );
      }
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.equipeNome}</p>
          <p className="text-blue-600">{`Takt Time Médio: ${data.taktTimeMedio}s`}</p>
          <p className="text-orange-600">{`Tempo Médio da Rodada: ${data.tempoMedioRodada.toFixed(1)}s`}</p>
          <p className="text-purple-600">{`Pizzas Enviadas: ${data.pizzasEnviadas}`}</p>
          <p className={`font-medium ${data.dentroDoTempo ? 'text-green-600' : 'text-red-600'}`}>
            {data.dentroDoTempo ? '✓ Dentro do tempo médio' : '✗ Acima do tempo médio'}
          </p>
          <p className="text-gray-600">{`Desempenho: ${data.desempenho}`}</p>
        </div>
      );
    }
    return null;
  };

  const obterCorBarra = (data: any) => {
    if (data.pizzasEnviadas === 0) return '#d1d5db'; // Cinza para sem dados
    if (data.desempenho === 'Excelente') return '#10b981'; // Verde
    if (data.desempenho === 'Bom') return '#3b82f6'; // Azul
    if (data.desempenho === 'Regular') return '#f59e0b'; // Amarelo
    return '#ef4444'; // Vermelho para crítico
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📊 Takt Time Médio por Equipe</span>
          <div className="text-sm text-gray-600">
            {rodadaAtual ? `Analisando Rodada ${rodadaAtual.numero}` : 'Nenhuma rodada selecionada'}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dadosTaktTimePorEquipe.dados.length > 0 && configRodada ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={dadosTaktTimePorEquipe.dados} 
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="equipeNome" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  fontSize={12} 
                />
                <YAxis 
                  label={{
                    value: 'Takt Time Médio (segundos)',
                    angle: -90,
                    position: 'insideLeft'
                  }} 
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Linha de referência do tempo médio da rodada */}
                <ReferenceLine 
                  y={dadosTaktTimePorEquipe.tempoMedioRodada} 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  label={{
                    value: `Tempo Médio da Rodada: ${dadosTaktTimePorEquipe.tempoMedioRodada.toFixed(1)}s`,
                    position: 'top',
                    fontSize: 12
                  }} 
                />
                
                <Bar 
                  dataKey="taktTimeMedio" 
                  name="Takt Time Médio" 
                  shape={(props: any) => {
                    const { fill, ...rest } = props;
                    return <rect {...rest} fill={obterCorBarra(props.payload)} />;
                  }} 
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-700">
                  {dadosTaktTimePorEquipe.tempoMedioRodada.toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">Tempo Médio de Referência</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-green-700">
                  {dadosTaktTimePorEquipe.dados.filter(d => d.dentroDoTempo && d.pizzasEnviadas > 0).length}
                </div>
                <div className="text-sm text-green-600">Equipes Dentro do Tempo</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-red-700">
                  {dadosTaktTimePorEquipe.dados.filter(d => !d.dentroDoTempo && d.pizzasEnviadas > 0).length}
                </div>
                <div className="text-sm text-red-600">Equipes Acima do Tempo</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-700">
                  {dadosTaktTimePorEquipe.dados.reduce((sum, d) => sum + d.pizzasEnviadas, 0)}
                </div>
                <div className="text-sm text-blue-600">Total de Pizzas Enviadas</div>
              </div>
            </div>

            {/* Análise detalhada por equipe */}
            <div className="mt-6">
              <h4 className="font-semibold text-gray-800 mb-3">📈 Ranking de Desempenho das Equipes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {dadosTaktTimePorEquipe.dados.map((equipe, index) => (
                  <div key={equipe.equipeNome} className="bg-white border border-gray-200 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-sm text-blue-700">{equipe.equipeNome}</h5>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">#{index + 1}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Takt Time médio:</span>
                        <span className="font-medium">{equipe.pizzasEnviadas > 0 ? `${equipe.taktTimeMedio}s` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pizzas enviadas:</span>
                        <span className="font-medium">{equipe.pizzasEnviadas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-medium ${equipe.dentroDoTempo && equipe.pizzasEnviadas > 0 ? 'text-green-600' : equipe.pizzasEnviadas > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {equipe.pizzasEnviadas > 0 ? equipe.dentroDoTempo ? 'No tempo' : 'Atrasado' : 'Sem dados'}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className={`text-xs px-2 py-1 rounded text-center ${equipe.desempenho === 'Excelente' ? 'bg-green-100 text-green-700' : equipe.desempenho === 'Bom' ? 'bg-blue-100 text-blue-700' : equipe.desempenho === 'Regular' ? 'bg-yellow-100 text-yellow-700' : equipe.desempenho === 'Crítico' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                          {equipe.desempenho === 'Excelente' ? '🏆 Excelente' : equipe.desempenho === 'Bom' ? '✅ Bom' : equipe.desempenho === 'Regular' ? '⚠️ Regular' : equipe.desempenho === 'Crítico' ? '❌ Crítico' : '📊 Sem dados'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg mb-2">📊 Sem dados disponíveis</p>
            <p className="text-sm">
              {rodadasDisponiveis.length === 0 
                ? "Nenhuma rodada finalizada com pizzas encontrada" 
                : configRodada === null 
                  ? "Carregando configuração da rodada..." 
                  : "Selecione uma rodada para visualizar a análise Takt Time"
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaktTimeChart;
