'use strict'

const db = uniCloud.database()
const { BADGE_DEFINITIONS, PURCHASE_ITEMS } = require('../../common/badge-definitions')

exports.main = async (event, context) => {
  const results = []

  results.push(await seedBadges())
  results.push(await seedPurchaseItems())

  return { code: 0, msg: '数据库初始化完成', data: { results } }
}

async function seedBadges() {
  const collection = db.collection('badges')
  const existing = await collection.count()
  if (existing.total > 0) {
    return { action: 'seedBadges', status: 'skipped', msg: `已有${existing.total}个徽章` }
  }

  for (const badge of BADGE_DEFINITIONS) {
    await collection.add(badge)
  }
  return { action: 'seedBadges', status: 'done', count: BADGE_DEFINITIONS.length }
}

async function seedPurchaseItems() {
  const collection = db.collection('purchase-items')

  const existing = await collection.count().catch(() => ({ total: 0 }))
  if (existing.total > 0) {
    return { action: 'seedPurchaseItems', status: 'skipped', msg: `已有${existing.total}个商品` }
  }

  for (const item of PURCHASE_ITEMS) {
    await collection.add(item)
  }
  return { action: 'seedPurchaseItems', status: 'done', count: PURCHASE_ITEMS.length }
}
