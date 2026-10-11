/* Copyright 2013 - 2026 Waiterio LLC */

export default function Button({
  appearance = 'primary',
  size = 'large',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      className={`luma-button luma-button-${appearance} luma-button-${size} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
    >
      <span
        className={
          isLoading ? 'button-label button-label-loading' : 'button-label'
        }
      >
        {children}
      </span>
      {isLoading && <span className="button-spinner" aria-hidden="true" />}
    </button>
  )
}
