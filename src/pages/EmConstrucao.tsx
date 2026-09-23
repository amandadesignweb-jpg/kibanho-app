export function EmConstrucao({ titulo, fase }: { titulo: string; fase: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[23px] font-extrabold">{titulo}</div>
      <div className="text-[13px] text-text-muted">
        Esta tela entra na {fase} da implementação — o Dashboard e o Login já estão
        funcionando com dados reais do Supabase.
      </div>
    </div>
  )
}
