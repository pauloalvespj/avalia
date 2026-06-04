import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Credenciais do Supabase não encontradas. ' +
    'Copie .env.example para .env.local e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(url, key)
