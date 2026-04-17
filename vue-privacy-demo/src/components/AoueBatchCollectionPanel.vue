<template>
  <div class="aoue-batch-panel" :class="`is-${mode}`">
    <div v-if="mode === 'expanded'" class="aoue-shell-head">
      <div>
        <div class="aoue-shell-eyebrow">放大查看模式</div>
        <div class="aoue-shell-title">AOUE 连续采集结果</div>
      </div>
    </div>

    <div class="aoue-batch-hero">
      <div class="aoue-batch-hero__head">
        <div>
          <div class="aoue-batch-hero__eyebrow">AOUE 连续采集累计统计</div>
          <h4 class="aoue-batch-hero__title">按位累计总和对比</h4>
        </div>
        <div class="aoue-batch-hero__progress">{{ batch.progressText }}</div>
      </div>
      <p class="aoue-batch-hero__desc">
        连续采集展示的是多轮 AOUE 扰动下，原始 one-hot 向量与扰动后上报向量在各 bit 位上的累计总和变化。
        AOUE 连续采集的聚合核心是按位累计统计，而不是单轮命中某一个唯一桶。
      </p>

      <div class="aoue-batch-meta">
        <div class="aoue-batch-meta__card">
          <span class="aoue-batch-meta__label">已完成轮数</span>
          <span class="aoue-batch-meta__value">{{ batch.completedRuns }} / {{ batch.totalRuns }}</span>
        </div>
        <div class="aoue-batch-meta__card">
          <span class="aoue-batch-meta__label">向量维度 d</span>
          <span class="aoue-batch-meta__value">{{ batch.domainSize }}</span>
        </div>
        <div class="aoue-batch-meta__card">
          <span class="aoue-batch-meta__label">最近真实分桶</span>
          <span class="aoue-batch-meta__value">{{ batch.latestRawLabel || '--' }}</span>
        </div>
        <div class="aoue-batch-meta__card">
          <span class="aoue-batch-meta__label">当前估计最高桶</span>
          <span class="aoue-batch-meta__value">{{ batch.topEstimatedBucketText }}</span>
        </div>
      </div>
    </div>

    <div class="aoue-batch-vector-summary">
      <div class="aoue-batch-vector-card">
        <div class="aoue-batch-vector-card__title">扰动前累计 bit 总和</div>
        <div class="aoue-batch-vector-card__value">{{ batch.originalBitSumsDisplay }}</div>
      </div>
      <div class="aoue-batch-vector-card">
        <div class="aoue-batch-vector-card__title">扰动后累计 bit 总和</div>
        <div class="aoue-batch-vector-card__value">{{ batch.perturbedBitSumsDisplay }}</div>
      </div>
    </div>

    <div class="aoue-batch-grid">
      <div class="aoue-batch-compare-panel">
        <div class="aoue-batch-compare-panel__head">
          <h4>累计 bit 对比</h4>
          <span>上方是真实累计，下方是扰动后累计</span>
        </div>
        <div class="aoue-batch-bit-grid">
          <div v-for="item in batch.bitCompareItems" :key="item.index" class="aoue-batch-bit-column">
            <div class="aoue-batch-bit-card aoue-batch-bit-card--raw" :class="{ 'is-peak': item.isRawPeak }">
              <div class="aoue-batch-bit-card__index">b{{ item.index }}</div>
              <div class="aoue-batch-bit-card__count">{{ item.originalCount }}</div>
              <div class="aoue-batch-bit-card__label">{{ item.bucketLabel }}</div>
              <div class="aoue-batch-bar">
                <div class="aoue-batch-bar__fill raw-fill" :style="{ width: `${item.originalPercent}%` }"></div>
              </div>
            </div>

            <div class="aoue-batch-bit-card aoue-batch-bit-card--reported" :class="{ 'is-peak': item.isReportedPeak }">
              <div class="aoue-batch-bit-card__index">b{{ item.index }}</div>
              <div class="aoue-batch-bit-card__count">{{ item.perturbedCount }}</div>
              <div class="aoue-batch-bit-card__label">扰动后累计</div>
              <div class="aoue-batch-bar">
                <div class="aoue-batch-bar__fill report-fill" :style="{ width: `${item.perturbedPercent}%` }"></div>
              </div>
            </div>

            <div class="aoue-batch-estimate">
              <span class="aoue-batch-estimate__label">估计值</span>
              <span class="aoue-batch-estimate__value">{{ item.estimatedCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="aoue-batch-side">
        <div class="aoue-batch-side-card">
          <div class="aoue-batch-side-card__title">最近一次采集</div>
          <div class="aoue-batch-side-card__text">单轮上报是随机的，多轮累计后才形成统计规律。</div>
          <div class="aoue-batch-mini-vector">
            <span class="aoue-batch-mini-vector__label">最近一次原始 one-hot</span>
            <span class="aoue-batch-mini-vector__value">{{ batch.latestOriginalVectorDisplay }}</span>
          </div>
          <div class="aoue-batch-mini-vector">
            <span class="aoue-batch-mini-vector__label">最近一次上报向量</span>
            <span class="aoue-batch-mini-vector__value">{{ batch.latestReportedVectorDisplay }}</span>
          </div>
        </div>

        <div class="aoue-batch-side-card">
          <div class="aoue-batch-side-card__title">聚合估计结果</div>
          <div class="aoue-batch-side-card__text">{{ batch.topEstimatedBucketDescription }}</div>
          <div class="aoue-batch-estimate-list">
            <div v-for="item in batch.estimatedDistributionItems" :key="`estimate-${item.index}`" class="aoue-batch-estimate-list__item">
              <span>{{ item.bucketLabel }}</span>
              <strong>{{ item.estimatedCount }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="aoue-batch-log-panel">
      <div class="summary-heading">
        <h4>最近一次 / 样本明细</h4>
        <el-button text @click="batch.onToggleLog">{{ batch.logToggleText }}</el-button>
      </div>
      <div class="aoue-batch-log-panel__hint">连续采集的核心是累计统计，下方明细默认只展示最近几条样本。</div>
      <div class="aoue-batch-log-scroll">
        <div class="aoue-batch-log-row aoue-batch-log-row--head">
          <span>#</span>
          <span>原始步数</span>
          <span>原始分桶</span>
          <span>扰动后解释</span>
          <span>上报向量</span>
        </div>
        <div v-for="row in batch.visiblePreviewRows" :key="row.index" class="aoue-batch-log-row">
          <span>{{ row.index }}</span>
          <span>{{ row.rawSteps }}</span>
          <span>{{ row.rawLabel }}</span>
          <span>{{ row.perturbedLabel }}</span>
          <span>{{ row.reportValueDisplay }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  batch: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    default: 'compact'
  }
});
</script>

<style scoped>
.aoue-batch-panel {
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

.aoue-batch-hero {
  padding: 20px 22px;
  border-radius: 18px;
  border: 1px solid #d7e7ff;
  background: linear-gradient(135deg, #f7fbff 0%, #eef6ff 100%);
  box-shadow: 0 14px 34px rgba(37, 99, 235, 0.08);
}

.aoue-batch-hero__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.aoue-batch-hero__eyebrow {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}

.aoue-batch-hero__title {
  margin: 6px 0 0;
  font-size: 20px;
  color: #1e293b;
}

.aoue-batch-hero__progress {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-size: 12px;
  font-weight: 700;
  color: #1d4ed8;
}

.aoue-batch-hero__desc {
  margin: 14px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: #4f6276;
}

.aoue-batch-meta {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.aoue-batch-meta__card,
.aoue-batch-vector-card,
.aoue-batch-compare-panel,
.aoue-batch-side-card,
.aoue-batch-log-panel {
  border: 1px solid #dfe6ee;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.aoue-batch-meta__card {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aoue-batch-meta__label {
  font-size: 12px;
  color: #7b8794;
}

.aoue-batch-meta__value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2d3d;
}

.aoue-batch-vector-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.aoue-batch-vector-card {
  padding: 16px 18px;
}

.aoue-batch-vector-card__title {
  font-size: 12px;
  color: #6b7785;
}

.aoue-batch-vector-card__value {
  margin-top: 10px;
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.45;
  word-break: break-all;
}

.aoue-batch-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
  gap: 16px;
}

.aoue-batch-compare-panel,
.aoue-batch-log-panel {
  padding: 18px;
}

.aoue-batch-compare-panel__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.aoue-batch-compare-panel__head h4 {
  margin: 0;
  color: #1f2d3d;
}

.aoue-batch-compare-panel__head span {
  font-size: 12px;
  color: #7b8794;
}

.aoue-batch-bit-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 10px;
}

.aoue-batch-bit-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aoue-batch-bit-card {
  padding: 10px 8px;
  border-radius: 14px;
  border: 1px solid #dbe6f1;
  background: #f8fbff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.aoue-batch-bit-card--raw {
  background: #eef5ff;
}

.aoue-batch-bit-card--reported {
  background: #f6fbf6;
}

.aoue-batch-bit-card.is-peak {
  border-color: #5aa2ff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
}

.aoue-batch-bit-card__index {
  font-size: 11px;
  color: #6b7785;
}

.aoue-batch-bit-card__count {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}

.aoue-batch-bit-card__label {
  min-height: 28px;
  font-size: 10px;
  line-height: 1.35;
  text-align: center;
  color: #5f6b7a;
}

.aoue-batch-bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #eaf0f6;
  overflow: hidden;
}

