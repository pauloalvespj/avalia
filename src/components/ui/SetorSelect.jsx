export function SetorSelect({ setores, setorId, onChange }) {
  if (!setores.length) return null
  return (
    <div className="flex items-center gap-3 mb-5">
      <label className="text-sm font-semibold text-navy whitespace-nowrap">Setor:</label>
      <select
        className="input py-2 text-sm w-auto"
        value={setorId ?? ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">Todos</option>
        {setores.map(s => (
          <option key={s.id} value={s.id}>{s.nome}</option>
        ))}
      </select>
    </div>
  )
}
