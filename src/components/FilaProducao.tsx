
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePizzas } from '@/hooks/usePizzas';
import { useOptimizedRodadas } from '@/hooks/useOptimizedRodadas';
import { useSabores } from '@/hooks/useSabores';
import { useSynchronizedTimer } from '@/hooks/useSynchronizedTimer';
import { obterConfigRodada } from '@/utils/rodadaConfig';
import { toast } from 'sonner';

interface FilaProducaoProps {
  equipeId: string;
  equipeNome: string;
  onPizzaEnviada: () => void;
}

const FilaProducao = ({ equipeId, equipeNome, onPizzaEnviada }: FilaProducaoProps) => {
  const { rodadaAtual } = useOptimizedRodadas();
  const { pizzas, marcarPizzaPronta } = usePizzas(equipeId, rodadaAtual?.id);
  const { sabores, loading: loadingSabores } = useSabores();
  const [saborSelecionado, setSaborSelecionado] = useState<string>('');
  const [enviandoPizza, setEnviandoPizza] = useState(false);
  const [limitePizzasRodada, setLimitePizzasRodada] = useState<number>(5);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Timer sincronizado para verificar se o tempo acabou
  const { timeRemaining, isActive } = useSynchronizedTimer(rodadaAtual);

  // Carregar configuração da rodada atual
  useEffect(() => {
    const carregarConfigRodada = async () => {
      if (!rodadaAtual?.id) {
        setLoadingConfig(false);
        return;
      }
      
      try {
        setLoadingConfig(true);
        const config = await obterConfigRodada(rodadaAtual.id);
        if (config) {
          setLimitePizzasRodada(config.numeroPizzasPlanejadas);
          console.log(`Limite de pizzas para rodada ${rodadaAtual.numero}: ${config.numeroPizzasPlanejadas}`);
        }
      } catch (error) {
        console.error('Erro ao carregar configuração da rodada:', error);
      } finally {
        setLoadingConfig(false);
      }
    };

    carregarConfigRodada();
  }, [rodadaAtual?.id]);

  // Verificar se a equipe atingiu o limite de pizzas para a rodada atual
  const verificarLimitePizzas = () => {
    const pizzasEnviadas = pizzas.length;
    return pizzasEnviadas >= limitePizzasRodada;
  };

  // Verificar se a rodada está ativa e dentro do tempo
  const podeEnviarPizza = () => {
    if (!rodadaAtual) return false;
    if (rodadaAtual.status !== 'ativa') return false;
    if (!isActive || timeRemaining <= 0) return false;
    return true;
  };

  const handleEnviarPizza = async () => {
    if (!rodadaAtual) return;
    
    if (!saborSelecionado) {
      toast.error('Por favor, selecione o sabor da pizza antes de enviar!');
      return;
    }

    // Verificar se a rodada ainda está ativa e com tempo
    if (!podeEnviarPizza()) {
      toast.error('⏰ Tempo esgotado! Não é possível enviar pizzas. Aguarde a próxima rodada.');
      return;
    }

    // Verificar limite de pizzas
    if (verificarLimitePizzas()) {
      toast.error(`Limite atingido! Esta equipe já enviou ${limitePizzasRodada} pizza(s) nesta rodada.`);
      return;
    }
    
    try {
      setEnviandoPizza(true);
      
      // Verificar novamente antes de enviar (dupla verificação)
      if (!podeEnviarPizza()) {
        toast.error('⏰ Tempo esgotado durante o envio! Aguarde a próxima rodada.');
        return;
      }
      
      // Disparar evento de seleção de sabor
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pizza-sabor-selecionado', { 
          detail: { 
            equipeId,
            rodadaId: rodadaAtual.id,
            saborId: saborSelecionado,
            timestamp: new Date().toISOString() 
          } 
        }));
      }
      
      await marcarPizzaPronta(equipeId, rodadaAtual.id, saborSelecionado);
      onPizzaEnviada();
      
      // Limpar seleção após envio
      setSaborSelecionado('');
      
      const pizzasRestantes = limitePizzasRodada - (pizzas.length + 1);
      if (pizzasRestantes > 0) {
        toast.success(`🍕 Pizza enviada! Restam ${pizzasRestantes} pizza(s) para esta rodada.`);
      } else {
        toast.success('🍕 Última pizza da rodada enviada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao enviar pizza para avaliação:', error);
      toast.error('Erro ao enviar pizza. Tente novamente.');
    } finally {
      setEnviandoPizza(false);
    }
  };

  const getStatusColor = (status: string, resultado?: string | null) => {
    if (status === 'em_producao') return 'bg-yellow-500';
    if (status === 'pronta') return 'bg-blue-500';
    if (resultado === 'aprovada') return 'bg-green-500';
    if (resultado === 'reprovada') return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getStatusText = (status: string, resultado?: string | null) => {
    if (status === 'em_producao') return 'Em Produção';
    if (status === 'pronta') return 'Aguardando Avaliação';
    if (resultado === 'aprovada') return 'Aprovada';
    if (resultado === 'reprovada') return 'Reprovada';
    return 'Desconhecido';
  };

  const getSaborNome = (pizza: any) => {
    return pizza.sabor?.nome || 'Sabor não informado';
  };

  const atingiuLimite = verificarLimitePizzas();
  const pizzasRestantes = limitePizzasRodada - pizzas.length;
  const tempoEsgotado = !podeEnviarPizza();

  return (
    <div className="space-y-6">
      {/* Formulário para Enviar Pizza */}
      <Card className="shadow-lg border-2 border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-green-600 text-center">🍕 Produção de Pizza</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🍕</div>

            {/* Indicador de limite de pizzas */}
            {!loadingConfig && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-700">
                  Pizzas desta rodada: {pizzas.length} / {limitePizzasRodada}
                </div>
                {pizzasRestantes > 0 ? (
                  <div className="text-xs text-blue-600">
                    Restam {pizzasRestantes} pizza(s) para enviar
                  </div>
                ) : (
                  <div className="text-xs text-red-600 font-medium">
                    ⚠️ Limite atingido para esta rodada
                  </div>
                )}
              </div>
            )}

            {/* Aviso de tempo esgotado */}
            {tempoEsgotado && rodadaAtual && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-lg font-bold text-red-700 mb-2">
                  ⏰ Tempo Esgotado
                </h3>
                <p className="text-red-600">
                  {rodadaAtual.status === 'ativa' && timeRemaining <= 0 ? 
                    'O tempo da rodada acabou! Não é possível enviar mais pizzas.' :
                    rodadaAtual.status === 'pausada' ? 
                    'A rodada está pausada. Aguarde a retomada.' :
                    rodadaAtual.status === 'finalizada' ?
                    'A rodada foi finalizada. Aguarde a próxima rodada.' :
                    'Aguarde o início da próxima rodada.'
                  }
                </p>
              </div>
            )}

            {atingiuLimite ? (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h3 className="text-lg font-bold text-red-700 mb-2">
                  🚫 Limite Atingido
                </h3>
                <p className="text-red-600">
                  Sua equipe já enviou o número máximo de {limitePizzasRodada} pizza(s) para esta rodada.
                  Aguarde a próxima rodada para enviar mais pizzas.
                </p>
              </div>
            ) : !tempoEsgotado ? (
              <>
                <h3 className="text-xl font-bold text-gray-700">
                  Pronto para enviar uma pizza?
                </h3>
                
                {/* Seleção de Sabor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">
                    Selecione o sabor da pizza:
                  </label>
                  <Select 
                    value={saborSelecionado} 
                    onValueChange={setSaborSelecionado}
                    disabled={!podeEnviarPizza() || loadingSabores || atingiuLimite}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha o sabor da pizza..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      {sabores.map((sabor) => (
                        <SelectItem key={sabor.id} value={sabor.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{sabor.nome}</span>
                            {sabor.descricao && (
                              <span className="text-xs text-gray-500">{sabor.descricao}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <p className="text-gray-600">
                  Escolha o sabor e clique no botão abaixo quando sua pizza estiver pronta para avaliação
                </p>
                
                <Button
                  onClick={handleEnviarPizza}
                  className="w-full h-16 text-xl bg-green-500 hover:bg-green-600 text-white font-bold"
                  disabled={!podeEnviarPizza() || !saborSelecionado || enviandoPizza || atingiuLimite}
                >
                  {enviandoPizza ? (
                    <>🔄 Enviando...</>
                  ) : (
                    <>✅ Enviar Pizza para Avaliação</>
                  )}
                </Button>
                
                {!podeEnviarPizza() && (
                  <p className="text-sm text-gray-500">
                    {!rodadaAtual ? 'Nenhuma rodada ativa' :
                     rodadaAtual.status !== 'ativa' ? 'Aguardando rodada ativa' :
                     'Tempo esgotado - aguarde próxima rodada'
                    }
                  </p>
                )}
                
                {!saborSelecionado && podeEnviarPizza() && !atingiuLimite && (
                  <p className="text-sm text-orange-600">
                    ⚠️ Selecione o sabor da pizza antes de enviar
                  </p>
                )}
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Pizzas da Rodada */}
      {pizzas.length > 0 && (
        <Card className="shadow-lg border-2 border-gray-200">
          <CardHeader className="bg-gray-50">
            <CardTitle className="text-gray-600">📊 Pizzas da Rodada {rodadaAtual?.numero}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pizzas
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((pizza, index) => (
                  <div key={pizza.id} className="p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg">Pizza #{pizzas.length - index}</span>
                      <Badge className={`text-white ${getStatusColor(pizza.status, pizza.resultado)}`}>
                        {getStatusText(pizza.status, pizza.resultado)}
                      </Badge>
                    </div>
                    
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-700">Sabor: </span>
                      <span className="text-sm text-gray-600">{getSaborNome(pizza)}</span>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-2">
                      Enviada: {new Date(pizza.created_at).toLocaleString('pt-BR')}
                    </div>
                    
                    {pizza.resultado === 'reprovada' && pizza.justificativa_reprovacao && (
                      <div className="mt-3 p-3 bg-red-50 rounded text-sm text-red-600">
                        <strong>Motivo da reprovação:</strong><br />
                        {pizza.justificativa_reprovacao}
                      </div>
                    )}
                    {pizza.resultado === 'aprovada' && (
                      <div className="mt-3 p-3 bg-green-50 rounded text-sm text-green-600">
                        <strong>✅ Pizza aprovada!</strong>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há pizzas */}
      {pizzas.length === 0 && podeEnviarPizza() && !atingiuLimite && (
        <Card className="shadow-lg border-2 border-yellow-200">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">
              Primeira Pizza da Rodada
            </h3>
            <p className="text-gray-500">
              Escolha um sabor e seja o primeiro a enviar uma pizza para avaliação nesta rodada!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FilaProducao;
