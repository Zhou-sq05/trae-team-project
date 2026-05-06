<template>
  <div class="user-device-container">
    <div class="header">
      <div class="header-left">
        <h1>用户采集端</h1>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-dropdown">
            {{ user?.username || '用户' }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="content">
      <div class="left-section">
        <div class="task-panel">
          <div class="task-user">{{ user?.username || '用户 #001' }}</div>
          <div class="task-select-row">
            <span class="task-select-label">当前绑定任务 ID：</span>
            <el-select v-model="currentTaskId" placeholder="选择任务 ID" style="width: 240px">
              <el-option
                v-for="task in taskList"
                :key="task.id"
                :label="task.id"
                :value="task.id"
              />
            </el-select>
          </div>
          <div v-if="currentTaskDetail" class="task-meta-grid">
            <div class="meta-card">
              <div class="meta-label">当前任务</div>
              <div class="meta-value">{{ currentTaskDetail.title }}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">协议</div>
              <div class="meta-value">{{ currentTaskDetail.protocol }}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">防护模式</div>
              <div class="meta-value">{{ currentTaskDetail.mode }}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">任务 ID</div>
              <div class="meta-value">{{ currentTaskDetail.taskId }}</div>
            </div>
          </div>
        </div>

        <div class="device-info">
          <div class="info-item">
            <span>设备：</span>
            <span>健康手环</span>
          </div>
          <div class="info-item">
            <span>状态：</span>
            <div class="status-display">
              <div class="status-indicator" :class="statusColor"></div>
              <span>{{ statusText }}</span>
            </div>
          </div>
          <div class="info-item">
            <span>采集模式：</span>
            <span>按当前任务动态采集</span>
          </div>
        </div>

        <div class="dynamic-form-panel">
          <h3>采集属性</h3>
          <div v-if="!currentTaskDetail" class="empty-box">
            <p>请先选择任务，系统会根据当前任务动态展示采集属性。</p>
          </div>

          <div v-else class="dynamic-form">
            <div v-if="currentTaskDetail.scenario === 'arr'" class="form-item">
              <span>是否触发睡眠异常提醒</span>
              <el-radio-group v-model="dynamicForm.fallAlarm" @change="markFormTouched">
                <el-radio :label="0" @click="handleArrOptionClick(0)">未触发提醒</el-radio>
                <el-radio :label="1" @click="handleArrOptionClick(1)">触发提醒</el-radio>
              </el-radio-group>
            </div>

            <div v-else-if="currentTaskDetail.scenario === 'agrr'" class="form-item">
              <span>日均站立时长（分钟）</span>
              <el-input-number
                v-model="dynamicForm.standMinutes"
                :min="0"
                :step="1"
                controls-position="right"
                placeholder="请输入原始分钟数"
                @change="handleAgrrMinutesChange"
              />
              <div class="derived-hint">原始分钟数会先映射为固定分档，再进入 AGRR 扰动流程。</div>
              <div class="derived-hint derived-hint--strong">当前分档：{{ derivedStandBucket || '--' }}</div>
              <div class="bucket-rule-list">
                <span v-for="rule in standDurationBucketRules" :key="rule.label" class="bucket-rule-chip">
                  {{ rule.label }}：{{ rule.rangeText }}
                </span>
              </div>
            </div>

            <div v-else-if="currentTaskDetail.scenario === 'aoue'" class="form-item">
              <span>每日步数</span>
              <el-input v-model.number="dynamicForm.dailySteps" placeholder="请输入每日步数" @input="markFormTouched" />
              <div class="derived-hint">自动映射分桶：{{ derivedStepsBucket || '--' }}</div>
            </div>

            <div v-else-if="currentTaskDetail.scenario === 'tsp'" class="tsp-form">
              <div class="form-item">
                <span>睡眠记录是否缺失</span>
                <el-radio-group v-model="dynamicForm.sleepMissing" @change="handleSleepMissingChange">
                  <el-radio :label="0" @click="markFormTouched">否</el-radio>
                  <el-radio :label="1" @click="markFormTouched">是</el-radio>
                </el-radio-group>
              </div>
              <div class="form-item">
                <span>睡眠质量评分（1-5）</span>
                <el-input-number
                  v-model="dynamicForm.sleepScore"
                  :min="1"
                  :max="5"
                  :disabled="dynamicForm.sleepMissing === 1"
                  @change="markFormTouched"
                />
                <div class="derived-hint">
                  {{ dynamicForm.sleepMissing === 1 ? '当前为缺失状态，评分输入已禁用' : '请填写 1~5 分的睡眠质量评分' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="dynamic-form-panel">
          <div class="summary-heading">
            <h3>单次扰动演示</h3>
            <span class="section-tip">基于当前输入执行一次本地扰动，查看单条样本的处理过程</span>
          </div>

          <div v-if="!currentTaskDetail" class="empty-box">
            <p>请先选择任务，再执行单次扰动演示。</p>
          </div>

          <div v-else class="dynamic-form batch-simulator">
            <div class="derived-hint">点击后将基于当前采集输入执行一次本地扰动，并自动切换到右侧“单次扰动演示”页签。</div>
            <div class="action-row">
              <el-button type="primary" @click="refreshData" :disabled="!currentTaskDetail">生成示例输入</el-button>
              <el-button type="primary" @click="simulateCurrentTaskOnce" :disabled="!canRunSingleSimulation">
                执行单次扰动演示
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="currentTaskDetail?.scenario !== 'arr'" class="dynamic-form-panel separated-panel">
          <div class="summary-heading">
            <h3>手环端连续采集</h3>
            <span class="section-tip">在当前页面连续执行本地扰动，健康手环持续采集</span>
          </div>

          <div v-if="!currentTaskDetail" class="empty-box">
            <p>请先选择任务，再配置连续采集模拟。</p>
          </div>

          <div v-else class="dynamic-form batch-simulator">
            <div class="form-item">
              <span>连续采集次数</span>
              <el-select v-model="batchSimulationCount" style="width: 180px">
                <el-option label="10 次" :value="10" />
                <el-option label="50 次" :value="50" />
                <el-option label="100 次" :value="100" />
                <el-option label="200 次" :value="200" />
                <el-option label="500 次" :value="500" />
              </el-select>
            </div>

            <div class="derived-hint">点击后将由手环端自动连续采集 {{ batchSimulationCount }} 次，并自动切换到右侧“连续采集结果”页签。</div>
            <div class="action-row">
              <el-button
                type="success"
                @click="runBatchSimulation"
                :loading="batchSimulationRunning"
                :disabled="!canRunBatchSimulation || batchSimulationRunning"
              >
                手环连续采集
              </el-button>
            </div>
          </div>
        </div>

        <div class="control-buttons">
          <el-button @click="goToDashboard">返回首页</el-button>
        </div>
      </div>

      <div class="right-section">
        <h3>演示调试区域</h3>
        <template v-if="['arr', 'agrr', 'aoue', 'tsp'].includes(currentTaskDetail?.scenario)">
          <div class="demo-tab-bar">
            <button
              v-if="currentTaskDetail?.scenario !== 'arr'"
              type="button"
              class="demo-tab-button"
              :class="{ active: activeDemoTab === 'single' }"
              @click="activeDemoTab = 'single'"
            >
              单次扰动演示
            </button>
            <button
              type="button"
              class="demo-tab-button"
              :class="{ active: activeDemoTab === 'batch' }"
              @click="activeDemoTab = 'batch'"
            >
              连续采集结果
            </button>
          </div>

          <template v-if="activeDemoTab === 'single'">
            <template v-if="currentTaskDetail?.scenario === 'aoue'">
              <AoueDemoPanel
                :demo="aoueDemoViewModel"
                mode="compact"
                :show-expand-action="true"
              />
              <el-dialog
                v-model="aoueExpandedVisible"
                fullscreen
                title="AOUE 放大演示"
                class="aoue-expanded-dialog"
                :destroy-on-close="false"
              >
                <div class="aoue-expanded-dialog__body">
                  <AoueDemoPanel
                    :demo="aoueDemoViewModel"
                    mode="expanded"
                  />
                </div>
              </el-dialog>
            </template>

            <template v-else-if="currentTaskDetail?.scenario === 'tsp'">
              <div class="summary-block">
                <h4>任务摘要</h4>
                <div class="demo-top-card">
                  <div class="demo-top-item">
                    <span class="demo-top-label">任务 ID</span>
                    <span class="demo-top-value">{{ currentTaskDetail?.taskId || '--' }}</span>
                  </div>
                  <div class="demo-top-item">
                    <span class="demo-top-label">协议</span>
                    <span class="demo-top-value">{{ currentTaskDetail?.protocol || '--' }}</span>
                  </div>
                  <div class="demo-top-item">
                    <span class="demo-top-label">隐私预算 ε</span>
                    <span class="demo-top-value">{{ displayEpsilon }}</span>
                  </div>
                  <div class="demo-top-item">
                    <span class="demo-top-label">TSP 版本</span>
                    <span class="demo-top-value">{{ tspVersionMeta?.label || '--' }}</span>
                  </div>
                </div>
              </div>

              <div class="summary-block">
                <h4>原始输入</h4>
                <div class="card-grid">
                  <div v-for="item in tspRawCards" :key="item.label" class="summary-card">
                    <div class="card-label">{{ item.label }}</div>
                    <div class="card-value">{{ item.value }}</div>
                  </div>
                </div>
              </div>

              <div class="summary-block">
                <div class="summary-heading">
                  <h4>第一阶段</h4>
                  <span class="section-tip">仅非缺失样本进入评分扰动</span>
                </div>
                <div v-if="tspSimulationResult?.stageOneSkipped" class="tsp-skip-panel">
                  <div class="tsp-skip-title">第一阶段已跳过</div>
                  <div class="tsp-skip-desc">{{ tspSimulationResult.stageOneSkipReason }}</div>
                </div>
                <div v-else class="card-grid">
                  <div v-for="item in tspStageOneCards" :key="item.label" class="summary-card preview-card">
                    <div class="card-label">{{ item.label }}</div>
                    <div class="card-value">{{ item.value }}</div>
                  </div>
                </div>
              </div>

              <div class="summary-block">
                <div class="summary-heading">
                  <h4>第二阶段</h4>
                  <span class="section-tip">统一域 {0,1,2,3,4,5} 上报扰动</span>
                </div>
                <div class="card-grid">
                  <div v-for="item in tspStageTwoCards" :key="item.label" class="summary-card preview-card">
                    <div class="card-label">{{ item.label }}</div>
                    <div class="card-value">{{ item.value }}</div>
                  </div>
                </div>
              </div>

              <div class="summary-block">
                <div class="summary-heading">
                  <h4>最终上报结果</h4>
                  <span class="section-tip">两阶段输出汇总后的最终值</span>
                </div>
                <div class="card-grid">
                  <div v-for="item in tspFinalReportCards" :key="item.label" class="summary-card preview-card">
                    <div class="card-label">{{ item.label }}</div>
                    <div class="card-value">{{ item.value }}</div>
                  </div>
                </div>
                <div class="preview-tip">{{ processPreviewTip }}</div>
                <div v-if="!tspParametersReady" class="preview-tip">
                  当前任务尚未在管理端完成 TSP 参数保存，暂时无法执行两阶段扰动演示。
                </div>
                <div class="action-row">
                  <el-button type="primary" @click="simulateCurrentTaskOnce" :disabled="!canRunSingleSimulation">
                    {{ currentSimulationResult ? '重新执行一次扰动' : '执行一次扰动' }}
                  </el-button>
                  <el-button type="success" @click="submitData" :loading="submitting" :disabled="!canSubmitCurrentTask">
                    提交上报
                  </el-button>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="summary-block">
                <h4>任务摘要</h4>
                <div class="demo-top-card">
                  <div class="demo-top-item">
                    <span class="demo-top-label">任务 ID：  </span>
                    <span class="demo-top-value">{{ currentTaskDetail?.taskId || '--' }}</span>
                  </div>
                  <div class="demo-top-item">
                    <span class="demo-top-label">协议：  </span>
                    <span class="demo-top-value">{{ currentTaskDetail?.protocol || '--' }}</span>
                  </div>
                  <div class="demo-top-item">
                    <span class="demo-top-label">隐私预算 ε：  </span>
                    <span class="demo-top-value">{{ displayEpsilon }}</span>
                  </div>
                </div>
              </div>

              <div class="summary-block">
                  <h4>原始输入</h4>
                <div class="card-grid">
                  <div v-for="item in singleRawCards" :key="item.label" class="summary-card">
                    <div class="card-label">{{ item.label }}</div>
                    <div class="card-value">{{ item.value }}</div>
                  </div>
                </div>
              </div>

              <div class="summary-block">
                <div class="summary-heading">
                  <h4>扰动参数</h4>
                  <span class="section-tip">从管理端当前任务的已保存配置中读取</span>
                </div>
                <div class="card-grid">
                  <div v-for="item in parameterCards" :key="item.label" class="summary-card">
                    <div class="card-label">{{ item.label }}</div>
                    <div class="card-value">{{ item.value }}</div>
                  </div>
                </div>
                <div v-if="currentPerturbationStatus" class="perturbation-status-banner" :class="`is-${currentPerturbationStatus.statusKey}`">
                  <div class="perturbation-status-title">{{ currentPerturbationStatus.title }}</div>
                  <div class="perturbation-status-desc">{{ currentPerturbationStatus.description }}</div>
                </div>
                <div v-if="(currentTaskDetail?.scenario === 'arr' && !arrParametersReady) || (currentTaskDetail?.scenario === 'agrr' && !agrrParametersReady)" class="preview-tip">
                  当前任务尚未在管理端完成 {{ currentTaskDetail?.protocol }} 参数保存，暂时无法执行本地扰动。
                </div>
              </div>
              <div class="summary-block">
                <div class="summary-heading">
                  <h4>扰动结果</h4>
                  <span class="section-tip">同一原始值下可重复随机模拟</span>
                </div>
                <div class="card-grid">
                  <div v-for="item in resultCards" :key="item.label" class="summary-card preview-card">
                    <div class="card-label">{{ item.label }}</div>
                    <div class="card-value">{{ item.value }}</div>
                  </div>
                </div>
                <div class="preview-tip">
                  <template v-if="currentTaskDetail?.scenario === 'agrr'">
                    AGRR 会先对原始分钟数做分档，再按当前档位编码值与参数 p、q 执行一次本地随机扰动。
                  </template>
                  <template v-else>
                    ARR 会按当前原始编码值与参数 p、q 进行一次本地随机扰动，再生成本次上报值。
                  </template>
                </div>
              </div>

              <div class="summary-block">
                <div class="summary-heading">
                  <h4>操作区</h4>
                  <span class="section-tip">先执行一次扰动，再提交上报</span>
                </div>
                <div class="action-row">
                  <el-button type="primary" @click="simulateCurrentTaskOnce" :disabled="!canRunSingleSimulation">
                    {{ currentSimulationResult ? '重新执行一次扰动' : '执行一次扰动' }}
                  </el-button>
                  <el-button type="success" @click="submitData" :loading="submitting" :disabled="!canSubmitCurrentTask">
                    提交上报
                  </el-button>
                </div>
              </div>
            </template>
          </template>

          <template v-else>
            <div class="summary-block">
              <div class="summary-heading summary-heading--with-action">
                <div class="summary-heading__copy">
                  <h4>连续采集结果</h4>
                  <span class="section-tip">展示健康手环连续采集并重复执行 {{ currentTaskDetail?.protocol || '--' }} 的汇总结果</span>
                </div>
                <el-button
                  v-if="currentTaskDetail?.scenario === 'aoue'"
                  plain
                  class="aoue-expand-trigger"
                  @click="openAoueBatchExpandedDialog"
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
                <template v-if="currentTaskDetail?.scenario === 'aoue'">
                  <AoueBatchCollectionPanel :batch="aoueBatchViewModel" />
                  <el-dialog
                    v-model="aoueBatchExpandedVisible"
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

                  <div v-if="currentPerturbationStatus" class="perturbation-status-banner perturbation-status-banner--batch" :class="`is-${currentPerturbationStatus.statusKey}`">
                    <div class="perturbation-status-title">{{ currentPerturbationStatus.title }}</div>
                    <div class="perturbation-status-desc">{{ currentPerturbationStatus.description }}</div>
                  </div>

                  <section class="tsp-batch-card tsp-batch-card--actions">
                    <div class="tsp-action-copy">
                      <div class="tsp-action-title">批量上报</div>
                      <div class="tsp-action-desc">将当前这批 AOUE 连续采集样本写入管理端提交数据，保留现有上报格式与字段。</div>
                      <div v-if="batchUploadState && batchUploadState.batchId === currentBatchResult.batchId" class="tsp-action-status">
                        本次上报状态：{{ batchUploadState.status }}，记录数：{{ batchUploadState.count }}
                      </div>
                    </div>
                    <div class="tsp-action-buttons">
                      <el-button @click="runBatchSimulation">重新生成样本</el-button>
                      <el-button
                        type="primary"
                        @click="uploadCurrentBatchResult"
                        :disabled="!currentBatchResult || batchUploadState?.batchId === currentBatchResult.batchId"
                      >
                        上报本次连续采集结果
                      </el-button>
                    </div>
                  </section>
                </template>

                <template v-else-if="currentTaskDetail?.scenario === 'tsp'">
                  <div class="tsp-batch-layout">
                    <section class="tsp-batch-card tsp-batch-card--stats">
                      <div class="summary-heading">
                        <div class="summary-heading__copy">
                          <h4>TSP 批量摘要</h4>
                          <span class="section-tip">连续采集后的总体统计，突出最终上报结果</span>
                        </div>
                      </div>
                      <div class="tsp-stat-grid">
                        <div class="tsp-stat-card">
                          <div class="tsp-stat-label">总样本数</div>
                          <div class="tsp-stat-value">{{ currentBatchResult?.totalRuns ?? 0 }}</div>
                        </div>
                        <div class="tsp-stat-card">
                          <div class="tsp-stat-label">缺失样本数</div>
                          <div class="tsp-stat-value">{{ currentBatchResult?.rawMissingCounts?.missing ?? 0 }}</div>
                        </div>
                        <div class="tsp-stat-card">
                          <div class="tsp-stat-label">有效样本数</div>
                          <div class="tsp-stat-value">{{ currentBatchResult?.rawMissingCounts?.nonMissing ?? 0 }}</div>
                        </div>
                        <div class="tsp-stat-card tsp-stat-card--accent">
                          <div class="tsp-stat-label">最终上报数</div>
                          <div class="tsp-stat-value">{{ currentBatchResult?.samples?.length ?? 0 }}</div>
                        </div>
                      </div>
                      <div class="tsp-batch-note">{{ currentBatchResultTip }}</div>
                    </section>

                    <section class="tsp-batch-card tsp-batch-card--table">
                      <div class="summary-heading">
                        <div class="summary-heading__copy">
                          <h4>样本预览</h4>
                          <span class="section-tip">展示前 10 条连续采集样本，重点标记最终上报值</span>
                        </div>
                      </div>
                      <div class="tsp-table-wrap">
                        <table class="tsp-preview-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>缺失状态</th>
                              <th>原始评分</th>
                              <th>阶段一结果</th>
                              <th>阶段二输入</th>
                              <th>最终上报</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="row in currentBatchPreviewRows" :key="row.index">
                              <td class="tsp-col-index">{{ row.index }}</td>
                              <td>
                                <span :class="['tsp-status-chip', row.rawMissing === 1 ? 'is-muted' : 'is-success']">
                                  {{ row.rawMissing === 1 ? '缺失' : '非缺失' }}
                                </span>
                              </td>
                              <td>
                                <span v-if="row.rawMissing === 1" class="tsp-status-chip is-muted">--</span>
                                <span v-else class="tsp-cell-text">{{ row.rawScoreDisplay }}</span>
                              </td>
                              <td>
                                <span :class="['tsp-status-chip', row.stageOneSkipped ? 'is-warning' : 'is-success']">
                                  {{ row.stageOneSkipped ? '已跳过' : row.stageOneLabel }}
                                </span>
                              </td>
                              <td>
                                <span :class="['tsp-status-chip', row.stageTwoInput === 0 ? 'is-muted' : 'is-success']">
                                  {{ row.stageTwoInputDisplay }}
                                </span>
                              </td>
                              <td class="tsp-col-report">
                                <span :class="['tsp-report-pill', row.reportValue === 0 ? 'is-muted' : 'is-accent']">
                                  {{ row.reportValueDisplay }}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section class="tsp-batch-card tsp-batch-card--actions">
                      <div class="tsp-action-copy">
                        <div class="tsp-action-title">批量上报</div>
                        <div class="tsp-action-desc">将当前这批 TSP 连续采集样本写入管理端提交数据，保留现有上报格式与字段。</div>
                        <div v-if="batchUploadState && batchUploadState.batchId === currentBatchResult.batchId" class="tsp-action-status">
                          本次上报状态：{{ batchUploadState.status }}，记录数：{{ batchUploadState.count }}
                        </div>
                      </div>
                      <div class="tsp-action-buttons">
                        <el-button @click="runBatchSimulation">重新生成样本</el-button>
                        <el-button
                          type="primary"
                          @click="uploadCurrentBatchResult"
                          :disabled="!currentBatchResult || batchUploadState?.batchId === currentBatchResult.batchId"
                        >
                          上报本次连续采集结果
                        </el-button>
                      </div>
                    </section>
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
                  <div v-if="currentPerturbationStatus" class="perturbation-status-banner perturbation-status-banner--batch" :class="`is-${currentPerturbationStatus.statusKey}`">
                    <div class="perturbation-status-title">{{ currentPerturbationStatus.title }}</div>
                    <div class="perturbation-status-desc">{{ currentPerturbationStatus.description }}</div>
                  </div>

                  <section class="tsp-batch-card tsp-batch-card--actions">
                    <div class="tsp-action-copy">
                      <div class="tsp-action-title">批量上报</div>
                      <div class="tsp-action-desc">将当前这批 {{ currentTaskDetail?.protocol || '--' }} 连续采集样本写入管理端提交数据，保留现有上报格式与字段。</div>
                      <div v-if="batchUploadState && batchUploadState.batchId === currentBatchResult.batchId" class="tsp-action-status">
                        本次上报状态：{{ batchUploadState.status }}，记录数：{{ batchUploadState.count }}
                      </div>
                    </div>
                    <div class="tsp-action-buttons">
                      <el-button @click="runBatchSimulation">重新生成样本</el-button>
                      <el-button
                        type="primary"
                        @click="uploadCurrentBatchResult"
                        :disabled="!currentBatchResult || batchUploadState?.batchId === currentBatchResult.batchId"
                      >
                        上报本次连续采集结果
                      </el-button>
                    </div>
                  </section>

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
        </template>

        <template v-else>
          <div class="demo-top-card">
            <div class="demo-top-item">
              <span class="demo-top-label">任务 ID</span>
              <span class="demo-top-value">{{ currentTaskDetail?.taskId || '--' }}</span>
            </div>
            <div class="demo-top-item">
              <span class="demo-top-label">协议</span>
              <span class="demo-top-value">{{ currentTaskDetail?.protocol || '--' }}</span>
            </div>
            <div class="demo-top-item">
              <span class="demo-top-label">隐私预算 ε</span>
              <span class="demo-top-value">{{ displayEpsilon }}</span>
            </div>
          </div>

          <div class="summary-block">
            <h4>原始值</h4>
            <div v-if="!currentTaskDetail" class="empty-box">
              <p>当前尚未选择任务。</p>
            </div>
            <div v-else class="card-grid">
              <div v-for="item in rawSummaryCards" :key="item.label" class="summary-card">
                <div class="card-label">{{ item.label }}</div>
                <div class="card-value">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <div class="summary-block">
            <h4>处理预览</h4>
            <div v-if="!currentTaskDetail" class="empty-box">
              <p>选择任务后，这里会同步展示当前输入对应的原始处理链路。</p>
            </div>
            <div v-else class="card-grid">
              <div v-for="item in processPreviewCards" :key="item.label" class="summary-card preview-card">
                <div class="card-label">{{ item.label }}</div>
                <div class="card-value">{{ item.value }}</div>
              </div>
            </div>
            <div v-if="currentTaskDetail" class="preview-tip">
              {{ processPreviewTip }}
            </div>
            <div class="action-row" v-if="currentTaskDetail">
              <el-button type="success" @click="submitData" :loading="submitting" :disabled="!canSubmitCurrentTask">
                提交上报
              </el-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowDown, FullScreen } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import AoueDemoPanel from '../../components/AoueDemoPanel.vue';
import AoueBatchCollectionPanel from '../../components/AoueBatchCollectionPanel.vue';
import { useAoueAnimation } from '../../composables/useAoueAnimation';
import { useUserStore } from '../../store/user';
import { useTaskStore } from '../../store/task';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import { AGRR, ARR, aggregateAOUE, applyTSP, perturbAOUEWithDetails } from '../../utils/ldpAlgorithms';
import { STAND_BUCKET_ORDER, STEP_BUCKET_ORDER } from '../../utils/constants';
import {
  STAND_DURATION_BUCKET_RULES,
  createEmptyStandBucketCounts,
  getStandBucketCode,
  getStandBucketCodeByMinutes,
  getStandBucketLabelByCode,
  getStandDurationBucket,
  normalizeStandBucketCounts
} from '../../utils/standDurationBuckets';
import {
  STEPS_BUCKET_RULES,
  createEmptyStepsBucketCounts,
  explainPerturbedVector,
  getStepsBucket,
  getStepsBucketCode,
  getStepsBucketCodeBySteps,
  getStepsBucketLabelByCode,
  normalizeStepsBucketCounts
} from '../../utils/stepsBuckets';
import { getPerturbationStatus } from '../../utils/perturbationStatus';
import {
  getTspEmpiricalDistribution,
  sampleTspRawRecordByDistribution,
  sampleTspRawRecordFromDistribution
} from '../../utils/tspEmpiricalDistribution';
import { getTspVersionMeta, resolveTspTaskConfig } from '../../utils/tspProtocol.js';
import {
  CONDITION_DISTRIBUTION_KEYS,
  sampleObservedValue
} from '../../utils/conditionDistributionPresets.js';

const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const user = computed(() => userStore.user);
const currentTaskId = ref('');
const submitting = ref(false);
const systemStatus = ref(0);
const formTouched = ref(false);
const arrSimulationResult = ref(null);
const arrBatchResult = ref(null);
const agrrSimulationResult = ref(null);
const agrrBatchResult = ref(null);
const tspSimulationResult = ref(null);
const tspBatchResult = ref(null);
const aoueSimulationResult = ref(null);
const aoueBatchResult = ref(null);
const aoueLogExpanded = ref(false);
const aoueBatchLogExpanded = ref(false);
const aoueExpandedVisible = ref(false);
const aoueBatchExpandedVisible = ref(false);
const batchSimulationCount = ref(200);
const batchSimulationRunning = ref(false);
const activeDemoTab = ref('single');
const batchUploadState = ref(null);
const standDurationBucketRules = STAND_DURATION_BUCKET_RULES;
const {
  playMode: aouePlayMode,
  animationStage: aoueAnimationStage,
  stepDelayMs: aoueStepDelayMs,
  currentBitIndex: aoueCurrentBitIndex,
  encodingStepIndex: aoueEncodingStepIndex,
  originalVector: aoueOriginalVector,
  encodingVector: aoueEncodingVector,
  resultVector: aoueAnimatedResultVector,
  bitSteps: aoueBitSteps,
  isPaused: aoueAnimationPaused,
  currentBitStep: aoueCurrentBitStep,
  completedBitsCount: aoueCompletedBitsCount,
  hasPreparedAnimation: hasPreparedAoueAnimation,
  hasCompletedPerturbation: aoueHasCompletedPerturbation,
  targetBitIndex: aoueTargetBitIndex,
  prepareAnimation: prepareAoueAnimation,
  advanceDemo: advanceAoueDemo,
  startAutoPlayback: startAoueAutoPlayback,
  startManualPlayback: startAoueManualPlayback,
  pausePlayback: pauseAouePlayback,
  resumeAutoPlayback: resumeAoueAutoPlayback,
  resetProgress: resetAoueDemoProgress,
  clearAnimation: resetAoueAnimation
} = useAoueAnimation();

const dynamicForm = reactive({
  fallAlarm: 0,
  standMinutes: null,
  dailySteps: null,
  sleepMissing: 0,
  sleepScore: 3
});

const taskList = computed(() => taskStore.taskList.map(task => ({ id: task.id })));
const currentTask = computed(() => taskStore.taskList.find(task => task.id === currentTaskId.value) || null);

const currentTaskAttribute = computed(() => {
  const task = currentTask.value;
  if (!task?.attributes?.length) return null;

  const supportedNames = ['是否触发睡眠异常提醒', '日均站立时长分档', '每日步数分桶', '睡眠质量评分'];
  return (
    task.attributes.find(attribute => supportedNames.includes(attribute.name) && attribute.isProtected) ||
    task.attributes.find(attribute => supportedNames.includes(attribute.name) && attribute.status === '已配置') ||
    task.attributes.find(attribute => supportedNames.includes(attribute.name)) ||
    null
  );
});

const currentTaskDetail = computed(() => {
  const task = currentTask.value;
  const attribute = currentTaskAttribute.value;
  if (!task || !attribute) return null;

  const map = {
    '是否触发睡眠异常提醒': {
      scenario: 'arr',
      title: '是否触发睡眠异常提醒',
      protocol: 'ARR',
      mode: '间接隐私风险'
    },
    '日均站立时长分档': {
      scenario: 'agrr',
      title: '日均站立时长分档',
      protocol: 'AGRR',
      mode: '间接隐私风险'
    },
    '每日步数分桶': {
      scenario: 'aoue',
      title: '每日步数分桶',
      protocol: 'AOUE',
      mode: '间接隐私风险'
    },
    '睡眠质量评分': {
      scenario: 'tsp',
      title: '睡眠质量评分',
      protocol: 'TSP',
      mode: '混合隐私风险'
    }
  };

  return {
    ...map[attribute.name],
    taskId: task.id,
    epsilon: task.privacyBudget ?? '--'
  };
});

const currentAttributeConfig = computed(() => {
  const attribute = currentTaskAttribute.value;
  if (!attribute?.id) return null;
  return currentTask.value?.configSnapshot || attributeConfigStore.getConfigById(attribute.id);
});

const arrConfigParams = computed(() => {
  if (currentTaskDetail.value?.scenario !== 'arr') return null;
  const calibratedParams = currentAttributeConfig.value?.calibratedParams;
  if (!calibratedParams) return null;

  const p = Number(calibratedParams.p);
  const q = Number(calibratedParams.q);
  if (!Number.isFinite(p) || !Number.isFinite(q)) return null;

  return {
    p,
    q,
    epsilon: currentAttributeConfig.value?.epsilon ?? currentTaskDetail.value?.epsilon ?? '--'
  };
});

const agrrConfigParams = computed(() => {
  if (currentTaskDetail.value?.scenario !== 'agrr') return null;
  const calibratedParams = currentAttributeConfig.value?.calibratedParams;
  if (!calibratedParams) return null;

  const p = Number(calibratedParams.p);
  const q = Number(calibratedParams.q);
  if (!Number.isFinite(p) || !Number.isFinite(q)) return null;

  return {
    p,
    q,
    epsilon: currentAttributeConfig.value?.epsilon ?? currentTaskDetail.value?.epsilon ?? '--',
    d: STAND_BUCKET_ORDER.length
  };
});

const aoueConfigParams = computed(() => {
  if (currentTaskDetail.value?.scenario !== 'aoue') return null;
  const calibratedParams = currentAttributeConfig.value?.calibratedParams;
  if (!calibratedParams) return null;

  const p = Number(calibratedParams.p);
  const q = Number(calibratedParams.q);
  if (!Number.isFinite(p) || !Number.isFinite(q)) return null;

  return {
    p,
    q,
    epsilon: currentAttributeConfig.value?.epsilon ?? currentTaskDetail.value?.epsilon ?? '--',
    d: STEP_BUCKET_ORDER.length
  };
});

const tspConfigParams = computed(() => {
  if (currentTaskDetail.value?.scenario !== 'tsp') return null;
  const snapshot = currentAttributeConfig.value;
  if (!snapshot) return null;

  const resolved = resolveTspTaskConfig(snapshot, Number(snapshot?.calibratedParams?.d ?? 5));

  if (![resolved.p1, resolved.q1, resolved.p2, resolved.q2, resolved.unifiedDomainSize].every(Number.isFinite)) {
    return null;
  }

  return resolved;
});

const arrParametersReady = computed(() => Boolean(arrConfigParams.value));
const agrrParametersReady = computed(() => Boolean(agrrConfigParams.value));
const aoueParametersReady = computed(() => Boolean(aoueConfigParams.value));
const tspParametersReady = computed(() => Boolean(tspConfigParams.value));
const arrPerturbationStatus = computed(() => getPerturbationStatus('ARR', arrConfigParams.value));
const agrrPerturbationStatus = computed(() => getPerturbationStatus('AGRR', agrrConfigParams.value));
const aouePerturbationStatus = computed(() => getPerturbationStatus('AOUE', aoueConfigParams.value));
const tspVersionMeta = computed(() => {
  if (currentTaskDetail.value?.scenario !== 'tsp' || !tspConfigParams.value) {
    return null;
  }

  return getTspVersionMeta(tspConfigParams.value.version);
});
const tspVersionNotice = computed(() => {
  if (!tspVersionMeta.value) return '';
  return '当前任务按统一总隐私预算 ε 求解两阶段参数。';
});
const currentPerturbationStatus = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrPerturbationStatus.value;
  }
  if (currentTaskDetail.value?.scenario === 'arr') {
    return arrPerturbationStatus.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aouePerturbationStatus.value;
  }
  return null;
});
const canSimulateArr = computed(() => currentTaskDetail.value?.scenario === 'arr' && formTouched.value && arrParametersReady.value);
const canSimulateAgrr = computed(() => (
  currentTaskDetail.value?.scenario === 'agrr'
  && formTouched.value
  && agrrParametersReady.value
  && Boolean(derivedStandBucket.value)
));
const canSimulateAoue = computed(() => (
  currentTaskDetail.value?.scenario === 'aoue'
  && formTouched.value
  && aoueParametersReady.value
  && Boolean(derivedStepsBucket.value)
));
const canSimulateTsp = computed(() => (
  currentTaskDetail.value?.scenario === 'tsp'
  && formTouched.value
  && tspParametersReady.value
  && (dynamicForm.sleepMissing === 1 || Number.isFinite(Number(dynamicForm.sleepScore)))
));
const canRunSingleSimulation = computed(() => {
  if (!currentTaskDetail.value) return false;
  if (currentTaskDetail.value.scenario === 'arr') {
    return canSimulateArr.value;
  }
  if (currentTaskDetail.value.scenario === 'agrr') {
    return canSimulateAgrr.value;
  }
  if (currentTaskDetail.value.scenario === 'aoue') {
    return canSimulateAoue.value;
  }
  if (currentTaskDetail.value.scenario === 'tsp') {
    return canSimulateTsp.value;
  }
  return formTouched.value;
});
const canRunBatchSimulation = computed(() => {
  if (!currentTaskDetail.value) return false;
  if (currentTaskDetail.value.scenario === 'arr') {
    return arrParametersReady.value && Number(batchSimulationCount.value) > 0;
  }
  if (currentTaskDetail.value.scenario === 'agrr') {
    return agrrParametersReady.value && Number(batchSimulationCount.value) > 0;
  }
  if (currentTaskDetail.value.scenario === 'aoue') {
    return aoueParametersReady.value && Number(batchSimulationCount.value) > 0;
  }
  if (currentTaskDetail.value.scenario === 'tsp') {
    return tspParametersReady.value && Number(batchSimulationCount.value) > 0;
  }
  return false;
});
const displayEpsilon = computed(() => {
  if (currentTaskDetail.value?.scenario === 'arr' && arrConfigParams.value) {
    return arrConfigParams.value.epsilon;
  }
  if (currentTaskDetail.value?.scenario === 'agrr' && agrrConfigParams.value) {
    return agrrConfigParams.value.epsilon;
  }
  if (currentTaskDetail.value?.scenario === 'aoue' && aoueConfigParams.value) {
    return aoueConfigParams.value.epsilon;
  }
  if (currentTaskDetail.value?.scenario === 'tsp' && tspConfigParams.value) {
    return tspConfigParams.value.epsilon;
  }
  return currentTaskDetail.value?.epsilon ?? '--';
});
const canSubmitCurrentTask = computed(() => {
  if (!currentTaskDetail.value) return false;
  if (currentTaskDetail.value.scenario === 'arr') {
    return Boolean(arrSimulationResult.value);
  }
  if (currentTaskDetail.value.scenario === 'agrr') {
    return Boolean(agrrSimulationResult.value);
  }
  if (currentTaskDetail.value.scenario === 'aoue') {
    return Boolean(aoueSimulationResult.value) && aoueAnimationStage.value === 'done';
  }
  if (currentTaskDetail.value.scenario === 'tsp') {
    return Boolean(tspSimulationResult.value);
  }
  return formTouched.value;
});

