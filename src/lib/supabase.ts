import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** false quando as variáveis de ambiente não foram configuradas no Netlify. */
export const supabaseConfigured = Boolean(url && anonKey)

// Importante: NUNCA lançar (throw) aqui. Um erro em tempo de import derruba a
// árvore inteira do React antes mesmo do primeiro render, resultando numa
// tela em branco sem nenhuma mensagem visível (bug já visto em produção).
// Se as variáveis estiverem ausentes, usamos um client "placeholder" válido —
// o <ConfigGuard> em App.tsx detecta `supabaseConfigured === false` e mostra
// um aviso claro em vez de deixar a tela vazia.
//
// Tipagem das linhas fica em src/types/database.ts e é aplicada manualmente
// em cada query (via `as` nos retornos), sem acoplar o client inteiro a um
// schema gerado — mais simples de manter enquanto o schema evolui.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key'
)
