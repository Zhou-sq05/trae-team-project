<template>
  <div class="summary-block">
    <div class="summary-heading summary-heading--with-action">
      <div class="summary-heading__copy">
        <h4>连续采集结果</h4>
        <span class="section-tip">展示健康手环连续采集并重复执行 {{ currentTaskDetail?.protocol || '--' }} 的汇总结果</span>
      </div>
      <el-button
        v-if="isAoue"
        plain
        class="aoue-expand-trigger"
        @click="dialogVisible = true"
        :disabled="!currentBatchResult"
      >
        <el-icon><FullScreen /></el-icon>
        放大查看
      </el-button>
    </div>

    <div v-if="!currentBatchResult" class="empty-box">
      <p>点击左侧“手环连续采集”后，这里会展示本次连续采集的统计结果和前 10 条样本明细。</p>
    </div>

    <template v-else>
      <template v-if="isAoue">
        <AoueBatchCollectionPanel :batch="aoueBatchViewModel" />
        <el-dialog
          v-model="dialogVisible"
          fullscreen
          title="AOUE 连续采集结果"
          class="aoue-expanded-dialog aoue-batch-expanded-dialog"
          :destroy-on-close="false"
        >
          <div class="aoue-expanded-dialog__body">
            <AoueBatchCollectionPanel
              :batch="aoueBatchViewModel"
              mode="expanded"
            />
          </div>
        </el-dialog>

        <div
          v-if="currentPerturbationStatus"
          class="perturbation-status-banner perturbation-status-banner--batch"
          :class="`is-${currentPerturbationStatus.statusKey}`"
        >
          <div class="perturbation-status-title">{{ currentPerturbationStatus.title }}</div>
          <div class="perturbation-status-desc">{{ currentPerturbationStatus.description }}</div>
        </div>

        <div class="summary-block batch-upload-block">
          <div class="summary-heading">
            <h4>批量上报</h4>
            <span class="section-tip">将本次连续采集产生的扰动后样本记录批量写入管理端数据源</span>
          </div>
          <div class="action-row">
            <el-button
              type="primary"
              @click="$emit('upload-current-batch-result')"
              :disabled="isCurrentBatchUploaded"
            >
              上报本次连续采集结果
            </el-button>
          </div>
          <div v-if="isCurrentBatchUploaded" class="preview-tip">
            本次上报状态：{{ batchUploadState.status }}，本次上报记录数：{{ batchUploadState.count }} 条
          </div>
          <div v-else class="preview-tip">
            请先完成连续采集模拟，再将本次连续采集产生的扰动后样本记录批量上报到管理端。
          </div>
        </div>
      </template>

      <template v-else>
        <div class="batch-summary-strip">
          <div class="batch-summary-item">
            <div class="card-label">{{ currentBatchSummaryCards[0]?.label || '样本总数' }}</div>
            <div class="batch-summary-value">{{ currentBatchSummaryCards[0]?.value }}</div>
          </div>
          <div class="batch-summary-item">
            <div class="card-label">{{ currentBatchSummaryCards[1]?.label || '当前任务名称' }}</div>
            <div class="batch-summary-value">{{ currentBatchSummaryCards[1]?.value }}</div>
          </div>
          <div class="batch-summary-item">
            <div class="card-label">{{ currentBatchSummaryCards[2]?.label || '当前协议' }}</div>
            <div class="batch-summary-value">{{ currentBatchSummaryCards[2]?.value }}</div>
          </div>
        </div>

        <div class="compare-panel">
          <div class="compare-title">扰动前后分布对比</div>
          <table class="compare-table">
            <thead>
              <tr>
                <th>状态</th>
                <th>原始值</th>
                <th>上报值</th>
                <th>变化</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in currentDistributionComparisonRows" :key="row.status">
                <td>{{ row.status }}</td>
                <td>{{ row.rawCount }}</td>
                <td>{{ row.reportCount }}</td>
                <td :class="['delta-text', row.delta > 0 ? 'increase' : row.delta < 0 ? 'decrease' : 'neutral']">
                  {{ row.deltaDisplay }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="compare-bars">
            <div v-for="row in currentDistributionComparisonRows" :key="`${row.status}-bars`" class="compare-bar-row">
              <div class="compare-bar-label">{{ row.status }}</div>
              <div class="compare-bar-track">
                <div class="compare-bar-group">
                  <span class="compare-bar-caption">原始</span>
                  <div class="compare-bar">
                    <div class="compare-bar-fill raw-fill" :style="{ width: `${row.rawPercent}%` }"></div>
                  </div>
                  <span class="compare-bar-number">{{ row.rawCount }}</span>
                </div>
                <div class="compare-bar-group">
                  <span class="compare-bar-caption">上报</span>
                  <div class="compare-bar">
                    <div class="compare-bar-fill report-fill" :style="{ width: `${row.reportPercent}%` }"></div>
                  </div>
                  <span class="compare-bar-number">{{ row.reportCount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="preview-tip">
          {{ currentBatchResultTip }}
        </div>
        <div
          v-if="currentPerturbationStatus"
          class="perturbation-status-banner perturbation-status-banner--batch"
          :class="`is-${currentPerturbationStatus.statusKey}`"
        >
          <div class="perturbation-status-title">{{ currentPerturbationStatus.title }}</div>
          <div class="perturbation-status-desc">{{ currentPerturbationStatus.description }}</div>
        </div>

        <div class="summary-block batch-upload-block">
          <div class="summary-heading">
            <h4>批量上报</h4>
            <span class="section-tip">将本次连续采集产生的扰动后样本记录批量写入管理端数据源</span>
          </div>
          <div class="action-row">
            <el-button
              type="primary"
              @click="$emit('upload-current-batch-result')"
              :disabled="isCurrentBatchUploaded"
            >
              上报本次连续采集结果
            </el-button>
          </div>
          <div v-if="isCurrentBatchUploaded" class="preview-tip">
            本次上报状态：{{ batchUploadState.status }}，本次上报记录数：{{ batchUploadState.count }} 条
          </div>
          <div v-else class="preview-tip">
            请先完成连续采集模拟，再将本次连续采集产生的扰动后样本记录批量上报到管理端。
          </div>
        </div>

        <div class="batch-detail-table">
          <div class="batch-table-title">前 {{ currentBatchPreviewRows.length }} 条样本明细</div>
          <table>
            <thead>
              <tr>
                <th v-for="column in batchPreviewColumns" :key="column.key">{{ column.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in currentBatchPreviewRows" :key="row.index">
                <td v-for="column in batchPreviewColumns" :key="column.key">{{ row[column.key] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { FullScreen } from '@element-plus/icons-vue';
import AoueBatchCollectionPanel from './AoueBatchCollectionPanel.vue';

const props = defineProps({
  currentTaskDetail: {
    type: Object,
    default: null
  },
  currentBatchResult: {
    type: Object,
    default: null
  },
  currentPerturbationStatus: {
    type: Object,
    default: null
  },
  aoueBatchViewModel: {
    type: Object,
    default: null
  },
  batchUploadState: {
    type: Object,
    default: null
  },
  currentBatchSummaryCards: {
    type: Array,
    default: () => []
  },
  currentDistributionComparisonRows: {
    type: Array,
    default: () => []
  },
  currentBatchResultTip: {
    type: String,
    default: ''
  },
  batchPreviewColumns: {
    type: Array,
    default: () => []
  },
  currentBatchPreviewRows: {
    type: Array,
    default: () => []
  },
  aoueBatchExpandedVisible: {
    type: Boolean,
    default: false
  }
});

defineEmits(['upload-current-batch-result', 'update:aoueBatchExpandedVisible']);

const isAoue = computed(() => props.currentTaskDetail?.scenario === 'aoue');

const isCurrentBatchUploaded = computed(() => (
  !props.currentBatchResult
  || props.batchUploadState?.batchId === props.currentBatchResult.batchId
));

const dialogVisible = computed({
  get: () => props.aoueBatchExpandedVisible,
  set: value => {
    // Use v-model to keep the parent as the single source of truth.
    emit('update:aoueBatchExpandedVisible', value);
  }
});
</script>

<script>
export default {
  name: 'UserBatchResultPanel'
};
</script>

<style scoped>
.summary-block {
  margin-bottom: 22px;
}

.summary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.summary-heading--with-action {
  align-items: flex-start;
}

.summary-heading__copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.summary-block h4 {
  margin: 0;
  color: #1f2d3d;
}

.section-tip {
  font-size: 12px;
  color: #7b8794;
}

.aoue-expand-trigger {
  flex-shrink: 0;
}

.empty-box {
  padding: 18px;
  color: #8b97a7;
  line-height: 1.6;
}

.action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-tip {
  color: #6b7785;
  font-size: 13px;
  line-height: 1.6;
}

.perturbation-status-banner {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #d7e7ff;
  background: #f4f8ff;
}

.perturbation-status-banner.is-no_extra_perturbation {
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.perturbation-status-banner.is-active_perturbation {
  background: #fff7e8;
  border-color: #f3d19e;
}

.perturbation-status-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
}

.perturbation-status-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #5f6b7a;
}

.perturbation-status-banner--batch {
  margin-bottom: 16px;
}

.batch-detail-table {
  margin-top: 16px;
  border: 1px solid #dfe6ee;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.batch-summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.batch-summary-item {
  padding: 12px 14px;
  border: 1px solid #e5ecf4;
  border-radius: 10px;
  background: #f8fbff;
}

.batch-summary-value {
  font-size: 16px;
  font-weight: 700;
  color: #425466;
  line-height: 1.5;
}

.compare-panel {
  border: 1px solid #dfe6ee;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  margin-bottom: 14px;
}

.compare-title {
  padding: 12px 14px;
  background: #f7fbff;
  border-bottom: 1px solid #e7eef6;
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
}

.compare-table th,
.compare-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #eef2f6;
  text-align: left;
  font-size: 13px;
  color: #425466;
}

.compare-table th {
  background: #fafcff;
  color: #6b7785;
  font-weight: 600;
}

.delta-text {
  font-weight: 700;
}

.delta-text.increase {
  color: #e67e22;
}

.delta-text.decrease {
  color: #409eff;
}

.delta-text.neutral {
  color: #6b7785;
}

.compare-bars {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #fcfdff;
}

.compare-bar-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.compare-bar-label {
  width: 100px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  color: #425466;
  padding-top: 4px;
}

.compare-bar-track {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compare-bar-group {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  gap: 10px;
  align-items: center;
}

.compare-bar-caption,
.compare-bar-number {
  font-size: 12px;
  color: #6b7785;
}

.compare-bar-number {
  text-align: right;
  font-weight: 600;
}

.compare-bar {
  height: 10px;
  border-radius: 999px;
  background: #edf2f7;
  overflow: hidden;
}

.compare-bar-fill {
  height: 100%;
  border-radius: 999px;
}

.raw-fill {
  background: linear-gradient(90deg, #9ec5ff 0%, #409eff 100%);
}

.report-fill {
  background: linear-gradient(90deg, #8fd3a8 0%, #67c23a 100%);
}

.batch-table-title {
  padding: 12px 14px;
  background: #f8fbff;
  color: #425466;
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid #dfe6ee;
}

.batch-detail-table table {
  width: 100%;
  border-collapse: collapse;
}

.batch-detail-table th,
.batch-detail-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #eef2f6;
  text-align: left;
  font-size: 13px;
  color: #425466;
}

.batch-detail-table th {
  background: #fafcff;
  color: #6b7785;
  font-weight: 600;
}

.batch-detail-table tr:last-child td {
  border-bottom: none;
}

:deep(.aoue-expanded-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 16px 22px 10px;
  border-bottom: 1px solid #e6edf5;
  background: #ffffff;
}

:deep(.aoue-expanded-dialog .el-dialog__title) {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}

:deep(.aoue-expanded-dialog .el-dialog__body) {
  padding: 0;
  background: linear-gradient(180deg, #f7f9fc 0%, #eef3f8 100%);
}

.aoue-expanded-dialog__body {
  min-height: calc(100vh - 72px);
  padding: 20px 24px 28px;
  box-sizing: border-box;
}

.aoue-batch-expanded-dialog .aoue-expanded-dialog__body {
  padding: 24px 28px 32px;
}

@media (max-width: 960px) {
  .batch-summary-strip {
    grid-template-columns: 1fr;
  }

  .compare-bar-row {
    flex-direction: column;
  }

  .compare-bar-label {
    width: auto;
    padding-top: 0;
  }

  .summary-heading--with-action {
    align-items: stretch;
  }

  .aoue-expand-trigger {
    width: 100%;
    justify-content: center;
  }
}
</style>