const statusText = computed(() => {
  if (systemStatus.value === 2) {
    return '已上报';
  }

  if (systemStatus.value === 1) {
    return '已扰动';
  }

  return '待扰动';
});

const statusColor = computed(() => {
  switch (systemStatus.value) {
    case 1:
      return 'yellow';
    case 2:
      return 'green';
    default:
      return 'red';
  }
});

const derivedStandBucket = computed(() => {
  return getStandDurationBucket(dynamicForm.standMinutes);
});

const derivedStandBucketCode = computed(() => {
  return getStandBucketCodeByMinutes(dynamicForm.standMinutes);
});

const derivedStepsBucket = computed(() => {
  return getStepsBucket(dynamicForm.dailySteps);
});

const derivedStepsBucketCode = computed(() => {
  return getStepsBucketCodeBySteps(dynamicForm.dailySteps);
});

const rawSummaryCards = computed(() => {
  if (!currentTaskDetail.value) return [];

  switch (currentTaskDetail.value.scenario) {
    case 'arr':
      return [
        { label: '原始提醒值', value: dynamicForm.fallAlarm === 1 ? '触发提醒' : '未触发提醒' }
      ];
    case 'agrr':
      return [
        { label: '原始分钟数', value: dynamicForm.standMinutes ?? '--' },
        { label: '映射分档', value: derivedStandBucket.value || '--' }
      ];
    case 'aoue':
      return [
        { label: '原始步数', value: dynamicForm.dailySteps ?? '--' },
        { label: '映射分桶', value: derivedStepsBucket.value || '--' }
      ];
    case 'tsp':
      return [
        { label: '缺失状态', value: dynamicForm.sleepMissing === 1 ? '缺失' : '非缺失' },
        { label: '睡眠质量评分', value: dynamicForm.sleepMissing === 1 ? '--' : dynamicForm.sleepScore ?? '--' }
      ];
    default:
      return [];
  }
});

