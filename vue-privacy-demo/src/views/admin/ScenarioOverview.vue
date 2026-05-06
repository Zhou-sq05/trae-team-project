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
            <el-menu-item index="/admin/dashboard">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
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
                实验效果对比
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>

        <el-main>
          <div class="scenario-content">
            <el-card shadow="hover" class="hero-card">
              <div class="hero-copy">
                <div class="page-title">健康手环数据采集场景说明</div>
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

            <el-card shadow="hover" class="section-card">
              <template #header>
                <div class="section-title">数据属性总览</div>
              </template>
              <el-table :data="attributeRows" border style="width: 100%">
                <el-table-column prop="name" label="属性名称" min-width="180" />
                <el-table-column prop="role" label="属性角色" width="140">
                  <template #default="scope">
                    <el-tag :type="roleTagType(scope.row.role)">{{ scope.row.role }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="type" label="属性类型" min-width="150" />
                <el-table-column prop="isCollected" label="待采集属性" width="120" />
                <el-table-column prop="sensitive" label="相关敏感属性" min-width="170" />
                <el-table-column prop="risk" label="隐私风险说明" min-width="260" />
                <el-table-column prop="protocol" label="采用协议" width="110">
                  <template #default="scope">
                    <el-tag v-if="scope.row.protocol !== '--'" type="success">{{ scope.row.protocol }}</el-tag>
                    <span v-else>--</span>
                  </template>
                </el-table-column>
                <el-table-column prop="note" label="说明" min-width="230" />
              </el-table>
            </el-card>

            <section class="relation-grid">
              <el-card v-for="card in relationCards" :key="card.protocol" shadow="hover" class="relation-card">
                <div class="relation-head">
                  <div>
                    <div class="relation-title">{{ card.attribute }}</div>
                    <div class="relation-protocol">{{ card.protocol }}</div>
                  </div>
                  <el-tag :type="card.modeType">{{ card.mode }}</el-tag>
                </div>
                <div class="relation-row">
                  <span>可能泄露的敏感属性</span>
                  <strong>{{ card.sensitive }}</strong>
                </div>
                <div class="relation-row">
                  <span>相关性描述</span>
                  <p>{{ card.correlation }}</p>
                </div>
                <div class="relation-row">
                  <span>本地处理方式</span>
                  <p>{{ card.localProcess }}</p>
                </div>
                <div class="server-visible">
                  服务器不直接获得用户原始采集值，也不直接获得用户敏感属性，只接收经过本地扰动后的上报值。
                </div>
              </el-card>
            </section>

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
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue';
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
    desc: '待采集属性可能与年龄段、BMI、健康状态等敏感属性相关。'
  },
  {
    label: '保护方式',
    value: '客户端本地编码与扰动',
    desc: '服务器仅接收扰动后值，并在聚合端执行统计估计。'
  }
];

