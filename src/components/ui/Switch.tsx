import clsx from '../../lib/clsx'

export function Switch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      className={clsx(
        'relative h-6 w-10 shrink-0 rounded-pill transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : '',
        checked ? 'bg-gradient-to-br from-blue to-blue-dark' : 'bg-border'
      )}
    >
      <span
        className={clsx(
          'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all',
          checked ? 'right-[3px]' : 'left-[3px]'
        )}
      />
    </button>
  )
}
