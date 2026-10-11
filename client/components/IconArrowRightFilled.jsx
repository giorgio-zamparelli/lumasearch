/* Copyright 2013 - 2024 Waiterio LLC */
import React from 'react'

const IconArrowRightFilled = props => {
  const { className, width = 24, height = 24, onClick, style } = props
  const title = 'icon-arrow-right-filled'
  const dataTestId = props['data-testid'] || title

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      onClick={onClick}
      data-testid={dataTestId}
    >
      <title>{title}</title>
      <path
        d="M22,12c0-5.52-4.48-10-10-10S2,6.48,2,12c0,5.52,4.48,10,10,10S22,17.52,22,12z
      M12,13l-4,0v-2l4,0V8l4,4l-4,4V13z"
      />
    </svg>
  )
}

export default IconArrowRightFilled