const arrRawCards = computed(() => [
  { label: '当前用户原始值', value: dynamicForm.fallAlarm === 1 ? '触发提醒' : '未触发提醒' },
  { label: 'ARR 二元取值', value: '0 = 未触发提醒，1 = 触发提醒' },
  { label: '扰动前值', value: `${dynamicForm.fallAlarm}（${dynamicForm.fallAlarm === 1 ? '触发提醒' : '未触发提醒'}）` }
]);

const agrrRawCards = computed(() => [
  { label: '原始分钟数', value: dynamicForm.standMinutes ?? '--' },
  { label: '当前分档', value: derivedStandBucket.value || '--' },
  { label: '原始编码值', value: derivedStandBucketCode.value ? String(derivedStandBucketCode.value) : '--' }
]);

const aoueRawCards = computed(() => [
  { label: '原始步数', value: dynamicForm.dailySteps ?? '--' },
  { label: '当前分桶', value: derivedStepsBucket.value || '--' },
  { label: '原始编码值', value: derivedStepsBucketCode.value ? String(derivedStepsBucketCode.value) : '--' }
]);

const arrParameterCards = computed(() => [
  { label: 'p（保留原值概率）', value: arrParametersReady.value ? arrConfigParams.value.p.toFixed(4) : '--' },
  { label: 'q（翻转为相反值概率）', value: arrParametersReady.value ? arrConfigParams.value.q.toFixed(4) : '--' },
  {
    label: '扰动概率说明',
    value: arrParametersReady.value
      ? `以 p=${arrConfigParams.value.p.toFixed(4)} 保留扰动前值，以 q=${arrConfigParams.value.q.toFixed(4)} 翻转为另一个二元值`
      : '--'
  }
]);

const agrrParameterCards = computed(() => [
  { label: 'p（保留原档位概率）', value: agrrParametersReady.value ? agrrConfigParams.value.p.toFixed(4) : '--' },
  { label: 'q（扰动到其他档位概率）', value: agrrParametersReady.value ? agrrConfigParams.value.q.toFixed(4) : '--' }
]);

const aoueParameterCards = computed(() => [
  { label: 'p（保留位概率）', value: '0.5000' },
  { label: 'q（翻转位概率）', value: aoueParametersReady.value ? aoueConfigParams.value.q.toFixed(4) : '--' }
]);

const arrResultCards = computed(() => [
  {
    label: '扰动前值',
    value: `${dynamicForm.fallAlarm}（${dynamicForm.fallAlarm === 1 ? '触发提醒' : '未触发提醒'}）`
  },
  {
    label: '扰动后值',
    value: arrSimulationResult.value ? (arrSimulationResult.value.perturbedLabel) : '--'
  },
  {
    label: '上报值',
    value: arrSimulationResult.value ? String(arrSimulationResult.value.reportValue) : '--'
  },
  {
    label: '单次扰动过程',
    value: arrSimulationResult.value
      ? `输入 ${arrSimulationResult.value.rawValue}，输出 ${arrSimulationResult.value.reportValue}`
      : '点击“执行一次扰动”后展示本次 ARR 随机扰动结果'
  }
]);

const agrrResultCards = computed(() => [
  {
    label: '扰动后档位',
    value: agrrSimulationResult.value ? agrrSimulationResult.value.perturbedLabel : '--'
  },
  {
    label: '上报值',
    value: agrrSimulationResult.value ? String(agrrSimulationResult.value.reportValue) : '--'
  }
]);

const aoueResultCards = computed(() => [
  {
    label: '初始编码向量',
    value: aoueSimulationResult.value ? aoueSimulationResult.value.encodedValueDisplay : '--'
  },
  {
    label: '扰动后编码向量说明',
    value: aoueSimulationResult.value ? aoueSimulationResult.value.perturbedLabel : '--'
  },
  {
    label: '扰动后编码向量',
    value: aoueSimulationResult.value ? aoueSimulationResult.value.reportValueDisplay : '--'
  }
]);

const tspRawCards = computed(() => [
  { label: '缺失状态', value: dynamicForm.sleepMissing === 1 ? '缺失（M=1）' : '非缺失（M=0）' },
  { label: '睡眠质量评分', value: dynamicForm.sleepMissing === 1 ? '--' : dynamicForm.sleepScore ?? '--' }
]);

const tspStageOneCards = computed(() => [
  { label: '第一阶段输入', value: tspSimulationResult.value?.stageOneInputDisplay || '--' },
  { label: '总隐私预算 ε', value: tspParametersReady.value ? String(tspConfigParams.value.epsilon) : '--' },
  { label: '第一阶段值域', value: 'd = 5，对应 {1,2,3,4,5}' },
  { label: '参数 p1', value: tspParametersReady.value ? tspConfigParams.value.p1.toFixed(4) : '--' },
  { label: '参数 q1', value: tspParametersReady.value ? tspConfigParams.value.q1.toFixed(4) : '--' },
  { label: '归一约束', value: 'p1 + (d - 1)q1 = 1' },
  { label: '第一阶段扰动结果', value: tspSimulationResult.value?.stageOneLabel || '--' }
]);

const tspStageTwoCards = computed(() => [
  { label: '第二阶段输入', value: tspSimulationResult.value?.stageTwoInputDisplay ?? '--' },
  { label: 'TSP 版本', value: tspParametersReady.value ? tspVersionMeta.value?.label || '--' : '--' },
  { label: '第二阶段值域', value: 'd + 1 = 6，对应 {0,1,2,3,4,5}' },
  { label: '参数 p2', value: tspParametersReady.value ? tspConfigParams.value.p2.toFixed(4) : '--' },
  { label: '参数 q2', value: tspParametersReady.value ? tspConfigParams.value.q2.toFixed(4) : '--' },
  { label: '归一约束', value: 'p2 + dq2 = 1' },
  { label: '第二阶段扰动结果', value: tspSimulationResult.value?.stageTwoLabel || '--' }
]);

const tspFinalReportCards = computed(() => [
  { label: '最终上报值', value: tspSimulationResult.value?.reportValueDisplay || '--' },
  { label: '上报缺失状态', value: tspSimulationResult.value?.reportMissingLabel || '--' },
  { label: '上报评分', value: tspSimulationResult.value?.reportScoreDisplay ?? '--' }
]);

const aoueAnimationReady = computed(() => (
  currentTaskDetail.value?.scenario === 'aoue'
  && Boolean(aoueSimulationResult.value)
  && hasPreparedAoueAnimation.value
));

function analyzeAoueVector(vector = []) {
  const oneBitIndices = [];
  vector.forEach((bit, index) => {
    if (bit === 1) {
      oneBitIndices.push(index);
    }
  });

  const oneBitItems = oneBitIndices.map(index => ({
    index,
    bucketIndex: index + 1,
    bucketLabel: STEP_BUCKET_ORDER[index] || `第 ${index + 1} 桶`,
    display: STEP_BUCKET_ORDER[index]
      ? `b${index} = 1（${STEP_BUCKET_ORDER[index]}）`
      : `b${index} = 1`
  }));

  if (!oneBitItems.length) {
    return {
      resultType: 'none',
      resultTypeLabel: '全 0 向量',
      resultDescription: '扰动后编码向量全为 0（AOUE 合法输出）',
      oneBitItems
    };
  }

  if (oneBitItems.length === 1) {
    return {
      resultType: 'single',
      resultTypeLabel: '单个 bit 为 1',
      resultDescription: `扰动后编码向量：${oneBitItems[0].display}`,
      oneBitItems
    };
  }

  return {
    resultType: 'multi',
    resultTypeLabel: '多个 bit 为 1',
    resultDescription: `扰动后编码向量多个 bit 为 1：${oneBitItems.map(item => item.display).join('、')}`,
    oneBitItems
  };
}

function formatAoueVectorDisplay(vector = [], pendingSymbol = '?') {
  if (!Array.isArray(vector) || !vector.length) {
    return '--';
  }

  return `[${vector.map(bit => (bit == null ? pendingSymbol : bit)).join(', ')}]`;
}

const aoueResolvedResultVector = computed(() => {
  if (!aoueAnimationReady.value) {
    return [];
  }

  if (aoueAnimationStage.value === 'done') {
    return [...aoueAnimatedResultVector.value];
  }

  return aoueAnimatedResultVector.value.map(bit => (bit == null ? null : bit));
});

const aoueMetaCards = computed(() => [
  { label: '任务 ID', value: currentTaskDetail.value?.taskId || '--' },
  { label: '协议', value: currentTaskDetail.value?.protocol || '--' },
  { label: 'ε', value: String(displayEpsilon.value ?? '--') },
  { label: '原始步数', value: String(aoueSimulationResult.value?.rawSteps ?? dynamicForm.dailySteps ?? '--') },
  { label: '当前分桶', value: aoueSimulationResult.value?.rawLabel ?? derivedStepsBucket.value ?? '--' },
  { label: '原始编码值', value: String(aoueSimulationResult.value?.rawValue ?? derivedStepsBucketCode.value ?? '--') },
  { label: 'p', value: aoueParametersReady.value ? aoueConfigParams.value.p.toFixed(4) : '--' },
  { label: 'q', value: aoueParametersReady.value ? aoueConfigParams.value.q.toFixed(4) : '--' }
]);

const aouePlayModeText = computed(() => {
  const labelMap = {
    idle: '未选择播放模式',
    auto: aoueAnimationPaused.value ? '自动播放已暂停' : '自动播放',
    manual: '手动模式'
  };
  return labelMap[aouePlayMode.value] || '未选择播放模式';
});

const aoueAnimationStatusText = computed(() => {
  const labelMap = {
    idle: '未开始',
    bucketing: '原始值与分桶',
    encoding: '初始编码向量',
    perturbing: '逐位扰动中',
    done: '生成扰动后编码向量'
  };
  return labelMap[aoueAnimationStage.value] || '未开始';
});

const aoueFinalResultAnalysis = computed(() => analyzeAoueVector(aoueSimulationResult.value?.reportValue || []));

const aoueDisplayOriginalVector = computed(() => {
  if (!aoueAnimationReady.value) {
    return [];
  }

  if (aoueAnimationStage.value === 'encoding') {
    return [...aoueEncodingVector.value];
  }

  if (['perturbing', 'done'].includes(aoueAnimationStage.value)) {
    return [...aoueOriginalVector.value];
  }

  return new Array(aoueOriginalVector.value.length).fill(null);
});

