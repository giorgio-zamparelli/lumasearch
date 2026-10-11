/* Copyright 2013 - 2024 Waiterio LLC */
import React from 'react'

const IconSearch = props => {
  const { className, width = 24, height = 24, onClick, style } = props
  const title = 'icon-search'
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
      <g
        data-rebalance="1.107"
        transform="translate(12 12) scale(1.107) translate(-12 -12)"
      >
        <title>{title}</title>
        <path d="M15.504 13.992h-0.792l-0.288-0.264c0.984-1.128 1.584-2.616 1.584-4.224 0-3.6-2.928-6.504-6.504-6.504s-6.504 2.904-6.504 6.504 2.904 6.504 6.504 6.504c1.608 0 3.096-0.6 4.224-1.584l0.264 0.288v0.792l5.016 4.992 1.488-1.488-4.992-5.016zM9.504 13.992c-2.496 0-4.512-2.016-4.512-4.488s2.016-4.512 4.512-4.512 4.488 2.016 4.488 4.512-2.016 4.488-4.488 4.488z" />
      </g>
    </svg>
  )
}

export default IconSearch
