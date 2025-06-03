
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTodasRodadas } from '@/hooks/useTodasRodadas';
import { useHistoricoSaboresRodada } from '@/hooks/useHistoricoSaboresRodada';

const HistoricoTodasRodadas = () => {
  const [rodadaSelecionada, setRodadaSelecionada] = useState<string>('');
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const { rodadas } = useTodasRodadas();
  const { historico } = useHistoricoSaboresRodada(rodadaSelecionada);

  const rodadasFinalizadas = rodadas.filter(r => r.status === 'finalizada');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Button
          onClick={() => setMostrarHistorico(!mostrarHistorico)}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          {mostrarHistorico ? '📖 Ocultar' : '📖 Ver Histórico de Rodadas'}
        </Button>
      </div>

      {mostrarHistorico && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-600">
              📚 Histórico Completo de Sabores por Rodada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              <Select value={rodadaSelecionada} onValueChange={setRodadaSelecionada}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Selecionar rodada..." />
                </SelectTrigger>
                <SelectContent>
                  {rodadasFinalizadas.map(rodada => (
                    <SelectItem key={rodada.id} value={rodada.id}>
                      Rodada {rodada.numero}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {rodadaSelecionada && historico.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-sm font-medium text-purple-800 mb-2">
                  Sequência de Sabores - Rodada {rodadas.find(r => r.id === rodadaSelecionada)?.numero}
                </div>
                <div className="flex flex-wrap gap-1">
                  {historico.map((item, index) => (
                    <Badge 
                      key={item.id} 
                      variant="outline" 
                      className="bg-purple-100 text-purple-700 text-xs"
                    >
                      {index + 1}. {item.sabor?.nome || 'N/A'}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-purple-600 mt-2">
                  Total de sabores: {historico.length}
                </div>
              </div>
            )}

            {rodadaSelecionada && historico.length === 0 && (
              <div className="text-center text-gray-500 py-4 text-sm">
                Nenhum sabor foi definido para esta rodada
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HistoricoTodasRodadas;
