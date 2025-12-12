/**
 * Currency conversion utility for displaying prices in CAD
 * Uses Frankfurter API for real-time exchange rates
 */

interface ExchangeRates {
  USD: number
  CAD: number
}

let cachedRates: ExchangeRates | null = null
let lastFetchTime: number = 0
const CACHE_DURATION = 3600000 // 1 hour in milliseconds

export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now()
  
  // Return cached rates if still valid
  if (cachedRates && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedRates
  }

  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=CAD')
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates')
    }

    const data = await response.json()
    
    cachedRates = {
      USD: 1,
      CAD: data.rates.CAD
    }
    lastFetchTime = now
    
    return cachedRates
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    
    // Fallback to approximate rate if API fails
    // This ensures the app doesn't break if the API is down
    return {
      USD: 1,
      CAD: 1.35 // Approximate fallback rate
    }
  }
}

/**
 * Convert USD price to CAD
 * @param usdPrice Price in USD
 * @param exchangeRate CAD exchange rate (how many CAD per 1 USD)
 * @returns Price converted to CAD
 */
export function convertUsdToCad(usdPrice: number, exchangeRate: number): number {
  return parseFloat((usdPrice * exchangeRate).toFixed(2))
}

/**
 * Format price for display
 * @param price Price amount
 * @param currency Currency code (USD or CAD)
 * @returns Formatted price string with currency label
 */
export function formatPrice(price: number, currency: 'USD' | 'CAD' = 'CAD'): string {
  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  const formatted = formatter.format(price)
  return currency === 'CAD' ? `${formatted} CAD` : formatted
}

/**
 * Get localized currency symbol
 */
export function getCurrencySymbol(currency: 'USD' | 'CAD'): string {
  return currency === 'CAD' ? '$' : '$'
}

/**
 * Hook to get exchange rates with loading state
 */
export async function getPriceInCad(usdPrice: number): Promise<number> {
  const rates = await getExchangeRates()
  return convertUsdToCad(usdPrice, rates.CAD)
}
