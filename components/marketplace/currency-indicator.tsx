import React from 'react'
import { Info } from 'lucide-react'

interface CurrencyIndicatorProps {
  exchangeRate: number
}

export function CurrencyIndicator({ exchangeRate }: CurrencyIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-700/50 rounded-lg text-xs text-white/80">
      <Info className="w-3 h-3 flex-shrink-0" />
      <span>
        Prices displayed in <strong>CAD</strong> • 1 USD = ${exchangeRate.toFixed(2)} CAD
      </span>
    </div>
  )
}
