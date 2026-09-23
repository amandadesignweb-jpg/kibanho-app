import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // Falha alto e cedo: sem essas variáveis nada no app funciona.
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Veja .env.example.'
  )
}

// Tipagem das linhas fica em src/types/database.ts e é aplicada manualmente
// em cada query (via genéricos do .select<T>()), sem acoplar o client inteiro
// a um schema gerado — mais simples de manter enquanto o schema evolui.
export const supabase = createClient(url, anonKey)
