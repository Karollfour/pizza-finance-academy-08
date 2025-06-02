
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEquipes } from '@/hooks/useEquipes';
import { toast } from 'sonner';

const GestaoEquipes = () => {
  const { equipes, criarEquipe, atualizarEquipe, removerEquipe } = useEquipes();
  const [novaEquipe, setNovaEquipe] = useState({
    nome: '',
    saldoInicial: 100,
    professorResponsavel: ''
  });
  const [editandoEquipe, setEditandoEquipe] = useState<string | null>(null);

  const handleCriarEquipe = async () => {
    if (!novaEquipe.nome || !novaEquipe.professorResponsavel) {
      toast.error('Nome e professor responsável são obrigatórios!');
      return;
    }

    try {
      await criarEquipe(
        novaEquipe.nome,
        novaEquipe.saldoInicial,
        novaEquipe.professorResponsavel
      );
      
      setNovaEquipe({
        nome: '',
        saldoInicial: 100,
        professorResponsavel: ''
      });
      
      toast.success('Equipe criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar equipe');
    }
  };

  const handleAtualizarSaldo = async (equipeId: string, novoSaldo: number) => {
    try {
      await atualizarEquipe(equipeId, { saldo_inicial: novoSaldo });
      toast.success('Saldo atualizado com sucesso!');
      setEditandoEquipe(null);
    } catch (error) {
      toast.error('Erro ao atualizar saldo');
    }
  };

  const handleRemoverEquipe = async (equipeId: string, nomeEquipe: string) => {
    if (confirm(`Tem certeza que deseja remover a equipe "${nomeEquipe}"?`)) {
      try {
        await removerEquipe(equipeId);
        toast.success('Equipe removida com sucesso!');
      } catch (error) {
        toast.error('Erro ao remover equipe');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Criar Nova Equipe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">➕ Criar Nova Equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Nome da equipe"
              value={novaEquipe.nome}
              onChange={(e) => setNovaEquipe(prev => ({ ...prev, nome: e.target.value }))}
            />
            <Input
              placeholder="Professor responsável"
              value={novaEquipe.professorResponsavel}
              onChange={(e) => setNovaEquipe(prev => ({ ...prev, professorResponsavel: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Saldo inicial"
              value={novaEquipe.saldoInicial}
              onChange={(e) => setNovaEquipe(prev => ({ ...prev, saldoInicial: Number(e.target.value) }))}
            />
          </div>
          <Button onClick={handleCriarEquipe} className="w-full">
            Criar Equipe
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Equipes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-600">👥 Equipes Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {equipes.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">👥</div>
                <p>Nenhuma equipe cadastrada</p>
              </div>
            ) : (
              equipes.map((equipe) => (
                <div key={equipe.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">{equipe.nome}</h3>
                        <Badge style={{ backgroundColor: equipe.cor_tema }}>
                          {equipe.emblema}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Professor:</strong> {equipe.professor_responsavel}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-600">
                          <strong>Saldo Inicial:</strong> R$ {equipe.saldo_inicial.toFixed(2)}
                        </span>
                        <span className="text-red-600">
                          <strong>Gasto Total:</strong> R$ {equipe.gasto_total.toFixed(2)}
                        </span>
                        <span className="text-blue-600">
                          <strong>Disponível:</strong> R$ {(equipe.saldo_inicial - equipe.gasto_total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditandoEquipe(editandoEquipe === equipe.id ? null : equipe.id)}
                      >
                        {editandoEquipe === equipe.id ? 'Cancelar' : 'Editar'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoverEquipe(equipe.id, equipe.nome)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                  
                  {editandoEquipe === equipe.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="Novo saldo inicial"
                          defaultValue={equipe.saldo_inicial}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              handleAtualizarSaldo(equipe.id, Number(input.value));
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            handleAtualizarSaldo(equipe.id, Number(input.value));
                          }}
                        >
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestaoEquipes;
