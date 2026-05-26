<template>
  <view class="social-container">
    <!-- 未加入战队面板 -->
    <view class="no-group-panel" v-if="!activeGroupId">
      <view class="welcome-card">
        <text class="banner-icon">👥</text>
        <text class="banner-title">拉屎战队</text>
        <text class="banner-desc">独乐乐不如众乐乐！与同事组队PK，看谁才是办公室的“带薪摸鱼之王”。</text>
      </view>

      <!-- 加入战队 -->
      <view class="action-card">
        <view class="card-title">加入现有战队</view>
        <view class="input-row">
          <input 
            class="input" 
            type="text" 
            v-model="inviteCodeInput"
            placeholder="请输入6位战队邀请码"
            maxlength="10"
          />
          <button class="action-btn join-btn" :loading="loading" @tap="handleJoinGroup">加入</button>
        </view>
      </view>

      <!-- 创建战队 -->
      <view class="action-card">
        <view class="card-title">创建全新战队</view>
        <view class="input-row">
          <input 
            class="input" 
            type="text" 
            v-model="newGroupName" 
            placeholder="请输入战队名称 (如: 拉屎天团)" 
            maxlength="20"
          />
          <button class="action-btn create-btn" :loading="loading" @tap="handleCreateGroup">创建</button>
        </view>
      </view>
    </view>

    <!-- 已加入战队面板 -->
    <view class="group-panel" v-else>
      <!-- 战队信息头部 -->
      <view class="group-header-card">
        <view class="meta">
          <text class="group-name">🛡️ {{ groupName }}</text>
          <text class="invite-code">邀请码: <text class="code-text" @tap="copyInviteCode">{{ inviteCode }}</text> (点击复制)</text>
        </view>
        <button class="leave-btn" @tap="handleLeaveGroup">退出战队</button>
      </view>

      <!-- 排行榜与动态标签 -->
      <view class="sub-tabs">
        <view 
          class="sub-tab" 
          :class="{ active: activeSubTab === 'rank' }"
          @tap="activeSubTab = 'rank'"
        >
          周排行榜
        </view>
        <view 
          class="sub-tab" 
          :class="{ active: activeSubTab === 'feed' }"
          @tap="activeSubTab = 'feed'"
        >
          战队动态
        </view>
      </view>

      <!-- 排行榜列表 -->
      <view class="tab-content" v-if="activeSubTab === 'rank'">
        <view class="rank-list">
          <view 
            class="rank-row-item" 
            v-for="item in leaderboard" 
            :key="item.user_id"
            :class="{ 'is-me': item.user_id === userStore.user?._id }"
          >
            <!-- 排名数 -->
            <view class="rank-num">
              <text v-if="item.rank === 1">🥇</text>
              <text v-else-if="item.rank === 2">🥈</text>
              <text v-else-if="item.rank === 3">🥉</text>
              <text v-else>{{ item.rank }}</text>
            </view>
            <!-- 成员头像及名字 -->
            <view class="member-meta">
              <text class="member-name">{{ item.nickname }}</text>
              <text class="member-title">{{ item.current_title }}</text>
            </view>
            <!-- 摸鱼战报数据 -->
            <view class="member-stats">
              <text class="stats-val">¥{{ item.total_earnings.toFixed(2) }}</text>
              <text class="stats-label">{{ item.total_sessions }}次 | {{ formatMinutes(item.total_duration) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 动态墙 -->
      <view class="tab-content" v-if="activeSubTab === 'feed'">
        <view class="feed-list" v-if="feedList.length > 0">
          <view 
            class="feed-card" 
            v-for="(feed, idx) in feedList" 
            :key="idx"
          >
            <view class="feed-header">
              <text class="feed-name">👤 {{ feed.display_name }}</text>
              <text class="feed-time">{{ formatTimeAgo(feed.created_at) }}</text>
            </view>
            <view class="feed-body">
              完成带薪拉屎，坚持了 <text class="highlight">{{ formatMinutes(feed.duration_seconds) }}</text>，为自己捞回带薪薪资 <text class="highlight price">¥{{ feed.earnings.toFixed(2) }}</text>！
            </view>
          </view>
        </view>
        <view class="empty-state" v-else>
          <text class="empty-emoji">📝</text>
          <text class="empty-text">当前暂无任何摸鱼动态...</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/user'
import { apiCall } from '../../services/api'
import { formatMinutes, formatTimeAgo } from '../../utils/formatters'
import type { Group, LeaderboardEntry } from '../../utils/types'

const userStore = useUserStore()

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

const fetchGroupStatus = async () => {
  try {
    const res = await apiCall<{ groups: Group[] }>('group-manager', 'list')
    if (res.code === 0 && res.data?.groups && res.data.groups.length > 0) {
      const activeGroup = res.data.groups[0]
      activeGroupId.value = activeGroup._id
      groupName.value = activeGroup.name
      inviteCode.value = activeGroup.invite_code
      
      // 加载排行榜和动态
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
      uni.showToast({ title: '成功加入战队！', icon: 'success' })
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
    uni.showToast({ title: '请输入战队名称', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await apiCall('group-manager', 'create', {
      name: newGroupName.value.trim()
    })
    loading.value = false
    if (res.code === 0) {
      uni.showToast({ title: '战队创建成功！', icon: 'success' })
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
    content: `您确定要退出「${groupName.value}」战队吗？`,
    success: async (mRes) => {
      if (mRes.confirm) {
        try {
          const res = await apiCall('group-manager', 'leave', {
            group_id: activeGroupId.value
          })
          if (res.code === 0) {
            uni.showToast({ title: '已成功退出战队', icon: 'success' })
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
      uni.showToast({ title: '邀请码已复制', icon: 'success' })
    }
  })
}
</script>

<style lang="scss" scoped>
.social-container {
  padding: 32rpx;
  min-height: 100vh;
  background-color: $bg-primary;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  box-sizing: border-box;
}

// 欢迎卡
.welcome-card {
  background: linear-gradient(135deg, #ffffff 0%, #fffaf5 100%);
  border-radius: $radius-lg;
  padding: 40rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 24rpx;

  .banner-icon {
    font-size: 110rpx;
    margin-bottom: 16rpx;
  }

  .banner-title {
    font-size: 36rpx;
    font-weight: 800;
    color: $color-primary-dark;
  }

  .banner-desc {
    font-size: 24rpx;
    color: $text-secondary;
    margin-top: 16rpx;
    line-height: 1.4;
  }
}

// 交互操作卡
.action-card {
  background-color: $bg-card;
  border-radius: $radius-lg;
  padding: 36rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  flex-direction: column;
  margin-bottom: 24rpx;

  .card-title {
    font-size: 26rpx;
    font-weight: bold;
    color: $text-secondary;
    margin-bottom: 20rpx;
  }

  .input-row {
    display: flex;
    gap: 16rpx;

    .input {
      flex: 1;
      background-color: #fafafa;
      border: 1rpx solid #e0e0e0;
      border-radius: $radius-sm;
      height: 80rpx;
      padding: 0 20rpx;
      font-size: 26rpx;
      color: $text-primary;
      box-sizing: border-box;
    }

    .action-btn {
      height: 80rpx;
      line-height: 80rpx;
      font-size: 26rpx;
      font-weight: bold;
      border-radius: $radius-sm;
      padding: 0 36rpx;
      border: none;
      color: #ffffff;
      box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);
    }

    .join-btn { background-color: $color-info; }
    .create-btn { background-color: $color-primary; }
  }
}

// 战队页卡
.group-header-card {
  background: linear-gradient(135deg, #ffffff 0%, #fffcf8 100%);
  border-radius: $radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .meta {
    display: flex;
    flex-direction: column;
    gap: 8rpx;

    .group-name {
      font-size: 32rpx;
      font-weight: bold;
      color: $text-primary;
    }

    .invite-code {
      font-size: 20rpx;
      color: $text-hint;

      .code-text {
        color: $color-primary-dark;
        font-weight: bold;
        text-decoration: underline;
      }
    }
  }

  .leave-btn {
    font-size: 22rpx;
    background-color: transparent;
    color: #f44336;
    border: 2rpx solid #ffcdd2;
    height: 60rpx;
    line-height: 60rpx;
    border-radius: $radius-round;
    padding: 0 24rpx;

    &:active {
      background-color: #ffebee;
    }
  }
}

// 标签选项
.sub-tabs {
  display: flex;
  border-bottom: 2rpx solid #e0e0e0;
  margin-top: 16rpx;

  .sub-tab {
    flex: 1;
    text-align: center;
    font-size: 26rpx;
    font-weight: bold;
    color: $text-secondary;
    padding: 20rpx 0;
    position: relative;

    &.active {
      color: $color-primary-dark;

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 30%;
        right: 30%;
        height: 4rpx;
        background-color: $color-primary;
        border-radius: 999rpx;
      }
    }
  }
}

// 排行榜列表
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}

.rank-row-item {
  display: flex;
  align-items: center;
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx;
  border: 1rpx solid #eee;
  box-shadow: $shadow-sm;

  &.is-me {
    background: linear-gradient(90deg, #fffaf5 0%, #fff2e8 100%);
    border-color: #ffd8c0;
  }

  .rank-num {
    font-size: 34rpx;
    width: 60rpx;
    display: flex;
    justify-content: center;
    color: $text-secondary;
    font-weight: bold;
  }

  .member-meta {
    flex: 1.2;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .member-name {
      font-size: 26rpx;
      font-weight: bold;
      color: $text-primary;
    }

    .member-title {
      font-size: 18rpx;
      color: $text-hint;
      background-color: #f0f0f0;
      padding: 2rpx 8rpx;
      border-radius: 4rpx;
      align-self: flex-start;
    }
  }

  .member-stats {
    flex: 1;
    text-align: right;
    display: flex;
    flex-direction: column;
    gap: 4rpx;

    .stats-val {
      font-size: 30rpx;
      font-weight: bold;
      color: $color-primary-dark;
      font-family: 'Courier New', Courier, monospace;
    }

    .stats-label {
      font-size: 18rpx;
      color: $text-hint;
    }
  }
}

// 动态墙
.feed-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}

.feed-card {
  background-color: $bg-card;
  border-radius: $radius-md;
  padding: 24rpx 32rpx;
  box-shadow: $shadow-sm;
  border: 1rpx solid #ffe8d8;

  .feed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;

    .feed-name {
      font-size: 24rpx;
      font-weight: bold;
      color: $text-secondary;
    }

    .feed-time {
      font-size: 18rpx;
      color: $text-hint;
    }
  }

  .feed-body {
    font-size: 24rpx;
    color: $text-primary;
    line-height: 1.4;

    .highlight {
      font-weight: bold;
      color: $text-secondary;
    }

    .highlight.price {
      color: $color-primary-dark;
      font-family: 'Courier New', Courier, monospace;
    }
  }
}

// 空白状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;

  .empty-emoji {
    font-size: 80rpx;
    margin-bottom: 16rpx;
  }
  .empty-text {
    font-size: 24rpx;
    color: $text-hint;
  }
}
</style>
