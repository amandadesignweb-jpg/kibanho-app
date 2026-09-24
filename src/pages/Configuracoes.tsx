import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/Card'
import { Switch } from '../components/ui/Switch'
import { useAuth } from '../lib/AuthContext'
import type { Configuracoes as ConfiguracoesRow, TipoPacote } from '../types/database'

export function Configuracoes() {
  const { session } = useAuth()
  const [config, setConfig] = useState<ConfiguracoesRow | null>(null)
  const [tipos, setTipos] = useState<TipoPacote[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const [novoPacoteNome, setNovoPacoteNome] = useState('')
  const [novoPacoteValor, setNovoPacoteValor] = useState('')
  const [novoPacoteBanhos, setNovoPacoteBanhos] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [configRes, tiposRes] = await Promise.all([
      supabase.from('configuracoes').select('*').eq('id', 1).single(),
      supabase.from('tipos_pacote').select('*').order('valor', { ascending: false }),
    ])
    setConfig(configRes.data as ConfiguracoesRow)
    setTipos((tiposRes.data as TipoPacote[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function updateField<K extends keyof ConfiguracoesRow>(campo: K, valor: ConfiguracoesRow[K]) {
    setConfig((c) => (c ? { ...c, [campo]: valor } : c))
  }

  async function salvarEmpresa() {
    if (!config) return
    setSalvandoEmpresa(true)
    await supabase
      .from('configuracoes')
      .update({
        empresa_nome: config.empresa_nome,
        responsavel: config.responsavel,
        telefone: config.telefone,
        instagram: config.instagram,
        endereco: config.endereco,
      })
      .eq('id', 1)
    setSalvandoEmpresa(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  async function toggleNotif(campo: keyof ConfiguracoesRow) {
    if (!config) return
    const novoValor = !config[campo]
    updateField(campo, novoValor as ConfiguracoesRow[typeof campo])
    await supabase.from('configuracoes').update({ [campo]: novoValor }).eq('id', 1)
  }

  async function adicionarPacote() {
    const valor = Number(novoPacoteValor.replace(',', '.'))
    const banhos = Number(novoPacoteBanhos)
    if (!novoPacoteNome || !valor || !banhos) return
    await supabase.from('tipos_pacote').insert({ nome: novoPacoteNome, valor, banhos_por_ciclo: banhos })
    setNovoPacoteNome('')
    setNovoPacoteValor('')
    setNovoPacoteBanhos('')
    load()
  }

  async function alterarEmail() {
    const novo = window.prompt('Novo e-mail de acesso:', session?.user.email ?? '')
    if (!novo || novo === session?.user.email) return
    const { error } = await supabase.auth.updateUser({ email: novo })
    window.alert(error ? 'Não foi possível alterar o e-mail.' : 'Verifique sua caixa de entrada para confirmar a alteração.')
  }

  async function alterarSenha() {
    const nova = window.prompt('Nova senha (mínimo 6 caracteres):')
    if (!nova) return
    const { error } = await supabase.auth.updateUser({ password: nova })
    window.alert(error ? 'Não foi possível alterar a senha.' : 'Senha alterada com sucesso.')
  }

  if (loading || !config) return <div className="text-text-muted">Carregando…</div>

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="text-[23px] font-extrabold">Configurações</div>
        <div className="mt-[2px] text-[12.5px] text-text-muted">Dados da empresa, pacotes, notificações e segurança</div>
      </div>

      <div className="flex gap-[14px]">
        <div className="flex flex-1 flex-col gap-[14px]">
          <Card className="p-[22px]">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[13.5px] font-extrabold">Dados da empresa</div>
              <button
                onClick={salvarEmpresa}
                disabled={salvandoEmpresa}
                className="rounded-pill bg-gradient-to-br from-blue to-blue-dark px-4 py-[8px] text-[11.5px] font-bold text-white disabled:opacity-60"
              >
                {salvo ? 'Salvo ✓' : salvandoEmpresa ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Nome da empresa" value={config.empresa_nome} onChange={(v) => updateField('empresa_nome', v)} />
              <Campo label="Responsável" value={config.responsavel ?? ''} onChange={(v) => updateField('responsavel', v)} />
              <Campo label="Telefone / WhatsApp" value={config.telefone ?? ''} onChange={(v) => updateField('telefone', v)} />
              <Campo label="Instagram" value={config.instagram ?? ''} onChange={(v) => updateField('instagram', v)} />
              <div className="col-span-2">
                <Campo label="Endereço" value={config.endereco ?? ''} onChange={(v) => updateField('endereco', v)} />
              </div>
            </div>
          </Card>

          <Card className="flex-grow p-[22px]">
            <div className="mb-2 text-[13.5px] font-extrabold">Tipos de pacote</div>
            {tipos.map((t) => (
              <div key={t.id} className="flex items-center gap-[14px] border-b border-[#ece5d8] py-3 last:border-none">
                <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-blue-tint text-[11px] font-extrabold text-blue-dark">
                  {t.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-grow">
                  <div className="text-[12.5px] font-bold">{t.nome}</div>
                  <div className="text-[11px] text-text-muted">
                    {t.banhos_por_ciclo} banho{t.banhos_por_ciclo !== 1 ? 's' : ''} por ciclo
                  </div>
                </div>
                <div className="text-[13px] font-extrabold">R$ {t.valor.toFixed(0)}</div>
              </div>
            ))}

            <div className="mt-3 flex items-end gap-2">
              <input
                placeholder="Nome"
                value={novoPacoteNome}
                onChange={(e) => setNovoPacoteNome(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-[#fbf9f5] px-[10px] py-[8px] text-[12px] outline-none focus:border-blue"
              />
              <input
                placeholder="Banhos/ciclo"
                value={novoPacoteBanhos}
                onChange={(e) => setNovoPacoteBanhos(e.target.value)}
                inputMode="numeric"
                className="w-[100px] rounded-lg border border-border bg-[#fbf9f5] px-[10px] py-[8px] text-[12px] outline-none focus:border-blue"
              />
              <input
                placeholder="Valor"
                value={novoPacoteValor}
                onChange={(e) => setNovoPacoteValor(e.target.value)}
                inputMode="decimal"
                className="w-[90px] rounded-lg border border-border bg-[#fbf9f5] px-[10px] py-[8px] text-[12px] outline-none focus:border-blue"
              />
              <button onClick={adicionarPacote} className="whitespace-nowrap text-[12px] font-bold text-blue">
                + Adicionar
              </button>
            </div>
          </Card>
        </div>

        <div className="flex flex-1 flex-col gap-[14px]">
          <Card className="p-[22px]">
            <div className="mb-2 text-[13.5px] font-extrabold">Notificações</div>
            <SettingRow
              titulo="Lembrete diário da agenda"
              descricao="Resumo dos banhos do dia"
              checked={config.notif_lembrete_diario}
              onChange={() => toggleNotif('notif_lembrete_diario')}
            />
            <SettingRow
              titulo="Cobranças pendentes"
              descricao="Avisar quando um pagamento atrasar"
              checked={config.notif_cobrancas_pendentes}
              onChange={() => toggleNotif('notif_cobrancas_pendentes')}
            />
            <SettingRow
              titulo="Renovação de pacote"
              descricao="Pedir confirmação antes de renovar"
              checked={config.notif_renovacao_pacote}
              onChange={() => toggleNotif('notif_renovacao_pacote')}
            />
            <SettingRow
              titulo="Alerta de estoque"
              descricao="Avisar quando um produto precisar de reposição"
              checked={config.notif_alerta_estoque}
              onChange={() => toggleNotif('notif_alerta_estoque')}
            />
          </Card>

          <Card className="p-[22px]">
            <div className="mb-2 text-[13.5px] font-extrabold">Conta e segurança</div>
            <div className="flex items-center justify-between border-b border-[#ece5d8] py-3">
              <div>
                <div className="text-[12.5px] font-bold">E-mail de acesso</div>
                <div className="mt-[2px] text-[11px] text-text-muted">{session?.user.email}</div>
              </div>
              <button onClick={alterarEmail} className="text-[11.5px] font-bold text-blue">
                Alterar
              </button>
            </div>
            <div className="flex items-center justify-between border-b border-[#ece5d8] py-3">
              <div>
                <div className="text-[12.5px] font-bold">Senha</div>
                <div className="mt-[2px] text-[11px] text-text-muted">Alterar senha de acesso</div>
              </div>
              <button onClick={alterarSenha} className="text-[11.5px] font-bold text-blue">
                Alterar
              </button>
            </div>
            <SettingRow
              titulo="Backup automático"
              descricao="Cópia periódica de todos os dados"
              checked={config.backup_automatico}
              onChange={() => toggleNotif('backup_automatico')}
              semBorda
            />
          </Card>

          <Card tone="terracota" className="flex flex-grow flex-col justify-center gap-[10px] p-[22px]">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8562a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
              </svg>
              <div className="text-[12.5px] font-extrabold text-terracota-dark">Zona de risco</div>
            </div>
            <div className="text-[11.5px] leading-[1.5] text-terracota-dark">
              Cancelar um pacote ou excluir um cadastro é uma ação permanente. Peça para a Amanda caso precise remover algo definitivamente.
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col">
      <div className="mb-[6px] text-[11px] font-extrabold uppercase tracking-wider text-text-faint">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border bg-[#fbf9f5] px-[13px] py-[10px] text-[12.5px] text-ink outline-none focus:border-blue"
      />
    </div>
  )
}

function SettingRow({
  titulo,
  descricao,
  checked,
  onChange,
  semBorda = false,
}: {
  titulo: string
  descricao: string
  checked: boolean
  onChange: () => void
  semBorda?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-3 ${semBorda ? '' : 'border-b border-[#ece5d8]'}`}>
      <div>
        <div className="text-[12.5px] font-bold">{titulo}</div>
        <div className="mt-[2px] text-[11px] text-text-muted">{descricao}</div>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}
