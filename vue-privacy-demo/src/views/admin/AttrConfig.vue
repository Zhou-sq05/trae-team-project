<template>
  <div class="admin-container">
    <el-container>
      <el-header>
        <div class="header-left">
          <h1>任务配置</h1>
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
        <el-aside width="240px">
          <div class="sidebar-brand">
            <div class="sidebar-brand-title">隐私保护平台</div>
            <div class="sidebar-brand-subtitle">风险自适应隐私保护数据采集系统</div>
          </div>
          <el-menu :default-active="activeMenu" class="el-menu-vertical-demo" router>
            <el-menu-item index="/admin/scenario-overview">
              <el-icon><Document /></el-icon>
              <span>场景说明</span>
            </el-menu-item>
            <el-menu-item index="/admin/attr-config">
              <el-icon><Setting /></el-icon>
              <span>任务配置</span>
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
          <div class="config-content">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <div class="card-header-copy">
                    <span>采集任务配置</span>
                    <p>新方案参数由内在不确定性建模结果计算得到，传统方案参数作为基线对比；配置下发后，用户端将按照对应协议完成本地扰动上报。</p>
                  </div>
                  <el-button
                    plain
                    class="clear-task-button"
                    :icon="Delete"
                    :disabled="taskStore.taskList.length === 0"
                    @click="handleClearAllTaskIds"
                  >
                    清空任务ID
                  </el-button>
                </div>
              </template>

              <div class="attr-config">
                <section class="config-card-list">
                  <article
                    v-for="attribute in tableAttributes"
                    :key="attribute.id"
                    class="config-card-item"
                  >
                    <div class="config-card-main">
                      <div class="config-card-head">
                        <div>
                          <div class="config-attr-name">{{ attribute.name }}</div>
                          <div class="scheme-tags">
                            <el-tag type="success" effect="light">{{ attribute.algorithm.toUpperCase() }}</el-tag>
                            <el-tag type="primary" effect="light">
                              {{ attribute.protectionMode === 'hybrid' ? '混合隐私风险' : '间接隐私风险' }}
                            </el-tag>
                          </div>
                        </div>
                      </div>

                      <div class="param-panel-grid">
                        <div class="param-panel param-panel--new">
                          <div class="param-panel-title">新方案扰动参数</div>
                          <div class="param-panel-subtitle">基于内在不确定性计算</div>
                          <div
                            class="param-display param-display--new"
                            :class="{ 'param-display--tsp': attribute.algorithm === 'tsp' }"
                          >
                            <template v-if="attribute.newParamGroups.length">
                              <div
                                v-for="group in attribute.newParamGroups"
                                :key="group.title"
                                class="param-group"
                              >
                                <div v-if="group.title" class="param-group-title">{{ group.title }}</div>
                                <div class="param-block-row">
                                  <div
                                    v-for="param in group.params"
                                    :key="param.name"
                                    class="param-block"
                                  >
                                    <span class="param-name">{{ param.name }}</span>
                                    <strong class="param-value">{{ param.value }}</strong>
                                  </div>
                                </div>
                              </div>
                            </template>
                            <span v-else class="param-muted">待配置</span>
                          </div>
                        </div>

                        <div class="param-panel param-panel--traditional">
                          <div class="param-panel-title">传统方案扰动参数</div>
                          <div class="param-panel-subtitle">基线对比参数</div>
                            <div class="param-display param-display--traditional">
                              <div v-if="attribute.algorithm === 'tsp'" class="not-applicable">
                                <span>TSP 为混合隐私风险场景，当前无传统单阶段参数对照。</span>
                              </div>
                            <template v-else-if="attribute.traditionalParamGroups.length">
                              <div
                                v-for="group in attribute.traditionalParamGroups"
                                :key="group.title"
                                class="param-group"
                              >
                                <div v-if="group.title" class="param-group-title">{{ group.title }}</div>
                                <div class="param-block-row">
                                  <div
                                    v-for="param in group.params"
                                    :key="param.name"
                                    class="param-block"
                                  >
                                    <span class="param-name">{{ param.name }}</span>
                                    <strong class="param-value">{{ param.value }}</strong>
                                  </div>
                                </div>
                              </div>
                            </template>
                            <span v-else class="param-muted">待配置</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="config-card-side">
                      <el-tag :type="attribute.configStatus === '已配置' ? 'success' : 'info'" effect="light" class="status-tag">
                        {{ attribute.configStatus }}
                      </el-tag>
                      <div class="card-actions">
                        <el-button type="primary" @click="handleAttributeClick(attribute)">
                          编辑配置
                        </el-button>
                        <el-button
                          plain
                          type="success"
                          :disabled="attribute.configStatus !== '已配置'"
                          @click="openDistributeDialog(attribute)"
                        >
                          下发
                        </el-button>
                        <el-button
                          circle
                          plain
                          class="delete-icon-button"
                          :icon="Delete"
                          :disabled="attribute.configStatus !== '已配置'"
                          @click="handleDeleteConfig(attribute)"
                        />
                      </div>
                    </div>
                  </article>
                </section>
              </div>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>

    <el-dialog
      v-model="dialogVisible"
      :title="currentAttribute ? `${currentAttribute.name} 详情` : '属性详情'"
      width="860px"
    >
      <div v-if="currentAttribute" class="attribute-details">
        <div class="detail-basic-grid">
          <div class="detail-basic-item">
            <span>采集属性 A</span>
            <strong>{{ currentAttribute.name }}</strong>
          </div>
          <div class="detail-basic-item">
            <span>相关敏感属性 S</span>
            <strong>{{ getSensitiveAttributeLabel(currentAttribute) }}</strong>
          </div>
          <div class="detail-basic-item">
            <span>防护模式</span>
            <strong>{{ getProtectionModeLabel(currentAttribute) }}</strong>
          </div>
          <div class="detail-basic-item">
            <span>协议</span>
            <strong>{{ getProtocolLabel(currentAttribute) }}</strong>
          </div>
        </div>

        <div v-if="currentAttribute.name === '是否触发睡眠异常提醒'" class="attribute-details">
          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">S 与 A 的条件分布矩阵 Pr(A|S)</h3>
              <el-button type="primary" plain :loading="matrixLoading" @click="recalculateMatrix">
                {{ fallAlarmMatrixData ? '重新估计' : '估计条件分布矩阵' }}
              </el-button>
            </div>

            <div v-if="matrixLoading" class="matrix-loading">
              <span>正在基于公开背景数据进行统计估计...</span>
            </div>
            <div v-else-if="fallAlarmMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>年龄段(S) \ 是否触发睡眠异常提醒(A)</th>
                    <th
                      v-for="header in matrixHeaders"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isSelectedColumn(header) }]"
                    >
                      <div class="header-cell">
                        <span>{{ header }}</span>
                        <el-tag v-if="isSelectedColumn(header)" size="small" type="success" effect="light">αβ来源</el-tag>
                      </div>
                    </th>
                    <th class="row-sum-column">行和</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in matrixRows" :key="row.s">
                    <th>{{ row.s }}</th>
                    <td
                      v-for="header in matrixHeaders"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isSelectedColumn(header) }]"
                    >
                      {{ formatProbability(row[header]) }}
                    </td>
                    <td class="row-sum-column">{{ formatProbability(rowSum(row)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="matrix-placeholder">
              <p>点击“估计条件分布矩阵”后，系统将利用公开背景数据统计待采集属性 A 在不同敏感属性 S 分组下的分布差异，得到条件分布矩阵 Pr(A|S)，用于刻画属性间统计相关性。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">隐私预算 ε</h3>
            <div class="epsilon-card">
              <div class="epsilon-item">
                <span class="epsilon-label">当前隐私预算</span>
                <el-input v-model.number="dialogPrivacyBudget" placeholder="请输入隐私预算" style="width: 200px" />
              </div>
              <el-button type="primary" @click="savePrivacyBudget">保存 ε</el-button>
            </div>
            <div class="epsilon-hint">当前校准将使用 ε = {{ savedPrivacyBudget }}</div>
          </div>

          <div class="module-group">
            <h3 class="module-title">计算依据</h3>
            <div v-if="columnStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                  <tr>
                    <th>候选列</th>
                    <th>α<sub>k</sub></th>
                    <th>β<sub>k</sub></th>
                    <th>ratio</th>
                    <th>是否选中</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in columnStats" :key="stat.label">
                    <td>{{ stat.label }}</td>
                    <td>{{ formatProbability(stat.max) }}</td>
                    <td>{{ formatProbability(stat.min) }}</td>
                    <td>{{ formatRatio(stat.ratio) }}</td>
                    <td>
                      <el-tag v-if="alphaBetaResult?.selectedLabel === stat.label" size="small" type="success" effect="light">
                        已选
                      </el-tag>
                      <span v-else class="muted-text">未选</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="final-selection-card">
                <div class="final-selection-title">最终选择结果</div>
                <div class="final-selection-line">最终选定列：{{ alphaBetaResult?.selectedLabel }}</div>
                <div class="final-selection-line">
                  选择原因：该列对应 ratio = {{ formatRatio(selectedColumnRatio) }}，大于另一列的 {{ formatRatio(unselectedColumnRatio) }}，因此作为 α、β 来源列。
                </div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>矩阵尚未计算，暂时无法展示 max / min / ratio 的比较结果。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数</h3>
            <div v-if="alphaBetaResult" class="result-grid">
              <div class="result-panel accent-panel">
                <div class="result-label">选定列</div>
                <div class="result-value">{{ alphaBetaResult.selectedLabel }}</div>
                <div class="result-subtext">后续 α、β 都基于这一列的条件概率推导。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">α（最大条件概率）</div>
                <div class="result-value">{{ formatProbability(alphaBetaResult.alpha) }}</div>
                <div class="result-subtext">在选定列中，对所有年龄段取最大的 Pr(A=a*|S=s)。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">β（最小条件概率）</div>
                <div class="result-value">{{ formatProbability(alphaBetaResult.beta) }}</div>
                <div class="result-subtext">在选定列中，对所有年龄段取最小的 Pr(A=a*|S=s)。</div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>条件分布矩阵估计完成后，这里会自动展示 α、β 的结果，无需额外点击计算。</p>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">扰动参数重校准</h3>
              <el-button type="primary" :loading="calibrationLoading" @click="calibrateParams">校准扰动参数</el-button>
            </div>
            <div class="result-grid compact-grid">
              <div class="result-panel">
                <div class="result-label">p（保持概率）</div>
                <div class="result-value">{{ calibratedParams ? calibratedParams.p : '--' }}</div>
              </div>
              <div class="result-panel">
                <div class="result-label">q（翻转概率）</div>
                <div class="result-value">{{ calibratedParams ? calibratedParams.q : '--' }}</div>
              </div>
            </div>
            <div v-if="arrPerturbationStatus" class="calibration-status-strip" :class="`is-${arrPerturbationStatus.statusKey}`">
              <div class="calibration-status-title">{{ arrPerturbationStatus.title }}</div>
              <div class="calibration-status-desc">{{ arrPerturbationStatus.description }}</div>
            </div>
            <div v-if="calibratedParams" class="calibration-info">
              <div class="calibration-info-section">
                <div class="calibration-info-title">扰动参数</div>
                <p class="formula">若 α / β ≤ e<sup>ε</sup>：p = 1，q = 0</p>
                <p class="formula formula-line">
                  <span>否则：p =</span>
                  <span class="formula-fraction">
                    <span class="formula-fraction__top">(1 - α) - (1 - β)e<sup>ε</sup></span>
                    <span class="formula-fraction__bottom">(1 - 2α) - (1 - 2β)e<sup>ε</sup></span>
                  </span>
                  <span>，q = 1 - p</span>
                </p>
                </div>
                <div class="calibration-info-section">
                  <div class="calibration-info-title">约束关系</div>
                  <p>概率归一化约束：ARR 属于二值随机响应类协议。真实值以概率 p 保留，其余 d - 1 个取值各以概率 q 上报，因此满足 p + (d - 1)q = 1。当前 d = 2，因此 p + q = 1。</p>
                  <p class="formula formula-line">
                    <span>内在不确定性隐私约束：</span>
                    <span class="formula-fraction formula-fraction--medium">
                      <span class="formula-fraction__top">αp + (1 - α)q</span>
                      <span class="formula-fraction__bottom">βp + (1 - β)q</span>
                    </span>
                    <span>≤ e<sup>ε</sup></span>
                  </p>
                </div>
              </div>
            </div>
        </div>



        <div v-else-if="currentAttribute.name === '日均站立时长分档'" class="attribute-details">
          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">S 与 A 的条件分布矩阵 Pr(A|S)</h3>
              <el-button type="primary" plain :loading="standMatrixLoading" @click="recalculateMatrix">
                {{ standMatrixData ? '重新估计' : '估计条件分布矩阵' }}
              </el-button>
            </div>

            <div v-if="standMatrixLoading" class="matrix-loading">
              <span>正在基于公开背景数据进行统计估计...</span>
            </div>
            <div v-else-if="standMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>BMI类别(S) \ 日均站立时长分档(A)</th>
                    <th
                      v-for="header in STAND_BUCKET_ORDER"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isStandSelectedColumn(header) }]"
                    >
                      <div class="header-cell">
                        <span>{{ header }}</span>
                        <el-tag v-if="isStandSelectedColumn(header)" size="small" type="success" effect="light">αβ来源</el-tag>
                      </div>
                    </th>
                    <th class="row-sum-column">行和</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in standMatrixRows" :key="row.s">
                    <th>{{ row.s }}</th>
                    <td
                      v-for="header in STAND_BUCKET_ORDER"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isStandSelectedColumn(header) }]"
                    >
                      {{ formatProbability(row[header]) }}
                    </td>
                    <td class="row-sum-column">{{ formatProbability(rowSum(row)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="matrix-placeholder">
              <p>点击“估计条件分布矩阵”后，系统将基于公开背景数据进行统计估计，得到条件分布矩阵 Pr(A|S)，用于刻画属性间统计相关性。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">隐私预算 ε</h3>
            <div class="epsilon-card">
              <div class="epsilon-item">
                <span class="epsilon-label">当前隐私预算</span>
                <el-input v-model.number="dialogPrivacyBudget" placeholder="请输入隐私预算" style="width: 200px" />
              </div>
              <el-button type="primary" @click="savePrivacyBudget">保存 ε</el-button>
            </div>
            <div class="epsilon-hint">当前校准将使用 ε = {{ savedPrivacyBudget }}</div>
          </div>

          <div class="module-group">
            <h3 class="module-title">计算依据</h3>
            <div v-if="standColumnStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                  <tr>
                    <th>候选列</th>
                    <th>α<sub>k</sub></th>
                    <th>β<sub>k</sub></th>
                    <th>是否选中</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in standColumnStats" :key="stat.label">
                    <td>{{ stat.label }}</td>
                    <td>
                      <div class="support-param-cell">
                        <strong>{{ formatProbability(stat.alpha) }}</strong>
                        <span v-if="stat.isEmptySet" class="support-param-formula">
                          e<sup>ε</sup> / (1 + e<sup>ε</sup>)
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="support-param-cell">
                        <strong>{{ formatProbability(stat.beta) }}</strong>
                        <span v-if="stat.isEmptySet" class="support-param-formula">
                          1 / (1 + e<sup>ε</sup>)
                        </span>
                      </div>
                    </td>
                    <td>
                      <el-tag v-if="standAlphaBetaResult?.selectedLabel === stat.label" size="small" type="success" effect="light">
                        已选
                      </el-tag>
                      <span v-else class="muted-text">未选</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="final-selection-card">
                <div class="final-selection-title">最终选择结果</div>
                <div class="final-selection-line">最终选定列：{{ standAlphaBetaResult?.selectedLabel }}</div>
                <div class="final-selection-line">
                  选择原因：系统按照专利中的不确定性参数选择规则进行候选对比较。低活动相对中活动满足 α 更大且 β 更小，因此优先于中活动；低活动与高活动比较时，计算 (0.4400 - 0.4200) / (0.2400 - 0.2000) = 0.5000，小于 e^0.5 ≈ 1.6487，因此选择高活动。最终得到 α = 0.4200，β = 0.2000。
                </div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>矩阵尚未计算，暂时无法展示各候选列的 αk / βk 比较结果。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数</h3>
            <div v-if="standAlphaBetaResult" class="result-grid">
              <div class="result-panel accent-panel">
                <div class="result-label">选定列</div>
                <div class="result-value">{{ standAlphaBetaResult.selectedLabel }}</div>
                <div class="result-subtext">系统按专利中的不确定性参数选择规则选中该列。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">α（最大条件概率）</div>
                <div class="result-value">{{ formatProbability(standAlphaBetaResult.alpha) }}</div>
                <div class="result-subtext">在选定列中，对所有 BMI 类别取最大的 Pr(A=a*|S=s)。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">β（最小条件概率）</div>
                <div class="result-value">{{ formatProbability(standAlphaBetaResult.beta) }}</div>
                <div class="result-subtext">在选定列中，对所有 BMI 类别取最小的 Pr(A=a*|S=s)。</div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>条件分布矩阵估计完成后，这里会自动展示 α、β 的结果，无需额外点击计算。</p>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">扰动参数重校准</h3>
              <el-button type="primary" :loading="standCalibrationLoading" @click="calibrateParams">校准扰动参数</el-button>
            </div>
            <div class="result-grid compact-grid">
              <div class="result-panel">
                <div class="result-label">p（保持概率）</div>
                <div class="result-value">{{ standCalibratedParams ? standCalibratedParams.p : '--' }}</div>
              </div>
              <div class="result-panel">
                <div class="result-label">q（翻转概率）</div>
                <div class="result-value">{{ standCalibratedParams ? standCalibratedParams.q : '--' }}</div>
              </div>
            </div>
            <div v-if="agrrPerturbationStatus" class="calibration-status-strip" :class="`is-${agrrPerturbationStatus.statusKey}`">
              <div class="calibration-status-title">{{ agrrPerturbationStatus.title }}</div>
              <div class="calibration-status-desc">{{ agrrPerturbationStatus.description }}</div>
            </div>
            <div v-if="standCalibratedParams" class="calibration-info">
              <div class="calibration-info-section">
                <div class="calibration-info-title">扰动参数</div>
                <p class="formula">若 α / β ≤ e<sup>ε</sup>：p = 1，q = 0</p>
                <p class="formula formula-line">
                  <span>否则：p =</span>
                  <span class="formula-fraction">
                    <span class="formula-fraction__top">(1 - α) - (1 - β)e<sup>ε</sup></span>
                    <span class="formula-fraction__bottom">(1 - dα) - (1 - dβ)e<sup>ε</sup></span>
                  </span>
                  <span>，q =</span>
                  <span class="formula-fraction formula-fraction--compact">
                    <span class="formula-fraction__top">1 - p</span>
                    <span class="formula-fraction__bottom">d - 1</span>
                  </span>
                </p>
                </div>
                <div class="calibration-info-section">
                  <div class="calibration-info-title">约束关系</div>
                  <p>概率归一化约束：AGRR 属于多值随机响应类协议。真实值以概率 p 保留，其余 d - 1 个取值各以概率 q 上报，因此满足 p + (d - 1)q = 1。当前示例属性域大小 d = 3，因此 p + 2q = 1。</p>
                  <p class="formula formula-line">
                    <span>内在不确定性隐私约束：</span>
                    <span class="formula-fraction formula-fraction--medium">
                      <span class="formula-fraction__top">αp + (1 - α)q</span>
                      <span class="formula-fraction__bottom">βp + (1 - β)q</span>
                    </span>
                    <span>≤ e<sup>ε</sup></span>
                  </p>
                </div>
              </div>
            </div>
        </div>

        <div v-else-if="currentAttribute.name === '每日步数分桶'" class="attribute-details">
          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">S 与 A 的条件分布矩阵 Pr(A|S)</h3>
              <el-button type="primary" plain :loading="stepsMatrixLoading" @click="recalculateMatrix">
                {{ stepsMatrixData ? '重新估计' : '估计条件分布矩阵' }}
              </el-button>
            </div>

            <div v-if="stepsMatrixLoading" class="matrix-loading">
              <span>正在基于公开背景数据进行统计估计...</span>
            </div>
            <div v-else-if="stepsMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>BMI类别(S) \ 每日步数分桶(A)</th>
                    <th
                      v-for="header in STEP_BUCKET_ORDER"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isStepsSelectedBucket(header) }]"
                    >
                      <div class="header-cell">
                        <span>{{ header }}</span>
                        <el-tag
                          v-if="isStepsSelectedBucket(header)"
                          size="small"
                          type="success"
                          effect="light"
                        >
                          支持集
                        </el-tag>
                      </div>
                    </th>
                    <th class="row-sum-column">行和</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in stepsMatrixRows" :key="row.s">
                    <th>{{ row.s }}</th>
                    <td
                      v-for="header in STEP_BUCKET_ORDER"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isStepsSelectedBucket(header) }]"
                    >
                      {{ formatProbability(row[header]) }}
                    </td>
                    <td class="row-sum-column">{{ formatProbability(rowSum(row)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="matrix-placeholder">
              <p>点击“估计条件分布矩阵”后，系统将基于公开背景数据进行统计估计，得到条件分布矩阵 Pr(A|S)，用于刻画属性间统计相关性。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">隐私预算 ε</h3>
            <div class="epsilon-card">
              <div class="epsilon-item">
                <span class="epsilon-label">当前隐私预算</span>
                <el-input v-model.number="dialogPrivacyBudget" placeholder="请输入隐私预算" style="width: 200px" />
              </div>
              <el-button type="primary" @click="savePrivacyBudget">保存 ε</el-button>
            </div>
            <div class="epsilon-hint">当前校准将使用 ε = {{ savedPrivacyBudget }}</div>
            <div class="epsilon-hint">AOUE 场景下，支持集构造依赖当前隐私预算 ε，因此需先设置 ε，再计算内在不确定性参数。</div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">支持集与内在不确定性参数计算</h3>
              <el-button type="primary" plain :disabled="!canCalculateStepsSupport" @click="calculateStepsSupportAndAlphaBeta">
                {{ stepsAlphaBetaResult ? '重新计算支持集与 α/β' : '计算支持集与 α/β' }}
              </el-button>
            </div>
            <div v-if="!privacyBudgetSaved" class="empty-state-panel">
              <p>请先设置并保存隐私预算 ε，AOUE 才能按当前 ε 构造支持集 C<sub>ij</sub> 并计算 α、β。</p>
            </div>
            <div v-else-if="!stepsMatrixData" class="empty-state-panel">
              <p>请先估计条件分布矩阵，再基于当前 ε 构造支持集与内在不确定性参数。</p>
            </div>
            <template v-else>
            <h3 class="module-title">计算依据</h3>
            <div v-if="stepsSupportStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                  <tr>
                    <th>敏感状态对</th>
                    <th>支持集</th>
                    <th>覆盖桶</th>
                    <th>α<sub>ij</sub></th>
                    <th>β<sub>ij</sub></th>
                    <th>是否选中</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in stepsSupportStats" :key="stat.label">
                    <td>{{ stat.label }}</td>
                    <td>C<sub>{{ supportPairKey(stat) }}</sub></td>
                    <td>{{ stat.bucketText }}</td>
                    <td>
                      <div class="support-param-cell">
                        <strong>{{ formatProbability(stat.alpha) }}</strong>
                        <span v-if="stat.isEmptySet" class="support-param-formula">
                          e<sup>ε</sup> / (1 + e<sup>ε</sup>)
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="support-param-cell">
                        <strong>{{ formatProbability(stat.beta) }}</strong>
                        <span v-if="stat.isEmptySet" class="support-param-formula">
                          1 / (1 + e<sup>ε</sup>)
                        </span>
                      </div>
                    </td>
                    <td>
                      <el-tag v-if="stepsAlphaBetaResult?.selectedLabel === stat.label" size="small" type="success" effect="light">
                        已选
                      </el-tag>
                      <span v-else class="muted-text">未选</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="final-selection-card">
                <div class="final-selection-title">最终选择结果</div>
                <div class="final-selection-line">最终选中的敏感状态对：{{ stepsAlphaBetaResult?.selectedLabel }}</div>
                <div class="final-selection-line">最终支持集：{{ stepsAlphaBetaResult?.selectedSupportSet?.bucketText }}</div>
                <div class="final-selection-line">最终 α = {{ formatProbability(stepsAlphaBetaResult?.alpha) }}，β = {{ formatProbability(stepsAlphaBetaResult?.beta) }}</div>
                <div class="final-selection-line">系统先按论文中的支持集规则构造所有有序状态对的 C<sub>ij</sub>，再计算每个 (α<sub>ij</sub>, β<sub>ij</sub>)，最后按专利中的不确定性参数选择规则进行候选对比较并选出最终结果。</div>
              </div>

              <div class="support-detail-list">
                <div
                  v-for="stat in stepsSupportStats"
                  :key="`${stat.label}-detail`"
                  :class="['support-detail-card', { 'selected-support-card': stepsAlphaBetaResult?.selectedLabel === stat.label }]"
                >
                  <button
                    type="button"
                    class="support-summary-row"
                    :aria-expanded="isStepsSupportExpanded(stat.label)"
                    @click="toggleStepsSupportDetail(stat.label)"
                  >
                    <el-icon :class="['support-toggle-icon', { 'is-expanded': isStepsSupportExpanded(stat.label) }]">
                      <ArrowRight />
                    </el-icon>
                    <div class="support-summary-main">
                      <div class="support-summary-title">{{ stat.label }}</div>
                      <div class="support-summary-meta">
                        <span>支持集：{{ stat.bucketText }}</span>
                        <span>α = {{ formatProbability(stat.alpha) }}，β = {{ formatProbability(stat.beta) }}</span>
                      </div>
                    </div>
                    <el-tag
                      v-if="stepsAlphaBetaResult?.selectedLabel === stat.label"
                      type="success"
                      effect="light"
                      class="support-summary-tag"
                    >
                      已选
                    </el-tag>
                    <span v-else class="support-summary-status">未选</span>
                  </button>

                  <div v-show="isStepsSupportExpanded(stat.label)" class="support-detail-body">
                    <div class="support-detail-line">敏感状态对：{{ stat.sourcePair[0] }} vs {{ stat.sourcePair[1] }}</div>
                    <div class="support-detail-line">支持集：C<sub>{{ supportPairKey(stat) }}</sub> = {{ stat.bucketText }}</div>
                    <div class="support-detail-line">
                      选取依据：按论文规则构造 C<sub>ij</sub> = { a | Pr(A=a|s<sub>i</sub>) / Pr(A=a|s<sub>j</sub>) >= e<sup>ε</sup> }。
                    </div>
                    <div class="support-detail-line">
                      当前规则：对 {{ stat.sourcePair[0] }} vs {{ stat.sourcePair[1] }}，仅保留满足 Pr(A=a|S={{ stat.sourcePair[0] }}) / Pr(A=a|S={{ stat.sourcePair[1] }}) >= e<sup>ε</sup> 的桶。
                    </div>

                    <div class="support-detail-subtitle">支持集选取过程</div>
                    <div v-for="decision in stat.bucketDecisions" :key="`${stat.label}-${decision.bucket}`" class="support-detail-line mono-line">
                      {{ decision.bucket }}：Pr(A={{ decision.bucket }}|{{ decision.leftStatus }}) = {{ formatProbability(decision.leftProb) }}，
                      Pr(A={{ decision.bucket }}|{{ decision.rightStatus }}) = {{ formatProbability(decision.rightProb) }}，
                      因 Pr({{ decision.bucket }}|{{ decision.leftStatus }}) / Pr({{ decision.bucket }}|{{ decision.rightStatus }})
                      = {{ formatDecisionRatio(decision.ratio) }}
                      <span v-if="decision.included"> >= e<sup>ε</sup> = {{ formatProbability(stat.expEpsilon) }}，纳入 C<sub>ij</sub></span>
                      <span v-else> &lt; e<sup>ε</sup> = {{ formatProbability(stat.expEpsilon) }}，不纳入 C<sub>ij</sub></span>
                    </div>

                    <div class="support-detail-subtitle">α、β 计算算式</div>
                    <div class="support-detail-line mono-line">
                      α<sub>{{ supportPairKey(stat) }}</sub>
                      <template v-if="stat.isEmptySet">
                        = e<sup>ε</sup> / (1 + e<sup>ε</sup>) = {{ formatProbability(stat.alpha) }}
                      </template>
                      <template v-else>
                        = {{ formatTermSum(stat.alphaTerms) }} = {{ formatProbability(stat.alpha) }}
                      </template>
                    </div>
                    <div class="support-detail-line mono-line">
                      β<sub>{{ supportPairKey(stat) }}</sub>
                      <template v-if="stat.isEmptySet">
                        = 1 / (1 + e<sup>ε</sup>) = {{ formatProbability(stat.beta) }}
                      </template>
                      <template v-else>
                        = {{ formatTermSum(stat.betaTerms) }} = {{ formatProbability(stat.beta) }}
                      </template>
                    </div>
                    <div class="support-detail-line mono-line">
                      <template v-if="stat.isEmptySet">
                        由于 C<sub>{{ supportPairKey(stat) }}</sub> = ∅，按默认初始化取 α = {{ formatProbability(stat.alpha) }}，β = {{ formatProbability(stat.beta) }}
                      </template>
                      <template v-else>
                        α = {{ formatProbability(stat.alpha) }}，β = {{ formatProbability(stat.beta) }}
                      </template>
                    </div>
                    <div v-if="stat.isEmptySet" class="support-detail-line">由于支持集为空，页面已按默认初始化展示 α<sub>ij</sub> 与 β<sub>ij</sub>。</div>
                    <div class="support-detail-line">
                      选择状态：
                      <template v-if="stepsAlphaBetaResult?.selectedLabel === stat.label">该敏感状态对为最终选中项。</template>
                      <template v-else>该敏感状态对未被最终选择。</template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>点击“计算支持集与 α/β”后，将按当前 ε 构造 C<sub>ij</sub>，并展示 α<sub>ij</sub>、β<sub>ij</sub> 及其计算过程。</p>
            </div>
            </template>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数</h3>
            <div v-if="!privacyBudgetSaved" class="empty-state-panel">
              <p>请先设置并保存隐私预算 ε。</p>
            </div>
            <div v-else-if="stepsAlphaBetaResult" class="result-grid">
              <div class="result-panel accent-panel">
                <div class="result-label">选定支持集</div>
                <div class="result-value">{{ stepsAlphaBetaResult.selectedLabel }}</div>
                <div class="result-subtext">{{ stepsAlphaBetaResult.selectedSupportSet?.bucketText }}</div>
              </div>
              <div class="result-panel">
                <div class="result-label">α（源状态支持集概率）</div>
                <div class="result-value">{{ formatProbability(stepsAlphaBetaResult.alpha) }}</div>
                <div class="result-subtext">对最终有序状态对的 s_i，在支持集覆盖桶上逐项求和得到。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">β（参照状态支持集概率）</div>
                <div class="result-value">{{ formatProbability(stepsAlphaBetaResult.beta) }}</div>
                <div class="result-subtext">对最终有序状态对的 s_j，在同一支持集覆盖桶上逐项求和得到。</div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>请先基于当前 ε 计算支持集与 α、β。</p>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">扰动参数重校准</h3>
              <el-button
                type="primary"
                :loading="stepsCalibrationLoading"
                :disabled="!privacyBudgetSaved || !stepsAlphaBetaResult"
                @click="calibrateParams"
              >
                校准扰动参数
              </el-button>
            </div>
            <div class="result-grid compact-grid">
                <div class="result-panel">
                  <div class="result-label">p：真实位 1 保留为 1 的概率</div>
                  <div class="result-value">{{ stepsCalibratedParams ? stepsCalibratedParams.p : '--' }}</div>
                </div>
                <div class="result-panel">
                  <div class="result-label">q：非真实位 0 翻转为 1 的概率</div>
                  <div class="result-value">{{ stepsCalibratedParams ? stepsCalibratedParams.q : '--' }}</div>
                </div>
            </div>
            <div class="calibration-tip">先对待采集属性 A 生成初始编码向量，再逐位扰动。</div>
            <div class="calibration-tip">AOUE 中 p、q 表示 one-hot 编码向量每一位的独立扰动概率。</div>
            <div v-if="!privacyBudgetSaved" class="calibration-tip">请先设置并保存隐私预算 ε。</div>
            <div v-else-if="!stepsAlphaBetaResult" class="calibration-tip">请先基于当前 ε 计算支持集与内在不确定性参数。</div>
            <div v-if="stepsCalibratedParams" class="calibration-info">
              <div class="calibration-info-section">
                <div class="calibration-info-title">扰动参数</div>
                  <p class="formula">若 α / β ≤ e<sup>ε</sup>：p = 1，q = 0</p>
                  <p class="formula formula-line">
                    <span>否则：p =</span>
                    <span class="formula-inline-value">1/2</span>
                    <span>，q =</span>
                    <span class="formula-fraction">
                      <span class="formula-fraction__top">α - βe<sup>ε</sup></span>
                      <span class="formula-fraction__bottom">(e<sup>ε</sup> - 1) + 2(α - βe<sup>ε</sup>)</span>
                  </span>
                </p>
                  </div>
                  <div class="calibration-info-section">
                    <div class="calibration-info-title">约束关系</div>
                  <p>AOUE 对 one-hot 编码向量逐位独立扰动，其中 p = Pr(B<sub>i</sub>'=1 | B<sub>i</sub>=1)，q = Pr(B<sub>i</sub>'=1 | B<sub>i</sub>=0)。</p>
                  <p>逐位概率归一化为 p + (1 - p) = 1、q + (1 - q) = 1。</p>
                  <p class="formula formula-line">
                    <span>内在不确定性约束为：</span>
                    <span class="formula-fraction">
                      <span class="formula-fraction__top">αp(1 - q) + (1 - α)(1 - p)q</span>
                      <span class="formula-fraction__bottom">βp(1 - q) + (1 - β)(1 - p)q</span>
                    </span>
                    <span>≤ e<sup>ε</sup></span>
                  </p>
                </div>
              </div>
            </div>
        </div>

        <div v-else-if="currentAttribute.name === '睡眠质量评分'" class="attribute-details">
          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">年龄段 -> 睡眠质量评分缺失状态 Pr(M|S)</h3>
              <el-button type="primary" plain :loading="sleepMissingMatrixLoading" @click="recalculateMatrix">
                {{ sleepMissingMatrixData ? '重新估计' : '估计条件分布矩阵' }}
              </el-button>
            </div>

            <div v-if="sleepMissingMatrixLoading" class="matrix-loading">
              <span>正在基于公开背景数据进行统计估计...</span>
            </div>
            <div v-else-if="sleepMissingMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>年龄段(S) \ 缺失状态(M)</th>
                    <th
                      v-for="header in MISSING_STATUS_ORDER"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isSleepMissingSelectedColumn(header) }]"
                    >
                      <div class="header-cell">
                        <span>{{ header }}</span>
                        <el-tag v-if="isSleepMissingSelectedColumn(header)" size="small" type="success" effect="light">αβ来源</el-tag>
                      </div>
                    </th>
                    <th class="row-sum-column">行和</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sleepMissingMatrixRows" :key="row.s">
                    <th>{{ row.s }}</th>
                    <td
                      v-for="header in MISSING_STATUS_ORDER"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isSleepMissingSelectedColumn(header) }]"
                    >
                      {{ formatProbability(row[header]) }}
                    </td>
                    <td class="row-sum-column">{{ formatProbability(rowSum(row)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="matrix-placeholder">
              <p>点击“估计条件分布矩阵”后，系统将基于公开背景数据进行统计估计，得到缺失状态条件分布矩阵 Pr(M|S)，用于刻画缺失状态与敏感属性之间的统计相关性。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">隐私预算 ε</h3>
            <div class="epsilon-card">
              <div class="epsilon-item">
                <span class="epsilon-label">当前隐私预算</span>
                <el-input v-model.number="dialogPrivacyBudget" placeholder="请输入隐私预算" style="width: 200px" />
              </div>
              <el-button type="primary" @click="savePrivacyBudget">保存 ε</el-button>
            </div>
            <div class="epsilon-hint">当前校准将使用 ε = {{ savedPrivacyBudget }}</div>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数计算依据</h3>
            <div v-if="sleepMissingColumnStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                    <tr>
                      <th>候选列</th>
                      <th>α<sub>k</sub></th>
                      <th>β<sub>k</sub></th>
                      <th>α<sub>k</sub> / β<sub>k</sub></th>
                      <th>是否选中</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="stat in sleepMissingColumnStats" :key="stat.label">
                      <td>{{ stat.label }}</td>
                      <td>{{ formatProbability(stat.max) }}</td>
                      <td>{{ formatProbability(stat.min) }}</td>
                      <td>{{ formatRatio(stat.ratio) }}</td>
                      <td>
                        <el-tag v-if="sleepMissingAlphaBetaResult?.selectedLabel === stat.label" size="small" type="success" effect="light">已选</el-tag>
                        <span v-else class="muted-text">未选</span>
                    </td>
                  </tr>
                </tbody>
                </table>
                <div class="final-selection-card">
                  <div class="final-selection-title">最终选择结果</div>
                  <div class="final-selection-line">缺失状态本身不敏感，但其分布可能泄露年龄段。</div>
                  <div class="final-selection-line">系统分别计算“未缺失”和“缺失”两列的 α<sub>k</sub>/β<sub>k</sub> 比值，用于衡量该状态在不同年龄段之间的区分度。</div>
                  <div class="final-selection-line">未缺失列：0.9600 / 0.8200 = 1.1707；缺失列：0.1800 / 0.0400 = 4.5000。</div>
                  <div class="final-selection-line">由于缺失列的比值更大，说明评分缺失状态对年龄段的区分度更高，因此选取“缺失”列作为 α、β 来源，最终 α = 0.1800，β = 0.0400。</div>
                </div>
              </div>
            <div v-else class="empty-state-panel">
              <p>矩阵尚未计算，暂时无法展示缺失状态列的 αk / βk 比较。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数</h3>
            <div v-if="sleepMissingAlphaBetaResult" class="result-grid">
              <div class="result-panel accent-panel">
                <div class="result-label">选定列</div>
                <div class="result-value">{{ sleepMissingAlphaBetaResult.selectedLabel }}</div>
                <div class="result-subtext">后续两阶段参数校准都基于该列的 α、β。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">α（最大条件概率）</div>
                <div class="result-value">{{ formatProbability(sleepMissingAlphaBetaResult.alpha) }}</div>
              </div>
              <div class="result-panel">
                <div class="result-label">β（最小条件概率）</div>
                <div class="result-value">{{ formatProbability(sleepMissingAlphaBetaResult.beta) }}</div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>缺失状态条件分布矩阵估计完成后，这里会自动展示 α、β。</p>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">两阶段扰动参数校准</h3>
              <div class="calibration-actions">
                <el-tag v-if="sleepMissingCalibratedParams" type="success" effect="light">已校准</el-tag>
                <el-button type="primary" :loading="sleepMissingCalibrationLoading" @click="calibrateParams">校准扰动参数</el-button>
              </div>
            </div>

            <div class="tsp-param-layout">
              <div class="tsp-stage-card">
                <div class="stage-title">第一阶段：有效评分域内扰动参数</div>
                <div class="stage-desc">仅对非缺失样本的有效评分值 {1,2,3,4,5} 执行多值扰动。</div>
                <div class="result-grid compact-grid">
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">p<sub>1</sub></div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.p1 : '--' }}</div>
                    <div class="result-subtext">有效评分值保持不变的概率</div>
                  </div>
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">q<sub>1</sub></div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.q1 : '--' }}</div>
                    <div class="result-subtext">有效评分值扰动为其他有效评分值的概率</div>
                  </div>
                </div>
              </div>

              <div class="tsp-stage-card">
                <div class="stage-title">第二阶段：缺失值与有效值统一域扰动参数</div>
                <div class="stage-desc">对缺失值 0 与第一阶段后的有效评分值统一在 {0,1,2,3,4,5} 上执行扰动。</div>
                <div class="result-grid compact-grid">
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">p<sub>2</sub></div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.p2 : '--' }}</div>
                    <div class="result-subtext">输入值保持不变的概率</div>
                  </div>
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">q<sub>2</sub></div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.q2 : '--' }}</div>
                    <div class="result-subtext">输入值扰动为统一域内其他取值的概率</div>
                  </div>
                </div>
              </div>

              <div class="tsp-stage-card">
                <div class="stage-title">组合恢复参数</div>
                <div class="stage-desc">服务器端聚合时使用 p<sup>*</sup>、q<sup>*</sup> 将两阶段扰动效果合成为最终恢复参数。</div>
                <div class="result-grid compact-grid">
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">p<sup>*</sup></div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.pStar : '--' }}</div>
                    <div class="result-subtext">真实有效评分经两阶段后仍被恢复为原值的组合概率</div>
                  </div>
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">q<sup>*</sup></div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.qStar : '--' }}</div>
                    <div class="result-subtext">其他有效评分经两阶段后被恢复为目标值的组合概率</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="sleepMissingCalibratedParams" class="calibration-info tsp-calibration-info">
              <div class="calibration-info-section">
                <div class="calibration-info-title">扰动参数</div>
                <p>第一阶段只对有效评分域 {1,2,3,4,5} 执行多值扰动，并在已知 p<sub>2</sub>、q<sub>2</sub> 的基础上计算。</p>
                <p class="formula formula-line tsp-formula-line">
                  <span>p<sub>1</sub> =</span>
                  <span class="formula-fraction">
                    <span class="formula-fraction__top">e<sup>ε</sup>p<sub>2</sub> + ((d - 2)e<sup>ε</sup> - (d - 1))q<sub>2</sub></span>
                    <span class="formula-fraction__bottom">(d - 1 + e<sup>ε</sup>)(p<sub>2</sub> - q<sub>2</sub>)</span>
                  </span>
                  <span>，q<sub>1</sub> =</span>
                  <span class="formula-fraction formula-fraction--compact">
                    <span class="formula-fraction__top">1 - p<sub>1</sub></span>
                    <span class="formula-fraction__bottom">d - 1</span>
                  </span>
                </p>
                <p>第二阶段针对缺失值 0 与第一阶段后的有效评分值组成的统一域 {0,1,2,3,4,5} 执行多值扰动。</p>
                <p class="formula formula-line tsp-formula-line">
                  <span>p<sub>2</sub> =</span>
                  <span class="formula-fraction">
                    <span class="formula-fraction__top">(1 - α) - (1 - β)e<sup>ε</sup></span>
                    <span class="formula-fraction__bottom">(1 - (d + 1)α) - (1 - (d + 1)β)e<sup>ε</sup></span>
                  </span>
                  <span>，q<sub>2</sub> =</span>
                  <span class="formula-fraction formula-fraction--compact">
                    <span class="formula-fraction__top">1 - p<sub>2</sub></span>
                    <span class="formula-fraction__bottom">d</span>
                  </span>
                </p>
              </div>
              <div class="calibration-info-section">
                <div class="calibration-info-title">约束关系</div>
                <div class="tsp-constraint-title">概率归一化约束</div>
                <p class="formula tsp-compact-formula">第一阶段：p<sub>1</sub> + 4q<sub>1</sub> = 1</p>
                <p class="formula tsp-compact-formula">第二阶段：p<sub>2</sub> + 5q<sub>2</sub> = 1</p>
                <div class="tsp-constraint-title">隐私约束</div>
                <p class="formula formula-line tsp-formula-line">
                  <span>第二阶段：</span>
                  <span class="formula-fraction">
                    <span class="formula-fraction__top">αp<sub>2</sub> + (1 - α)q<sub>2</sub></span>
                    <span class="formula-fraction__bottom">βp<sub>2</sub> + (1 - β)q<sub>2</sub></span>
                  </span>
                  <span>≤ e<sup>ε</sup></span>
                </p>
                <p class="formula formula-line tsp-formula-line">
                  <span>两阶段整体：</span>
                  <span class="formula-fraction">
                    <span class="formula-fraction__top">p<sub>1</sub>p<sub>2</sub> + (1 - p<sub>1</sub>)q<sub>2</sub></span>
                    <span class="formula-fraction__bottom">q<sub>1</sub>p<sub>2</sub> + (1 - q<sub>1</sub>)q<sub>2</sub></span>
                  </span>
                  <span>≤ e<sup>ε</sup></span>
                </p>
                <div class="tsp-constraint-title">组合恢复参数</div>
                <p class="formula tsp-compact-formula">p<sup>*</sup> = p<sub>1</sub>p<sub>2</sub> + (1 - p<sub>1</sub>)q<sub>2</sub> = {{ sleepMissingCalibratedParams.pStar }}</p>
                <p class="formula tsp-compact-formula">q<sup>*</sup> = q<sub>1</sub>p<sub>2</sub> + (1 - q<sub>1</sub>)q<sub>2</sub> = {{ sleepMissingCalibratedParams.qStar }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-details">
          <p>该属性的详细信息正在整理中。</p>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleDialogCancel">取消</el-button>
          <el-button type="primary" :disabled="!canSaveCurrentConfig" @click="handleSaveAttributeConfig">
            保存配置
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="distributeDialogVisible"
      title="下发确认"
      width="680px"
    >
      <div v-if="distributeAttribute" class="distribute-dialog-body">
        <div class="distribute-task-row">
          <div class="task-id-block">
            <span class="task-id-label">任务 ID</span>
            <el-input v-model="distributeTaskIdDraft" placeholder="请输入任务 ID，留空可自动生成" />
          </div>
          <el-button @click="generateDistributeTaskId">自动生成</el-button>
        </div>

        <div class="distribute-overview-card">
          <div class="overview-title">当前属性下发概览</div>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="overview-label">任务ID</span>
              <span class="overview-value">{{ distributePreviewTaskId || '待生成' }}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">采集属性名称</span>
              <span class="overview-value">{{ distributeAttribute.name }}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">防护模式</span>
              <span class="overview-value">{{ distributeSummary.mode }}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">协议类型</span>
              <span class="overview-value">{{ distributeSummary.protocol }}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">相关敏感属性</span>
              <span class="overview-value">{{ distributeSummary.sensitiveAttribute }}</span>
            </div>
            <div class="overview-item">
              <span class="overview-label">隐私预算 ε</span>
              <span class="overview-value">{{ distributeSummary.epsilon }}</span>
            </div>
            <div class="overview-item overview-item-full">
              <span class="overview-label">关键参数摘要</span>
              <div class="param-chip-list">
                <el-tag
                  v-for="item in distributeSummary.parameterSummary"
                  :key="item"
                  size="small"
                  effect="light"
                >
                  {{ item }}
                </el-tag>
              </div>
            </div>
            <div class="overview-item overview-item-full">
              <span class="overview-label">用户端处理方式摘要</span>
              <span class="overview-value">{{ distributeSummary.userProcessSummary }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="distributeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmDistributeAttribute">
            确认下发
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowDown, ArrowRight, DataAnalysis, Delete, Document, Monitor, QuestionFilled, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import { useTaskStore } from '../../store/task';
import { useUserStore } from '../../store/user';
import {
  FALL_ALARM_DATA_PATH,
  ARR_DEFAULT_DATA_SOURCE_MODE,
  ARR_DATA_SOURCE_MODES,
  buildMatrixRows,
  calculateAlphaBeta,
  loadFallAlarmMatrixFromCSV
} from '../../utils/fallAlarmMatrix.js';
import { FALL_ALARM_ORDER, STEP_BUCKET_ORDER } from '../../utils/constants.js';
import {
  STAND_DURATION_DATA_PATH,
  STAND_BUCKET_ORDER,
  buildStandMatrixRows,
  calculateStandAlphaBeta,
  loadStandMatrixFromCSV
} from '../../utils/standDurationMatrix.js';
import {
  STEPS_WEIGHT_DATA_PATH,
  buildStepsMatrixRows,
  calculateStepsAlphaBeta,
  loadStepsMatrixFromCSV
} from '../../utils/stepsWeightMatrix.js';
import {
  SLEEP_QUALITY_MISSING_DATA_PATH,
  MISSING_STATUS_ORDER,
  buildSleepMissingMatrixRows,
  calculateSleepMissingAlphaBeta,
  loadSleepMissingMatrixFromCSV
} from '../../utils/sleepQualityMissingMatrix.js';
import { calculateARRParameters, calculateAGRParameters, calculateAOUEParameters, calculateTSPParameters } from '../../utils/ldpAlgorithms.js';
import { getTspVersionMeta } from '../../utils/tspProtocol.js';
import { getPerturbationStatus } from '../../utils/perturbationStatus.js';
import {
  CONDITION_PRESET_RUNTIME_NOTICE,
  getConditionDistributionSource
} from '../../utils/conditionDistributionPresets.js';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);

const dialogVisible = ref(false);
const currentAttribute = ref(null);
const distributeDialogVisible = ref(false);
const distributeAttribute = ref(null);
const distributeTaskIdDraft = ref('');
const hasGeneratedMatrix = ref(false);
const privacyBudgetSaved = ref(false);

const basicConfig = ref({
  dataSource: '内置数据',
  privacyBudget: 0.5
});

const dialogPrivacyBudget = ref(0.5);
const savedPrivacyBudget = ref(0.5);

const attributes = ref([
  {
    id: 1,
    name: '是否触发睡眠异常提醒',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'arr',
    status: '未配置',
    fixed: true,
    tooltip: '是否触发睡眠异常提醒与年龄段存在统计相关性，固定采用间接隐私风险 + ARR 协议配置。'
  },
  {
    id: 2,
    name: '日均站立时长分档',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'agrr',
    status: '已配置',
    fixed: true,
    tooltip: '日均站立时长分档与 BMI 类别存在关联关系，使用间接隐私风险 + AGRR协议。'
  },
  {
    id: 3,
    name: '每日步数分桶',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'aoue',
    status: '未配置',
    fixed: true,
    tooltip: '每日步数分桶与 BMI 类别存在关联关系，使用间接隐私风险 + AOUE协议。'
  },
  {
    id: 4,
    name: '睡眠质量评分',
    isProtected: false,
    protectionMode: 'hybrid',
    algorithm: 'tsp',
    status: '未配置',
    fixed: true,
    tooltip: '睡眠质量评分存在缺失状态与年龄段关联，使用混合隐私风险 + TSP协议。'
  }
]);

const matrixHeaders = FALL_ALARM_ORDER;

function formatParamNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(4) : null;
}

function getAttributeDomainSize(attribute) {
  if (attribute.name === '是否触发睡眠异常提醒') return 2;
  if (attribute.name === '日均站立时长分档') return STAND_BUCKET_ORDER.length;
  if (attribute.name === '每日步数分桶') return STEP_BUCKET_ORDER.length;
  if (attribute.name === '睡眠质量评分') return 5;
  return 2;
}

function getSensitiveAttributeLabel(attribute) {
  if (!attribute) return '--';
  if (attribute.name === '日均站立时长分档' || attribute.name === '每日步数分桶') {
    return 'BMI类别';
  }
  return '年龄段';
}

function getProtectionModeLabel(attribute) {
  const mode = String(attribute?.protectionMode || '').toLowerCase();
  return mode === 'hybrid' ? '混合隐私风险' : '间接隐私风险';
}

function getProtocolLabel(attribute) {
  return String(attribute?.algorithm || '--').toUpperCase();
}

function calculateDisplayParams(attribute, config) {
  const calibrated = config?.calibratedParams;
  if (calibrated?.p != null && calibrated?.q != null) {
    return {
      p: formatParamNumber(calibrated.p),
      q: formatParamNumber(calibrated.q)
    };
  }
  if (calibrated?.p1 != null && calibrated?.q1 != null && calibrated?.p2 != null && calibrated?.q2 != null) {
    return {
      p1: formatParamNumber(calibrated.p1),
      q1: formatParamNumber(calibrated.q1),
      p2: formatParamNumber(calibrated.p2),
      q2: formatParamNumber(calibrated.q2)
    };
  }

  const alpha = Number(config?.alphaBetaResult?.alpha);
  const beta = Number(config?.alphaBetaResult?.beta);
  const epsilon = Number(config?.epsilon ?? config?.epsilonDraft);
  if (!Number.isFinite(alpha) || !Number.isFinite(beta) || !Number.isFinite(epsilon)) {
    return null;
  }

  const domainSize = getAttributeDomainSize(attribute);
  if (attribute.algorithm === 'arr') {
    const { p, q } = calculateARRParameters(alpha, beta, epsilon, domainSize);
    return { p: formatParamNumber(p), q: formatParamNumber(q) };
  }
  if (attribute.algorithm === 'agrr') {
    const { p, q } = calculateAGRParameters(alpha, beta, epsilon, domainSize);
    return { p: formatParamNumber(p), q: formatParamNumber(q) };
  }
  if (attribute.algorithm === 'aoue') {
    const { p, q } = calculateAOUEParameters(alpha, beta, epsilon);
    return { p: formatParamNumber(p), q: formatParamNumber(q) };
  }
  if (attribute.algorithm === 'tsp') {
    const { p1, q1, p2, q2 } = calculateTSPParameters(alpha, beta, epsilon, domainSize);
    return {
      p1: formatParamNumber(p1),
      q1: formatParamNumber(q1),
      p2: formatParamNumber(p2),
      q2: formatParamNumber(q2)
    };
  }
  return null;
}

function buildNewParamGroups(attribute, config) {
  const params = calculateDisplayParams(attribute, config);
  if (!params) return [];
    if (attribute.algorithm === 'tsp') {
      return [
        {
          title: '第一阶段：有效评分域内扰动参数',
          params: [
            { name: 'p₁', value: params.p1 ?? '--' },
            { name: 'q₁', value: params.q1 ?? '--' }
          ]
        },
        {
          title: '第二阶段：缺失值与有效值统一域扰动参数',
          params: [
            { name: 'p₂', value: params.p2 ?? '--' },
            { name: 'q₂', value: params.q2 ?? '--' }
        ]
      }
    ];
  }
  return [
    {
      title: '',
      params: [
        { name: 'p', value: params.p ?? '--' },
        { name: 'q', value: params.q ?? '--' }
      ]
    }
  ];
}

function buildTraditionalParamGroups(attribute, config) {
  if (attribute.algorithm === 'tsp') {
    return [];
  }

  const epsilon = Number(config?.epsilon ?? config?.epsilonDraft);
  if (!Number.isFinite(epsilon)) {
    return [];
  }

  const expEpsilon = Math.exp(epsilon);
  if (attribute.algorithm === 'aoue') {
    return [
      {
        title: '',
        params: [
          { name: 'p', value: formatParamNumber(0.5) },
          { name: 'q', value: formatParamNumber(1 / (expEpsilon + 1)) }
        ]
      }
    ];
  }

  const domainSize = getAttributeDomainSize(attribute);
  const p = expEpsilon / (expEpsilon + domainSize - 1);
  const q = 1 / (expEpsilon + domainSize - 1);
  return [
    {
      title: '',
      params: [
        { name: 'p', value: formatParamNumber(p) },
        { name: 'q', value: formatParamNumber(q) }
      ]
    }
  ];
}

const tableAttributes = computed(() =>
  attributes.value.map(attribute => {
    const config = attributeConfigStore.getConfigById(attribute.id);
    return {
      ...attribute,
      configStatus: config ? '已配置' : '未配置',
      newParamGroups: buildNewParamGroups(attribute, config),
      traditionalParamGroups: buildTraditionalParamGroups(attribute, config)
    };
  })
);

const matrixLoading = ref(false);
const fallAlarmMatrixData = ref(null);
const alphaBetaResult = ref(null);
const columnStats = ref([]);
const calibrationLoading = ref(false);
const calibratedParams = ref(null);
const arrDataSourceMode = ref(ARR_DEFAULT_DATA_SOURCE_MODE);
const arrDataSourceLabel = computed(() => (
  ARR_DATA_SOURCE_MODES[arrDataSourceMode.value]?.label || '基于公开背景数据估计的 Pr(A|S) 条件分布矩阵'
));
const arrDataSourceDescription = computed(() => (
  ARR_DATA_SOURCE_MODES[arrDataSourceMode.value]?.description || CONDITION_PRESET_RUNTIME_NOTICE
));

// 站立时长相关状态
const standMatrixLoading = ref(false);
const standMatrixData = ref(null);
const standAlphaBetaResult = ref(null);
const standColumnStats = ref([]);
const standCalibrationLoading = ref(false);
const standCalibratedParams = ref(null);
const arrPerturbationStatus = computed(() => getPerturbationStatus('ARR', calibratedParams.value));
const agrrPerturbationStatus = computed(() => getPerturbationStatus('AGRR', standCalibratedParams.value));

const stepsMatrixLoading = ref(false);
const stepsMatrixData = ref(null);
const stepsAlphaBetaResult = ref(null);
const stepsSupportStats = ref([]);
const expandedStepsSupportLabels = ref(new Set());
const stepsCalibrationLoading = ref(false);
const stepsCalibratedParams = ref(null);

const sleepMissingMatrixLoading = ref(false);
const sleepMissingMatrixData = ref(null);
const sleepMissingAlphaBetaResult = ref(null);
const sleepMissingColumnStats = ref([]);
const sleepMissingCalibrationLoading = ref(false);
const sleepMissingCalibratedParams = ref(null);

const conditionPresetNotice = CONDITION_PRESET_RUNTIME_NOTICE;
const arrPresetSource = computed(() => fallAlarmMatrixData.value?.source || getConditionDistributionSource('arr_sleep_alert_age'));
const standPresetSource = computed(() => standMatrixData.value?.source || getConditionDistributionSource('agrr_activity_bmi'));
const stepsPresetSource = computed(() => stepsMatrixData.value?.source || getConditionDistributionSource('aoue_steps_bmi'));
const sleepMissingPresetSource = computed(() => sleepMissingMatrixData.value?.source || getConditionDistributionSource('tsp_missing_age'));


const matrixRows = computed(() => buildMatrixRows(fallAlarmMatrixData.value));
const selectedColumnRatio = computed(() => alphaBetaResult.value?.selectedStat?.ratio ?? null);
const unselectedColumnRatio = computed(() => {
  if (!alphaBetaResult.value) return null;
  const other = columnStats.value.find(stat => stat.label !== alphaBetaResult.value.selectedLabel);
  return other?.ratio ?? null;
});

// 站立时长矩阵数据
const standMatrixRows = computed(() => buildStandMatrixRows(standMatrixData.value));
const stepsMatrixRows = computed(() => buildStepsMatrixRows(stepsMatrixData.value));
const sleepMissingMatrixRows = computed(() => buildSleepMissingMatrixRows(sleepMissingMatrixData.value));
const canCalculateStepsSupport = computed(() => Boolean(stepsMatrixData.value && privacyBudgetSaved.value));
const canSaveCurrentConfig = computed(() => {
  if (!currentAttribute.value) return false;

  if (currentAttribute.value.name === '是否触发睡眠异常提醒') {
    return Boolean(
      hasGeneratedMatrix.value &&
      alphaBetaResult.value &&
      privacyBudgetSaved.value &&
      calibratedParams.value
    );
  }

  if (currentAttribute.value.name === '日均站立时长分档') {
    return Boolean(
      hasGeneratedMatrix.value &&
      standAlphaBetaResult.value &&
      privacyBudgetSaved.value &&
      standCalibratedParams.value
    );
  }

  if (currentAttribute.value.name === '每日步数分桶') {
    return Boolean(
      hasGeneratedMatrix.value &&
      stepsAlphaBetaResult.value &&
      privacyBudgetSaved.value &&
      stepsCalibratedParams.value
    );
  }

  if (currentAttribute.value.name === '睡眠质量评分') {
    return Boolean(
      hasGeneratedMatrix.value &&
      sleepMissingAlphaBetaResult.value &&
      privacyBudgetSaved.value &&
      sleepMissingCalibratedParams.value
    );
  }

  return true;
});
const distributePreviewTaskId = computed(() => distributeTaskIdDraft.value.trim());
const distributeSummary = computed(() => {
  if (!distributeAttribute.value) {
    return {
      mode: '--',
      protocol: '--',
      sensitiveAttribute: '--',
      epsilon: '--',
      parameterSummary: ['待读取配置'],
      userProcessSummary: '--'
    };
  }

  const config = attributeConfigStore.getConfigById(distributeAttribute.value.id);
  const calibratedParams = config?.calibratedParams || {};
  const protocolMap = {
    arr: 'ARR',
    agrr: 'AGRR',
    aoue: 'AOUE',
    tsp: 'TSP'
  };
  const summaryMap = {
    '是否触发睡眠异常提醒': {
      sensitiveAttribute: '年龄段',
      userProcessSummary: 'ARR：睡眠异常提醒二值采集 + 本地随机响应',
      parameterSummary: [
        `α=${config?.alphaBetaResult?.alpha != null ? formatProbability(config.alphaBetaResult.alpha) : '--'}`,
        `β=${config?.alphaBetaResult?.beta != null ? formatProbability(config.alphaBetaResult.beta) : '--'}`,
        `p=${calibratedParams.p ?? '--'}`,
        `q=${calibratedParams.q ?? '--'}`
      ]
    },
    '日均站立时长分档': {
      sensitiveAttribute: 'BMI类别',
      userProcessSummary: 'AGRR：分档后多值扰动',
      parameterSummary: [
        `α=${config?.alphaBetaResult?.alpha != null ? formatProbability(config.alphaBetaResult.alpha) : '--'}`,
        `β=${config?.alphaBetaResult?.beta != null ? formatProbability(config.alphaBetaResult.beta) : '--'}`,
        `p=${calibratedParams.p ?? '--'}`,
        `q=${calibratedParams.q ?? '--'}`
      ]
    },
    '每日步数分桶': {
      sensitiveAttribute: 'BMI类别',
      userProcessSummary: 'AOUE：分桶 + 初始编码向量 + 逐位扰动',
      parameterSummary: [
        `α=${config?.alphaBetaResult?.alpha != null ? formatProbability(config.alphaBetaResult.alpha) : '--'}`,
        `β=${config?.alphaBetaResult?.beta != null ? formatProbability(config.alphaBetaResult.beta) : '--'}`,
        `p=${calibratedParams.p ?? '--'}`,
        `q=${calibratedParams.q ?? '--'}`
      ]
    },
    '睡眠质量评分': {
      sensitiveAttribute: '年龄段',
      userProcessSummary: 'TSP：先对非缺失有效评分做第一阶段扰动，再对缺失值 0 与处理后有效值统一做第二阶段扰动',
      parameterSummary: [
        `α=${config?.alphaBetaResult?.alpha != null ? formatProbability(config.alphaBetaResult.alpha) : '--'}`,
        `β=${config?.alphaBetaResult?.beta != null ? formatProbability(config.alphaBetaResult.beta) : '--'}`,
        `p₁=${calibratedParams.p1 ?? '--'}`,
        `q₁=${calibratedParams.q1 ?? '--'}`,
        `p₂=${calibratedParams.p2 ?? '--'}`,
        `q₂=${calibratedParams.q2 ?? '--'}`
      ]
    }
  };
  const details = summaryMap[distributeAttribute.value.name] || {
    sensitiveAttribute: '--',
    userProcessSummary: '--',
    parameterSummary: ['--']
  };

  return {
    mode: distributeAttribute.value.protectionMode === 'hybrid' ? '混合隐私风险' : '间接隐私风险',
    protocol: protocolMap[distributeAttribute.value.algorithm] || distributeAttribute.value.algorithm?.toUpperCase() || '--',
    sensitiveAttribute: details.sensitiveAttribute,
    epsilon: config?.epsilon ?? '--',
    parameterSummary: details.parameterSummary,
    userProcessSummary: details.userProcessSummary
  };
});

watch(dialogVisible, visible => {
  if (!visible) {
    resetMatrixState();
  }
});

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

function formatProbability(value) {
  return Number(value).toFixed(4);
}

function formatRatio(value) {
  if (!Number.isFinite(value)) return 'Infinity';
  return Number(value).toFixed(4);
}

function formatDecisionRatio(value) {
  return Number.isFinite(value) ? Number(value).toFixed(4) : 'Infinity';
}

function formatTermSum(terms = []) {
  return Array.isArray(terms) && terms.length
    ? terms.map(value => Number(value).toFixed(4)).join(' + ')
    : '0.0000';
}

function supportPairKey(stat) {
  return Array.isArray(stat?.sourcePair) ? stat.sourcePair.join('') : 'ij';
}

function resetStepsSupportExpansion(result = stepsAlphaBetaResult.value) {
  expandedStepsSupportLabels.value = new Set(result?.selectedLabel ? [result.selectedLabel] : []);
}

function isStepsSupportExpanded(label) {
  return expandedStepsSupportLabels.value.has(label);
}

function toggleStepsSupportDetail(label) {
  const nextLabels = new Set(expandedStepsSupportLabels.value);
  if (nextLabels.has(label)) {
    nextLabels.delete(label);
  } else {
    nextLabels.add(label);
  }
  expandedStepsSupportLabels.value = nextLabels;
}

function rowSum(row) {
  if (!row) return 0;
  if (matrixHeaders.some(header => row[header] !== undefined)) {
    return matrixHeaders.reduce((sum, header) => sum + (row[header] || 0), 0);
  }
  if (STAND_BUCKET_ORDER.some(header => row[header] !== undefined)) {
    return STAND_BUCKET_ORDER.reduce((sum, header) => sum + (row[header] || 0), 0);
  }
  if (MISSING_STATUS_ORDER.some(header => row[header] !== undefined)) {
    return MISSING_STATUS_ORDER.reduce((sum, header) => sum + (row[header] || 0), 0);
  }
  return STEP_BUCKET_ORDER.reduce((sum, header) => sum + (row[header] || 0), 0);
}

function isSelectedColumn(header) {
  return alphaBetaResult.value?.selectedLabel === header;
}

function isStandSelectedColumn(header) {
  return standAlphaBetaResult.value?.selectedLabel === header;
}

function isStepsSelectedBucket(header) {
  return stepsAlphaBetaResult.value?.selectedSupportSet?.buckets?.includes(header);
}

function isSleepMissingSelectedColumn(header) {
  return sleepMissingAlphaBetaResult.value?.selectedLabel === header;
}

function savePrivacyBudget() {
  const nextValue = Number(dialogPrivacyBudget.value);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    ElMessage.warning('请输入大于 0 的隐私预算');
    return;
  }

  savedPrivacyBudget.value = nextValue;
  basicConfig.value.privacyBudget = nextValue;
  privacyBudgetSaved.value = true;
  calibratedParams.value = null;
  arrDataSourceMode.value = ARR_DEFAULT_DATA_SOURCE_MODE;
  standCalibratedParams.value = null;
  stepsCalibratedParams.value = null;
  sleepMissingCalibratedParams.value = null;
  if (standMatrixData.value) {
    const nextStandResult = calculateStandAlphaBeta(standMatrixData.value, nextValue);
    standAlphaBetaResult.value = nextStandResult;
    standColumnStats.value = nextStandResult.columnStats;
  }
  if (stepsMatrixData.value) {
    stepsAlphaBetaResult.value = null;
    stepsSupportStats.value = [];
    expandedStepsSupportLabels.value = new Set();
  }
  if (sleepMissingMatrixData.value) {
    const nextTspResult = calculateSleepMissingAlphaBeta(sleepMissingMatrixData.value, nextValue);
    sleepMissingAlphaBetaResult.value = nextTspResult;
    sleepMissingColumnStats.value = nextTspResult.stats;
  }
  if (currentAttribute.value?.name === '每日步数分桶') {
    stepsAlphaBetaResult.value = null;
    stepsSupportStats.value = [];
    expandedStepsSupportLabels.value = new Set();
  }
  ElMessage.success('隐私预算已保存');
}

function resetMatrixState() {
  fallAlarmMatrixData.value = null;
  alphaBetaResult.value = null;
  columnStats.value = [];
  calibratedParams.value = null;
  standMatrixData.value = null;
  standAlphaBetaResult.value = null;
  standColumnStats.value = [];
  standCalibratedParams.value = null;
  stepsMatrixData.value = null;
  stepsAlphaBetaResult.value = null;
  stepsSupportStats.value = [];
  expandedStepsSupportLabels.value = new Set();
  stepsCalibratedParams.value = null;
  sleepMissingMatrixData.value = null;
  sleepMissingAlphaBetaResult.value = null;
  sleepMissingColumnStats.value = [];
  sleepMissingCalibratedParams.value = null;
  hasGeneratedMatrix.value = false;
  privacyBudgetSaved.value = false;
  dialogPrivacyBudget.value = basicConfig.value.privacyBudget;
  savedPrivacyBudget.value = basicConfig.value.privacyBudget;
}

function buildCurrentConfigPayload() {
  if (currentAttribute.value?.name === '日均站立时长分档') {
    return {
      attributeName: currentAttribute.value.name,
      sceneType: 'standDuration',
      matrixData: standMatrixData.value,
      supportStats: standColumnStats.value,
      alphaBetaResult: standAlphaBetaResult.value,
      epsilon: savedPrivacyBudget.value,
      epsilonDraft: dialogPrivacyBudget.value,
      privacyBudgetSaved: privacyBudgetSaved.value,
      calibratedParams: standCalibratedParams.value,
      notes: {
        dataPath: STAND_DURATION_DATA_PATH,
        dataSourceMode: standMatrixData.value?.source?.dataSourceMode,
        basis: standMatrixData.value?.source?.basis,
        notes: standMatrixData.value?.source?.notes
      }
    };
  }

  if (currentAttribute.value?.name === '每日步数分桶') {
    return {
      attributeName: currentAttribute.value.name,
      sceneType: 'stepsBucket',
      matrixData: stepsMatrixData.value,
      supportStats: stepsSupportStats.value,
      alphaBetaResult: stepsAlphaBetaResult.value,
      epsilon: savedPrivacyBudget.value,
      epsilonDraft: dialogPrivacyBudget.value,
      privacyBudgetSaved: privacyBudgetSaved.value,
      calibratedParams: stepsCalibratedParams.value,
      notes: {
        dataPath: STEPS_WEIGHT_DATA_PATH,
        dataSourceMode: stepsMatrixData.value?.source?.dataSourceMode,
        basis: stepsMatrixData.value?.source?.basis,
        notes: stepsMatrixData.value?.source?.notes
      }
    };
  }

  if (currentAttribute.value?.name === '睡眠质量评分') {
    return {
      attributeName: currentAttribute.value.name,
      sceneType: 'sleepQualityTsp',
      tspVersion: sleepMissingCalibratedParams.value?.tspVersion ?? null,
      matrixData: sleepMissingMatrixData.value,
      columnStats: sleepMissingColumnStats.value,
      alphaBetaResult: sleepMissingAlphaBetaResult.value,
      epsilon: savedPrivacyBudget.value,
      epsilonDraft: dialogPrivacyBudget.value,
      privacyBudgetSaved: privacyBudgetSaved.value,
      calibratedParams: sleepMissingCalibratedParams.value,
      notes: {
        dataPath: SLEEP_QUALITY_MISSING_DATA_PATH,
        dataSourceMode: sleepMissingMatrixData.value?.source?.dataSourceMode,
        missingBasis: sleepMissingMatrixData.value?.source?.basis,
        missingNotes: sleepMissingMatrixData.value?.source?.notes
      }
    };
  }

  return {
    attributeName: currentAttribute.value?.name || '',
    sceneType: 'fallAlarm',
    matrixData: fallAlarmMatrixData.value,
    columnStats: columnStats.value,
    alphaBetaResult: alphaBetaResult.value,
    selectedColumnLabel: alphaBetaResult.value?.selectedLabel || '',
    epsilon: savedPrivacyBudget.value,
    epsilonDraft: dialogPrivacyBudget.value,
    privacyBudgetSaved: privacyBudgetSaved.value,
    calibratedParams: calibratedParams.value,
    notes: {
      dataPath: FALL_ALARM_DATA_PATH,
      dataSourceMode: arrDataSourceMode.value,
      dataSourceDescription: arrDataSourceDescription.value,
      basis: fallAlarmMatrixData.value?.source?.basis,
      notes: fallAlarmMatrixData.value?.source?.notes,
      selectedColumnRatio: selectedColumnRatio.value,
      unselectedColumnRatio: unselectedColumnRatio.value
    }
  };
}

function applySavedConfig(config) {
  if (config?.sceneType === 'standDuration') {
    standMatrixData.value = config?.matrixData || null;
    standAlphaBetaResult.value = config?.alphaBetaResult || null;
    standColumnStats.value = config?.supportStats || config?.alphaBetaResult?.columnStats || [];
    standCalibratedParams.value = config?.calibratedParams || null;
    hasGeneratedMatrix.value = Boolean(config?.matrixData && config?.alphaBetaResult);
    privacyBudgetSaved.value = Boolean(config?.privacyBudgetSaved);
    dialogPrivacyBudget.value = config?.epsilonDraft ?? config?.epsilon ?? basicConfig.value.privacyBudget;
    savedPrivacyBudget.value = config?.epsilon ?? basicConfig.value.privacyBudget;
    return;
  }

  if (config?.sceneType === 'stepsBucket') {
    stepsMatrixData.value = config?.matrixData || null;
    stepsAlphaBetaResult.value = config?.alphaBetaResult || null;
    stepsSupportStats.value = config?.supportStats || config?.alphaBetaResult?.supportStats || [];
    resetStepsSupportExpansion(stepsAlphaBetaResult.value);
    stepsCalibratedParams.value = config?.calibratedParams || null;
    hasGeneratedMatrix.value = Boolean(config?.matrixData && config?.alphaBetaResult);
    privacyBudgetSaved.value = Boolean(config?.privacyBudgetSaved);
    dialogPrivacyBudget.value = config?.epsilonDraft ?? config?.epsilon ?? basicConfig.value.privacyBudget;
    savedPrivacyBudget.value = config?.epsilon ?? basicConfig.value.privacyBudget;
    return;
  }

  if (config?.sceneType === 'sleepQualityTsp') {
    sleepMissingMatrixData.value = config?.matrixData || null;
    sleepMissingAlphaBetaResult.value = config?.alphaBetaResult || null;
    sleepMissingColumnStats.value = config?.columnStats || config?.alphaBetaResult?.stats || [];
    sleepMissingCalibratedParams.value = config?.calibratedParams
      ? {
          ...config.calibratedParams,
          tspVersion: config.calibratedParams.tspVersion ?? config.tspVersion ?? 'paper_unified_budget',
          versionLabel: config.calibratedParams.versionLabel ?? getTspVersionMeta(config.calibratedParams.tspVersion ?? config.tspVersion ?? 'paper_unified_budget').label,
          budgetExplanation: config.calibratedParams.budgetExplanation
            || 'TSP 使用统一的总隐私预算 ε 联合求解两阶段参数。'
        }
      : null;
    hasGeneratedMatrix.value = Boolean(config?.matrixData && config?.alphaBetaResult);
    privacyBudgetSaved.value = Boolean(config?.privacyBudgetSaved);
    dialogPrivacyBudget.value = config?.epsilonDraft ?? config?.epsilon ?? basicConfig.value.privacyBudget;
    savedPrivacyBudget.value = config?.epsilon ?? basicConfig.value.privacyBudget;
    return;
  }

  fallAlarmMatrixData.value = config?.matrixData || null;
  alphaBetaResult.value = config?.alphaBetaResult || null;
  columnStats.value = config?.columnStats || config?.alphaBetaResult?.stats || [];
  calibratedParams.value = config?.calibratedParams || null;
  arrDataSourceMode.value = ARR_DEFAULT_DATA_SOURCE_MODE;
  hasGeneratedMatrix.value = Boolean(config?.matrixData && config?.alphaBetaResult);
  privacyBudgetSaved.value = Boolean(config?.privacyBudgetSaved);
  dialogPrivacyBudget.value = config?.epsilonDraft ?? config?.epsilon ?? basicConfig.value.privacyBudget;
  savedPrivacyBudget.value = config?.epsilon ?? basicConfig.value.privacyBudget;
}

function resetDialogForAttribute(attribute) {
  resetMatrixState();

  const savedConfig = attributeConfigStore.getConfigById(attribute.id);
  if (savedConfig) {
    applySavedConfig(savedConfig);
  }
}

async function recalculateMatrix() {
  if (!currentAttribute.value) return;

  if (currentAttribute.value.name === '是否触发睡眠异常提醒') {
    matrixLoading.value = true;
    calibratedParams.value = null;

    try {
      const result = await loadFallAlarmMatrixFromCSV(FALL_ALARM_DATA_PATH, {
        dataSourceMode: arrDataSourceMode.value
      });
      fallAlarmMatrixData.value = result.matrix;
      const alphaBetaResultData = calculateAlphaBeta(result.matrix);
      alphaBetaResult.value = alphaBetaResultData;
      columnStats.value = alphaBetaResultData.stats;
      hasGeneratedMatrix.value = true;
      ElMessage.success('条件分布矩阵已刷新');
    } catch (error) {
      console.error('重算条件分布矩阵失败:', error);
      ElMessage.error('重算条件分布矩阵失败');
    } finally {
      matrixLoading.value = false;
    }
  } else if (currentAttribute.value.name === '日均站立时长分档') {
    standMatrixLoading.value = true;
    standCalibratedParams.value = null;

    try {
      const matrix = await loadStandMatrixFromCSV();
      standMatrixData.value = matrix;
      const result = calculateStandAlphaBeta(matrix, Number(savedPrivacyBudget.value) || 1.0);
      standAlphaBetaResult.value = result;
      standColumnStats.value = result.columnStats;
      hasGeneratedMatrix.value = true;
      ElMessage.success('条件分布矩阵已刷新');
    } catch (error) {
      console.error('重算条件分布矩阵失败:', error);
      ElMessage.error('重算条件分布矩阵失败');
    } finally {
      standMatrixLoading.value = false;
    }
  } else if (currentAttribute.value.name === '每日步数分桶') {
    stepsMatrixLoading.value = true;
    stepsAlphaBetaResult.value = null;
    stepsSupportStats.value = [];
    expandedStepsSupportLabels.value = new Set();
    stepsCalibratedParams.value = null;

    try {
      const result = await loadStepsMatrixFromCSV();
      stepsMatrixData.value = result.matrix;
      hasGeneratedMatrix.value = true;
      ElMessage.success('条件分布矩阵已刷新，请先保存隐私预算 ε 再计算支持集与内在不确定性参数');
    } catch (error) {
      console.error('重算条件分布矩阵失败:', error);
      ElMessage.error('重算条件分布矩阵失败');
    } finally {
      stepsMatrixLoading.value = false;
    }
  } else if (currentAttribute.value.name === '睡眠质量评分') {
    sleepMissingMatrixLoading.value = true;
    sleepMissingCalibratedParams.value = null;

    try {
      const result = await loadSleepMissingMatrixFromCSV();
      sleepMissingMatrixData.value = result.matrix;
      const alphaBetaResultData = calculateSleepMissingAlphaBeta(
        result.matrix,
        Number(savedPrivacyBudget.value) || 0.5
      );
      sleepMissingAlphaBetaResult.value = alphaBetaResultData;
      sleepMissingColumnStats.value = alphaBetaResultData.stats;
      hasGeneratedMatrix.value = true;
      ElMessage.success('缺失状态条件分布矩阵已刷新');
    } catch (error) {
      console.error('重算条件分布矩阵失败:', error);
      ElMessage.error('重算条件分布矩阵失败');
    } finally {
      sleepMissingMatrixLoading.value = false;
    }
  }
}

function calculateStepsSupportAndAlphaBeta() {
  if (!stepsMatrixData.value) {
    ElMessage.warning('请先估计条件分布矩阵');
    return;
  }

  if (!privacyBudgetSaved.value) {
    ElMessage.warning('请先设置并保存隐私预算 ε');
    return;
  }

  const alphaBetaResultData = calculateStepsAlphaBeta(
    stepsMatrixData.value,
    Number(savedPrivacyBudget.value) || 1.0
  );
  stepsAlphaBetaResult.value = alphaBetaResultData;
  stepsSupportStats.value = alphaBetaResultData.supportStats;
  resetStepsSupportExpansion(alphaBetaResultData);
  stepsCalibratedParams.value = null;
  ElMessage.success('支持集与内在不确定性参数已更新');
}

async function handleAttributeClick(attribute) {
  currentAttribute.value = attribute;
  resetDialogForAttribute(attribute);
  dialogVisible.value = true;

  if (
    attribute.name === '是否触发睡眠异常提醒' &&
    alphaBetaResult.value &&
    !fallAlarmMatrixData.value
  ) {
    await recalculateMatrix();
  }

  if (
    attribute.name === '日均站立时长分档' &&
    standAlphaBetaResult.value &&
    !standMatrixData.value
  ) {
    await recalculateMatrix();
  }

  if (
    attribute.name === '每日步数分桶' &&
    stepsAlphaBetaResult.value &&
    !stepsMatrixData.value
  ) {
    await recalculateMatrix();
  }

  if (
    attribute.name === '睡眠质量评分' &&
    sleepMissingAlphaBetaResult.value &&
    !sleepMissingMatrixData.value
  ) {
    await recalculateMatrix();
  }
}

function calibrateParams() {
  if (!currentAttribute.value) return;

  if (currentAttribute.value.name === '是否触发睡眠异常提醒') {
    if (!alphaBetaResult.value) {
      ElMessage.warning('请先估计条件分布矩阵');
      return;
    }

    if (!privacyBudgetSaved.value) {
      ElMessage.warning('请先填写并保存隐私预算 ε');
      return;
    }

    calibrationLoading.value = true;

    try {
      const epsilon = Number(savedPrivacyBudget.value) || 1.0;
      const d = matrixHeaders.length;
      const { p, q } = calculateARRParameters(alphaBetaResult.value.alpha, alphaBetaResult.value.beta, epsilon, d);

      calibratedParams.value = {
        p: Number(p).toFixed(4),
        q: Number(q).toFixed(4),
        epsilon,
        d,
        protocol: 'ARR (Adaptive Randomized Response)',
        description: '系统基于公开背景数据估计条件分布矩阵 Pr(A|S)，计算内在不确定性参数 α、β，并据此校准扰动参数。',
        dataSource: '基于公开背景数据估计的 Pr(A|S) 条件分布矩阵'
      };

      ElMessage.success('扰动参数校准完成');
    } catch (error) {
      console.error('校准扰动参数失败:', error);
      ElMessage.error('校准扰动参数失败');
    } finally {
      calibrationLoading.value = false;
    }
  } else if (currentAttribute.value.name === '日均站立时长分档') {
    if (!standAlphaBetaResult.value) {
      ElMessage.warning('请先估计条件分布矩阵');
      return;
    }

    if (!privacyBudgetSaved.value) {
      ElMessage.warning('请先填写并保存隐私预算 ε');
      return;
    }

    standCalibrationLoading.value = true;

    try {
      const epsilon = Number(savedPrivacyBudget.value) || 1.0;
      const d = STAND_BUCKET_ORDER.length;
      const { p, q, triggeredByThreshold } = calculateAGRParameters(
        standAlphaBetaResult.value.alpha,
        standAlphaBetaResult.value.beta,
        epsilon,
        d
      );

      standCalibratedParams.value = {
        p: Number(p).toFixed(4),
        q: Number(q).toFixed(4),
        epsilon,
        d,
        protocol: 'AGRR (Adaptive Generalized Randomized Response)',
        description: triggeredByThreshold
          ? `由于 α / β <= e^ε，系统直接取 p = 1、q = 0。当前 α = ${standAlphaBetaResult.value.alpha.toFixed(4)}，β = ${standAlphaBetaResult.value.beta.toFixed(4)}，ε = ${epsilon}。`
          : '系统基于公开背景数据估计条件分布矩阵 Pr(A|S)，计算内在不确定性参数 α、β，并据此校准扰动参数。',
        dataSource: '基于公开背景数据估计的 Pr(A|S) 条件分布矩阵'
      };

      ElMessage.success('扰动参数校准完成');
    } catch (error) {
      console.error('校准扰动参数失败:', error);
      ElMessage.error('校准扰动参数失败');
    } finally {
      standCalibrationLoading.value = false;
    }
  } else if (currentAttribute.value.name === '每日步数分桶') {
    if (!stepsAlphaBetaResult.value) {
      ElMessage.warning('请先估计条件分布矩阵');
      return;
    }

    if (!privacyBudgetSaved.value) {
      ElMessage.warning('请先填写并保存隐私预算 ε');
      return;
    }

    stepsCalibrationLoading.value = true;

    try {
      const epsilon = Number(savedPrivacyBudget.value) || 1.0;
      const { p, q, rawQ, clamped } = calculateAOUEParameters(
        stepsAlphaBetaResult.value.alpha,
        stepsAlphaBetaResult.value.beta,
        epsilon
      );

      stepsCalibratedParams.value = {
        p: Number(p).toFixed(4),
        q: Number(q).toFixed(4),
        epsilon,
        d: STEP_BUCKET_ORDER.length,
        protocol: 'AOUE (Adaptive Optimized Unary Encoding)',
        description: clamped
          ? `系统依据不确定性参数选择规则选中支持集 ${stepsAlphaBetaResult.value.selectedLabel}。AOUE 先对每日步数分桶生成初始编码向量，再逐位扰动；本次原始 q = ${rawQ.toFixed(4)}，已按有效区间裁剪为 ${q.toFixed(4)}。`
          : `系统依据不确定性参数选择规则选中支持集 ${stepsAlphaBetaResult.value.selectedLabel}，先对每日步数分桶生成初始编码向量，再按 AOUE 逐位扰动。`,
        dataSource: '基于公开背景数据估计的 Pr(A|S) 条件分布矩阵'
      };

      ElMessage.success('扰动参数校准完成');
    } catch (error) {
      console.error('校准扰动参数失败:', error);
      ElMessage.error('校准扰动参数失败');
    } finally {
      stepsCalibrationLoading.value = false;
    }
  } else if (currentAttribute.value.name === '睡眠质量评分') {
    if (!sleepMissingAlphaBetaResult.value) {
      ElMessage.warning('请先计算缺失状态条件分布矩阵');
      return;
    }

    if (!privacyBudgetSaved.value) {
      ElMessage.warning('请先填写并保存隐私预算 ε');
      return;
    }

    sleepMissingCalibrationLoading.value = true;

    try {
      const epsilon = Number(savedPrivacyBudget.value) || 1.0;
      const { version, p1, q1, p2, q2, pStar, qStar, scoreDomainSize, unifiedDomainSize } = calculateTSPParameters(
        sleepMissingAlphaBetaResult.value.alpha,
        sleepMissingAlphaBetaResult.value.beta,
        epsilon,
        5
      );
      const versionMeta = getTspVersionMeta(version);

      sleepMissingCalibratedParams.value = {
        tspVersion: version,
        versionLabel: versionMeta.label,
        p1: Number(p1).toFixed(4),
        q1: Number(q1).toFixed(4),
        p2: Number(p2).toFixed(4),
        q2: Number(q2).toFixed(4),
        pStar: Number(pStar).toFixed(4),
        qStar: Number(qStar).toFixed(4),
        alpha: Number(sleepMissingAlphaBetaResult.value.alpha).toFixed(4),
        beta: Number(sleepMissingAlphaBetaResult.value.beta).toFixed(4),
        epsilon,
        d: scoreDomainSize,
        unifiedDomainSize,
        protocol: 'TSP (Two-Stage Perturbation)',
        description: `基于缺失状态矩阵 P(M|S) 计算内在不确定性参数，本次来源为 ${sleepMissingAlphaBetaResult.value.selectedSource || sleepMissingAlphaBetaResult.value.selectedLabel}；第一阶段向非缺失样本的有效评分值 {1,2,3,4,5} 注入等量不确定性，第二阶段再将缺失值 0 与第一阶段处理后的有效评分值统一在 {0,1,2,3,4,5} 上执行扰动并上报。`,
        budgetExplanation: 'TSP 使用统一的总隐私预算 ε。第一阶段在有效评分域上校准 p₁ / q₁，第二阶段在缺失值 0 与有效评分值组成的统一域上校准 p₂ / q₂。整体满足论文中的统一 ε-LDP 约束。',
        dataSource: '基于公开背景数据估计的 Pr(M|S) 条件分布矩阵'
      };

      ElMessage.success('两阶段扰动参数校准完成');
    } catch (error) {
      console.error('校准扰动参数失败:', error);
      ElMessage.error('校准扰动参数失败');
    } finally {
      sleepMissingCalibrationLoading.value = false;
    }
  }
}

function handleDialogCancel() {
  dialogVisible.value = false;
}

function handleSaveAttributeConfig() {
  if (!currentAttribute.value) {
    return;
  }

  if (!canSaveCurrentConfig.value) {
    ElMessage.warning('请先完成矩阵、α/β、ε 和扰动参数校准后再保存配置');
    return;
  }

  attributeConfigStore.saveConfig(currentAttribute.value.id, buildCurrentConfigPayload());
  dialogVisible.value = false;
  ElMessage.success('配置已保存');
}

function handleDeleteConfig(attribute) {
  ElMessageBox.confirm('确认删除当前配置吗？删除后将恢复为未配置状态。', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      attributeConfigStore.deleteConfig(attribute.id);

      if (currentAttribute.value?.id === attribute.id) {
        resetMatrixState();
        dialogVisible.value = false;
      }

      ElMessage.success('配置已删除');
    })
    .catch(() => {});
}

function handleClearAllTaskIds() {
  if (!taskStore.taskList.length) {
    ElMessage.info('当前没有可清空的任务 ID');
    return;
  }

  ElMessageBox.confirm(
    `确认清空当前 ${taskStore.taskList.length} 个任务 ID 吗？该操作不会删除采集任务配置。`,
    '清空任务ID确认',
    {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  )
    .then(() => {
      taskStore.clearTasks();
      ElMessage.success('任务 ID 已清空');
    })
    .catch(() => {});
}

function createGeneratedTaskId(attribute) {
  const protocolPrefix = String(attribute?.algorithm || 'PROTOCOL')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') || 'PROTOCOL';
  const protocolTaskPattern = new RegExp(`^${protocolPrefix}_(\\d+)$`, 'i');
  const usedNumbers = new Set(
    taskStore.taskList
      .map(task => String(task.id || '').match(protocolTaskPattern)?.[1])
      .filter(Boolean)
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value > 0)
  );

  let nextSequence = 1;
  while (usedNumbers.has(nextSequence)) {
    nextSequence += 1;
  }

  return `${protocolPrefix}_${String(nextSequence).padStart(2, '0')}`;
}

function validateTaskId(taskIdValue) {
  if (!taskIdValue) {
    ElMessage.warning('请填写或自动生成任务 ID');
    return false;
  }

  if (taskIdValue.length > 50) {
    ElMessage.warning('任务 ID 长度不能超过 50 个字符');
    return false;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(taskIdValue)) {
    ElMessage.warning('任务 ID 只允许字母、数字、下划线和中划线');
    return false;
  }

  if (taskStore.taskList.some(task => task.id === taskIdValue)) {
    ElMessage.warning('任务 ID 已存在，请更换');
    return false;
  }

  return true;
}

function generateDistributeTaskId() {
  if (!distributeAttribute.value) return;
  distributeTaskIdDraft.value = createGeneratedTaskId(distributeAttribute.value);
}

function openDistributeDialog(attribute) {
  if (!attributeConfigStore.hasConfigById(attribute.id)) {
    ElMessage.warning('请先完成当前任务配置保存，再执行下发');
    return;
  }

  distributeAttribute.value = attribute;
  distributeTaskIdDraft.value = createGeneratedTaskId(attribute);
  distributeDialogVisible.value = true;
}

function confirmDistributeAttribute() {
  if (!distributeAttribute.value) return;

  const nextTaskId = distributeTaskIdDraft.value.trim();
  if (!validateTaskId(nextTaskId)) {
    return;
  }

  const savedConfig = attributeConfigStore.getConfigById(distributeAttribute.value.id);
  if (!savedConfig) {
    ElMessage.warning('当前任务尚无可下发的已保存配置');
    return;
  }

  const taskAttribute = {
    ...JSON.parse(JSON.stringify(distributeAttribute.value)),
    isProtected: true,
    status: '已配置',
    configStatus: '已配置'
  };

  taskStore.addTask({
    id: nextTaskId,
    createdAt: new Date().toISOString(),
    dataSource: savedConfig?.notes?.dataPath || basicConfig.value.dataSource,
    privacyBudget: savedConfig?.epsilon ?? savedPrivacyBudget.value,
    attributes: [taskAttribute],
    distributedAttributeId: distributeAttribute.value.id,
    distributedAttributeName: distributeAttribute.value.name,
    protectionMode: distributeAttribute.value.protectionMode,
    algorithm: distributeAttribute.value.algorithm,
    configSnapshot: JSON.parse(JSON.stringify(savedConfig))
  });

  distributeDialogVisible.value = false;
  ElMessage.success(`属性 ${distributeAttribute.value.name} 已成功下发，任务 ID：${nextTaskId}`);
}

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  dialogPrivacyBudget.value = basicConfig.value.privacyBudget;
  savedPrivacyBudget.value = basicConfig.value.privacyBudget;
});
</script>

<style scoped>
.admin-container {
  height: 100vh;
  overflow: hidden;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left h1 {
  font-size: 20px;
  color: #409eff;
  margin: 0;
}

.user-info {
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.el-menu-vertical-demo {
  height: 100%;
  border-right: none;
}

.el-main {
  height: calc(100vh - 60px);
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #f5f7fa;
}

.config-content {
  padding: 20px;
  padding-bottom: 40px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.card-header-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header-copy > span {
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.card-header-copy p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}

.clear-task-button {
  flex: 0 0 auto;
  color: #64748b;
  border-color: #e2e8f0;
  background: #fff;
}

.clear-task-button:hover,
.clear-task-button:focus {
  color: #475569;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.basic-config,
.attr-config {
  padding: 20px 0;
}

.config-card-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-card-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  gap: 18px;
  padding: 18px;
  border: 1px solid #e8eef5;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.config-card-item:hover {
  border-color: #cfe0f5;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
  transform: translateY(-1px);
}

.config-card-main {
  display: grid;
  grid-template-columns: minmax(210px, 0.76fr) minmax(0, 1.6fr);
  gap: 18px;
  min-width: 0;
}

.config-card-head {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.config-attr-name {
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.45;
}

.scheme-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.param-panel-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
  gap: 12px;
  min-width: 0;
}

.param-panel {
  min-width: 0;
  border-radius: 12px;
  padding: 14px;
  min-height: 148px;
}

.param-panel--new {
  border: 1px solid #b7ebc6;
  background: #f3fdf6;
}

.param-panel--traditional {
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.param-panel-title {
  margin-bottom: 4px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.param-panel-subtitle {
  margin-bottom: 12px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.4;
}

.config-card-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  border-left: 1px solid #eef2f7;
  padding-left: 18px;
}

.status-tag {
  font-weight: 700;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.delete-icon-button {
  color: #94a3b8;
  border-color: #e2e8f0;
  background: #fff;
}

.delete-icon-button:hover,
.delete-icon-button:focus {
  color: #f56c6c;
  border-color: #fbc4c4;
  background: #fff5f5;
}

.config-section {
  margin-bottom: 30px;
}

.config-section h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #303133;
}

.attribute-link {
  cursor: pointer;
  text-decoration: underline;
  color: #409eff;
}

.action-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.param-column-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.param-column-header .el-icon {
  color: #909399;
  cursor: help;
}

.param-display {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.35;
}

.param-display--tsp {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
}

.param-group {
  min-width: 0;
}

.param-group-title {
  margin-bottom: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.param-block-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.param-block {
  min-width: 78px;
  border-radius: 10px;
  padding: 9px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.param-name {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.param-value {
  color: #1f2937;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.param-display--new .param-block {
  border: 1px solid #bbf7d0;
  background: #ecfdf3;
}

.param-display--new .param-value {
  color: #047857;
}

.param-display--traditional .param-block {
  border: 1px solid #e2e8f0;
  background: #fff;
}

.param-display--traditional .param-name,
.param-display--traditional .param-value {
  color: #64748b;
}

.not-applicable {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
  color: #64748b;
  line-height: 1.6;
}

.not-applicable strong {
  color: #475569;
  font-size: 15px;
}

.param-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  white-space: normal;
  overflow-wrap: anywhere;
}

.param-display--new .param-chip {
  color: #166534;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
}

.param-display--traditional .param-chip {
  color: #475569;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.param-muted {
  color: #909399;
  font-size: 12px;
}

.distribute-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.distribute-task-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.task-id-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-id-label {
  font-weight: 700;
  color: #303133;
}

.distribute-overview-card {
  border: 1px solid #dfe6ee;
  border-radius: 10px;
  background: #f8fbff;
  padding: 16px;
}

.overview-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 14px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e4ebf3;
  border-radius: 8px;
  background: #fff;
}

.overview-item-full {
  grid-column: 1 / -1;
}

.overview-label {
  font-size: 13px;
  color: #6b7785;
}

.overview-value {
  font-size: 15px;
  font-weight: 700;
  color: #1f2d3d;
  line-height: 1.6;
}

.param-chip-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.attribute-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-basic-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.detail-basic-item {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #f8fafc;
}

.detail-basic-item span {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
}

.detail-basic-item strong {
  display: block;
  color: #303133;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.scenario-description {
  margin: 0 0 8px;
  color: #425466;
  line-height: 1.7;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item label {
  font-weight: 700;
  color: #303133;
}

.relation-row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.relation-label,
.relation-value {
  font-weight: 700;
}

.grouping-brief {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #f8fafc;
}

.grouping-brief .relation-label {
  color: #64748b;
}

.grouping-brief .relation-value {
  color: #303133;
  line-height: 1.6;
}

.boundary-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.boundary-group,
.module-group {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background-color: #fff;
}

.boundary-title,
.module-title {
  font-weight: 700;
  font-size: 16px;
  color: #303133;
  margin: 0 0 14px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.group-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.group-name {
  font-weight: 700;
  color: #303133;
  min-width: 100px;
}

.group-range {
  color: #409eff;
  font-weight: 500;
}

.matrix-loading,
.matrix-placeholder,
.empty-details,
.empty-state-panel {
  text-align: center;
  padding: 24px;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.matrix-container {
  overflow-x: auto;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 560px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #dfe6ee;
  padding: 10px;
  text-align: center;
}

.matrix-table th {
  background-color: #f7f9fc;
  font-weight: 700;
}

.matrix-table td {
  font-family: 'Courier New', monospace;
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.matrix-value-column.highlight-column {
  background-color: #edf5ff;
}

.row-sum-column {
  background-color: #fafbfc !important;
  color: #9aa4b2;
  font-weight: 500 !important;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.compact-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.result-panel {
  padding: 14px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #f8fbff;
}

.accent-panel {
  border-color: #bfd7ff;
  background: #eef5ff;
}

.result-label {
  font-size: 13px;
  color: #5f6b7a;
  margin-bottom: 8px;
}

.result-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.result-subtext {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7785;
}

.basis-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fbff;
  border: 1px solid #dfe6ee;
}

.basis-table {
  width: 100%;
  border-collapse: collapse;
}

.basis-table th,
.basis-table td {
  border-bottom: 1px solid #e7edf4;
  padding: 10px 8px;
  text-align: left;
  color: #425466;
}

.basis-table th {
  color: #1f2d3d;
  font-weight: 700;
}

.support-param-cell {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1.25;
}

.support-param-formula {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.basis-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #425466;
}

.basis-name {
  min-width: 120px;
  font-weight: 700;
  color: #1f2d3d;
}

.selected-reason {
  font-weight: 700;
  color: #214c9b;
  border-top: 1px dashed #cfd8e3;
  padding-top: 10px;
}

.final-selection-card {
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #eef5ff;
  border: 1px solid #bfd7ff;
}

.final-selection-title {
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 6px;
}

.final-selection-line {
  color: #214c9b;
  font-weight: 600;
  line-height: 1.6;
}

.support-detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.support-detail-card {
  overflow: hidden;
  padding: 0;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #ffffff;
}

.selected-support-card {
  border-color: #c7e8b5;
  background: #f6fff2;
}

.support-summary-row {
  width: 100%;
  border: 0;
  padding: 12px 14px;
  background: transparent;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.support-summary-row:hover,
.support-summary-row:focus-visible {
  background: rgba(64, 158, 255, 0.06);
  outline: none;
}

.selected-support-card .support-summary-row:hover,
.selected-support-card .support-summary-row:focus-visible {
  background: rgba(103, 194, 58, 0.08);
}

.support-toggle-icon {
  color: #64748b;
  font-size: 16px;
  transition: transform 0.18s ease;
}

.support-toggle-icon.is-expanded {
  transform: rotate(90deg);
}

.support-summary-main {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.support-summary-title {
  color: #1f2d3d;
  font-weight: 800;
  white-space: nowrap;
}

.support-summary-meta {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  color: #425466;
  font-size: 13px;
}

.support-summary-tag {
  font-weight: 700;
}

.support-summary-status {
  color: #94a3b8;
  font-weight: 700;
  white-space: nowrap;
}

.support-detail-body {
  border-top: 1px solid #e7edf4;
  padding: 12px 14px 14px 40px;
  background: rgba(255, 255, 255, 0.7);
}

.support-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.support-detail-title,
.support-detail-subtitle {
  font-weight: 700;
  color: #1f2d3d;
}

.support-detail-subtitle {
  margin-top: 10px;
}

.support-detail-line {
  color: #425466;
  line-height: 1.7;
}

.mono-line {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.stage-panel-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.calibration-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.tsp-param-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tsp-stage-card {
  padding: 14px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #f8fbff;
}

.stage-panel {
  padding: 16px;
  border: 1px solid #dfe6ee;
  border-radius: 10px;
  background: #f8fbff;
}

.stage-title {
  font-size: 15px;
  font-weight: 700;
  color: #1f2d3d;
}

.stage-desc {
  margin-top: 6px;
  margin-bottom: 12px;
  color: #6b7785;
  font-size: 13px;
}

.stage-result-panel {
  background: #ffffff;
  min-height: 116px;
}

.stage-check-line {
  margin-top: 10px;
  color: #6b7785;
  font-size: 13px;
}

.tsp-calibration-info {
  margin-top: 12px;
}

.tsp-calibration-info .tsp-formula-line {
  justify-content: center;
  margin: 8px 0 10px;
}

.tsp-constraint-title {
  margin: 10px 0 4px;
  color: #166534;
  font-size: 13px;
  font-weight: 700;
}

.tsp-constraint-title:first-of-type {
  margin-top: 0;
}

.tsp-compact-formula {
  text-align: center;
}

.calibration-summary-bar {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #eef5ff;
  border: 1px solid #bfd7ff;
  color: #214c9b;
  font-weight: 700;
}

.light-summary-card {
  margin-top: 10px;
  padding: 14px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.light-summary-item {
  color: #425466;
  line-height: 1.6;
}

.muted-text {
  color: #98a2b3;
}

.epsilon-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #f8fbff;
}

.epsilon-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.epsilon-label {
  font-weight: 700;
  color: #425466;
}

.epsilon-hint,
.calibration-tip {
  font-size: 13px;
  color: #7b8794;
  margin-top: 8px;
}

.calibration-status-strip {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #d9ecff;
  background: #f4f8ff;
}

.calibration-status-strip.is-no_extra_perturbation {
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.calibration-status-strip.is-active_perturbation {
  background: #fff7e8;
  border-color: #f3d19e;
}

.calibration-status-title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
}

.calibration-status-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #5f6b7a;
}

.calibration-info {
  margin-top: 12px;
  padding: 14px;
  background-color: #f0fff4;
  border-left: 4px solid #67c23a;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calibration-info-section {
  padding-bottom: 10px;
  border-bottom: 1px solid #d9f2df;
}

.calibration-info-section:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.calibration-info-title {
  margin-bottom: 6px;
  color: #166534;
  font-size: 14px;
  font-weight: 700;
}

.calibration-info p {
  margin: 5px 0;
  color: #303133;
  line-height: 1.7;
}

.calibration-info .formula {
  font-family: 'Courier New', monospace;
  color: #606266;
  font-style: italic;
}

.calibration-info .formula-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.formula-fraction {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  min-width: 260px;
  font-style: italic;
}

.formula-fraction--compact {
  min-width: 56px;
}

.formula-fraction--medium {
  min-width: 170px;
}

.formula-inline-value {
  display: inline-block;
  min-width: 34px;
  text-align: center;
  font-style: italic;
}

.formula-fraction__top,
.formula-fraction__bottom {
  display: block;
  width: 100%;
  text-align: center;
  white-space: nowrap;
}

.formula-fraction__top {
  padding: 0 8px 3px;
  border-bottom: 1px solid #606266;
}

.formula-fraction__bottom {
  padding: 3px 8px 0;
}

.fixed-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fixed-value .el-icon {
  color: #909399;
  cursor: help;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1180px) {
  .config-card-item {
    grid-template-columns: 1fr;
  }

  .config-card-side {
    flex-direction: row;
    align-items: center;
    border-left: none;
    border-top: 1px solid #eef2f7;
    padding-left: 0;
    padding-top: 14px;
  }
}

@media (max-width: 768px) {
  .section-header,
  .epsilon-card,
  .distribute-task-row {
    flex-direction: column;
    align-items: stretch;
  }

  .result-grid,
  .compact-grid,
  .overview-grid,
  .config-card-main,
  .param-panel-grid {
    grid-template-columns: 1fr;
  }

  .action-cell,
  .dialog-footer,
  .card-actions {
    justify-content: flex-start;
  }

  .card-header {
    flex-direction: column;
  }

  .config-card-side {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