const aoueOverviewVectorText = computed(() => {
  if (!aoueAnimationReady.value) {
    return '--';
  }

  if (aoueAnimationStage.value === 'done' && aoueSimulationResult.value) {
    return aoueSimulationResult.value.reportValueDisplay;
  }

  if (!['perturbing', 'done'].includes(aoueAnimationStage.value)) {
    return '待生成';
  }

  return formatAoueVectorDisplay(aoueResolvedResultVector.value, '?');
});

const aoueOverviewTypeText = computed(() => {
  if (!aoueAnimationReady.value) {
    return '等待生成样例';
  }

  if (aoueAnimationStage.value === 'idle') {
    return '等待选择播放模式';
  }

  if (aoueAnimationStage.value === 'bucketing') {
    return '阶段 1 / 4：原始值与分桶';
  }

  if (aoueAnimationStage.value === 'encoding') {
    if (aoueEncodingStepIndex.value === 0) {
      return '阶段 2 / 4：生成全 0 向量';
    }
    if (aoueEncodingStepIndex.value === 1) {
      return `阶段 2 / 4：高亮第 ${aoueTargetBitIndex.value + 1} 位`;
    }
    return `阶段 2 / 4：将第 ${aoueTargetBitIndex.value + 1} 位置为 1`;
  }

  if (aoueAnimationStage.value === 'perturbing') {
    const currentStep = Math.min(aoueCompletedBitsCount.value + 1, aoueBitSteps.value.length || 0);
    return currentStep > aoueBitSteps.value.length
      ? '阶段 4 / 4：生成扰动后编码向量'
      : `阶段 3 / 4：第 ${currentStep} / ${aoueBitSteps.value.length} 位`;
  }

  return aoueFinalResultAnalysis.value.resultTypeLabel;
});

const aoueOverviewVectorNoteText = computed(() => {
  if (!aoueAnimationReady.value) {
    return '先基于当前输入生成一组 AOUE 示例样本，再选择自动播放或手动模式。';
  }

  if (aoueAnimationStage.value === 'idle') {
    return '当前演示保持静止，等待你选择“自动播放”或“手动模式”。';
  }

  if (aoueAnimationStage.value === 'bucketing') {
    return `先根据原始步数 ${aoueSimulationResult.value?.rawSteps ?? '--'} 确定所在分桶 ${aoueSimulationResult.value?.rawLabel ?? '--'}。`;
  }

  if (aoueAnimationStage.value === 'encoding') {
    return `根据当前分桶位置，将长度为 d 的全 0 向量中第 ${aoueTargetBitIndex.value + 1} 位设为 1，得到初始编码向量。`;
  }

  if (aoueAnimationStage.value === 'perturbing') {
    return 'AOUE 会对初始编码向量的每一位独立采样，扰动后编码向量可以是全 0、单个 bit 为 1 或多个 bit 为 1。';
  }

  return aoueFinalResultAnalysis.value.resultDescription;
});

const aoueStepperItems = computed(() => {
  const stepStates = ['pending', 'pending', 'pending', 'pending'];

  if (!aoueAnimationReady.value) {
    return [
      { label: '原始值与分桶', state: stepStates[0] },
      { label: '初始编码向量', state: stepStates[1] },
      { label: '逐位扰动', state: stepStates[2] },
      { label: '生成扰动后编码向量', state: stepStates[3] }
    ];
  }

  if (aoueAnimationStage.value === 'bucketing') {
    stepStates[0] = 'active';
  } else if (aoueAnimationStage.value === 'encoding') {
    stepStates[0] = 'done';
    stepStates[1] = 'active';
  } else if (aoueAnimationStage.value === 'perturbing') {
    stepStates[0] = 'done';
    stepStates[1] = 'done';
    stepStates[2] = aoueHasCompletedPerturbation.value ? 'done' : 'active';
    stepStates[3] = aoueHasCompletedPerturbation.value ? 'active' : 'pending';
  } else if (aoueAnimationStage.value === 'done') {
    stepStates[0] = 'done';
    stepStates[1] = 'done';
    stepStates[2] = 'done';
    stepStates[3] = 'active';
  }

  return [
    { label: '原始值与分桶', state: stepStates[0] },
    { label: '初始编码向量', state: stepStates[1] },
    { label: '逐位扰动', state: stepStates[2] },
    { label: '生成扰动后编码向量', state: stepStates[3] }
  ];
});

const aoueCurrentDisplayStep = computed(() => {
  if (aoueAnimationStage.value !== 'perturbing') {
    return null;
  }

  if (aoueCurrentBitStep.value) {
    return aoueCurrentBitStep.value;
  }

  if (aoueCompletedBitsCount.value > 0) {
    return aoueBitSteps.value[aoueCompletedBitsCount.value - 1] || null;
  }

  return null;
});

const aoueCurrentDetailTitle = computed(() => {
  if (!aoueAnimationReady.value) {
    return '等待生成样例';
  }

  if (aoueAnimationStage.value === 'bucketing') {
    return '原始值与分桶';
  }

  if (aoueAnimationStage.value === 'encoding') {
    if (aoueEncodingStepIndex.value === 0) {
      return '初始编码向量：初始化';
    }
    if (aoueEncodingStepIndex.value === 1) {
      return '初始编码向量：定位目标位';
    }
    return '初始编码向量：置位完成';
  }

  if (aoueAnimationStage.value === 'perturbing' && aoueCurrentDisplayStep.value) {
    return `第 ${aoueCurrentDisplayStep.value.index} 位扰动`;
  }

  if (aoueAnimationStage.value === 'done') {
    return '最终上报结果';
  }

  return '等待开始';
});

const aoueVectorDetailText = computed(() => {
  if (!aoueAnimationReady.value) {
    return '点击左侧“执行单次扰动演示”或“生成示例输入”后，会先准备当前样例，但不会自动播放。';
  }

  if (aoueAnimationStage.value === 'idle') {
    return '当前样例已准备完成。请选择“自动播放”完整演示，或进入“手动模式”逐步推进。';
  }

  if (aoueAnimationStage.value === 'bucketing') {
    return `原始步数 = ${aoueSimulationResult.value?.rawSteps ?? '--'}，所属分桶 = ${aoueSimulationResult.value?.rawLabel ?? '--'}，原始编码值 = ${aoueSimulationResult.value?.rawValue ?? '--'}。`;
  }

  if (aoueAnimationStage.value === 'encoding') {
    if (aoueEncodingStepIndex.value === 0) {
      return `先创建一个长度为 d = ${aoueOriginalVector.value.length} 的全 0 向量，准备生成当前样本的初始编码向量。`;
    }

    if (aoueEncodingStepIndex.value === 1) {
      return `当前样本属于第 ${aoueTargetBitIndex.value + 1} 桶，正在高亮目标位，下一步会把这一位从 0 置为 1。`;
    }

    return `已将第 ${aoueTargetBitIndex.value + 1} 位设为 1，得到初始编码向量 ${formatAoueVectorDisplay(aoueDisplayOriginalVector.value, '0')}。`;
  }

  if (aoueAnimationStage.value === 'done' && aoueSimulationResult.value) {
    return `扰动后编码向量为 ${aoueSimulationResult.value.reportValueDisplay}，向量说明：${aoueSimulationResult.value.perturbedLabel}。`;
  }

  const step = aoueCurrentDisplayStep.value;
  if (!step) {
    return '下一步将继续执行 AOUE 的逐位扰动判断。';
  }
  return `第 ${step.index} 位：原始 bit = ${step.originalBit}，使用 ${step.originalBit === 1 ? 'p' : 'q'} = ${step.usedProbability.toFixed(4)}，随机数 = ${step.sampledRandom.toFixed(4)}，因此输出 ${step.resultBit}`;
});

const aoueVectorColumns = computed(() => (
  aoueOriginalVector.value.map((originalBit, index) => {
    const displayedOriginalBit = aoueDisplayOriginalVector.value[index] ?? null;
    const resultBit = aoueResolvedResultVector.value[index] ?? null;
    const isEncodingTarget = aoueAnimationStage.value === 'encoding'
      && aoueTargetBitIndex.value === index
      && aoueEncodingStepIndex.value >= 1;
    const isEncodingDone = aoueAnimationStage.value === 'encoding'
      && aoueTargetBitIndex.value === index
      && aoueEncodingStepIndex.value === 2;
    const isProcessing = aoueAnimationStage.value === 'perturbing' && aoueCurrentBitIndex.value === index;
    const isCompleted = resultBit != null;
    const state = isProcessing
      ? 'active'
      : isCompleted || isEncodingDone
        ? 'done'
        : isEncodingTarget
          ? 'encoding'
          : 'pending';
    const transitionKey = resultBit == null ? 'pending' : `${originalBit}${resultBit}`;

    return {
      index,
      bucketLabel: STEP_BUCKET_ORDER[index] || `第 ${index + 1} 桶`,
      originalBit,
      displayedOriginalBit,
      resultBit,
      state,
      isEncodingTarget,
      isEncodingDone,
      isProcessing,
      transitionKey,
      transitionLabel: resultBit == null ? '待处理' : `${originalBit}→${resultBit}`,
      transitionHint: resultBit == null
        ? '等待随机采样'
        : (
          transitionKey === '10' ? '真实位被翻转为 0'
            : transitionKey === '01' ? '非真实位被翻转为 1'
              : transitionKey === '11' ? '真实位保留为 1'
                : '非真实位保持为 0'
        ),
      hasChanged: resultBit != null && originalBit !== resultBit
    };
  })
));

const aoueStepLogRows = computed(() => (
  aoueBitSteps.value.map((step, index) => ({
    ...step,
    stageState: aoueAnimatedResultVector.value[index] == null
      ? (aoueCurrentBitIndex.value === index ? 'active' : 'pending')
      : (aoueCurrentBitIndex.value === index && aoueAnimationStage.value !== 'done' ? 'active' : 'done')
  }))
));

const aoueVisibleLogRows = computed(() => (
  aoueLogExpanded.value ? aoueStepLogRows.value : aoueStepLogRows.value.slice(-4)
));

const aoueLogToggleText = computed(() => (
  aoueLogExpanded.value ? '收起 bit 日志' : '查看全部 bit 日志'
));

const aoueAutoButtonText = computed(() => {
  return aoueAnimationPaused.value ? '继续自动播放' : '暂停自动播放';
});

const aoueCanStartAuto = computed(() => (
  aoueAnimationReady.value && aouePlayMode.value === 'idle'
));

const aoueCanStartManual = computed(() => (
  aoueAnimationReady.value && aouePlayMode.value === 'idle'
));

const aoueCanPauseAuto = computed(() => (
  aoueAnimationReady.value
  && aouePlayMode.value === 'auto'
  && !aoueAnimationPaused.value
  && !['idle', 'done'].includes(aoueAnimationStage.value)
));

const aoueCanResumeAuto = computed(() => (
  aoueAnimationReady.value
  && (
    (aouePlayMode.value === 'auto' && aoueAnimationPaused.value && aoueAnimationStage.value !== 'done')
    || (aouePlayMode.value === 'manual' && aoueAnimationStage.value !== 'done')
  )
));

const aoueCanStepManually = computed(() => (
  aoueAnimationReady.value
  && aouePlayMode.value === 'manual'
  && aoueAnimationStage.value !== 'done'
));

const aoueCanResetDemo = computed(() => aoueAnimationReady.value);

function openAoueExpandedDialog() {
  aoueExpandedVisible.value = true;
}

function openAoueBatchExpandedDialog() {
  aoueBatchExpandedVisible.value = true;
}

const aoueDemoViewModel = computed(() => ({
  metaCards: aoueMetaCards.value,
  currentPerturbationStatus: currentPerturbationStatus.value,
  parametersReady: aoueParametersReady.value,
  finalResultAnalysis: aoueFinalResultAnalysis.value,
  playMode: aouePlayMode.value,
  playModeText: aouePlayModeText.value,
  animationStatus: aoueAnimationStage.value,
  overviewTypeText: aoueOverviewTypeText.value,
  overviewVectorText: aoueOverviewVectorText.value,
  overviewVectorNoteText: aoueOverviewVectorNoteText.value,
  stepperItems: aoueStepperItems.value,
  animationReady: aoueAnimationReady.value,
  vectorColumns: aoueVectorColumns.value,
  animationStatusText: aoueAnimationStatusText.value,
  completedBitsCount: aoueCompletedBitsCount.value,
  bitStepsLength: aoueBitSteps.value.length,
  stepDelayMs: aoueStepDelayMs.value,
  currentDisplayStep: aoueCurrentDisplayStep.value,
  currentDetailTitle: aoueCurrentDetailTitle.value,
  vectorDetailText: aoueVectorDetailText.value,
  canGenerateSample: canRunSingleSimulation.value,
  canRunSingleSimulation: canRunSingleSimulation.value,
  canStartAuto: aoueCanStartAuto.value,
  canStartManual: aoueCanStartManual.value,
  canPauseAuto: aoueCanPauseAuto.value,
  canResumeAuto: aoueCanResumeAuto.value,
  autoButtonText: aoueAutoButtonText.value,
  canStepManually: aoueCanStepManually.value,
  canResetDemo: aoueCanResetDemo.value,
  canSubmitCurrentTask: canSubmitCurrentTask.value,
  submitting: submitting.value,
  logToggleText: aoueLogToggleText.value,
  visibleLogRows: aoueVisibleLogRows.value,
  onGenerate: replayAoueAnimation,
  onStartAuto: startAoueAutoMode,
  onStartManual: startAoueManualMode,
  onPause: pauseAoueAutoPlayback,
  onResumeAuto: resumeAoueAutoMode,
  onNext: handleAoueNextBit,
  onReset: resetPreparedAoueDemo,
  onSubmit: submitData,
  onToggleLog: toggleAoueLogPanel,
  onExpand: openAoueExpandedDialog
}));

const currentSimulationResult = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrSimulationResult.value;
  }
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return tspSimulationResult.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueSimulationResult.value;
  }
  return arrSimulationResult.value;
});

const singleRawCards = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrRawCards.value;
  }
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return tspRawCards.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueRawCards.value;
  }
  return arrRawCards.value;
});

const parameterCards = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrParameterCards.value;
  }
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return [
      { label: 'TSP 版本', value: tspVersionMeta.value?.label || '--' },
      { label: '总隐私预算 ε', value: tspParametersReady.value ? String(tspConfigParams.value.epsilon) : '--' },
      { label: '参数 p1', value: tspParametersReady.value ? tspConfigParams.value.p1.toFixed(4) : '--' },
      { label: '参数 q1', value: tspParametersReady.value ? tspConfigParams.value.q1.toFixed(4) : '--' },
      { label: '参数 p2', value: tspParametersReady.value ? tspConfigParams.value.p2.toFixed(4) : '--' },
      { label: '参数 q2', value: tspParametersReady.value ? tspConfigParams.value.q2.toFixed(4) : '--' }
    ];
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueParameterCards.value;
  }
  return arrParameterCards.value;
});

const resultCards = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrResultCards.value;
  }
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return tspFinalReportCards.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueResultCards.value;
  }
  return arrResultCards.value;
});

const currentBatchResult = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrBatchResult.value;
  }
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return tspBatchResult.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueBatchResult.value;
  }
  return arrBatchResult.value;
});

const arrBatchSummaryCards = computed(() => {
  if (!arrBatchResult.value) return [];
  return [
    { label: '本次连续采集次数', value: String(arrBatchResult.value.totalRuns) },
    { label: '当前任务名称', value: currentTaskDetail.value?.title || '--' },
    { label: '当前协议', value: currentTaskDetail.value?.protocol || '--' },
    { label: '原始“触发提醒”数量', value: String(arrBatchResult.value.rawCountOne) },
    { label: '原始“未触发提醒”数量', value: String(arrBatchResult.value.rawCountZero) },
    { label: '上报“触发提醒”数量', value: String(arrBatchResult.value.countOne) },
    { label: '上报“未触发提醒”数量', value: String(arrBatchResult.value.countZero) }
  ];
});

const agrrBatchSummaryCards = computed(() => {
  if (!agrrBatchResult.value) return [];
  return [
    { label: '样本总数', value: String(agrrBatchResult.value.totalRuns) },
    { label: '当前任务名称', value: currentTaskDetail.value?.title || '--' },
    { label: '当前协议', value: currentTaskDetail.value?.protocol || '--' }
  ];
});

