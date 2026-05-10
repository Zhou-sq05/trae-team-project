<template>
  <div class="admin-container">
    <el-container>
      <el-header>
        <div class="header-left">
          <h1>隐私保护数据采集与管理平台</h1>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              {{ user?.username || '管理员' }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-container>
        <el-aside width="200px">
          <el-menu :default-active="activeMenu" class="el-menu-vertical-demo" router>
            <el-menu-item index="/admin/scenario-overview">
              <el-icon><Document /></el-icon>
              <span>场景说明</span>
            </el-menu-item>
            <el-menu-item index="/admin/attr-config">
              <el-icon><Setting /></el-icon>
              <span>属性配置</span>
            </el-menu-item>
            <el-menu-item index="/admin/dataset">
              <el-icon><Document /></el-icon>
              <span>数据集列表</span>
            </el-menu-item>
            <el-menu-item index="/admin/aggregate">
              <el-icon><DataAnalysis /></el-icon>
              <span>聚合结果</span>
            </el-menu-item>
            <el-sub-menu index="/admin/demo">
              <template #title>
                <el-icon><Monitor /></el-icon>
                <span>演示与验证</span>
              </template>
              <el-menu-item index="/admin/demo/arr-experiment-comparison">
                误差评估
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>

        <el-main>
          <div class="scenario-content">
            <el-card shadow="hover" class="hero-card">
              <div class="hero-copy">
                <div class="page-title">数据属性与协议选择总览</div>
                <p class="page-desc">
                  本系统面向智能手环健康数据采集场景。平台需要收集部分健康行为或状态数据，用于群体统计分析、异常提醒评估和健康趋势观察。但部分待采集属性与用户敏感状态之间存在统计相关性，直接采集可能导致敏感属性被推断。因此，本系统在客户端本地完成编码与随机扰动，服务器仅接收扰动后的上报值，并在聚合端进行统计估计。
                </p>
              </div>
              <el-button type="primary" @click="goToAttrConfig">进入属性配置</el-button>
            </el-card>

            <section class="overview-grid">
              <el-card v-for="item in overviewCards" :key="item.label" shadow="hover" class="overview-card">
                <div class="overview-label">{{ item.label }}</div>
                <div class="overview-value">{{ item.value }}</div>
                <div class="overview-desc">{{ item.desc }}</div>
              </el-card>
            </section>

            <el-alert
              class="protocol-summary"
              type="info"
              :closable="false"
              show-icon
            >
              <template #title>
                本页面将采集属性、敏感属性关系与协议选择合并展示。待采集属性在客户端完成编码与本地扰动，服务器仅接收扰动后的上报结果；年龄段和 BMI 类别不作为直接采集对象，而是用于条件分布风险建模的相关敏感属性。
              </template>
            </el-alert>

            <el-card shadow="hover" class="section-card grouping-standard-card">
              <template #header>
                <div class="section-title">相关敏感属性分组说明</div>
              </template>
              <p class="grouping-standard-desc">
                以下分组用于构建条件分布矩阵 Pr(A|S)，并作为内在不确定性参数 α、β 的计算基础。
              </p>
              <div class="grouping-standard-grid">
                <div
                  v-for="group in sensitiveGroupingCards"
                  :key="group.title"
                  class="grouping-standard-panel"
                >
                  <div class="grouping-standard-title">{{ group.title }}</div>
                  <div class="grouping-standard-role">{{ group.role }}</div>
                  <div class="grouping-standard-items">
                    <span
                      v-for="item in group.items"
                      :key="item.name"
                      class="grouping-standard-item"
                    >
                      <strong>{{ item.name }}</strong>
                      <span v-if="item.desc">{{ item.desc }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </el-card>

            <section class="relation-grid">
              <el-card v-for="card in relationCards" :key="card.protocol" shadow="hover" class="relation-card">
                <div class="relation-head">
                  <div>
                    <div class="relation-title">{{ card.attribute }}</div>
                    <div class="relation-subtitle">{{ card.subtitle }}</div>
                  </div>
                  <div class="tag-group">
                    <el-tag type="primary">{{ card.protocol }}</el-tag>
                    <el-tag :type="card.modeType">{{ card.mode }}</el-tag>
                  </div>
                </div>
                <div v-if="card.composition" class="relation-row">
                  <span>属性组成</span>
                  <p>{{ card.composition }}</p>
                </div>
                <div v-if="card.valueRole || card.missingRole" class="role-split">
                  <div v-if="card.valueRole">
                    <span>有效值角色</span>
                    <p>{{ card.valueRole }}</p>
                  </div>
                  <div v-if="card.missingRole">
                    <span>缺失状态角色</span>
                    <p>{{ card.missingRole }}</p>
                  </div>
                </div>
                <div class="relation-row">
                  <span>可能泄露的敏感属性</span>
                  <strong>{{ card.sensitive }}</strong>
                </div>
                <div class="relation-row">
                  <span>隐私风险</span>
                  <p v-html="formatRiskText(card.risk)"></p>
                </div>
                <div class="relation-row">
                  <span>本地处理方式</span>
                  <p>{{ card.localProcess }}</p>
                </div>
              </el-card>
            </section>

            <el-card shadow="hover" class="section-card sensitive-note-card">
              <template #header>
                <div class="section-title">敏感属性说明</div>
              </template>
              <p>
                年龄段和 BMI 类别是系统重点建模和保护的相关敏感属性。年龄段可能由睡眠异常提醒或睡眠质量评分缺失状态间接推断；BMI 类别可能由站立时长分档或每日步数分布间接推断。
              </p>
            </el-card>

            <el-card shadow="hover" class="section-card">
              <template #header>
                <div class="section-title">系统流程说明</div>
              </template>
              <el-steps :active="7" finish-status="success" align-center>
                <el-step v-for="step in processSteps" :key="step" :title="step" />
              </el-steps>
              <div class="next-tip">
                完成场景理解后，可进入属性配置页面，为每个待采集属性配置对应的隐私保护协议和扰动参数。
              </div>
              <div class="footer-actions">
                <el-button type="primary" @click="goToAttrConfig">进入属性配置</el-button>
              </div>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue';
import { useUserStore } from '../../store/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);

const overviewCards = [
  {
    label: '应用场景',
    value: '智能手环健康数据采集',
    desc: '围绕睡眠、活动和提醒状态进行健康行为数据采集。'
  },
  {
    label: '采集目标',
    value: '群体统计分析',
    desc: '关注总体分布、趋势观察和异常提醒评估，而非识别单个用户。'
  },
  {
    label: '隐私风险',
    value: '统计相关性泄露',
    desc: '待采集属性可能与年龄段、BMI类别、缺失状态等建模属性相关。'
  },
  {
    label: '保护方式',
    value: '客户端本地编码与扰动',
    desc: '服务器仅接收扰动后值，并在聚合端执行统计估计。'
  }
];

const relationCards = [
  {
    protocol: 'ARR',
    attribute: '是否触发睡眠异常提醒',
    subtitle: '二值事件采集',
    sensitive: '年龄段',
    mode: '间接隐私风险',
    modeType: 'primary',
    risk: '本身不敏感，但触发情况可能与年龄段存在统计相关性，从而泄露敏感属性年龄段。',
    localProcess: '适合用 ARR 对 0/1 二值事件进行本地随机响应。'
  },
  {
    protocol: 'AGRR',
    attribute: '日均站立时长分档',
    subtitle: '多值分档采集',
    sensitive: 'BMI 类别',
    mode: '间接隐私风险',
    modeType: 'primary',
    risk: '本身不敏感，但站立时长或活动水平分档可能与 BMI 类别存在统计相关性，从而泄露敏感属性 BMI 类别。',
    localProcess: '先映射为活动分档，再进行多值随机扰动。'
  },
  {
    protocol: 'AOUE',
    attribute: '每日步数分桶',
    subtitle: 'one-hot 向量编码采集',
    sensitive: 'BMI 类别',
    mode: '间接隐私风险',
    modeType: 'primary',
    risk: '本身不敏感，但步数分布可能与 BMI 类别存在统计相关性，从而泄露敏感属性 BMI 类别。',
    localProcess: '先生成 one-hot 编码向量，再对向量每一位进行 AOUE 扰动。'
  },
  {
    protocol: 'TSP',
    attribute: '睡眠质量评分',
    subtitle: '含缺失状态的混合属性采集',
    composition: '睡眠质量评分有效值 + 睡眠质量评分缺失状态',
    valueRole: '本身敏感，需要扰动上报',
    missingRole: '本身不敏感，但可能泄露敏感属性年龄段',
    sensitive: '年龄段',
    mode: '混合隐私风险',
    modeType: 'warning',
    risk: '评分有效值可能直接反映用户睡眠健康状态，因此本身具有敏感性；评分是否缺失本身不敏感，但可能与年龄段存在统计相关性，从而泄露敏感属性年龄段。',
    localProcess: 'TSP 先处理评分缺失状态，再对有效评分取值进行本地扰动上报，并结合年龄段相关性进行风险建模。'
  }
];

const sensitiveGroupingCards = [
  {
    title: '年龄段',
    role: '用于 ARR 与 TSP 的相关敏感属性 S',
    items: [
      { name: '青年', desc: '18-44岁' },
      { name: '中年', desc: '45-59岁' },
      { name: '老年', desc: '60岁及以上' }
    ]
  },
  {
    title: 'BMI类别',
    role: '用于 AGRR 与 AOUE 的相关敏感属性 S',
    items: [
      { name: '正常' },
      { name: '超重' },
      { name: '肥胖' }
    ]
  }
];

const processSteps = [
  '场景属性定义',
  '选择待采集属性',
  '识别相关敏感属性',
  '配置隐私保护协议',
  '客户端本地编码与扰动',
  '上传扰动后值',
  '聚合端统计估计'
];

function formatRiskText(text) {
  return String(text)
    .replace(/本身不敏感/g, '<strong>本身不敏感</strong>')
    .replace(/本身敏感/g, '<strong>本身敏感</strong>')
    .replace(/泄露敏感属性([^，。；]+)/g, '<strong>泄露敏感属性$1</strong>');
}

function goToAttrConfig() {
  router.push('/admin/attr-config');
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.admin-container {
  height: 100vh;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.user-info {
  cursor: pointer;
  color: #606266;
}

.el-aside {
  background-color: #304156;
}

.el-menu {
  border-right: none;
}

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: calc(100vh - 60px);
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
}

.scenario-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-card :deep(.el-card__body) {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.hero-copy {
  min-width: 0;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 10px;
}

.page-desc {
  margin: 0;
  max-width: 980px;
  color: #4b5563;
  line-height: 1.8;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.overview-card {
  min-height: 136px;
}

.overview-label {
  font-size: 13px;
  color: #718096;
}

.overview-value {
  margin-top: 8px;
  color: #1f2d3d;
  font-size: 18px;
  font-weight: 700;
}

.overview-desc {
  margin-top: 10px;
  color: #64748b;
  line-height: 1.6;
}

.section-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f2d3d;
}

.protocol-summary {
  border: 1px solid #dbeafe;
}

.protocol-summary :deep(.el-alert__title) {
  color: #1e3a8a;
  line-height: 1.7;
  font-weight: 600;
}

.relation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.grouping-standard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  justify-content: start;
  gap: 10px;
}

.grouping-standard-desc {
  margin: -2px 0 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.grouping-standard-panel {
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px 12px;
}

.grouping-standard-title {
  color: #1f2d3d;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 3px;
}

.grouping-standard-role {
  color: #7b8794;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 8px;
}

.grouping-standard-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.grouping-standard-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  color: #475569;
  line-height: 1.2;
  font-size: 12px;
}

.grouping-standard-item strong {
  color: #1e3a8a;
}

.grouping-standard-item span {
  color: #475569;
}

.relation-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.relation-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.relation-title {
  color: #1f2d3d;
  font-size: 17px;
  font-weight: 700;
}

.relation-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.inline-tags {
  justify-content: flex-start;
}

.relation-row span {
  display: block;
  color: #7b8794;
  font-size: 12px;
  margin-bottom: 5px;
}

.relation-row strong,
.relation-row p {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

.role-split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.role-split > div {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  padding: 10px 12px;
}

.role-split span {
  display: block;
  color: #7b8794;
  font-size: 12px;
  margin-bottom: 5px;
}

.role-split p {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

.sensitive-note-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.8;
}

.next-tip {
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f8fafc;
  color: #4b5563;
  line-height: 1.7;
}

.footer-actions {
  margin-top: 16px;
  text-align: right;
}

@media (max-width: 1200px) {
  .overview-grid,
  .grouping-standard-grid,
  .relation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .hero-card :deep(.el-card__body) {
    flex-direction: column;
  }

  .overview-grid,
  .grouping-standard-grid,
  .relation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
