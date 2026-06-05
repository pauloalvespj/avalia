import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verifica se o chamador é admin
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: corsHeaders })
    }

    const { data: perfil } = await supabaseAdmin
      .from('perfis').select('role').eq('id', user.id).single()

    if (perfil?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json()

    // ── Criar usuário ──────────────────────────────────────────────────────────
    if (body.action === 'create') {
      const { email, password, role } = body
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'email e password são obrigatórios' }), { status: 400, headers: corsHeaders })
      }
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: role ?? 'consultor' },
      })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
      }
      await supabaseAdmin.from('perfis').upsert({
        id:    data.user.id,
        email: data.user.email,
        role:  role ?? 'consultor',
        ativo: true,
      }, { onConflict: 'id' })
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
    }

    // ── Atualizar e-mail ───────────────────────────────────────────────────────
    const { userId, email } = body
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'userId e email são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email })
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders })
    }

    await supabaseAdmin.from('perfis').update({ email }).eq('id', userId)

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
