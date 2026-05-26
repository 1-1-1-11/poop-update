import type { PurchaseComparison } from './types'

export interface PurchaseItem {
  name: string
  price: number
  icon: string
}

export const PURCHASE_ITEMS: PurchaseItem[] = [
  { name: '瑞幸咖啡', price: 9.9, icon: 'coffee' },
  { name: '蜜雪冰城', price: 4, icon: 'ice-cream' },
  { name: '奶茶', price: 15, icon: 'bubble-tea' },
  { name: '煎饼果子', price: 8, icon: 'pancake' },
  { name: '包子', price: 2, icon: 'bao' },
  { name: '地铁票', price: 3, icon: 'metro' },
  { name: '可乐', price: 3.5, icon: 'cola' },
  { name: '矿泉水', price: 2, icon: 'water' },
  { name: '方便面', price: 5, icon: 'noodle' },
  { name: '视频会员日卡', price: 6, icon: 'vip' },
  { name: '麦当劳巨无霸', price: 25, icon: 'burger' },
  { name: '电影票', price: 35, icon: 'movie' },
  { name: '外卖一顿饭', price: 25, icon: 'takeout' },
  { name: 'AJ球鞋', price: 1299, icon: 'sneaker' },
  { name: 'Switch游戏', price: 299, icon: 'game' },
  { name: 'iPhone', price: 7999, icon: 'phone' },
]

export function getTopComparisons(earnings: number, count: number = 3): PurchaseComparison[] {
  const affordable = PURCHASE_ITEMS
    .map(item => ({
      item_name: item.name,
      item_price: item.price,
      quantity_affordable: Math.floor((earnings / item.price) * 10) / 10,
      icon: item.icon,
    }))
    .filter(c => c.quantity_affordable >= 0.1)
    .sort((a, b) => {
      const aWhole = a.quantity_affordable >= 1 ? 1 : 0
      const bWhole = b.quantity_affordable >= 1 ? 1 : 0
      if (aWhole !== bWhole) return bWhole - aWhole
      return a.quantity_affordable - b.quantity_affordable
    })

  return affordable.slice(0, count)
}

export function getBestComparison(earnings: number): PurchaseComparison | null {
  const sorted = PURCHASE_ITEMS
    .filter(item => earnings >= item.price)
    .sort((a, b) => b.price - a.price)

  if (sorted.length === 0) {
    const cheapest = PURCHASE_ITEMS.reduce((a, b) => a.price < b.price ? a : b)
    return {
      item_name: cheapest.name,
      item_price: cheapest.price,
      quantity_affordable: Math.floor((earnings / cheapest.price) * 10) / 10,
      icon: cheapest.icon,
    }
  }

  const best = sorted[0]
  return {
    item_name: best.name,
    item_price: best.price,
    quantity_affordable: Math.floor((earnings / best.price) * 10) / 10,
    icon: best.icon,
  }
}