const aoueBatchSummaryCards = computed(() => {
  if (!aoueBatchResult.value) return [];
  return [
    { label: '样本总数', value: String(aoueBatchResult.value.totalRuns) },
    { label: '当前任务名称', value: currentTaskDetail.value?.title || '--' },
    { label: '当前协议', value: currentTaskDetail.value?.protocol || '--' }
  ];
});

const tspBatchSummaryCards = computed(() => {
  if (!tspBatchResult.value) return [];
  return [
    { label: '本次连续采集次数', value: String(tspBatchResult.value.totalRuns) },
    { label: '当前任务名称', value: currentTaskDetail.value?.title || '--' },
    { label: '当前协议', value: currentTaskDetail.value?.protocol || '--' },
    { label: '隐私预算 ε', value: tspConfigParams.value ? String(tspConfigParams.value.epsilon) : '--' },
    { label: 'TSP 版本', value: tspConfigParams.value ? tspVersionMeta.value?.label || '--' : '--' },
    { label: 'α / β', value: tspConfigParams.value ? `${tspConfigParams.value.alpha.toFixed(4)} / ${tspConfigParams.value.beta.toFixed(4)}` : '--' }
  ];
});

const currentBatchSummaryCards = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrBatchSummaryCards.value;
  }
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return tspBatchSummaryCards.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueBatchSummaryCards.value;
  }
  return arrBatchSummaryCards.value;
});

const arrDistributionComparisonRows = computed(() => {
  if (!arrBatchResult.value) return [];
  const total = arrBatchResult.value.totalRuns || 1;
  const rows = [
    {
      status: '触发提醒',
      rawCount: arrBatchResult.value.rawCountOne,
      reportCount: arrBatchResult.value.countOne
    },
    {
      status: '未触发提醒',
      rawCount: arrBatchResult.value.rawCountZero,
      reportCount: arrBatchResult.value.countZero
    }
  ];

  return rows.map(row => {
    const delta = row.reportCount - row.rawCount;
    return {
      ...row,
      delta,
      deltaDisplay: delta > 0 ? `+${delta}` : `${delta}`,
      rawPercent: Number(((row.rawCount / total) * 100).toFixed(1)),
      reportPercent: Number(((row.reportCount / total) * 100).toFixed(1))
    };
  });
});

const agrrDistributionComparisonRows = computed(() => {
  if (!agrrBatchResult.value) return [];

  const total = agrrBatchResult.value.totalRuns || 1;
  return STAND_BUCKET_ORDER.map(bucket => {
    const rawCount = Number(agrrBatchResult.value.rawBucketCounts?.[bucket] ?? 0);
    const reportCount = Number(agrrBatchResult.value.reportBucketCounts?.[bucket] ?? 0);
    const delta = reportCount - rawCount;

    return {
      status: bucket,
      rawCount,
      reportCount,
      delta,
      deltaDisplay: delta > 0 ? `+${delta}` : `${delta}`,
      rawPercent: Number(((rawCount / total) * 100).toFixed(1)),
      reportPercent: Number(((reportCount / total) * 100).toFixed(1))
    };
  });
});

const aoueDistributionComparisonRows = computed(() => {
  if (!aoueBatchResult.value) return [];

  const total = aoueBatchResult.value.totalRuns || 1;
  return STEP_BUCKET_ORDER.map(bucket => {
    const rawCount = Number(aoueBatchResult.value.rawBucketCounts?.[bucket] ?? 0);
    const reportCount = Number(aoueBatchResult.value.reportBucketCounts?.[bucket] ?? 0);
    const delta = reportCount - rawCount;

    return {
      status: bucket,
      rawCount,
      reportCount,
      delta,
      deltaDisplay: delta > 0 ? `+${delta}` : `${delta}`,
      rawPercent: Number(((rawCount / total) * 100).toFixed(1)),
      reportPercent: Number(((reportCount / total) * 100).toFixed(1))
    };
  });
});

const currentDistributionComparisonRows = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrDistributionComparisonRows.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueDistributionComparisonRows.value;
  }
  return arrDistributionComparisonRows.value;
});

const tspDistributionGroups = computed(() => {
  if (!tspBatchResult.value) return [];

  const total = tspBatchResult.value.totalRuns || 1;
  const buildRows = (items, rawSource, reportSource) => items.map(item => {
    const rawCount = Number(rawSource[item.key] ?? 0);
    const reportCount = Number(reportSource[item.key] ?? 0);
    const delta = reportCount - rawCount;

    return {
      status: item.label,
      rawCount,
      reportCount,
      delta,
      deltaDisplay: delta > 0 ? `+${delta}` : `${delta}`,
      rawPercent: Number(((rawCount / total) * 100).toFixed(1)),
      reportPercent: Number(((reportCount / total) * 100).toFixed(1))
    };
  });

  return [
    {
      title: '缺失状态分布对比',
      rows: buildRows(
        [
          { key: 'missing', label: '缺失' },
          { key: 'nonMissing', label: '非缺失' }
        ],
        tspBatchResult.value.rawMissingCounts,
        tspBatchResult.value.reportMissingCounts
      )
    },
    {
      title: '评分分布对比（1~5）',
      rows: buildRows(
        [1, 2, 3, 4, 5].map(value => ({ key: String(value), label: `${value} 分` })),
        tspBatchResult.value.rawScoreCounts,
        tspBatchResult.value.reportScoreCounts
      )
    }
  ];
});

const currentDistributionGroups = computed(() => {
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return tspDistributionGroups.value;
  }

  return [
    {
      title: '扰动前后分布对比',
      rows: currentDistributionComparisonRows.value
    }
  ];
});

const arrBatchPreviewRows = computed(() => arrBatchResult.value?.samples?.slice(0, 10) || []);
const agrrBatchPreviewRows = computed(() => agrrBatchResult.value?.samples?.slice(0, 10) || []);
const tspBatchPreviewRows = computed(() => tspBatchResult.value?.samples?.slice(0, 10) || []);
const aoueBatchPreviewRows = computed(() => aoueBatchResult.value?.samples?.slice(0, 10) || []);
const currentBatchPreviewRows = computed(() => {
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return agrrBatchPreviewRows.value;
  }
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return tspBatchPreviewRows.value;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return aoueBatchPreviewRows.value;
  }
  return arrBatchPreviewRows.value;
});

const aoueBatchOriginalBitSums = computed(() => cloneBitArray(aoueBatchResult.value?.originalBitSums));
const aoueBatchPerturbedBitSums = computed(() => cloneBitArray(aoueBatchResult.value?.perturbedBitSums));

const aoueBatchEstimatedCounts = computed(() => {
  if (!aoueBatchResult.value?.samples?.length || !aoueParametersReady.value) {
    return [];
  }

  return aggregateAOUE(
    aoueBatchResult.value.samples.map(sample => sample.reportValue),
    aoueConfigParams.value.epsilon,
    STEP_BUCKET_ORDER.length,
    aoueConfigParams.value.p,
    aoueConfigParams.value.q
  ).map(value => Number(value));
});

const aoueBatchBitCompareItems = computed(() => {
  if (!aoueBatchOriginalBitSums.value.length || !aoueBatchPerturbedBitSums.value.length) {
    return [];
  }

  const maxOriginal = Math.max(...aoueBatchOriginalBitSums.value, 1);
  const maxPerturbed = Math.max(...aoueBatchPerturbedBitSums.value, 1);
  const rawPeak = Math.max(...aoueBatchOriginalBitSums.value);
  const reportPeak = Math.max(...aoueBatchPerturbedBitSums.value);

  return STEP_BUCKET_ORDER.map((bucketLabel, index) => {
    const originalCount = Number(aoueBatchOriginalBitSums.value[index] ?? 0);
    const perturbedCount = Number(aoueBatchPerturbedBitSums.value[index] ?? 0);
    const estimatedCount = Number(aoueBatchEstimatedCounts.value[index] ?? 0);

    return {
      index,
      bucketLabel,
      originalCount,
      perturbedCount,
      estimatedCount: estimatedCount.toFixed(2),
      originalPercent: Number(((originalCount / maxOriginal) * 100).toFixed(1)),
      perturbedPercent: Number(((perturbedCount / maxPerturbed) * 100).toFixed(1)),
      isRawPeak: rawPeak > 0 && originalCount === rawPeak,
      isReportedPeak: reportPeak > 0 && perturbedCount === reportPeak
    };
  });
});

const aoueBatchTopEstimatedBucket = computed(() => {
  if (!aoueBatchEstimatedCounts.value.length) {
    return null;
  }

  let maxIndex = 0;
  let maxValue = Number.NEGATIVE_INFINITY;
  aoueBatchEstimatedCounts.value.forEach((value, index) => {
    if (value > maxValue) {
      maxValue = value;
      maxIndex = index;
    }
  });

  return {
    index: maxIndex,
    label: STEP_BUCKET_ORDER[maxIndex] || `第 ${maxIndex + 1} 桶`,
    value: maxValue
  };
});

const aoueBatchEstimatedDistributionItems = computed(() => (
  STEP_BUCKET_ORDER.map((bucketLabel, index) => ({
    index,
    bucketLabel,
    estimatedCount: Number(aoueBatchEstimatedCounts.value[index] ?? 0).toFixed(2)
  }))
));

const aoueBatchVisiblePreviewRows = computed(() => {
  const rows = aoueBatchResult.value?.samples || [];
  const visibleCount = aoueBatchLogExpanded.value ? 10 : 4;
  return rows.slice(-visibleCount).reverse();
});

const aoueBatchLogToggleText = computed(() => (
  aoueBatchLogExpanded.value ? '收起最近样本明细' : '查看更多最近样本'
));

const aoueBatchViewModel = computed(() => ({
  progressText: aoueBatchResult.value
    ? `已完成 ${aoueBatchResult.value.completedRuns ?? aoueBatchResult.value.totalRuns} / ${aoueBatchResult.value.totalRuns} 轮`
    : '等待连续采集',
  completedRuns: Number(aoueBatchResult.value?.completedRuns ?? 0),
  totalRuns: Number(aoueBatchResult.value?.totalRuns ?? 0),
  domainSize: STEP_BUCKET_ORDER.length,
  latestRawLabel: aoueBatchResult.value?.latestRawLabel || '--',
  topEstimatedBucketText: aoueBatchTopEstimatedBucket.value
    ? `第 ${aoueBatchTopEstimatedBucket.value.index + 1} 桶`
    : '--',
  topEstimatedBucketDescription: aoueBatchTopEstimatedBucket.value
    ? `当前估计最高的桶为第 ${aoueBatchTopEstimatedBucket.value.index + 1} 桶（${aoueBatchTopEstimatedBucket.value.label}），估计值约为 ${aoueBatchTopEstimatedBucket.value.value.toFixed(2)}。`
    : '等待累计足够多的扰动样本后，再观察按位聚合得到的估计结果。',
  originalBitSumsDisplay: formatAoueVectorDisplay(aoueBatchOriginalBitSums.value, '0'),
  perturbedBitSumsDisplay: formatAoueVectorDisplay(aoueBatchPerturbedBitSums.value, '0'),
  bitCompareItems: aoueBatchBitCompareItems.value,
  latestOriginalVectorDisplay: formatAoueVectorDisplay(aoueBatchResult.value?.latestOriginalVector || [], '0'),
  latestReportedVectorDisplay: formatAoueVectorDisplay(aoueBatchResult.value?.latestReportedVector || [], '0'),
  estimatedDistributionItems: aoueBatchEstimatedDistributionItems.value,
  logToggleText: aoueBatchLogToggleText.value,
  visiblePreviewRows: aoueBatchVisiblePreviewRows.value,
  onToggleLog: toggleAoueBatchLogPanel
}));

const currentBatchResultTip = computed(() => {
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return '当前结果为手环端连续生成缺失/非缺失样本；非缺失样本先执行第一阶段评分扰动，随后所有样本统一进入 {0,1,2,3,4,5} 的第二阶段扰动并生成最终上报值。';
  }
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return `${currentPerturbationStatus.value?.description || '当前结果为手环端连续生成原始分钟数样本、映射到 4 档后，再执行 AGRR 本地扰动得到的统计结果。'} 原始分钟数仅用于映射分档，真正执行扰动与上报的是分档后的档位编码。`;
  }
  if (currentTaskDetail.value?.scenario === 'aoue') {
    return `${currentPerturbationStatus.value?.description || '当前结果为手环端连续生成原始步数样本并执行 AOUE 本地扰动。'} 原始步数先映射为初始编码向量，再逐位扰动为扰动后编码向量；下表展示了原始分布与扰动后编码向量累计分布的对比。`;
  }
  return currentPerturbationStatus.value?.description || '当前结果为手环端连续执行本地扰动后的统计结果，用于演示设备持续采集并立即本地上报的过程。';
});

const batchPreviewColumns = computed(() => {
  if (currentTaskDetail.value?.scenario === 'tsp') {
    return [
      { key: 'index', label: '#' },
      { key: 'rawMissingLabel', label: '原始缺失状态' },
      { key: 'rawScoreDisplay', label: '原始评分' },
      { key: 'stageOneLabel', label: '第一阶段结果' },
      { key: 'stageTwoInputDisplay', label: '第二阶段输入' },
      { key: 'reportValueDisplay', label: '最终上报值' }
    ];
  }
  if (currentTaskDetail.value?.scenario === 'agrr') {
    return [
      { key: 'index', label: '#' },
      { key: 'rawMinutes', label: '原始分钟数' },
      { key: 'rawLabel', label: '原始档位' },
      { key: 'perturbedLabel', label: '扰动后档位' },
      { key: 'reportValue', label: '上报值' }
    ];
  }

  if (currentTaskDetail.value?.scenario === 'aoue') {
    return [
      { key: 'index', label: '#' },
      { key: 'rawSteps', label: '原始步数' },
      { key: 'rawLabel', label: '原始分桶' },
      { key: 'perturbedLabel', label: '扰动后编码向量说明' },
      { key: 'reportValueDisplay', label: '扰动后编码向量' }
    ];
  }

  return [
    { key: 'index', label: '#' },
    { key: 'rawLabel', label: '原始值' },
    { key: 'rawValue', label: '原始编码' },
    { key: 'perturbedLabel', label: '扰动结果' },
    { key: 'reportValue', label: '上报值' }
  ];
});

const processPreviewCards = computed(() => {
  if (!currentTaskDetail.value) return [];

  switch (currentTaskDetail.value.scenario) {
    case 'arr':
      return [
        { label: '处理链路', value: '原始值 -> 扰动值（下一步接入）' },
        { label: '当前输入', value: dynamicForm.fallAlarm === 1 ? '触发提醒' : '未触发提醒' }
      ];
    case 'agrr':
      return [
        { label: '处理链路', value: '原始分钟数 -> 4 档映射 -> AGRR 扰动 -> 上报编码值' },
        { label: '当前分档', value: derivedStandBucket.value || '--' }
      ];
    case 'aoue':
      return [
        { label: '处理链路', value: '原始步数 -> 分桶 -> 初始编码向量 -> AOUE 逐位扰动 -> 扰动后编码向量' },
        { label: '当前分桶', value: derivedStepsBucket.value || '--' }
      ];
    case 'tsp':
      return [
        { label: '处理链路', value: '缺失状态/评分 -> 第一阶段 -> 第二阶段 -> 上报值（下一步接入）' },
        { label: '当前状态', value: dynamicForm.sleepMissing === 1 ? '仅上报缺失状态' : `评分 ${dynamicForm.sleepScore ?? '--'}` }
      ];
    default:
      return [];
  }
});

const processPreviewTip = computed(() => {
  if (!currentTaskDetail.value) return '';
  if (currentTaskDetail.value.scenario === 'agrr') {
    return '当前 AGRR 已接入单次扰动、连续采集和上报链路，扰动对象为分档后的档位，而不是原始分钟数。';
  }

  if (currentTaskDetail.value.scenario === 'aoue') {
    return '当前 AOUE 已按初始编码向量逐位独立扰动接入单次演示、连续采集与上报链路，展示结果与扰动后编码向量保持一致。';
  }

  return '当前优先完成 ARR 场景的本地扰动演示，其余协议的完整上报链路将在下一步继续接入。';
});

watch(currentTaskDetail, detail => {
  resetDynamicForm();
  clearSimulationState();
  batchUploadState.value = null;
  aoueExpandedVisible.value = false;
  aoueBatchExpandedVisible.value = false;
  if (detail) {
    systemStatus.value = 0;
    formTouched.value = false;
    activeDemoTab.value = 'single';
  }
});

