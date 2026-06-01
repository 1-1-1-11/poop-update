<template>
  <view class="page-container" :class="themeStore.themeClass">
    <PageTransition>
      <!-- 未加入战队面板 -->
      <view class="no-group-panel" v-if="!activeGroupId">
        <view class="welcome-card-flat">
          <text class="banner-title">{{ themeStore.t('socialTitle') }}</text>
          <text class="banner-desc">{{ groupIntroText }}</text>
        </view>

        <!-- 加入战队 -->
        <ThemeCard customClass="action-card-flat">
          <view class="card-title">// {{ joinGroupTitle }}</view>
          <view class="input-row">
            <input 
              class="input" 
              type="text" 
              v-model="inviteCodeInput"
              :placeholder="invitePlaceholder"
              maxlength="10"
            />
            <button class="action-btn join-btn" :loading="loading" @tap="handleJoinGroup">加入</button>
          </view>
        </ThemeCard>

        <!-- 创建战队 -->
        <ThemeCard customClass="action-card-flat">
          <view class="card-title">// {{ createGroupTitle }}</view>
          <view class="input-row">
            <input 
              class="input" 
              type="text" 
              v-model="newGroupName" 
              :placeholder="createPlaceholder" 
              maxlength="20"
            />
            <button class="action-btn create-btn" :loading="loading" @tap="handleCreateGroup">创建</button>
          </view>
        </ThemeCard>
      </view>

      <!-- 已加入战队面板 -->
      <view class="group-panel" v-else>
        <!-- 战队信息头部 (扁平头部板) -->
        <ThemeCard customClass="group-header-board-flat">
          <view class="meta">
            <text class="group-name">{{ groupName }}</text>
            <text class="invite-code">邀请码: <text class="code-text" @tap="copyInviteCode">{{ inviteCode }}</text> (点击复制)</text>
          </view>
          <button class="leave-btn" @tap="handleLeaveGroup">退出</button>
        </ThemeCard>

        <!-- 排行榜与动态标签 (下划线式 tabs) -->
        <view class="sub-tabs">
          <view 
            class="sub-tab" 
            :class="{ active: activeSubTab === 'rank' }"
            @tap="activeSubTab = 'rank'"
          >
            {{ rankTabLabel }}
          </view>
          <view 
            class="sub-tab" 
            :class="{ active: activeSubTab === 'feed' }"
            @tap="activeSubTab = 'feed'"
          >
            {{ feedTabLabel }}
          </view>
        </view>

        <!-- 排行榜列表 (扁平对账单行) -->
        <view class="tab-content" v-if="activeSubTab === 'rank'">
          <view class="rank-list">
            <view 
              class="rank-row-flat" 
              v-for="item in leaderboard" 
              :key="item.user_id"
              :class="{ 'is-me': item.user_id === userStore.user?._id }"
            >
              <!-- 排名数 (对账单单号风格) -->
              <view class="rank-num">
                <text class="num-text">{{ String(item.rank).padStart(2, '0') }}</text>
              </view>
              <!-- 成员头像及名字 -->
              <view class="member-meta">
                <text class="member-name">{{ item.nickname }}</text>
                <text class="member-title">{{ item.current_title }}</text>
              </view>
              <!-- 摸鱼战报数据 -->
              <view class="member-stats">
                <view class="stats-val">
                  <NumberTicker :value="item.total_earnings" prefix="¥" :precision="2" />
                </view>
                <text class="stats-label">{{ item.total_sessions }}次 | {{ formatMinutes(item.total_duration) }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 动态墙 (流水记录行) -->
        <view class="tab-content" v-if="activeSubTab === 'feed'">
          <view class="feed-list" v-if="feedList.length > 0">
            <view 
              class="feed-row-flat" 
              v-for="(feed, idx) in feedList" 
              :key="idx"
            >
              <view class="feed-header">
                <text class="feed-name">{{ feed.display_name }}</text>
                <text class="feed-time">{{ formatTimeAgo(feed.created_at) }}</text>
              </view>
              <view class="feed-body">
                {{ formatFeedBody(feed) }}
              </view>
            </view>
          </view>
          <view class="empty-state" v-else>
            <text class="empty-text">NO RECORD / 暂无活动动态</text>
          </view>
        </view>
      </view>
    </PageTransition>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { useThemeStore } from '../../stores/theme'
import { apiCall } from '../../services/api'
import { formatMinutes, formatTimeAgo } from '../../utils/formatters'
import type { Group, LeaderboardEntry } from '../../utils/types'

// Components
import PageTransition from '../../components/PageTransition.vue'
import ThemeCard from '../../components/ThemeCard.vue'
import NumberTicker from '../../components/NumberTicker.vue'

const userStore = useUserStore()
const themeStore = useThemeStore()

const activeGroupId = ref<string>('')
const groupName = ref<string>('')
const inviteCode = ref<string>('')
const activeSubTab = ref<'rank' | 'feed'>('rank')

const inviteCodeInput = ref('')
const newGroupName = ref('')
const loading = ref(false)

const leaderboard = ref<LeaderboardEntry[]>([])
const feedList = ref<any[]>([])

onShow(async () => {
  await fetchGroupStatus()
})

// Dynamic labels
const groupIntroText = computed(() => {
  return themeStore.isStock
    ? '量化套利，组队取暖！与同事组队PK持仓收益，看谁才是办公室的“带薪交易大师”。'
    : '科学研究，协同共进！与学术伙伴组队打卡实验，看谁才是实验室的“高效科研劳模”。'
})

const joinGroupTitle = computed(() => themeStore.isStock ? '加入现有证券团队' : '加入现有课题组')
const createGroupTitle = computed(() => themeStore.isStock ? '创建自营交易团队' : '创建全新课题组')

const invitePlaceholder = computed(() => themeStore.isStock ? '输入团队6位邀请码' : '输入课题组6位验证码')
const createPlaceholder = computed(() => {
  return themeStore.isStock ? '团队名称 (如: 游资大本营)' : '课题组名称 (如: 重点攻坚组)'
})

const rankTabLabel = computed(() => themeStore.isStock ? '团队对账单' : '课题组产出榜')
const feedTabLabel = computed(() => themeStore.isStock ? '团队委单流水' : '课题组实验动态')

const formatFeedBody = (feed: any) => {
  const mins = formatMinutes(feed.duration_seconds)
  const money = `¥${feed.earnings.toFixed(2)}`
  return themeStore.isStock
    ? `执行交易委单，持仓时段达 ${mins}，为账户增加浮动盈亏 ${money}！`
    : `开展化学/生物反应，实验观察持续时间 ${mins}，产出科研能量 ${money}！`
}

const fetchGroupStatus = async () => {
  try {
    const res = await apiCall<{ groups: Group[] }>('group-manager', 'list')
    if (res.code === 0 && res.data?.groups && res.data.groups.length > 0) {
      const activeGroup = res.data.groups[0]
      activeGroupId.value = activeGroup._id
      groupName.value = activeGroup.name
      inviteCode.value = activeGroup.invite_code
      
      await fetchLeaderboard()
      await fetchFeed()
    } else {
      activeGroupId.value = ''
      groupName.value = ''
      inviteCode.value = ''
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchLeaderboard = async () => {
  if (!activeGroupId.value) return
  try {
    const res = await apiCall<{ rankings: LeaderboardEntry[] }>('group-manager', 'leaderboard', {
      group_id: activeGroupId.value,
      period: 'week'
    })
    if (res.code === 0 && res.data) {
      leaderboard.value = res.data.rankings
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchFeed = async () => {
  if (!activeGroupId.value) return
  try {
    const res = await apiCall<{ feed: any[] }>('group-manager', 'feed', {
      group_id: activeGroupId.value
    })
    if (res.code === 0 && res.data) {
      feedList.value = res.data.feed
    }
  } catch (e) {
    console.error(e)
  }
}

const handleJoinGroup = async () => {
  if (!inviteCodeInput.value.trim()) {
    uni.showToast({ title: '请输入邀请码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await apiCall('group-manager', 'join', {
      invite_code: inviteCodeInput.value.trim()
    })
    loading.value = false
    if (res.code === 0) {
      uni.showToast({ title: '已成功加入团队！', icon: 'none' })
      inviteCodeInput.value = ''
      await fetchGroupStatus()
    } else {
      uni.showToast({ title: res.msg || '加入失败', icon: 'none' })
    }
  } catch (e) {
    loading.value = false
    console.error(e)
  }
}

const handleCreateGroup = async () => {
  if (!newGroupName.value.trim()) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await apiCall('group-manager', 'create', {
      name: newGroupName.value.trim()
    })
    loading.value = false
    if (res.code === 0) {
      uni.showToast({ title: '团队创建成功！', icon: 'none' })
      newGroupName.value = ''
      await fetchGroupStatus()
    } else {
      uni.showToast({ title: res.msg || '创建失败', icon: 'none' })
    }
  } catch (e) {
    loading.value = false
    console.error(e)
  }
}

const handleLeaveGroup = () => {
  uni.showModal({
    title: '退出确认',
    content: `确定解约或退出「${groupName.value}」组织吗？`,
    success: async (mRes) => {
      if (mRes.confirm) {
        try {
          const res = await apiCall('group-manager', 'leave', {
            group_id: activeGroupId.value
          })
          if (res.code === 0) {
            uni.showToast({ title: '已成功退出', icon: 'none' })
            await fetchGroupStatus()
          } else {
            uni.showToast({ title: res.msg || '退出失败', icon: 'none' })
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  })
}

const copyInviteCode = () => {
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      uni.showToast({ title: '已复制邀请码', icon: 'none' })
    }
  })
}
</script>

<style lang="scss" scoped>
.page-container {
  padding: 40rpx;
  min-height: 100vh;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

// 欢迎卡
.welcome-card-flat {
  background: var(--bg-card);
  border: 1rpx solid var(--border);
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24rpx;

  .banner-title {
    font-size: 36rpx;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .banner-desc {
    font-size: 24rpx;
    color: var(--text-secondary);
    margin-top: 16rpx;
    line-height: 1.5;
  }
}

// 交互操作卡
.action-card-flat {
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;

  .card-title {
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 20rpx;
    letter-spacing: 2rpx;
    text-transform: uppercase;
  }

  .input-row {
    display: flex;
    gap: 16rpx;

    .input {
      flex: 1;
      background-color: var(--bg-primary);
      border: 1rpx solid var(--border);
      height: 80rpx;
      padding: 0 20rpx;
      font-size: 24rpx;
      color: var(--text-primary);
      box-sizing: border-box;
      font-family: var(--font-mono);
    }

    .action-btn {
      height: 80rpx;
      line-height: 80rpx;
      font-size: 24rpx;
      font-weight: 800;
      border-radius: var(--radius-sm, 4rpx);
      padding: 0 36rpx;
      border: none;
      color: #ffffff;
      text-transform: uppercase;
    }

    .join-btn { background-color: var(--accent-info); }
    .create-btn { background-color: var(--accent); }
  }
}

// 战队页卡
.group-header-board-flat {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .meta {
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .group-name {
      font-size: 32rpx;
      font-weight: 800;
      color: var(--text-primary);
    }

    .invite-code {
      font-size: 20rpx;
      color: var(--text-secondary);

      .code-text {
        color: var(--accent-warn);
        font-weight: 800;
        text-decoration: underline;
        font-family: var(--font-mono);
      }
    }
  }

  .leave-btn {
    font-size: 22rpx;
    font-weight: 800;
    background-color: transparent;
    color: var(--accent-warn);
    border: 1rpx solid var(--accent-warn);
    height: 60rpx;
    line-height: 60rpx;
    border-radius: var(--radius-sm, 4rpx);
    padding: 0 24rpx;
    text-transform: uppercase;

    &:active {
      background-color: rgba(231, 76, 60, 0.05);
    }
  }
}

// 标签选项 (下划线)
.sub-tabs {
  display: flex;
  border-bottom: 2rpx solid var(--border);
  margin-top: 16rpx;

  .sub-tab {
    flex: 1;
    text-align: center;
    font-size: 24rpx;
    font-weight: 800;
    color: var(--text-secondary);
    padding: 24rpx 0;
    border-bottom: 4rpx solid transparent;
    transition: all 0.2s ease;

    &.active {
      border-bottom-color: var(--accent);
      color: var(--accent);
    }
  }
}

// 排行榜列表
.rank-list {
  display: flex;
  flex-direction: column;
  margin-top: 24rpx;
}

.rank-row-flat {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--border);

  &.is-me {
    border-left: 4rpx solid var(--accent);
    padding-left: 12rpx;
  }

  .rank-num {
    font-size: 26rpx;
    width: 60rpx;
    display: flex;
    justify-content: center;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-weight: 800;
  }

  .member-meta {
    flex: 1.2;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .member-name {
      font-size: 24rpx;
      font-weight: 800;
      color: var(--text-primary);
    }

    .member-title {
      font-size: 18rpx;
      color: var(--text-secondary);
      background-color: var(--border);
      padding: 2rpx 8rpx;
      align-self: flex-start;
      font-family: var(--font-mono);
    }
  }

  .member-stats {
    flex: 1;
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .stats-val {
      font-size: 26rpx;
      font-weight: 800;
      color: var(--accent);
      font-family: var(--font-mono);
    }

    .stats-label {
      font-size: 18rpx;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
  }
}

// 动态墙
.feed-list {
  display: flex;
  flex-direction: column;
  margin-top: 24rpx;
}

.feed-row-flat {
  display: flex;
  flex-direction: column;
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--border);
  gap: 12rpx;

  .feed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .feed-name {
      font-size: 22rpx;
      font-weight: 800;
      color: var(--text-primary);
    }

    .feed-time {
      font-size: 18rpx;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }
  }

  .feed-body {
    font-size: 22rpx;
    color: var(--text-secondary);
    line-height: 1.5;
  }
}

// 空白状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;

  .empty-text {
    font-size: 22rpx;
    color: var(--text-secondary);
    letter-spacing: 2rpx;
  }
}
</style>
