<template>
  <div class="aoue-demo-panel" :class="`is-${mode}`">
    <div v-if="showExpandAction || mode === 'expanded'" class="aoue-shell-head">
      <div>
        <div class="aoue-shell-eyebrow">{{ mode === 'expanded' ? '放大演示模式' : '紧凑演示模式' }}</div>
        <div class="aoue-shell-title">AOUE 单次扰动演示</div>
      </div>
      <el-button v-if="showExpandAction" plain @click="demo.onExpand">
        <el-icon><FullScreen /></el-icon>
        放大演示
      </el-button>
    </div>

    <div class="aoue-compact-strip">
      <div v-for="item in demo.metaCards" :key="item.label" class="aoue-meta-card">
        <div class="aoue-meta-label">{{ item.label }}</div>
        <div class="aoue-meta-value">{{ item.value }}</div>
      </div>
    </div>

    <div v-if="demo.currentPerturbationStatus" class="aoue-soft-note">
      <div class="aoue-soft-note__title">{{ demo.currentPerturbationStatus.title }}</div>
      <div class="aoue-soft-note__desc">{{ demo.currentPerturbationStatus.description }}</div>
    </div>

    <div v-if="!demo.parametersReady" class="preview-tip">
      当前任务尚未在管理端完成 AOUE 参数保存，暂时无法执行本地扰动。
    </div>

    <div class="aoue-hero-card" :class="demo.animationStatus === 'done' ? `is-${demo.finalResultAnalysis.resultType}` : 'is-running'">
      <div class="aoue-hero-head">
        <div>
          <div class="aoue-hero-eyebrow">AOUE 单次扰动结果总览</div>
          <h4 class="aoue-hero-title">本次扰动后编码向量</h4>
        </div>
        <div class="aoue-hero-status">{{ demo.overviewTypeText }}</div>
      </div>
      <div class="aoue-hero-vector">{{ demo.overviewVectorText }}</div>
      <div class="aoue-hero-grid">
        <div class="aoue-hero-metric">
          <span class="aoue-hero-metric__label">播放模式</span>
          <span class="aoue-hero-metric__value">{{ demo.playModeText }}</span>
        </div>
        <div class="aoue-hero-metric">
              <span class="aoue-hero-metric__label">向量说明</span>
          <span class="aoue-hero-metric__value">{{ demo.overviewVectorNoteText }}</span>
        </div>
      </div>
    </div>

    <div class="aoue-stepper">
      <div
        v-for="(step, stepIndex) in demo.stepperItems"
        :key="step.label"
        class="aoue-stepper-item"
        :class="`is-${step.state}`"
      >
        <div class="aoue-stepper-node">{{ stepIndex + 1 }}</div>
        <div class="aoue-stepper-text">{{ step.label }}</div>
      </div>
    </div>

    <div class="aoue-main-grid">
      <div class="aoue-visual-panel">
        <div class="summary-heading">
          <h4>{{ demo.animationStatusText }}</h4>
          <span class="section-tip">先展示分桶与编码，再进入 AOUE 的逐位独立扰动</span>
        </div>

        <div v-if="demo.animationReady" class="aoue-vector-board">
          <div class="aoue-vector-caption-row">
            <span>初始编码向量</span>
            <span class="aoue-vector-caption-row__hint">编码阶段会先出现全 0 向量，再把目标位置为 1</span>
          </div>
          <div class="aoue-vector-columns">
            <div v-for="cell in demo.vectorColumns" :key="`original-${cell.index}`" class="aoue-vector-column">
              <div class="aoue-grid-bit" :class="[`is-${cell.state}`, { 'is-true': cell.originalBit === 1, 'is-encoding-target': cell.isEncodingTarget, 'is-encoding-done': cell.isEncodingDone }]">
                <span class="aoue-grid-bit__index">b{{ cell.index }}</span>
                <span class="aoue-grid-bit__value">{{ cell.displayedOriginalBit == null ? '·' : cell.displayedOriginalBit }}</span>
                <span class="aoue-grid-bit__bucket">{{ cell.bucketLabel }}</span>
              </div>
            </div>
          </div>

          <div v-if="demo.animationStatus === 'encoding'" class="aoue-encoding-banner">
            <span>初始编码向量生成中</span>
            <span>根据当前分桶位置，将目标位从 0 置为 1</span>
          </div>
          <div v-else class="aoue-transition-row">
            <div v-for="cell in demo.vectorColumns" :key="`transition-${cell.index}`" class="aoue-transition-cell">
              <div class="aoue-transition-badge" :class="[`is-${cell.transitionKey}`, `is-${cell.state}`]">
                {{ cell.transitionLabel }}
              </div>
            </div>
          </div>

          <div class="aoue-vector-caption-row aoue-vector-caption-row--bottom">
            <span>扰动后编码向量</span>
            <span class="aoue-vector-caption-row__hint">进入扰动阶段后，结果向量会按位从左到右逐步生成</span>
          </div>
          <div class="aoue-vector-columns">
            <div v-for="cell in demo.vectorColumns" :key="`result-${cell.index}`" class="aoue-vector-column">
              <div class="aoue-grid-bit aoue-grid-bit--result" :class="[`is-${cell.state}`, { 'is-one': cell.resultBit === 1, 'is-pending': cell.resultBit == null, 'is-flipped': cell.hasChanged }]">
                <span class="aoue-grid-bit__index">b{{ cell.index }}</span>
                <span class="aoue-grid-bit__value">{{ cell.resultBit == null ? '?' : cell.resultBit }}</span>
                <span class="aoue-grid-bit__bucket">{{ cell.bucketLabel }}</span>
              </div>
            </div>
          </div>

          <div class="aoue-board-footer">
            <span>状态：{{ demo.animationStatusText }}</span>
            <span>模式：{{ demo.playModeText }}</span>
            <span>已完成 {{ demo.completedBitsCount }} / {{ demo.bitStepsLength }} 位</span>
          </div>
        </div>

        <div v-else class="empty-box">
          <p>准备样例后，这里会按“分桶 → 编码 → 逐位扰动 → 最终结果”的顺序展示完整演示流程。</p>
        </div>
      </div>

      <div class="aoue-side-panel">
        <div class="aoue-detail-card">
          <div class="aoue-side-card__eyebrow">当前阶段详情</div>
          <div class="aoue-side-card__title">{{ demo.currentDetailTitle }}</div>
          <div class="aoue-side-card__body">{{ demo.vectorDetailText }}</div>
        </div>

        <div class="aoue-control-card">
          <div class="aoue-side-card__eyebrow">播放控制</div>
          <div class="aoue-control-actions">
            <template v-if="demo.playMode === 'idle'">
              <el-button type="primary" size="large" @click="demo.onStartAuto" :disabled="!demo.canStartAuto">
                自动播放
              </el-button>
              <el-button type="warning" plain @click="demo.onStartManual" :disabled="!demo.canStartManual">
                手动模式
              </el-button>
              <el-button plain @click="demo.onGenerate" :disabled="!demo.canGenerateSample">
                重新生成一次样例
              </el-button>
            </template>
            <template v-else-if="demo.playMode === 'auto'">
              <el-button v-if="demo.canPauseAuto" type="primary" plain @click="demo.onPause">
                暂停自动播放
              </el-button>
              <el-button v-if="demo.canResumeAuto" type="primary" @click="demo.onResumeAuto">
                继续自动播放
              </el-button>
              <el-button plain @click="demo.onReset" :disabled="!demo.canResetDemo">
                重置本次演示
              </el-button>
            </template>
            <template v-else>
              <el-button type="warning" @click="demo.onNext" :disabled="!demo.canStepManually">
                下一步
              </el-button>
              <el-button type="primary" plain @click="demo.onResumeAuto" :disabled="!demo.canResumeAuto">
                切换为自动播放
              </el-button>
              <el-button plain @click="demo.onReset" :disabled="!demo.canResetDemo">
                重置本次演示
              </el-button>
            </template>
          </div>
        </div>

        <div class="aoue-submit-card">
          <div class="aoue-side-card__eyebrow">结果上报</div>
          <div class="aoue-side-card__body">只有完整演示结束后，页面上的最终向量才会作为这次 AOUE 上报结果。</div>
          <el-button type="success" size="large" @click="demo.onSubmit" :loading="demo.submitting" :disabled="!demo.canSubmitCurrentTask">
            提交上报
          </el-button>
        </div>
      </div>
    </div>

    <div class="aoue-log-panel">
      <div class="summary-heading">
        <h4>bit 日志</h4>
        <el-button text @click="demo.onToggleLog">{{ demo.logToggleText }}</el-button>
      </div>
      <div class="aoue-log-panel__hint">日志区保留最近若干条 bit 判断，主视觉仍聚焦编码与向量变化。</div>
      <div v-if="demo.animationReady" class="aoue-log-scroll">
        <div
          v-for="step in demo.visibleLogRows"
          :key="`log-${step.index}`"
          class="aoue-log-item"
          :class="`is-${step.stageState}`"
        >
          <span class="aoue-log-index">第 {{ step.index }} 位</span>
          <span>原始 bit = {{ step.originalBit }}</span>
          <span>{{ step.originalBit === 1 ? 'p' : 'q' }} = {{ step.usedProbability.toFixed(4) }}</span>
          <span>random = {{ step.stageState === 'pending' ? '--' : step.sampledRandom.toFixed(4) }}</span>
          <span>输出 = {{ step.stageState === 'pending' ? '--' : step.resultBit }}</span>
        </div>
      </div>
      <div v-else class="empty-box">
        <p>开始演示后，这里会记录每一位的采样与输出结果。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FullScreen } from '@element-plus/icons-vue';

