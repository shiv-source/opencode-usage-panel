const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export function share(value: number, whole: number): string {
  if (!whole) return ""
  return `${((value / whole) * 100).toFixed(1)}%`
}

export function formatCost(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (value === 0) return "$0.00"
  const abs = Math.abs(value)
  if (abs >= 1) return money.format(value)
  const digits = abs >= 0.01 ? 4 : 6
  if (abs < 0.000001) return value > 0 ? "<$0.000001" : ">-$0.000001"
  return `$${value.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "")}`
}