.aoue-batch-bar__fill {
  height: 100%;
  border-radius: 999px;
}

.raw-fill {
  background: linear-gradient(90deg, #9ec5ff 0%, #409eff 100%);
}

.report-fill {
  background: linear-gradient(90deg, #8fd3a8 0%, #67c23a 100%);
}

.aoue-batch-estimate {
  padding: 8px;
  border-radius: 12px;
  background: #fcfdff;
  border: 1px solid #e7edf4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.aoue-batch-estimate__label {
  font-size: 11px;
  color: #7b8794;
}

.aoue-batch-estimate__value {
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
}

.aoue-batch-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.aoue-batch-side-card {
  padding: 16px;
}

.aoue-batch-side-card__title {
  font-size: 16px;
  font-weight: 800;
  color: #1f2d3d;
}

.aoue-batch-side-card__text {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: #5f6b7a;
}

.aoue-batch-mini-vector {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fbff;
  border: 1px solid #e4edf6;
}

.aoue-batch-mini-vector__label {
  display: block;
  font-size: 12px;
  color: #7b8794;
}

.aoue-batch-mini-vector__value {
  display: block;
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
  color: #1f2d3d;
  word-break: break-all;
}

.aoue-batch-estimate-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.aoue-batch-estimate-list__item {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fbff;
  border: 1px solid #e4edf6;
  font-size: 13px;
  color: #51606f;
}

.aoue-batch-estimate-list__item strong {
  color: #1f2d3d;
}

.aoue-batch-log-panel__hint {
  display: inline-flex;
  margin-bottom: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.aoue-batch-log-scroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
}

.aoue-batch-log-row {
  display: grid;
  grid-template-columns: 50px 90px 120px 1fr 1.4fr;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e5ecf4;
  background: #fcfdff;
  font-size: 12px;
  color: #5f6b7a;
  align-items: center;
}

.aoue-batch-log-row--head {
  background: #f7fbff;
  font-weight: 700;
  color: #425466;
}

.summary-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.summary-heading h4 {
  margin: 0;
  color: #1f2d3d;
}

.aoue-batch-panel.is-expanded {
  gap: 20px;
}

.aoue-batch-panel.is-expanded .aoue-batch-hero {
  padding: 26px 28px;
  border-radius: 24px;
}

.aoue-batch-panel.is-expanded .aoue-batch-hero__title {
  font-size: 24px;
}

.aoue-batch-panel.is-expanded .aoue-batch-hero__desc {
  font-size: 15px;
}

.aoue-batch-panel.is-expanded .aoue-batch-meta__card,
.aoue-batch-panel.is-expanded .aoue-batch-vector-card,
.aoue-batch-panel.is-expanded .aoue-batch-compare-panel,
.aoue-batch-panel.is-expanded .aoue-batch-side-card,
.aoue-batch-panel.is-expanded .aoue-batch-log-panel {
  border-radius: 20px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}

.aoue-batch-panel.is-expanded .aoue-batch-meta__card {
  padding: 18px 20px;
}

.aoue-batch-panel.is-expanded .aoue-batch-meta__value {
  font-size: 18px;
}

.aoue-batch-panel.is-expanded .aoue-batch-vector-summary {
  gap: 16px;
}

.aoue-batch-panel.is-expanded .aoue-batch-vector-card {
  padding: 22px 24px;
}

.aoue-batch-panel.is-expanded .aoue-batch-vector-card__value {
  font-size: 28px;
  line-height: 1.55;
}

.aoue-batch-panel.is-expanded .aoue-batch-grid {
  grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr);
  gap: 20px;
}

.aoue-batch-panel.is-expanded .aoue-batch-compare-panel,
.aoue-batch-panel.is-expanded .aoue-batch-log-panel {
  padding: 22px;
}

.aoue-batch-panel.is-expanded .aoue-batch-compare-panel__head h4,
.aoue-batch-panel.is-expanded .summary-heading h4 {
  font-size: 20px;
}

.aoue-batch-panel.is-expanded .aoue-batch-compare-panel__head span,
.aoue-batch-panel.is-expanded .aoue-batch-log-panel__hint {
  font-size: 13px;
}

.aoue-batch-panel.is-expanded .aoue-batch-bit-grid {
  gap: 14px;
}

.aoue-batch-panel.is-expanded .aoue-batch-bit-card {
  padding: 14px 12px;
  gap: 8px;
}

.aoue-batch-panel.is-expanded .aoue-batch-bit-card__count {
  font-size: 30px;
}

.aoue-batch-panel.is-expanded .aoue-batch-bit-card__label {
  min-height: 34px;
  font-size: 11px;
}

.aoue-batch-panel.is-expanded .aoue-batch-bar {
  height: 10px;
}

.aoue-batch-panel.is-expanded .aoue-batch-estimate {
  padding: 10px;
}

.aoue-batch-panel.is-expanded .aoue-batch-estimate__value {
  font-size: 16px;
}

.aoue-batch-panel.is-expanded .aoue-batch-side {
  gap: 18px;
}

.aoue-batch-panel.is-expanded .aoue-batch-side-card {
  padding: 20px;
}

.aoue-batch-panel.is-expanded .aoue-batch-side-card__title {
  font-size: 18px;
}

.aoue-batch-panel.is-expanded .aoue-batch-side-card__text,
.aoue-batch-panel.is-expanded .aoue-batch-estimate-list__item {
  font-size: 14px;
}

.aoue-batch-panel.is-expanded .aoue-batch-mini-vector {
  padding: 12px 14px;
}

.aoue-batch-panel.is-expanded .aoue-batch-mini-vector__value {
  font-size: 16px;
}

.aoue-batch-panel.is-expanded .aoue-batch-log-scroll {
  max-height: 420px;
  gap: 10px;
}

.aoue-batch-panel.is-expanded .aoue-batch-log-row {
  grid-template-columns: 60px 120px 150px minmax(180px, 1.1fr) minmax(240px, 1.6fr);
  padding: 14px 16px;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .aoue-batch-meta,
  .aoue-batch-vector-summary,
  .aoue-batch-grid {
    grid-template-columns: 1fr;
  }

  .aoue-batch-bit-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .aoue-batch-hero__head,
  .aoue-batch-compare-panel__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .aoue-batch-bit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .aoue-batch-log-row {
    grid-template-columns: 1fr;
  }

  .aoue-batch-panel.is-expanded .aoue-batch-log-row {
    grid-template-columns: 1fr;
  }
}
</style>