defineProps({
  demo: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    default: 'compact'
  },
  showExpandAction: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.aoue-demo-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.aoue-shell-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.aoue-shell-eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.aoue-shell-title {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}

.aoue-compact-strip {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
}

.aoue-meta-card {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e6edf5;
  background: #fafcff;
}

.aoue-meta-label {
  font-size: 11px;
  color: #7b8794;
}

.aoue-meta-value {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #334155;
}

.aoue-soft-note {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fbff;
  border: 1px solid #dbe7f5;
}

.aoue-soft-note__title {
  font-size: 12px;
  font-weight: 700;
  color: #46627f;
}

.aoue-soft-note__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #718096;
}

.aoue-hero-card {
  padding: 20px 22px;
  border-radius: 18px;
  border: 1px solid #d9e8fb;
  background: linear-gradient(135deg, #f7fbff 0%, #eef6ff 100%);
  box-shadow: 0 14px 34px rgba(37, 99, 235, 0.08);
}

.aoue-hero-card.is-none {
  border-color: #d8e1eb;
  background: linear-gradient(135deg, #fbfcfd 0%, #f3f6f9 100%);
}

.aoue-hero-card.is-running {
  border-color: #f3c969;
  background: linear-gradient(135deg, #fffdf7 0%, #fff7e8 100%);
}

.aoue-hero-card.is-single {
  border-color: #b9d7ff;
}

.aoue-hero-card.is-multi {
  border-color: #9fd8b3;
  background: linear-gradient(135deg, #f7fff9 0%, #eefbf2 100%);
}

.aoue-hero-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.aoue-hero-eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 0.04em;
}

.aoue-hero-title {
  margin: 6px 0 0;
  font-size: 18px;
  color: #1e293b;
}

.aoue-hero-status {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.22);
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
  white-space: nowrap;
}

.aoue-hero-vector {
  margin-top: 16px;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(191, 219, 254, 0.9);
  font-size: 28px;
  line-height: 1.35;
  font-weight: 800;
  color: #0f172a;
  word-break: break-all;
}

.aoue-hero-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
}

.aoue-hero-metric {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(219, 234, 254, 0.95);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.aoue-hero-metric__label {
  font-size: 12px;
  color: #6b7785;
}

.aoue-hero-metric__value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2d3d;
  line-height: 1.6;
}

.aoue-stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.aoue-stepper-item {
  position: relative;
  padding: 10px 14px 10px 42px;
  border-radius: 12px;
  border: 1px solid #e3ebf3;
  background: #f8fbff;
}

.aoue-stepper-item.is-active {
  border-color: #f3c969;
  background: #fff8ea;
}

.aoue-stepper-item.is-done {
  border-color: #bfdcff;
  background: #f3f9ff;
}

.aoue-stepper-node {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aoue-stepper-item.is-active .aoue-stepper-node {
  background: #fde7b0;
  color: #b45309;
}

.aoue-stepper-item.is-done .aoue-stepper-node {
  background: #93c5fd;
  color: #fff;
}

.aoue-stepper-text {
  font-size: 13px;
  font-weight: 700;
  color: #425466;
}

.aoue-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
  gap: 16px;
  align-items: start;
}

.aoue-visual-panel,
.aoue-detail-card,
.aoue-control-card,
.aoue-submit-card,
.aoue-log-panel {
  border: 1px solid #dfe6ee;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.aoue-visual-panel,
.aoue-log-panel {
  padding: 18px;
}

.aoue-side-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.aoue-detail-card,
.aoue-control-card,
.aoue-submit-card {
  padding: 16px;
}

.aoue-side-card__eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.aoue-side-card__title {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
  color: #1e293b;
}

.aoue-side-card__body {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.75;
  color: #5f6b7a;
}

.aoue-control-actions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.aoue-control-actions :deep(.el-button) {
  justify-content: center;
}

.aoue-vector-board {
  padding: 18px;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f5f9ff 100%);
  border: 1px solid #e3edf8;
}

.aoue-vector-caption-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #425466;
}

