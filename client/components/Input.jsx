/* Copyright 2013 - 2026 Waiterio LLC */

export default function Input({ label, Icon, ref, ...props }) {
  return (
    <div className={`luma-input ${Icon ? 'luma-input-with-icon' : ''}`}>
      <input {...props} ref={ref} aria-label={props['aria-label'] || label} />
      {Icon && <Icon className="input-icon" aria-hidden="true" />}
    </div>
  )
}
