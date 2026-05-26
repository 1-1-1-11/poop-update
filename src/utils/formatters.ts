export function getLocalDateString(timestamp: number): string {
  const d = new Date(timestamp)
  const utc = timestamp + d.getTimezoneOffset() * 60000
  const nd = new Date(utc + 3600000 * 8)
  const y = nd.getFullYear()
  const m = String(nd.getMonth() + 1).padStart(2, '0')
  const day = String(nd.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatHours(seconds: number): string {
  const hrs = seconds / 3600
  if (hrs < 0.1) return `${Math.round(seconds / 60)}分钟`
  return `${hrs.toFixed(1)}小时`
}

export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60)
  return `${m}分钟`
}

export function formatDurationSec(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}秒`
  return `${m}分${s}秒`
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hr = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hr}:${min}`
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60000) return '刚刚'
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`
  return `${Math.floor(hr / 24)}天前`
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
