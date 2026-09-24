export function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '')
}

/** Abre o WhatsApp Web/app com uma mensagem pré-preenchida pro telefone do tutor.
 * Retorna false se não houver telefone válido (chamador decide o que fazer). */
export function abrirWhatsapp(telefone: string | null | undefined, mensagem: string): boolean {
  const digitos = apenasDigitos(telefone ?? '')
  if (!digitos) return false
  window.open(`https://wa.me/55${digitos}?text=${encodeURIComponent(mensagem)}`, '_blank')
  return true
}