watch(
  () => ({ ...dynamicForm }),
  () => {
    if (!currentTaskDetail.value || !formTouched.value) {
      return;
    }

    if (currentTaskDetail.value.scenario === 'arr') {
      arrSimulationResult.value = null;
      arrBatchResult.value = null;
      batchUploadState.value = null;
      systemStatus.value = 0;
      return;
    }

    if (currentTaskDetail.value.scenario === 'agrr') {
      agrrSimulationResult.value = null;
      agrrBatchResult.value = null;
      batchUploadState.value = null;
      systemStatus.value = 0;
      return;
    }

    if (currentTaskDetail.value.scenario === 'aoue') {
      aoueSimulationResult.value = null;
      aoueBatchResult.value = null;
      batchUploadState.value = null;
      systemStatus.value = 0;
      resetAoueAnimation();
      return;
    }

    if (currentTaskDetail.value.scenario === 'tsp') {
      tspSimulationResult.value = null;
      tspBatchResult.value = null;
      batchUploadState.value = null;
      systemStatus.value = 0;
      return;
    }

    systemStatus.value = 0;
  },
  { deep: true }
);

function resetDynamicForm() {
  dynamicForm.fallAlarm = 0;
  dynamicForm.standMinutes = null;
  dynamicForm.dailySteps = null;
  dynamicForm.sleepMissing = 0;
  dynamicForm.sleepScore = 3;
}

function clearSimulationState() {
  arrSimulationResult.value = null;
  arrBatchResult.value = null;
  agrrSimulationResult.value = null;
  agrrBatchResult.value = null;
  tspSimulationResult.value = null;
  tspBatchResult.value = null;
  aoueSimulationResult.value = null;
  aoueBatchResult.value = null;
  aoueLogExpanded.value = false;
  aoueBatchLogExpanded.value = false;
  resetAoueAnimation();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createEmptyBitArray(length) {
  return Array.from({ length }, () => 0);
}

function cloneBitArray(values = []) {
  return Array.isArray(values) ? values.map(value => Number(value) || 0) : [];
}

function randomValueInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function standMinutesFromActivityLabel(label) {
  const ranges = {
    低活动: [0, 119],
    中活动: [120, 239],
    高活动: [240, 480]
  };
  const [min, max] = ranges[label] || ranges.中活动;
  return randomValueInRange(min, max);
}

function dailyStepsFromBucketLabel(label) {
  const ranges = {
    低步数: [0, 3999],
    中低步数: [4000, 6999],
    中高步数: [7000, 9999],
    高步数: [10000, 16000]
  };
  const [min, max] = ranges[label] || ranges.中低步数;
  return randomValueInRange(min, max);
}

function waitForUiFrame(ms = 12) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

async function generateRandomExampleInput(scenario) {
  switch (scenario) {
    case 'arr':
      return {
        fallAlarm: sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.ARR_SLEEP_ALERT_AGE).observedValue === '触发提醒' ? 1 : 0
      };
    case 'agrr':
      return {
        standMinutes: standMinutesFromActivityLabel(
          sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.AGRR_ACTIVITY_BMI).observedValue
        )
      };
    case 'aoue':
      return {
        dailySteps: dailyStepsFromBucketLabel(
          sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.AOUE_STEPS_BMI).observedValue
        )
      };
    case 'tsp': {
      const sample = await sampleTspRawRecordByDistribution();
      return {
        sleepMissing: sample.rawMissing,
        sleepScore: sample.rawScore
      };
    }
    default:
      return {};
  }
}

async function refreshData() {
  if (!currentTaskDetail.value) return;

  let exampleInput = null;

  try {
    exampleInput = await generateRandomExampleInput(currentTaskDetail.value.scenario);
  } catch (error) {
    console.error('生成示例输入失败:', error);
    ElMessage.error('生成示例输入失败，请检查 TSP 基础样本数据');
    return;
  }

  switch (currentTaskDetail.value.scenario) {
    case 'arr':
      dynamicForm.fallAlarm = exampleInput.fallAlarm ?? 0;
      break;
    case 'agrr':
      dynamicForm.standMinutes = exampleInput.standMinutes ?? null;
      break;
    case 'aoue':
      dynamicForm.dailySteps = exampleInput.dailySteps ?? null;
      break;
    case 'tsp':
      dynamicForm.sleepMissing = exampleInput.sleepMissing ?? 0;
      dynamicForm.sleepScore = exampleInput.sleepScore ?? null;
      break;
  }

  formTouched.value = true;
  systemStatus.value = 0;
  // 生成示例输入后自动切换到单次扰动演示标签页
  activeDemoTab.value = 'single';
  clearSimulationState();
  batchUploadState.value = null;
  if (currentTaskDetail.value.scenario === 'arr' && arrParametersReady.value) {
    simulateArrPerturbation(false);
  }
  if (currentTaskDetail.value.scenario === 'agrr' && agrrParametersReady.value) {
    simulateAgrrPerturbation(false);
  }
  if (currentTaskDetail.value.scenario === 'aoue' && aoueParametersReady.value) {
    simulateAouePerturbation(false);
  }
  ElMessage.success('已生成当前任务的随机示例输入');
}

function markFormTouched() {
  formTouched.value = true;
  if (currentTaskDetail.value?.scenario !== 'arr') {
    systemStatus.value = 0;
  }

  if (currentTaskDetail.value?.scenario === 'aoue') {
    resetAoueAnimation();
  }
}

function handleArrOptionClick(value) {
  dynamicForm.fallAlarm = value;
  markFormTouched();
  arrSimulationResult.value = null;
  arrBatchResult.value = null;
  batchUploadState.value = null;
  systemStatus.value = 0;
  if (arrParametersReady.value) {
    simulateArrPerturbation(false);
  }
}

function handleAgrrMinutesChange() {
  markFormTouched();
  agrrSimulationResult.value = null;
  agrrBatchResult.value = null;
  batchUploadState.value = null;
  systemStatus.value = 0;
}

function handleSleepMissingChange(value) {
  markFormTouched();
  if (value === 1) {
    dynamicForm.sleepScore = null;
    return;
  }

  if (dynamicForm.sleepScore == null) {
    dynamicForm.sleepScore = 3;
  }
}

function simulateArrPerturbation(showMessage = true) {
  if (!canSimulateArr.value) {
    if (showMessage) {
      ElMessage.warning('请先完成填写，并确保管理端已保存当前 ARR 参数');
    }
    return;
  }

  const reportValue = ARR(dynamicForm.fallAlarm, arrConfigParams.value.epsilon, 2, arrConfigParams.value.p, arrConfigParams.value.q);
  arrSimulationResult.value = {
    reportValue,
    perturbedLabel: reportValue === 1 ? '触发提醒' : '未触发提醒',
    rawValue: dynamicForm.fallAlarm,
    rawLabel: dynamicForm.fallAlarm === 1 ? '触发提醒' : '未触发提醒'
  };
  systemStatus.value = 1;

  if (showMessage) {
    ElMessage.success('已完成一次 ARR 本地扰动');
  }
}

function performAgrrPerturbation(rawMinutes) {
  if (!agrrParametersReady.value) {
    return null;
  }

  const rawLabel = getStandDurationBucket(rawMinutes);
  const rawValue = getStandBucketCode(rawLabel);
  if (!rawLabel || !rawValue) {
    return null;
  }

  const reportValue = AGRR(rawValue, agrrConfigParams.value.epsilon, STAND_BUCKET_ORDER.length, agrrConfigParams.value.p, agrrConfigParams.value.q);
  const perturbedLabel = getStandBucketLabelByCode(reportValue);

  return {
    rawMinutes,
    rawLabel,
    rawValue,
    reportValue,
    perturbedLabel,
    perturbedValue: reportValue
  };
}

function simulateAgrrPerturbation(showMessage = true) {
  if (!canSimulateAgrr.value) {
    if (showMessage) {
      ElMessage.warning('请先填写原始分钟数，并确保管理端已保存当前 AGRR 参数');
    }
    return;
  }

  const result = performAgrrPerturbation(dynamicForm.standMinutes);
  if (!result) {
    if (showMessage) {
      ElMessage.warning('当前分钟数无法映射到有效分档，请先检查输入');
    }
    return;
  }

  agrrSimulationResult.value = result;
  systemStatus.value = 1;

  if (showMessage) {
    ElMessage.success('已完成一次 AGRR 本地扰动');
  }
}

function performAouePerturbation(rawSteps) {
  if (!aoueParametersReady.value) {
    return null;
  }

  const rawLabel = getStepsBucket(rawSteps);
  const rawValue = getStepsBucketCode(rawLabel);
  const domainSize = STEP_BUCKET_ORDER.length;
  if (!rawLabel || !rawValue || rawValue < 1 || rawValue > domainSize) {
    return null;
  }

  const { originalVector, reportValue, bitSteps } = perturbAOUEWithDetails(
    rawValue,
    domainSize,
    aoueConfigParams.value.q,
    aoueConfigParams.value.p
  );
  const perturbedLabel = explainPerturbedVector(reportValue, STEP_BUCKET_ORDER);

  return {
    rawSteps,
    rawLabel,
    rawValue,
    encodedValue: originalVector,
    encodedValueDisplay: `[${originalVector.join(', ')}]`,
    reportValue,
    reportValueDisplay: `[${reportValue.join(', ')}]`,
    perturbedLabel,
    perturbedValue: reportValue,
    bitSteps
  };
}

function prepareAoueDemo(showMessage = true) {
  if (!canSimulateAoue.value) {
    if (showMessage) {
      ElMessage.warning('请先填写每日步数，并确保管理端已保存当前 AOUE 参数');
    }
    return null;
  }

  const result = performAouePerturbation(dynamicForm.dailySteps);
  if (!result) {
    if (showMessage) {
      ElMessage.warning('当前步数无法映射到有效分桶，请先检查输入');
    }
    return null;
  }

  aoueSimulationResult.value = result;
  prepareAoueAnimation(result);
  systemStatus.value = 0;
  return result;
}

async function startAoueAutoMode() {
  if (!aoueAnimationReady.value) {
    const prepared = prepareAoueDemo(true);
    if (!prepared) {
      return;
    }
  }

  activeDemoTab.value = 'single';
  const finished = await startAoueAutoPlayback();
  if (finished) {
    systemStatus.value = 1;
  }
}

function startAoueManualMode() {
  if (!aoueAnimationReady.value) {
    const prepared = prepareAoueDemo(true);
    if (!prepared) {
      return;
    }
  }

  activeDemoTab.value = 'single';
  startAoueManualPlayback();
}

function resetPreparedAoueDemo(showMessage = false) {
  if (!aoueAnimationReady.value) {
    return;
  }

  resetAoueDemoProgress();
  systemStatus.value = 0;
  if (showMessage) {
    ElMessage.info('已重置本次 AOUE 演示，可重新选择自动播放或手动模式');
  }
}

async function resumeAoueAutoMode() {
  if (!aoueAnimationReady.value || aoueAnimationStage.value === 'done') {
    return;
  }

  const finished = await resumeAoueAutoPlayback();
  if (finished) {
    systemStatus.value = 1;
  }
}

function pauseAoueAutoPlayback() {
  if (pauseAouePlayback()) {
    systemStatus.value = 0;
  }
}

function simulateAouePerturbation(showMessage = true) {
  const result = prepareAoueDemo(showMessage);
  if (!result) {
    return;
  }

  if (showMessage) {
    ElMessage.success('已生成 AOUE 单次演示样例，请选择自动播放或手动模式开始');
  }
}

function replayAoueAnimation() {
  if (!canSimulateAoue.value) {
    ElMessage.warning('请先填写每日步数，并确保管理端已保存当前 AOUE 参数');
    return;
  }

  activeDemoTab.value = 'single';
  simulateAouePerturbation(true);
}

function handleAoueNextBit() {
  if (!aoueAnimationReady.value) {
    return;
  }

  if (aouePlayMode.value !== 'manual') {
    startAoueManualMode();
  }

  if (aoueAnimationStage.value === 'done') {
    ElMessage.info('当前 AOUE 逐位扰动已经完成');
    return;
  }

  const executed = advanceAoueDemo();
  if (!executed) {
    return;
  }

  if (aoueAnimationStage.value === 'done') {
    systemStatus.value = 1;
  }
}

function toggleAoueLogPanel() {
  aoueLogExpanded.value = !aoueLogExpanded.value;
}

function toggleAoueBatchLogPanel() {
  aoueBatchLogExpanded.value = !aoueBatchLogExpanded.value;
}

function buildTspReportParams() {
  if (!tspConfigParams.value) {
    return null;
  }

  return {
    tspVersion: tspConfigParams.value.version,
    epsilon: Number(tspConfigParams.value.epsilon).toFixed(4),
    p1: tspConfigParams.value.p1.toFixed(4),
    q1: tspConfigParams.value.q1.toFixed(4),
    p2: tspConfigParams.value.p2.toFixed(4),
    q2: tspConfigParams.value.q2.toFixed(4),
    pStar: tspConfigParams.value.pStar != null ? tspConfigParams.value.pStar.toFixed(4) : null,
    qStar: tspConfigParams.value.qStar != null ? tspConfigParams.value.qStar.toFixed(4) : null,
    alpha: tspConfigParams.value.alpha.toFixed(4),
    beta: tspConfigParams.value.beta.toFixed(4)
  };
}

function buildBatchSummaryPayload() {
  if (!currentBatchResult.value || !currentTaskDetail.value) {
    return null;
  }

  if (currentTaskDetail.value.scenario === 'agrr') {
    return {
      sampleCount: currentBatchResult.value.samples.length,
      rawBucketCounts: normalizeStandBucketCounts(currentBatchResult.value.rawBucketCounts),
      reportBucketCounts: normalizeStandBucketCounts(currentBatchResult.value.reportBucketCounts)
    };
  }

  if (currentTaskDetail.value.scenario === 'aoue') {
    return {
      sampleCount: currentBatchResult.value.samples.length,
      rawBucketCounts: normalizeStepsBucketCounts(currentBatchResult.value.rawBucketCounts),
      reportBucketCounts: normalizeStepsBucketCounts(currentBatchResult.value.reportBucketCounts)
    };
  }

  if (currentTaskDetail.value.scenario === 'tsp') {
    return {
      sampleCount: currentBatchResult.value.samples.length,
      rawMissingCounts: currentBatchResult.value.rawMissingCounts,
      reportMissingCounts: currentBatchResult.value.reportMissingCounts,
      rawScoreCounts: currentBatchResult.value.rawScoreCounts,
      reportScoreCounts: currentBatchResult.value.reportScoreCounts
    };
  }

  return {
    sampleCount: currentBatchResult.value.samples.length,
    rawTriggerCount: currentBatchResult.value.rawCountOne,
    rawNonTriggerCount: currentBatchResult.value.rawCountZero,
    reportTriggerCount: currentBatchResult.value.countOne,
    reportNonTriggerCount: currentBatchResult.value.countZero
  };
}

function isQuotaExceededError(error) {
  return error?.name === 'QuotaExceededError'
    || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || error?.code === 22
    || error?.code === 1014;
}

function performTspPerturbation(rawMissingInput, rawScoreInput) {
  if (!tspParametersReady.value) {
    return null;
  }

  const rawMissing = Number(rawMissingInput) === 1 ? 1 : 0;
  const rawMissingLabel = rawMissing === 1 ? '缺失（M=1）' : '非缺失（M=0）';
  const rawScore = rawMissing === 1 ? null : Number(rawScoreInput);
  const rawValue = rawMissing === 1 ? 0 : rawScore;
  const {
    stageOneSkipped,
    stageOneValue: tspStageOneValue,
    stageTwoInput,
    stageTwoValue
  } = applyTSP(rawValue, tspConfigParams.value);

  let stageOneValue = null;
  let stageOneLabel = '已跳过';
  let stageOneInputDisplay = '缺失样本不进入第一阶段';
  if (!stageOneSkipped) {
    stageOneValue = tspStageOneValue;
    stageOneLabel = `${stageOneValue} 分`;
    stageOneInputDisplay = `${rawScore} 分`;
  }

  const stageTwoLabel = stageTwoValue === 0 ? '缺失值 0' : `${stageTwoValue} 分`;
  const reportMissingLabel = stageTwoValue === 0 ? '缺失（M=1）' : '非缺失（M=0）';
  const reportScoreDisplay = stageTwoValue === 0 ? '--' : `${stageTwoValue} 分`;

  return {
    rawMissing,
    rawMissingLabel,
    rawScore,
    rawScoreDisplay: rawMissing === 1 ? '--' : String(rawScore),
    stageOneSkipped,
    stageOneInputDisplay,
    stageOneValue,
    stageOneLabel,
    stageOneSkipReason: stageOneSkipped ? '当前样本为缺失记录，第一阶段仅对非缺失样本执行，因此本阶段跳过。' : '',
    stageTwoInput,
    stageTwoInputDisplay: stageTwoInput === 0 ? '缺失值 0' : `${stageTwoInput} 分`,
    stageTwoSkipped: false,
    stageTwoValue,
    stageTwoLabel,
    stageTwoSkipReason: '',
    reportValue: stageTwoValue,
    reportValueDisplay: stageTwoValue === 0 ? '0（缺失值）' : `${stageTwoValue}（有效评分）`,
    reportMissing: stageTwoValue === 0 ? 1 : 0,
    reportMissingLabel,
    reportScore: stageTwoValue === 0 ? null : stageTwoValue,
    reportScoreDisplay
  };
}

