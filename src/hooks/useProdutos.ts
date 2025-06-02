
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProdutoLoja } from '@/types/database';

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<ProdutoLoja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produtos_loja')
        .select('*')
        .eq('disponivel', true)
        .order('nome');

      if (error) throw error;
      setProdutos(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const uploadImagem = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `produtos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagens')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('imagens')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Erro ao fazer upload da imagem:', err);
      return null;
    }
  };

  const criarProduto = async (
    nome: string, 
    unidade: string, 
    valorUnitario: number, 
    durabilidade?: number, 
    descricao?: string, 
    imagemFile?: File
  ) => {
    try {
      let imagemUrl = null;
      if (imagemFile) {
        imagemUrl = await uploadImagem(imagemFile);
      }

      const { data, error } = await supabase
        .from('produtos_loja')
        .insert({
          nome,
          unidade,
          valor_unitario: valorUnitario,
          durabilidade: durabilidade || 1,
          descricao,
          imagem: imagemUrl
        })
        .select()
        .single();

      if (error) throw error;
      await fetchProdutos();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar produto');
      throw err;
    }
  };

  const atualizarProduto = async (id: string, dados: Partial<ProdutoLoja>, imagemFile?: File) => {
    try {
      let imagemUrl = dados.imagem;
      if (imagemFile) {
        imagemUrl = await uploadImagem(imagemFile);
      }

      const { error } = await supabase
        .from('produtos_loja')
        .update({
          ...dados,
          imagem: imagemUrl
        })
        .eq('id', id);

      if (error) throw error;
      await fetchProdutos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto');
      throw err;
    }
  };

  useEffect(() => {
    fetchProdutos();

    // Setup realtime subscription with proper cleanup
    if (!channelRef.current) {
      channelRef.current = supabase
        .channel('produtos-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'produtos_loja'
          },
          () => {
            console.log('Produto atualizado, recarregando...');
            fetchProdutos();
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return {
    produtos,
    loading,
    error,
    criarProduto,
    atualizarProduto,
    refetch: fetchProdutos
  };
};
