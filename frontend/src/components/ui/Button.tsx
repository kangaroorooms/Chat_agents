import React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }

export default function Button({ variant = 'primary', children, className = '', ...rest }: Props) {
  const classes = `btn btn-${variant} ${className}`.trim()

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}
