import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useCompras } from '@/hooks/useCompras';
import { useEquipes } from '@/hooks/useEquipes';
import { useProdutos } from '@/hooks/useProdutos';
import { useRodadas } from '@/hooks/useRodadas';
import { usePizzas } from '@/hooks/usePizzas';
import { useTodasRodadas } from '@/hooks/useTodasRodadas';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaktTimeChart from './TaktTimeChart';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DashboardLojinha = () => {
  const { compras } = useCompras();
  const { equipes } = useEquipes();
  const { produtos } = useProdutos();
  const { rodadaAtual } = useRodadas();
  const { rodadas } = useTodasRodadas();
  const { pizzas } = usePizzas();
  const [rodadaSelecionada, setRodadaSelecionada] = useState<number | null>(null);

  // Obter todas as rodadas disponíveis que têm dados
  const rodadasDisponiveis = rodadas.filter(rodada => {
    // Verificar se a rodada tem dados associados (pizzas ou compras)
    const temPizzas = pizzas.some(pizza => pizza.rodada_id === rodada.id);
    const temCompras = compras.some(compra => compra.rodada_id === rodada.id);
    return temPizzas || temCompras;
  }).map(rodada => rodada.numero).sort((a, b) => a - b);

  // Função para obter rodada por número
  const getRodadaPorNumero = (numeroRodada: number) => {
    return rodadas.find(r => r.numero === numeroRodada);
  };

  // Dados de pizzas por rodada e equipe
  const dadosPizzasPorRodada = (numeroRodada: number) => {
    const rodada = getRodadaPorNumero(numeroRodada);
    if (!rodada) return [];
    return equipes.map(equipe => {
      const pizzasEquipe = pizzas.filter(p => p.equipe_id === equipe.id && p.rodada_id === rodada.id && p.status === 'avaliada');
      const aprovadas = pizzasEquipe.filter(p => p.resultado === 'aprovada').length;
      const reprovadas = pizzasEquipe.filter(p => p.resultado === 'reprovada').length;
      const total = aprovadas + reprovadas;
      return {
        equipe: equipe.nome,
        aprovadas,
        reprovadas,
        total,
        corEquipe: equipe.cor_tema || '#3b82f6'
      };
    }).filter(dados => dados.total > 0);
  };

  // Dados gerais por equipe (todas as rodadas)
  const dadosGeraisPorEquipe = equipes.map(equipe => {
    const pizzasEquipe = pizzas.filter(p => p.equipe_id === equipe.id && p.status === 'avaliada');
    const aprovadas = pizzasEquipe.filter(p => p.resultado === 'aprovada').length;
    const reprovadas = pizzasEquipe.filter(p => p.resultado === 'reprovada').length;
    const total = aprovadas + reprovadas;
    return {
      equipe: equipe.nome,
      aprovadas,
      reprovadas,
      total,
      corEquipe: equipe.cor_tema || '#3b82f6'
    };
  }).filter(dados => dados.total > 0);

  // Dados de produtividade de mão de obra (pizzas por pessoa)
  const dadosProductividadeMaoDeObra = (numeroRodada: number | null) => {
    return equipes.map(equipe => {
      const pizzasEquipe = numeroRodada 
        ? pizzas.filter(p => {
            const rodada = getRodadaPorNumero(numeroRodada);
            return p.equipe_id === equipe.id && p.rodada_id === rodada?.id && p.status === 'avaliada';
          })
        : pizzas.filter(p => p.equipe_id === equipe.id && p.status === 'avaliada');
      
      const totalPizzas = pizzasEquipe.length;
      const quantidadePessoas = equipe.quantidade_pessoas || 1;
      const pizzasPorPessoa = totalPizzas / quantidadePessoas;
      
      return {
        equipe: equipe.nome,
        pizzasPorPessoa: Number(pizzasPorPessoa.toFixed(2)),
        totalPizzas,
        quantidadePessoas,
        corEquipe: equipe.cor_tema || '#3b82f6'
      };
    }).filter(dados => dados.totalPizzas > 0);
  };

  // NOVO: Dados para o gráfico de análise de lucro
  const dadosAnaliseLucro = (numeroRodada: number) => {
    const rodada = getRodadaPorNumero(numeroRodada);
    if (!rodada) return [];

    // Lista específica de produtos que são matéria-prima
    const materiasPrimas = ['caixa de pizza', 'mussarela', 'pepperoni', 'massa de pizza'];

    return equipes.map(equipe => {
      // Filtrar compras da rodada específica
      const comprasEquipeRodada = compras.filter(c => c.equipe_id === equipe.id && c.rodada_id === rodada.id);
      
      // Calcular MP (Matéria-Prima) - apenas produtos específicos
      const comprasMP = comprasEquipeRodada.filter(c => {
        if (!c.produto_id) return false;
        const produto = produtos.find(p => p.id === c.produto_id);
        return produto && materiasPrimas.some(mp => 
          produto.nome.toLowerCase().includes(mp.toLowerCase())
        );
      });
      const mp = comprasMP.reduce((sum, c) => sum + c.valor_total, 0);
      
      // Calcular EQ (Equipamento) - todos os outros produtos da loja
      const comprasEQ = comprasEquipeRodada.filter(c => {
        if (!c.produto_id) return false;
        const produto = produtos.find(p => p.id === c.produto_id);
        return produto && !materiasPrimas.some(mp => 
          produto.nome.toLowerCase().includes(mp.toLowerCase())
        );
      });
      
      // Para equipamentos, dividir o valor total pelo número de rodadas em que foi usado
      const numeroRodadasUsadas = rodadas.filter(r => 
        compras.some(c => c.equipe_id === equipe.id && c.rodada_id === r.id && 
          comprasEQ.some(eq => eq.produto_id === c.produto_id))
      ).length || 1;
      
      const eq = comprasEQ.reduce((sum, c) => sum + (c.valor_total / numeroRodadasUsadas), 0);
      
      // Calcular MO (Mão de Obra) - número de pessoas x R$10
      const mo = (equipe.quantidade_pessoas || 1) * 10;
      
      // Calcular número de pizzas aprovadas na rodada
      const pizzasAprovadas = pizzas.filter(p => 
        p.equipe_id === equipe.id && 
        p.rodada_id === rodada.id && 
        p.resultado === 'aprovada'
      ).length;
      
      // Calcular lucro = (MP + EQ + MO) ÷ número de pizzas aprovadas
      const custoTotal = mp + eq + mo;
      const lucro = pizzasAprovadas > 0 ? custoTotal / pizzasAprovadas : 0;
      
      return {
        equipe: equipe.nome,
        mp,
        eq, 
        mo,
        custoTotal,
        pizzasAprovadas,
        lucro: Number(lucro.toFixed(2)),
        corEquipe: equipe.cor_tema || '#3b82f6'
      };
    }).filter(dados => dados.pizzasAprovadas > 0);
  };

  // NOVO: Dados por equipe para gastos com filtro de rodada
  const dadosGastosPorEquipe = (numeroRodada: number | null) => {
    return equipes.map(equipe => {
      const comprasEquipe = numeroRodada 
        ? compras.filter(c => {
            const rodada = getRodadaPorNumero(numeroRodada);
            return c.equipe_id === equipe.id && c.rodada_id === rodada?.id;
          })
        : compras.filter(c => c.equipe_id === equipe.id);
      
      const totalGasto = comprasEquipe.reduce((sum, c) => sum + c.valor_total, 0);
      const viagens = comprasEquipe.filter(c => c.tipo === 'viagem').length;
      
      return {
        nome: equipe.nome,
        gasto: totalGasto,
        viagens,
        corEquipe: equipe.cor_tema || '#3b82f6'
      };
    }).filter(dados => dados.gasto > 0);
  };

  // NOVO: Dados de ganhos por equipe com filtro de rodada
  const dadosGanhosPorEquipe = (numeroRodada: number | null) => {
    return equipes.map(equipe => {
      const pizzasEquipe = numeroRodada 
        ? pizzas.filter(p => {
            const rodada = getRodadaPorNumero(numeroRodada);
            return p.equipe_id === equipe.id && p.rodada_id === rodada?.id && p.resultado === 'aprovada';
          })
        : pizzas.filter(p => p.equipe_id === equipe.id && p.resultado === 'aprovada');
      
      const ganho = pizzasEquipe.length * 10; // R$ 10 por pizza aprovada
      
      return {
        nome: equipe.nome,
        ganho,
        corEquipe: equipe.cor_tema || '#3b82f6'
      };
    }).filter(dados => dados.ganho > 0);
  };

  // Produtos mais comprados
  const produtosMaisComprados = produtos.map(produto => {
    const comprasProduto = compras.filter(c => c.produto_id === produto.id);
    const quantidadeTotal = comprasProduto.reduce((sum, c) => sum + (c.quantidade || 0), 0);
    return {
      nome: produto.nome,
      quantidade: quantidadeTotal
    };
  }).filter(p => p.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade);

  // Distribuição de gastos
  const gastosCategoria = [
    {
      name: 'Materiais',
      value: compras.filter(c => c.tipo === 'material').reduce((sum, c) => sum + c.valor_total, 0)
    },
    {
      name: 'Viagens',
      value: compras.filter(c => c.tipo === 'viagem').reduce((sum, c) => sum + c.valor_total, 0)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filtro Global Unificado - MOVIDO PARA O INÍCIO */}
      <Card className="shadow-lg border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🎯 Filtro Global de Análise</span>
            <Select 
              value={rodadaSelecionada?.toString() || "todas"} 
              onValueChange={(value) => setRodadaSelecionada(value === "todas" ? null : parseInt(value))}
            >
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Selecione uma rodada" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="todas">Ver Todas as Rodadas</SelectItem>
                {rodadasDisponiveis.map(numeroRodada => (
                  <SelectItem key={numeroRodada} value={numeroRodada.toString()}>
                    Rodada {numeroRodada}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600">
            {rodadaSelecionada 
              ? `📊 Analisando dados da Rodada ${rodadaSelecionada}`
              : "📈 Analisando dados de todas as rodadas"
            }
          </div>
        </CardContent>
      </Card>

      {/* NOVO: Gráfico de Análise de Lucro por Pizza - Só aparece quando uma rodada específica está selecionada */}
      {rodadaSelecionada && (
        <Card className="shadow-lg border-2 border-green-200">
          <CardHeader>
            <CardTitle>💰 Análise de Lucro por Pizza - Rodada {rodadaSelecionada}</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosAnaliseLucro(rodadaSelecionada).length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={dadosAnaliseLucro(rodadaSelecionada)} margin={{ top: 50, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="equipe" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        const formatters = {
                          mp: (val: number) => [`R$ ${val.toFixed(2)}`, 'Matéria-Prima (MP)'],
                          eq: (val: number) => [`R$ ${val.toFixed(2)}`, 'Equipamento (EQ)'],
                          mo: (val: number) => [`R$ ${val.toFixed(2)}`, 'Mão de Obra (MO)']
                        };
                        return formatters[name as keyof typeof formatters]?.(value as number) || [value, name];
                      }}
                      labelFormatter={(label) => `Equipe: ${label}`}
                    />
                    {/* Barras empilhadas para mostrar MP, EQ e MO */}
                    <Bar dataKey="mp" stackId="custo" fill="#ef4444" name="mp" />
                    <Bar dataKey="eq" stackId="custo" fill="#f59e0b" name="eq" />
                    <Bar dataKey="mo" stackId="custo" fill="#10b981" name="mo" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Resumo detalhado da análise de lucro */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dadosAnaliseLucro(rodadaSelecionada).map((dados, index) => (
                    <Card key={index} className="border-2" style={{ borderColor: dados.corEquipe }}>
                      <CardContent className="p-4">
                        <h4 className="font-bold text-lg mb-3 text-center" style={{ color: dados.corEquipe }}>
                          {dados.equipe}
                        </h4>
                        
                        {/* Lucro por pizza - destaque principal */}
                        <div className="bg-green-100 p-3 rounded-lg mb-3 text-center">
                          <div className="text-2xl font-bold text-green-700">
                            R$ {dados.lucro}
                          </div>
                          <div className="text-sm text-green-600">Custo por Pizza</div>
                        </div>

                        {/* Breakdown dos custos */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-red-50 p-2 rounded">
                            <span className="text-red-700">MP (Matéria-Prima):</span>
                            <span className="font-bold text-red-800">R$ {dados.mp.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center bg-yellow-50 p-2 rounded">
                            <span className="text-yellow-700">EQ (Equipamento):</span>
                            <span className="font-bold text-yellow-800">R$ {dados.eq.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center bg-green-50 p-2 rounded">
                            <span className="text-green-700">MO (Mão de Obra):</span>
                            <span className="font-bold text-green-800">R$ {dados.mo.toFixed(2)}</span>
                          </div>
                          
                          {/* Totais */}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between items-center font-bold">
                              <span>Custo Total:</span>
                              <span>R$ {dados.custoTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-blue-600">
                              <span>Pizzas Aprovadas:</span>
                              <span>{dados.pizzasAprovadas}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">📊 Nenhum dado encontrado</p>
                <p className="text-sm">
                  Não há dados suficientes para calcular o lucro na Rodada {rodadaSelecionada}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Takt Time com filtro global */}
      <TaktTimeChart rodadaSelecionada={rodadaSelecionada} />

      {/* Novo Gráfico: Produtividade de Mão de Obra */}
      <Card>
        <CardHeader>
          <CardTitle>👷‍♂️ Produtividade de Mão de Obra (Pizzas por Pessoa)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosProductividadeMaoDeObra(rodadaSelecionada)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipe" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'pizzasPorPessoa' ? `${value} pizzas/pessoa` : value,
                  name === 'pizzasPorPessoa' ? 'Produtividade' : name
                ]}
                labelFormatter={(label) => `Equipe: ${label}`}
              />
              <Bar dataKey="pizzasPorPessoa" fill="#8b5cf6" name="Pizzas por Pessoa" />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Resumo da Produtividade */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {dadosProductividadeMaoDeObra(rodadaSelecionada).map((dados, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-4">
                  <h4 className="font-bold text-lg mb-2">{dados.equipe}</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-purple-100 p-2 rounded">
                      <div className="text-purple-600 font-bold">{dados.pizzasPorPessoa}</div>
                      <div className="text-purple-700">Pizza/Pessoa</div>
                    </div>
                    <div className="bg-blue-100 p-2 rounded">
                      <div className="text-blue-600 font-bold">{dados.totalPizzas}</div>
                      <div className="text-blue-700">Total Pizzas</div>
                    </div>
                    <div className="bg-gray-100 p-2 rounded">
                      <div className="text-gray-600 font-bold">{dados.quantidadePessoas}</div>
                      <div className="text-gray-700">Pessoas</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Pizzas por Rodada */}
      <Card>
        <CardHeader>
          <CardTitle>🍕 Análise de Pizzas</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Gráfico de Pizzas por Equipe */}
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={rodadaSelecionada ? dadosPizzasPorRodada(rodadaSelecionada) : dadosGeraisPorEquipe}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="equipe" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [value, name === 'aprovadas' ? 'Aprovadas' : 'Reprovadas']} 
                labelFormatter={(label) => `Equipe: ${label}`} 
              />
              <Bar dataKey="aprovadas" fill="#22c55e" name="Aprovadas" />
              <Bar dataKey="reprovadas" fill="#ef4444" name="Reprovadas" />
            </BarChart>
          </ResponsiveContainer>

          {/* Resumo das Pizzas */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(rodadaSelecionada ? dadosPizzasPorRodada(rodadaSelecionada) : dadosGeraisPorEquipe).map((dados, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-4">
                  <h4 className="font-bold text-lg mb-2">{dados.equipe}</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-green-100 p-2 rounded">
                      <div className="text-green-600 font-bold">{dados.aprovadas}</div>
                      <div className="text-green-700">Aprovadas</div>
                    </div>
                    <div className="bg-red-100 p-2 rounded">
                      <div className="text-red-600 font-bold">{dados.reprovadas}</div>
                      <div className="text-red-700">Reprovadas</div>
                    </div>
                    <div className="bg-blue-100 p-2 rounded">
                      <div className="text-blue-600 font-bold">{dados.total}</div>
                      <div className="text-blue-700">Total</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gastos por Equipe - SEM FILTRO INDIVIDUAL */}
        <Card>
          <CardHeader>
            <CardTitle>💰 Gastos por Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosGastosPorEquipe(rodadaSelecionada).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGastosPorEquipe(rodadaSelecionada)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Gasto Total']} />
                  <Bar dataKey="gasto" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">💰 Nenhum gasto encontrado</p>
                <p className="text-sm">
                  {rodadaSelecionada 
                    ? `Não há gastos registrados para a Rodada ${rodadaSelecionada}`
                    : "Não há gastos registrados"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ganhos por Equipe - SEM FILTRO INDIVIDUAL */}
        <Card>
          <CardHeader>
            <CardTitle>🎉 Vendas por Equipe (Pizzas Aprovadas)</CardTitle>
          </CardHeader>
          <CardContent>
            {dadosGanhosPorEquipe(rodadaSelecionada).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGanhosPorEquipe(rodadaSelecionada)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Ganho Total']} />
                  <Bar dataKey="ganho" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">🏆 Nenhum ganho encontrado</p>
                <p className="text-sm">
                  {rodadaSelecionada 
                    ? `Não há pizzas aprovadas na Rodada ${rodadaSelecionada}`
                    : "As equipes ganham R$ 10,00 para cada pizza aprovada!"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produtos Mais Comprados */}
        <Card>
          <CardHeader>
            <CardTitle>🛒 Produtos Mais Comprados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={produtosMaisComprados.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição de Gastos */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Distribuição de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gastosCategoria}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gastosCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Geral Atualizado */}
      <Card>
        <CardHeader>
          <CardTitle>📈 Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  R$ {compras.reduce((sum, c) => sum + c.valor_total, 0).toFixed(2)}
                </div>
                <div className="text-sm text-blue-700">Total Gasto</div>
              </div>
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  R$ {equipes.reduce((sum, e) => sum + (e.ganho_total || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-green-700">Total Ganho (Pizzas)</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {produtos.length}
                </div>
                <div className="text-sm text-orange-700">Produtos Cadastrados</div>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {pizzas.filter(p => p.status === 'avaliada' && p.resultado === 'aprovada').length}
                </div>
                <div className="text-sm text-purple-700">Pizzas Aprovadas</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardLojinha;