function simulateTspPerturbation(showMessage = true) {
  if (!canSimulateTsp.value) {
    if (showMessage) {
      ElMessage.warning('请先完成 TSP 输入，并确保管理端已保存当前 TSP 参数');
    }
    return;
  }

  const result = performTspPerturbation(dynamicForm.sleepMissing, dynamicForm.sleepScore);
  if (!result) {
    if (showMessage) {
      ElMessage.warning('当前 TSP 输入无效，请先检查缺失状态与评分');
    }
    return;
  }

  tspSimulationResult.value = result;
  systemStatus.value = 1;

  if (showMessage) {
    ElMessage.success('已完成一次 TSP 两阶段扰动演示');
  }
}

function simulateCurrentTaskOnce() {
  if (currentTaskDetail.value?.scenario === 'tsp') {
    activeDemoTab.value = 'single';
    simulateTspPerturbation(true);
    return;
  }

  if (!currentTaskDetail.value) {
    ElMessage.warning('请先选择任务');
    return;
  }

  if (currentTaskDetail.value.scenario === 'arr') {
    activeDemoTab.value = 'single';
    simulateArrPerturbation(true);
    return;
  }

  if (currentTaskDetail.value.scenario === 'agrr') {
    activeDemoTab.value = 'single';
    simulateAgrrPerturbation(true);
    return;
  }

  if (currentTaskDetail.value.scenario === 'aoue') {
    activeDemoTab.value = 'single';
    simulateAouePerturbation(true);
    return;
  }

  ElMessage.info('当前优先完成 ARR 场景，其他协议的单次扰动演示将在下一步接入');
}

function generateArrRawSample() {
  return sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.ARR_SLEEP_ALERT_AGE).observedValue === '触发提醒' ? 1 : 0;
}

function generateAgrrRawSample() {
  const sample = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.AGRR_ACTIVITY_BMI);
  return standMinutesFromActivityLabel(sample.observedValue);
}

function generateAoueRawSample() {
  const sample = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.AOUE_STEPS_BMI);
  return dailyStepsFromBucketLabel(sample.observedValue);
}

async function generateTspRawSample(distribution = null) {
  if (distribution) {
    return sampleTspRawRecordFromDistribution(distribution);
  }

  return sampleTspRawRecordByDistribution();
}

async function runBatchSimulation() {
  if (currentTaskDetail.value?.scenario === 'tsp') {
    let distribution = null;

    try {
      distribution = await getTspEmpiricalDistribution();
    } catch (error) {
      console.error('加载 TSP 基础分布失败:', error);
      ElMessage.error('无法加载 TSP 基础样本分布，请检查基础数据文件');
      return;
    }
  }

  if (!currentTaskDetail.value) {
    ElMessage.warning('请先选择任务');
    return;
  }

  if (!canRunBatchSimulation.value) {
    ElMessage.warning(`请确保当前 ${currentTaskDetail.value.protocol} 参数已就绪`);
    return;
  }

  activeDemoTab.value = 'batch';
  batchUploadState.value = null;
  batchSimulationRunning.value = true;

  const totalRuns = Number(batchSimulationCount.value);

  if (currentTaskDetail.value.scenario === 'tsp') {
    let distribution = null;

    try {
      distribution = await getTspEmpiricalDistribution();
    } catch (error) {
      console.error('加载 TSP 基础分布失败:', error);
      ElMessage.error('无法加载 TSP 基础样本分布，请检查基础数据文件');
      batchSimulationRunning.value = false;
      return;
    }

    const samples = [];
    const rawMissingCounts = { missing: 0, nonMissing: 0 };
    const reportMissingCounts = { missing: 0, nonMissing: 0 };
    const rawScoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const reportScoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (let i = 0; i < totalRuns; i += 1) {
      const sampleInput = await generateTspRawSample(distribution);
      const sampleResult = performTspPerturbation(sampleInput.rawMissing, sampleInput.rawScore);
      if (!sampleResult) {
        continue;
      }

      if (sampleResult.rawMissing === 1) {
        rawMissingCounts.missing += 1;
      } else {
        rawMissingCounts.nonMissing += 1;
        rawScoreCounts[String(sampleResult.rawScore)] += 1;
      }

      if (sampleResult.reportValue === 0) {
        reportMissingCounts.missing += 1;
      } else {
        reportMissingCounts.nonMissing += 1;
        reportScoreCounts[String(sampleResult.reportValue)] += 1;
      }

      samples.push({
        index: i + 1,
        ...sampleResult
      });
    }

    tspBatchResult.value = {
      batchId: `${currentTaskDetail.value.taskId}-${Date.now()}`,
      totalRuns,
      rawMissingCounts,
      reportMissingCounts,
      rawScoreCounts,
      reportScoreCounts,
      samples
    };

    if (samples.length > 0) {
      tspSimulationResult.value = {
        ...samples[0]
      };
    }

    systemStatus.value = 1;
    batchSimulationRunning.value = false;
    ElMessage.success(`已完成 ${totalRuns} 次手环端连续采集`);
    return;
  }

  if (currentTaskDetail.value.scenario === 'agrr') {
    const samples = [];
    const rawBucketCounts = createEmptyStandBucketCounts();
    const reportBucketCounts = createEmptyStandBucketCounts();

    for (let i = 0; i < totalRuns; i += 1) {
      const rawMinutes = generateAgrrRawSample();
      const sampleResult = performAgrrPerturbation(rawMinutes);
      if (!sampleResult) {
        continue;
      }

      rawBucketCounts[sampleResult.rawLabel] += 1;
      reportBucketCounts[sampleResult.perturbedLabel] += 1;

      samples.push({
        index: i + 1,
        ...sampleResult
      });
    }

    agrrBatchResult.value = {
      batchId: `${currentTaskDetail.value.taskId}-${Date.now()}`,
      totalRuns,
      rawBucketCounts,
      reportBucketCounts,
      samples
    };

    if (samples.length > 0) {
      agrrSimulationResult.value = {
        ...samples[0]
      };
    }

    batchUploadState.value = null;
    systemStatus.value = 1;
    batchSimulationRunning.value = false;
    ElMessage.success(`已完成 ${totalRuns} 次手环端连续采集`);
    return;
  }

  if (currentTaskDetail.value.scenario === 'aoue') {
    const samples = [];
    const rawBucketCounts = createEmptyStepsBucketCounts();
    const reportBucketCounts = createEmptyStepsBucketCounts();
    const originalBitSums = createEmptyBitArray(STEP_BUCKET_ORDER.length);
    const perturbedBitSums = createEmptyBitArray(STEP_BUCKET_ORDER.length);
    const batchId = `${currentTaskDetail.value.taskId}-${Date.now()}`;

    aoueBatchLogExpanded.value = false;
    aoueBatchResult.value = {
      batchId,
      totalRuns,
      completedRuns: 0,
      rawBucketCounts: { ...rawBucketCounts },
      reportBucketCounts: { ...reportBucketCounts },
      originalBitSums: [...originalBitSums],
      perturbedBitSums: [...perturbedBitSums],
      latestOriginalVector: [],
      latestReportedVector: [],
      latestRawLabel: '',
      samples: []
    };

    for (let i = 0; i < totalRuns; i += 1) {
      const rawSteps = generateAoueRawSample();
      const sampleResult = performAouePerturbation(rawSteps);
      if (!sampleResult) {
        continue;
      }

      rawBucketCounts[sampleResult.rawLabel] += 1;
      sampleResult.encodedValue.forEach((bit, index) => {
        originalBitSums[index] += Number(bit) || 0;
      });
      // 对于 AOUE，扰动后编码向量可能包含多个 1，也可能全为 0，统计时按位累加。
      sampleResult.reportValue.forEach((bit, index) => {
        perturbedBitSums[index] += Number(bit) || 0;
        if (bit === 1) {
          const label = getStepsBucketLabelByCode(index + 1);
          reportBucketCounts[label] += 1;
        }
      });

      samples.push({
        index: i + 1,
        ...sampleResult
      });

      aoueBatchResult.value = {
        batchId,
        totalRuns,
        completedRuns: i + 1,
        rawBucketCounts: { ...rawBucketCounts },
        reportBucketCounts: { ...reportBucketCounts },
        originalBitSums: [...originalBitSums],
        perturbedBitSums: [...perturbedBitSums],
        latestOriginalVector: [...sampleResult.encodedValue],
        latestReportedVector: [...sampleResult.reportValue],
        latestRawLabel: sampleResult.rawLabel,
        samples: [...samples]
      };

      if ((i + 1) % 10 === 0 || i === totalRuns - 1) {
        await waitForUiFrame(10);
      }
    }

    aoueBatchResult.value = {
      batchId,
      totalRuns,
      completedRuns: samples.length,
      rawBucketCounts: { ...rawBucketCounts },
      reportBucketCounts: { ...reportBucketCounts },
      originalBitSums: [...originalBitSums],
      perturbedBitSums: [...perturbedBitSums],
      latestOriginalVector: samples.length ? [...samples[samples.length - 1].encodedValue] : [],
      latestReportedVector: samples.length ? [...samples[samples.length - 1].reportValue] : [],
      latestRawLabel: samples.length ? samples[samples.length - 1].rawLabel : '',
      samples: [...samples]
    };

    if (samples.length > 0) {
      aoueSimulationResult.value = {
        ...samples[samples.length - 1]
      };
    }

    batchUploadState.value = null;
    systemStatus.value = 1;
    batchSimulationRunning.value = false;
    ElMessage.success(`已完成 ${totalRuns} 次手环端连续采集`);
    return;
  }

  const samples = [];
  let countOne = 0;
  let countZero = 0;
  let rawCountOne = 0;
  let rawCountZero = 0;

  for (let i = 0; i < totalRuns; i += 1) {
    const rawValue = generateArrRawSample();
    const rawLabel = rawValue === 1 ? '触发提醒' : '未触发提醒';
    if (rawValue === 1) {
      rawCountOne += 1;
    } else {
      rawCountZero += 1;
    }

    const reportValue = ARR(rawValue, arrConfigParams.value.epsilon, 2, arrConfigParams.value.p, arrConfigParams.value.q);
    if (reportValue === 1) {
      countOne += 1;
    } else {
      countZero += 1;
    }

    samples.push({
      index: i + 1,
      rawValue,
      rawLabel,
      reportValue,
      perturbedLabel: reportValue === 1 ? '触发提醒' : '未触发提醒'
    });
  }

  arrBatchResult.value = {
    batchId: `${currentTaskDetail.value.taskId}-${Date.now()}`,
    totalRuns,
    rawValue: null,
    rawLabel: '连续采集样本',
    rawCountOne,
    rawCountZero,
    countOne,
    countZero,
    samples
  };

  if (samples.length > 0) {
    arrSimulationResult.value = {
      reportValue: samples[0].reportValue,
      perturbedLabel: samples[0].perturbedLabel,
      rawValue: samples[0].rawValue,
      rawLabel: samples[0].rawLabel
    };
  }

  systemStatus.value = 1;
  batchSimulationRunning.value = false;
  ElMessage.success(`已完成 ${totalRuns} 次手环端连续采集`);
}

function uploadCurrentBatchResult() {
  if (!currentTaskDetail.value) {
    ElMessage.warning('请先选择任务');
    return;
  }

  if (!currentBatchResult.value?.samples?.length) {
    ElMessage.warning('请先模拟连续采集');
    return;
  }

  if (batchUploadState.value?.batchId === currentBatchResult.value.batchId) {
    ElMessage.info('本次连续采集结果已上报');
    return;
  }

  try {
    const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]');
    const uploadTime = new Date().toISOString();
    const userId = user.value?.username || '用户001';
    const batchSummary = buildBatchSummaryPayload();
    const records = currentBatchResult.value.samples.map((sample, index) => {
      const baseRecord = {
        userId,
        user_id: userId,
        taskId: currentTaskDetail.value.taskId,
        task_id: currentTaskDetail.value.taskId,
        batch_id: currentBatchResult.value.batchId,
        protocol: currentTaskDetail.value.protocol,
        uploadTime,
        upload_time: uploadTime,
        sampleMeta: {
          batchId: currentBatchResult.value.batchId,
          sampleIndex: sample.index
        }
      };
      const batchSummaryField = index === 0 && batchSummary ? { batchSummary } : {};

      if (currentTaskDetail.value.scenario === 'agrr') {
        return {
          ...baseRecord,
          report_value: sample.reportValue,
          original_minutes: sample.rawMinutes,
          original_bucket: sample.rawLabel,
          original_bucket_code: sample.rawValue,
          perturbed_bucket: sample.perturbedLabel,
          perturbed_bucket_code: sample.reportValue,
          rawData: {
            scenario: 'agrr',
            standMinutes: sample.rawMinutes,
            standBucket: sample.rawLabel,
            standBucketCode: sample.rawValue
          },
          reportData: {
            protocol: currentTaskDetail.value.protocol,
            perturbedValue: sample.reportValue,
            perturbedLabel: sample.perturbedLabel,
            reportValue: sample.reportValue,
            rawBucket: sample.rawLabel,
            rawBucketCode: sample.rawValue,
            perturbedBucket: sample.perturbedLabel,
            perturbedBucketCode: sample.reportValue
          },
          ...batchSummaryField
        };
      }

      if (currentTaskDetail.value.scenario === 'aoue') {
        return {
          ...baseRecord,
          report_value: sample.reportValue,
          original_steps: sample.rawSteps,
          original_bucket: sample.rawLabel,
          original_bucket_code: sample.rawValue,
          perturbed_bucket: sample.perturbedLabel,
          perturbed_bucket_code: sample.reportValue,
          rawData: {
            scenario: 'aoue',
            dailySteps: sample.rawSteps,
            stepsBucket: sample.rawLabel,
            stepsBucketCode: sample.rawValue
          },
          reportData: {
            protocol: currentTaskDetail.value.protocol,
            perturbedValue: sample.reportValue,
            perturbedLabel: sample.perturbedLabel,
            reportValue: sample.reportValue,
            rawBucket: sample.rawLabel,
            rawBucketCode: sample.rawValue,
            perturbedBucket: sample.perturbedLabel,
            perturbedBucketCode: sample.reportValue
          },
          ...batchSummaryField
        };
      }

      if (currentTaskDetail.value.scenario === 'tsp') {
        return {
          ...baseRecord,
          original_missing: sample.rawMissing,
          original_score: sample.rawScore,
          stage1_result: sample.stageOneSkipped ? 'skipped' : sample.stageOneValue,
          stage2_input: sample.stageTwoInput,
          report_value: sample.reportValue,
          rawData: {
            scenario: 'tsp',
            sleepMissing: sample.rawMissing,
            sleepScore: sample.rawScore
          },
          reportData: {
            protocol: currentTaskDetail.value.protocol,
            reportValue: sample.reportValue,
            perturbedValue: sample.reportValue,
            perturbedLabel: sample.reportValueDisplay,
            stageOneResult: sample.stageOneValue,
            stageOneLabel: sample.stageOneLabel,
            stageOneSkipped: sample.stageOneSkipped,
            stageTwoInput: sample.stageTwoInput,
            stageTwoResult: sample.stageTwoValue,
            stageTwoLabel: sample.stageTwoLabel,
            reportMissing: sample.reportMissing,
            reportMissingLabel: sample.reportMissingLabel,
            reportScore: sample.reportScore,
            reportScoreDisplay: sample.reportScoreDisplay
          },
          ...batchSummaryField
        };
      }

      return {
        ...baseRecord,
        report_value: sample.reportValue,
        reportData: {
          protocol: currentTaskDetail.value.protocol,
          perturbedValue: sample.reportValue,
          perturbedLabel: sample.perturbedLabel,
          reportValue: sample.reportValue
        },
        ...batchSummaryField
      };
    });

    localStorage.setItem('submittedData', JSON.stringify([...storedData, ...records]));
    batchUploadState.value = {
      batchId: currentBatchResult.value.batchId,
      status: '已上报',
      count: currentBatchResult.value.samples.length
    };
    systemStatus.value = 2;
    ElMessage.success(`已成功上报 ${currentBatchResult.value.samples.length} 条连续采集扰动记录到管理端`);
  } catch (error) {
    console.error('批量上报连续采集结果失败:', error);
    if (isQuotaExceededError(error)) {
      ElMessage.error('本地存储空间不足，当前批次未写入。请先清理部分历史上报数据后重试。');
      return;
    }
    ElMessage.error('上报失败，请稍后重试');
  }
}