.aoue-vector-caption-row--bottom {
  margin-top: 6px;
}

.aoue-vector-caption-row__hint {
  font-size: 12px;
  font-weight: 500;
  color: #7b8794;
}

.aoue-vector-columns,
.aoue-transition-row {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
}

.aoue-transition-row {
  margin: 12px 0;
}

.aoue-grid-bit {
  min-height: 88px;
  padding: 10px 8px;
  border-radius: 14px;
  border: 1px solid #d8e3ef;
  background: #f7fbff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.aoue-grid-bit.is-true {
  border-color: #7ab4ff;
  background: #eaf4ff;
}

.aoue-grid-bit.is-encoding,
.aoue-grid-bit.is-encoding-target,
.aoue-grid-bit.is-encoding-done {
  border-color: #f59e0b;
  background: #fff7e8;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.14);
}

.aoue-grid-bit.is-active {
  border-color: #f59e0b;
  background: #fff7e8;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.14);
  animation: aoue-pulse 1.05s ease-in-out infinite;
}

.aoue-grid-bit--result.is-one {
  border-color: #68c18c;
  background: #edf9f1;
}

.aoue-grid-bit--result.is-flipped {
  border-width: 2px;
}

.aoue-grid-bit--result.is-pending {
  border-style: dashed;
  background: #f8fafc;
  color: #9aa6b2;
}

