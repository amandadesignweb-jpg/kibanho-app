// Utilitário mínimo — evita depender do pacote `clsx` só por isso.
export default function clsx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ')
}