function submitData() {
  if (!currentTaskDetail.value) {
    ElMessage.warning('请先选择任务');
    return;
  }

  if (!formTouched.value) {
    ElMessage.warning('请先完成当前任务的数据填写');
    return;
  }

  if (currentTaskDetail.value.scenario === 'arr' && !arrSimulationResult.value) {
    ElMessage.warning('请先完成一次 ARR 本地扰动');
    return;
  }

  if (currentTaskDetail.value.scenario === 'agrr' && !agrrSimulationResult.value) {
    ElMessage.warning('请先完成一次 AGRR 本地扰动');
    return;
  }

  if (currentTaskDetail.value.scenario === 'aoue' && !aoueSimulationResult.value) {
    ElMessage.warning('请先完成一次 AOUE 本地扰动');
    return;
  }

  if (currentTaskDetail.value.scenario === 'tsp' && !tspSimulationResult.value) {
    ElMessage.warning('请先完成一次 TSP 两阶段扰动演示');
    return;
  }

  submitting.value = true;

  setTimeout(() => {
    submitting.value = false;
    systemStatus.value = 2;

    try {
      const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]');
      const uploadTime = new Date().toISOString();
      const userId = user.value?.username || '用户001';
      storedData.push({
        userId,
        user_id: userId,
        taskId: currentTaskDetail.value.taskId,
        task_id: currentTaskDetail.value.taskId,
        protocol: currentTaskDetail.value.protocol,
        uploadTime,
        upload_time: uploadTime,
        report_value: currentTaskDetail.value.scenario === 'arr'
          ? arrSimulationResult.value?.reportValue ?? null
          : currentTaskDetail.value.scenario === 'agrr'
            ? agrrSimulationResult.value?.reportValue ?? null
            : currentTaskDetail.value.scenario === 'aoue'
              ? aoueSimulationResult.value?.reportValue ?? null
              : currentTaskDetail.value.scenario === 'tsp'
                ? tspSimulationResult.value?.reportValue ?? null
              : null,
        original_minutes: currentTaskDetail.value.scenario === 'agrr' ? agrrSimulationResult.value?.rawMinutes ?? null : null,
        original_steps: currentTaskDetail.value.scenario === 'aoue' ? aoueSimulationResult.value?.rawSteps ?? null : null,
        original_bucket: currentTaskDetail.value.scenario === 'agrr'
          ? agrrSimulationResult.value?.rawLabel ?? null
          : currentTaskDetail.value.scenario === 'aoue'
            ? aoueSimulationResult.value?.rawLabel ?? null
            : null,
        original_bucket_code: currentTaskDetail.value.scenario === 'agrr'
          ? agrrSimulationResult.value?.rawValue ?? null
          : currentTaskDetail.value.scenario === 'aoue'
            ? aoueSimulationResult.value?.rawValue ?? null
            : null,
        perturbed_bucket: currentTaskDetail.value.scenario === 'agrr'
          ? agrrSimulationResult.value?.perturbedLabel ?? null
          : currentTaskDetail.value.scenario === 'aoue'
            ? aoueSimulationResult.value?.perturbedLabel ?? null
            : null,
        perturbed_bucket_code: currentTaskDetail.value.scenario === 'agrr'
          ? agrrSimulationResult.value?.reportValue ?? null
          : currentTaskDetail.value.scenario === 'aoue'
            ? aoueSimulationResult.value?.reportValue ?? null
            : null,
        rawData: {
          scenario: currentTaskDetail.value.scenario,
          ...JSON.parse(JSON.stringify(dynamicForm)),
          standBucket: derivedStandBucket.value || null,
          standBucketCode: derivedStandBucketCode.value || null,
          stepsBucket: derivedStepsBucket.value || null,
          stepsBucketCode: derivedStepsBucketCode.value || null
        },
        reportData: {
          protocol: currentTaskDetail.value.protocol,
          perturbedValue: currentTaskDetail.value.scenario === 'arr'
            ? arrSimulationResult.value?.reportValue ?? null
            : currentTaskDetail.value.scenario === 'agrr'
              ? agrrSimulationResult.value?.reportValue ?? null
              : currentTaskDetail.value.scenario === 'aoue'
                ? aoueSimulationResult.value?.reportValue ?? null
                : currentTaskDetail.value.scenario === 'tsp'
                  ? tspSimulationResult.value?.reportValue ?? null
                : null,
          perturbedLabel: currentTaskDetail.value.scenario === 'arr'
            ? arrSimulationResult.value?.perturbedLabel ?? null
            : currentTaskDetail.value.scenario === 'agrr'
              ? agrrSimulationResult.value?.perturbedLabel ?? null
              : currentTaskDetail.value.scenario === 'aoue'
                ? aoueSimulationResult.value?.perturbedLabel ?? null
                : currentTaskDetail.value.scenario === 'tsp'
                  ? tspSimulationResult.value?.reportValueDisplay ?? null
                : null,
          reportValue: currentTaskDetail.value.scenario === 'agrr'
            ? agrrSimulationResult.value?.reportValue ?? null
            : currentTaskDetail.value.scenario === 'arr'
              ? arrSimulationResult.value?.reportValue ?? null
              : currentTaskDetail.value.scenario === 'aoue'
                ? aoueSimulationResult.value?.reportValue ?? null
                : currentTaskDetail.value.scenario === 'tsp'
                  ? tspSimulationResult.value?.reportValue ?? null
                : null,
          rawBucket: currentTaskDetail.value.scenario === 'agrr'
            ? agrrSimulationResult.value?.rawLabel ?? null
            : currentTaskDetail.value.scenario === 'aoue'
              ? aoueSimulationResult.value?.rawLabel ?? null
              : null,
          rawBucketCode: currentTaskDetail.value.scenario === 'agrr'
            ? agrrSimulationResult.value?.rawValue ?? null
            : currentTaskDetail.value.scenario === 'aoue'
              ? aoueSimulationResult.value?.rawValue ?? null
              : null,
          perturbedBucket: currentTaskDetail.value.scenario === 'agrr'
            ? agrrSimulationResult.value?.perturbedLabel ?? null
            : currentTaskDetail.value.scenario === 'aoue'
              ? aoueSimulationResult.value?.perturbedLabel ?? null
              : null,
          perturbedBucketCode: currentTaskDetail.value.scenario === 'agrr'
            ? agrrSimulationResult.value?.reportValue ?? null
            : currentTaskDetail.value.scenario === 'aoue'
              ? aoueSimulationResult.value?.reportValue ?? null
              : null,
          params: currentTaskDetail.value.scenario === 'arr' && arrConfigParams.value
            ? {
                p: arrConfigParams.value.p.toFixed(4),
                q: arrConfigParams.value.q.toFixed(4)
              }
            : currentTaskDetail.value.scenario === 'agrr' && agrrConfigParams.value
              ? {
                  p: agrrConfigParams.value.p.toFixed(4),
                  q: agrrConfigParams.value.q.toFixed(4)
                }
              : currentTaskDetail.value.scenario === 'aoue' && aoueConfigParams.value
                ? {
                    p: 0.5,
                    q: aoueConfigParams.value.q.toFixed(4)
                  }
                : currentTaskDetail.value.scenario === 'tsp' && tspConfigParams.value
                  ? buildTspReportParams()
                : null
          ,
          stageOneResult: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.stageOneValue ?? null : null,
          stageOneLabel: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.stageOneLabel ?? null : null,
          stageOneSkipped: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.stageOneSkipped ?? null : null,
          stageTwoInput: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.stageTwoInput ?? null : null,
          stageTwoResult: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.stageTwoValue ?? null : null,
          stageTwoLabel: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.stageTwoLabel ?? null : null,
          reportValueDisplay: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.reportValueDisplay ?? null : null,
          reportMissing: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.reportMissing ?? null : null,
          reportMissingLabel: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.reportMissingLabel ?? null : null,
          reportScore: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.reportScore ?? null : null,
          reportScoreDisplay: currentTaskDetail.value.scenario === 'tsp' ? tspSimulationResult.value?.reportScoreDisplay ?? null : null
        }
      });
      localStorage.setItem('submittedData', JSON.stringify(storedData));
      ElMessage.success('当前任务扰动结果已提交上报');
    } catch (error) {
      console.error('保存用户端采集数据失败:', error);
      ElMessage.error('提交失败');
    }
  }, 600);
}

function goToDashboard() {
  router.push('/');
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  getTspEmpiricalDistribution().catch(error => {
    console.error('预加载 TSP 基础样本分布失败:', error);
  });
  if (taskStore.taskList.length > 0) {
    currentTaskId.value = taskStore.taskList[0].id;
  }
});
</script>

<style scoped>
.user-device-container {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #dfe8f5 100%);
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  color: #409eff;
}

.user-dropdown {
  color: #606266;
  cursor: pointer;
}

.content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
}

.left-section,
.right-section {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  padding: 28px;
  display: flex;
  flex-direction: column;
}

.left-section {
  flex: 0 0 38%;
  max-width: 560px;
}

.right-section {
  flex: 1 1 0;
  min-width: 0;
}

.task-panel,
.device-info,
.dynamic-form-panel,
.summary-block,
.demo-top-card {
  margin-bottom: 22px;
}

.task-user {
  font-size: 24px;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 14px;
}

.task-select-row,
.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: #425466;
}

.task-select-label,
.info-item span:first-child {
  font-weight: 600;
}

.task-meta-grid,
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.tsp-skip-panel {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px dashed #d9b96e;
  background: #fff8e8;
}

.tsp-skip-title {
  font-size: 14px;
  font-weight: 700;
  color: #8a5a00;
}

.tsp-skip-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #7a6536;
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

.aoue-expand-trigger {
  flex-shrink: 0;
}

.meta-card,
.summary-card,
.empty-box,
.demo-top-card {
  border: 1px solid #dfe6ee;
  border-radius: 10px;
  background: #f8fbff;
}

.meta-card,
.summary-card {
  padding: 14px;
}

.meta-label,
.card-label,
.demo-top-label {
  font-size: 13px;
  color: #6b7785;
  margin-bottom: 8px;
}

.meta-value,
.card-value,
.demo-top-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.red {
  background: #f56c6c;
}

.status-indicator.yellow {
  background: #e6a23c;
}

.status-indicator.green {
  background: #67c23a;
}

.dynamic-form-panel h3,
.right-section h3,
.summary-block h4 {
  margin: 0 0 14px;
  color: #1f2d3d;
}

.dynamic-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-simulator {
  padding: 4px 0 0;
}

.separated-panel {
  border-top: 1px solid #e8edf3;
  padding-top: 22px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item > span {
  color: #425466;
  font-weight: 600;
}

.tsp-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.derived-hint,
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

.derived-hint--strong {
  color: #1d4ed8;
  font-weight: 700;
}

.bucket-rule-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.bucket-rule-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1e40af;
  font-size: 12px;
  line-height: 1.4;
}

.section-tip {
  font-size: 12px;
  color: #7b8794;
}

.control-buttons {
  margin-top: auto;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.demo-tab-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  padding: 6px;
  border-radius: 12px;
  background: #f3f7fc;
  border: 1px solid #dbe6f1;
}

.demo-tab-button {
  border: none;
  background: transparent;
  color: #5f6b7a;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.demo-tab-button.active {
  background: #ffffff;
  color: #409eff;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.12);
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

.demo-top-card {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.demo-top-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-top-item:first-child {
  flex: 0 1 40%;
  min-width: 0;
}

.demo-top-item:not(:first-child) {
  flex: 0 0 auto;
}

.demo-top-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
  word-break: break-all;
}

.preview-card {
  background: #f5f7fa;
}

.tsp-batch-layout {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.tsp-batch-card {
  border: 1px solid #e5ecf4;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.tsp-batch-card--stats {
  background: linear-gradient(180deg, #fbfdff 0%, #f7fbff 100%);
}

.tsp-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.tsp-stat-card {
  padding: 14px 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e8eef5;
}

.tsp-stat-card--accent {
  border-color: #bfd8ff;
  background: linear-gradient(135deg, #f4f9ff 0%, #eef6ff 100%);
}

.tsp-stat-label {
  font-size: 12px;
  color: #7b8794;
}

.tsp-stat-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2d3d;
  line-height: 1.2;
}

.tsp-batch-note {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e8eef5;
  font-size: 13px;
  line-height: 1.7;
  color: #5f6b7a;
}

.tsp-table-wrap {
  overflow-x: auto;
  border: 1px solid #e8eef5;
  border-radius: 12px;
}

.tsp-preview-table {
  width: 100%;
  min-width: 780px;
  border-collapse: separate;
  border-spacing: 0;
  background: #ffffff;
}

.tsp-preview-table th,
.tsp-preview-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  font-size: 12px;
  color: #425466;
  white-space: nowrap;
}

.tsp-preview-table th {
  background: #f5f7fa;
  color: #6b7785;
  font-weight: 600;
}

.tsp-preview-table tbody tr {
  transition: background-color 0.2s ease;
}

.tsp-preview-table tbody tr:hover {
  background: #f9fbfe;
}

.tsp-preview-table tbody tr:last-child td {
  border-bottom: none;
}

.tsp-col-index {
  width: 56px;
  color: #7b8794;
}

.tsp-col-report {
  font-weight: 600;
}

.tsp-cell-text {
  font-size: 12px;
  color: #334155;
}

.tsp-status-chip,
.tsp-report-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
}

.tsp-status-chip.is-success {
  color: #1f7a45;
  background: #edf8f1;
  border-color: #cdebd6;
}

.tsp-status-chip.is-muted,
.tsp-report-pill.is-muted {
  color: #667085;
  background: #f2f4f7;
  border-color: #e4e7ec;
}

.tsp-status-chip.is-warning {
  color: #b76e00;
  background: #fff4df;
  border-color: #f3d19c;
}

.tsp-report-pill.is-accent {
  color: #1859c8;
  background: #eef5ff;
  border-color: #c9dcff;
  box-shadow: inset 0 0 0 1px rgba(24, 89, 200, 0.04);
}

.tsp-batch-card--actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.tsp-action-copy {
  flex: 1;
  min-width: 0;
}

.tsp-action-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2d3d;
}

.tsp-action-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7785;
}

.tsp-action-status {
  margin-top: 10px;
  font-size: 12px;
  color: #409eff;
}

.tsp-action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.aoue-compact-strip {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;
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
  margin-bottom: 14px;
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
  margin-bottom: 16px;
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
  margin-bottom: 16px;
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
  overflow-x: auto;
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
  min-width: 640px;
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

.aoue-log-panel {
  margin-top: 16px;
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

.empty-box {
  padding: 18px;
  color: #8b97a7;
  line-height: 1.6;
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
  .content {
    flex-direction: column;
  }

  .left-section,
  .right-section {
    flex: 1 1 auto;
    max-width: none;
  }

  .task-meta-grid,
  .card-grid,
  .batch-summary-strip,
  .tsp-stat-grid,
  .aoue-hero-grid,
  .aoue-main-grid {
    grid-template-columns: 1fr;
  }
  
  .demo-top-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .demo-top-item {
    width: 100%;
  }

  .compare-bar-row {
    flex-direction: column;
  }

  .compare-bar-label {
    width: auto;
    padding-top: 0;
  }

  .tsp-batch-card--actions {
    flex-direction: column;
    align-items: stretch;
  }

  .tsp-action-buttons {
    justify-content: flex-start;
  }

  .tsp-preview-table {
    min-width: 640px;
  }

  .aoue-compact-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-heading--with-action {
    align-items: stretch;
  }

  .aoue-expand-trigger {
    width: 100%;
    justify-content: center;
  }

  .aoue-stepper {
    grid-template-columns: 1fr;
  }

  .aoue-hero-head,
  .aoue-vector-caption-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .aoue-hero-vector {
    font-size: 22px;
  }

  .aoue-log-item {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