.aoue-grid-bit__index {
  font-size: 11px;
  color: #6b7785;
}

.aoue-grid-bit__value {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}

.aoue-grid-bit__bucket {
  font-size: 10px;
  line-height: 1.4;
  text-align: center;
  color: #64748b;
}

.aoue-encoding-banner {
  margin: 12px 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed #f3c969;
  background: #fffaf0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #9a6700;
}

.aoue-transition-badge {
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid #dbe6f1;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.aoue-transition-badge.is-10 {
  color: #d97706;
  background: #fff7e8;
  border-color: #f3c969;
}

.aoue-transition-badge.is-01 {
  color: #15803d;
  background: #eefbf2;
  border-color: #a7e0bc;
}

.aoue-transition-badge.is-11 {
  color: #2563eb;
  background: #eef5ff;
  border-color: #bfdcff;
}

.aoue-transition-badge.is-00,
.aoue-transition-badge.is-pending {
  background: #f8fafc;
}

.aoue-transition-badge.is-active {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

.aoue-board-footer {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.aoue-board-footer span,
.aoue-log-panel__hint {
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.aoue-log-panel__hint {
  display: inline-flex;
  margin-bottom: 12px;
}

.aoue-log-scroll {
  max-height: 260px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aoue-log-item {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5ecf4;
  background: #fcfdff;
  font-size: 12px;
  color: #5f6b7a;
}

.aoue-log-item.is-active {
  border-color: #f3c969;
  background: #fff7e8;
}

.aoue-log-item.is-done {
  border-color: #cfe1ff;
  background: #f7fbff;
}

.aoue-log-item.is-pending {
  color: #98a4b3;
  border-style: dashed;
}

.aoue-log-index {
  font-weight: 700;
  color: #1f2d3d;
}

.preview-tip {
  color: #6b7785;
  font-size: 13px;
  line-height: 1.6;
}

.summary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.summary-heading h4 {
  margin: 0;
  color: #1f2d3d;
}

.section-tip {
  font-size: 12px;
  color: #7b8794;
}

.empty-box {
  padding: 18px;
  color: #8b97a7;
  line-height: 1.6;
}

@keyframes aoue-pulse {
  0%,
  100% {
    transform: translateY(0);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
  }

  50% {
    transform: translateY(-2px);
    box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.12);
  }
}

.aoue-demo-panel.is-compact .aoue-hero-vector {
  font-size: 26px;
}

.aoue-demo-panel.is-expanded {
  gap: 18px;
}

.aoue-demo-panel.is-expanded .aoue-shell-title {
  font-size: 22px;
}

.aoue-demo-panel.is-expanded .aoue-hero-card {
  padding: 24px 28px;
}

.aoue-demo-panel.is-expanded .aoue-hero-vector {
  font-size: 34px;
}

.aoue-demo-panel.is-expanded .aoue-main-grid {
  grid-template-columns: minmax(0, 2fr) minmax(320px, 0.95fr);
}

.aoue-demo-panel.is-expanded .aoue-grid-bit {
  min-height: 104px;
}

.aoue-demo-panel.is-expanded .aoue-grid-bit__value {
  font-size: 28px;
}

.aoue-demo-panel.is-expanded .aoue-log-scroll {
  max-height: 320px;
}

@media (max-width: 1280px) {
  .aoue-compact-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .aoue-compact-strip,
  .aoue-hero-grid,
  .aoue-main-grid,
  .aoue-stepper {
    grid-template-columns: 1fr;
  }

  .aoue-shell-head,
  .aoue-hero-head,
  .aoue-vector-caption-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .aoue-vector-columns,
  .aoue-transition-row {
    gap: 6px;
  }

  .aoue-grid-bit {
    min-height: 76px;
    padding: 8px 4px;
  }

  .aoue-grid-bit__value {
    font-size: 18px;
  }

  .aoue-grid-bit__bucket {
    font-size: 9px;
  }

  .aoue-log-item {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