const attributeRows = [
  {
    name: '是否触发睡眠异常提醒',
    role: '待采集属性',
    type: '二元属性',
    isCollected: '是',
    sensitive: '年龄段、健康状态',
    risk: '异常提醒触发情况可能与年龄、健康状态等敏感属性存在相关性。',
    protocol: 'ARR',
    note: '适合用 ARR 对 0/1 二值事件进行本地随机响应。'
  },
  {
    name: '日均站立时长分档',
    role: '待采集属性',
    type: '多分类属性',
    isCollected: '是',
    sensitive: 'BMI / 体重状态',
    risk: '站立时长或活动水平可能泄露用户体重状态。',
    protocol: 'AGRR',
    note: '先映射为活动分档，再进行多值随机扰动。'
  },
  {
    name: '每日步数分桶',
    role: '待采集属性',
    type: '多分类 / 向量编码属性',
    isCollected: '是',
    sensitive: 'BMI / 体重状态',
    risk: '步数分布可能与用户体重状态、活动能力有关。',
    protocol: 'AOUE',
    note: '先生成 one-hot 编码向量，再进行逐位扰动。'
  },
  {
    name: '睡眠质量评分',
    role: '待采集属性',
    type: '混合属性',
    isCollected: '是',
    sensitive: '缺失状态、健康状态',
    risk: '睡眠质量评分及缺失情况可能反映用户健康状态或作息状况。',
    protocol: 'TSP',
    note: '先处理缺失状态，再对有效值与缺失值执行两阶段扰动。'
  },
  {
    name: '年龄段',
    role: '相关敏感属性',
    type: '分组属性',
    isCollected: '否',
    sensitive: '自身作为敏感属性',
    risk: '年龄段可能被睡眠异常提醒或评分缺失状态间接推断。',
    protocol: '--',
    note: '用于 ARR 与 TSP 的条件分布风险建模。'
  },
  {
    name: 'BMI / 体重状态',
    role: '相关敏感属性',
    type: '分组属性',
    isCollected: '否',
    sensitive: '自身作为敏感属性',
    risk: 'BMI 或体重状态可能由活动水平、站立时长、步数分布间接泄露。',
    protocol: '--',
    note: '用于 AGRR 与 AOUE 的条件分布风险建模。'
  },
  {
    name: '睡眠质量评分缺失状态',
    role: '辅助背景属性',
    type: '二元状态',
    isCollected: '随 TSP 本地处理',
    sensitive: '年龄段、健康状态',
    risk: '缺失状态本身可能与年龄段或健康状况存在统计相关性。',
    protocol: 'TSP',
    note: '作为 TSP 混合隐私风险中的缺失状态 M 进行建模。'
  }
];

const relationCards = [
  {
    protocol: 'ARR',
    attribute: '是否触发睡眠异常提醒',
    sensitive: '年龄段、健康状态',
    mode: '间接隐私风险',
    modeType: 'primary',
    correlation: '不同年龄段或健康状态用户触发睡眠异常提醒的概率可能不同，二值采集值可能间接泄露敏感属性。',
    localProcess: '客户端将未触发提醒编码为 0、触发提醒编码为 1，并在本地执行 ARR 二元随机扰动。'
  },
  {
    protocol: 'AGRR',
    attribute: '日均站立时长分档',
    sensitive: 'BMI / 体重状态',
    mode: '间接隐私风险',
    modeType: 'primary',
    correlation: '活动水平与 BMI 或体重状态存在统计相关性，站立时长分档可能成为敏感状态的推断线索。',
    localProcess: '客户端先将原始站立时长映射为活动分档，再按 AGRR 协议对分档值进行扰动。'
  },
  {
    protocol: 'AOUE',
    attribute: '每日步数分桶',
    sensitive: 'BMI / 体重状态、活动能力',
    mode: '间接隐私风险',
    modeType: 'primary',
    correlation: '每日步数分布可能反映用户活动能力，也可能与 BMI 或体重状态相关。',
    localProcess: '客户端先将步数分桶编码为 one-hot 向量，再对向量每一位进行 AOUE 扰动。'
  },
  {
    protocol: 'TSP',
    attribute: '睡眠质量评分',
    sensitive: '缺失状态、健康状态、年龄段',
    mode: '混合隐私风险',
    modeType: 'warning',
    correlation: '评分有效值本身具有直接隐私风险，评分缺失状态也可能与年龄段或健康状态相关。',
    localProcess: '客户端先将本地采集结果编码为缺失/非缺失状态及对应取值，再执行第一阶段有效值扰动和第二阶段统一域扰动。'
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

function roleTagType(role) {
  if (role === '待采集属性') return 'success';
  if (role === '相关敏感属性') return 'warning';
  return 'info';
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

.relation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
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

.relation-protocol {
  margin-top: 4px;
  color: #409eff;
  font-weight: 700;
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

.server-visible {
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
  padding: 12px;
  color: #1e3a8a;
  line-height: 1.7;
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
  .relation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .hero-card :deep(.el-card__body) {
    flex-direction: column;
  }

  .overview-grid,
  .relation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
