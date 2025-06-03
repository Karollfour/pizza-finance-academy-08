
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHistoricoSaboresRodada } from '@/hooks/useHistoricoSaboresRodada';
import { useSabores } from '@/hooks/useSabores';

interface VisualizadorSaboresRodadaProps {
  rodadaId?: string;
}

const VisualizadorSaboresRodada = ({ rodadaId }: VisualizadorSaboresRodadaProps) => {
  const { historico, loading: loadingHistorico } = useHistoricoSaboresRodada(rodadaId);
  const { sabores, loading: loadingSabores } = useSabores();

  console.log('VisualizadorSaboresRodada - rodadaId:', rodadaId);
  console.log('VisualizadorSaboresRodada - historico:', historico);
  console.log('VisualizadorSaboresRodada - sabores:', sabores);

  if (!rodadaId) {
    return (
      <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-gray-500">Aguardando rodada ativa...</p>
        </CardContent>
      </Card>
    );
  }

  if (loadingHistorico || loadingSabores) {
    return (
      <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-500">Carregando sequência de sabores...</p>
        </CardContent>
      </Card>
    );
  }

  if (historico.length === 0) {
    return (
      <Card className="shadow-lg border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">🍕</div>
          <p className="text-gray-500">Sequência de sabores não criada ainda...</p>
        </CardContent>
      </Card>
    );
  }

  // Ordenar por ordem crescente para garantir que temos a sequência correta
  const historicoOrdenado = [...historico].sort((a, b) => a.ordem - b.ordem);
  
  // Sempre mostrar os 3 primeiros sabores da sequência
  const saborAtual = historicoOrdenado[0]; // Primeiro sabor (atual)
  const proximoSabor2 = historicoOrdenado[1]; // Segundo sabor
  const proximoSabor3 = historicoOrdenado[2]; // Terceiro sabor

  const getSaborNome = (item: any) => {
    if (item?.sabor?.nome) {
      return item.sabor.nome;
    }
    // Fallback: buscar sabor pelo ID
    const saborEncontrado = sabores.find(s => s.id === item?.sabor_id);
    return saborEncontrado?.nome || 'Sabor não encontrado';
  };

  const getSaborDescricao = (item: any) => {
    if (item?.sabor?.descricao) {
      return item.sabor.descricao;
    }
    const saborEncontrado = sabores.find(s => s.id === item?.sabor_id);
    return saborEncontrado?.descricao;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Sabor Atual - Ocupa mais espaço e em verde */}
      <div className="lg:col-span-2">
        <Card className="shadow-xl border-4 border-green-400 bg-green-50">
          <CardContent className="p-8 text-center">
            <Badge className="bg-green-500 text-white text-lg px-4 py-2 mb-4">
              🍕 SABOR ATUAL
            </Badge>
            <div className="text-6xl mb-4">🍕</div>
            <h2 className="text-4xl font-bold text-green-700 mb-2">
              {getSaborNome(saborAtual)}
            </h2>
            {getSaborDescricao(saborAtual) && (
              <p className="text-lg text-green-600 mb-4">
                {getSaborDescricao(saborAtual)}
              </p>
            )}
            <div className="text-lg text-green-600">
              Pizza #{saborAtual?.ordem || 1}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximos Sabores - Em azul, um em cima do outro */}
      <div className="space-y-4">
        {/* Próximo Sabor 2 */}
        {proximoSabor2 ? (
          <Card className="shadow-lg border-2 border-blue-400 bg-blue-50">
            <CardContent className="p-4 text-center">
              <Badge className="bg-blue-500 text-white text-sm px-3 py-1 mb-2">
                PRÓXIMO
              </Badge>
              <div className="text-3xl mb-2">🍕</div>
              <h3 className="text-xl font-bold text-blue-700">
                {getSaborNome(proximoSabor2)}
              </h3>
              <div className="text-sm text-blue-600">
                Pizza #{proximoSabor2.ordem}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-2 border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-sm text-gray-500">
                Próximo sabor não definido
              </p>
            </CardContent>
          </Card>
        )}

        {/* Próximo Sabor 3 */}
        {proximoSabor3 ? (
          <Card className="shadow-lg border-2 border-blue-400 bg-blue-50">
            <CardContent className="p-4 text-center">
              <Badge className="bg-blue-500 text-white text-sm px-3 py-1 mb-2">
                DEPOIS
              </Badge>
              <div className="text-3xl mb-2">🍕</div>
              <h3 className="text-xl font-bold text-blue-700">
                {getSaborNome(proximoSabor3)}
              </h3>
              <div className="text-sm text-blue-600">
                Pizza #{proximoSabor3.ordem}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-2 border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">⏳</div>
              <p className="text-sm text-gray-500">
                Terceiro sabor não definido
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VisualizadorSaboresRodada;
