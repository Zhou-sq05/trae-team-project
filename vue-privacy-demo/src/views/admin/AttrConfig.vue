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
          <div class="config-content">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>采集属性配置</span>
                </div>
              </template>

              <div class="attr-config">
                <el-table :data="tableAttributes" style="width: 100%">
                  <el-table-column prop="name" label="采集属性" min-width="220">
                    <template #default="scope">
                      <span class="attribute-link" @click="handleAttributeClick(scope.row)">
                        {{ scope.row.name }}
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="防护模式" width="170">
                    <template #default="scope">
                      <div class="fixed-value">
                        <el-tag type="primary">
                          {{ scope.row.protectionMode === 'hybrid' ? '混合隐私风险' : '间接隐私风险' }}
                        </el-tag>
                        <el-tooltip :content="scope.row.tooltip">
                          <el-icon><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="算法协议" width="140">
                    <template #default="scope">
                      <div class="fixed-value">
                        <el-tag type="success">{{ scope.row.algorithm.toUpperCase() }}</el-tag>
                      </div>
                    </template>
                  </el-table-column>
                  <el-table-column label="状态" width="100">
                    <template #default="scope">
                      <el-tag :type="scope.row.configStatus === '已配置' ? 'success' : 'info'">
                        {{ scope.row.configStatus }}
                      </el-tag>
                    </template>
                  </el-table-column>
                      <el-table-column label="操作" width="240">
                        <template #default="scope">
                          <div class="action-cell">
                            <el-button type="primary" link @click="handleAttributeClick(scope.row)">
                              编辑配置
                            </el-button>
                            <el-button
                              type="danger"
                              link
                              :disabled="scope.row.configStatus !== '已配置'"
                              @click="handleDeleteConfig(scope.row)"
                            >
                              删除
                            </el-button>
                        <el-button
                          type="success"
                          link
                          :disabled="scope.row.configStatus !== '已配置'"
                          @click="openDistributeDialog(scope.row)"
                        >
                          下发
                        </el-button>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
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
        <div v-if="currentAttribute.name === '是否触发睡眠异常提醒'" class="attribute-details">
          <div class="form-item relation-row">
            <span class="relation-label">相关敏感属性 S：</span>
            <span class="relation-value">年龄段</span>
          </div>

          <div class="module-group">
            <h3 class="module-title">场景说明</h3>
            <p class="scenario-description">
              该场景将年龄段作为敏感属性 S，将是否触发睡眠异常提醒作为非敏感采集属性 A。由于不同年龄段用户触发睡眠异常提醒的概率存在差异，系统通过条件分布 P(A|S) 计算内在不确定性参数，并结合 ARR 协议完成二值采集值的本地扰动。
            </p>
            <p class="scenario-description">当前数据源模式：{{ arrDataSourceLabel }}</p>
            <p class="scenario-description">{{ arrDataSourceDescription }}</p>
            <p class="scenario-description">{{ conditionPresetNotice }}</p>
            <p class="scenario-description">dataSourceMode：{{ arrPresetSource.dataSourceMode }}；basis：{{ arrPresetSource.basis }}</p>
          </div>

          <div class="form-item">
            <label>年龄段分组</label>
            <div class="boundary-settings">
              <div class="boundary-group">
                <div class="boundary-title">年龄段分组</div>
                <div class="group-display">
                  <div v-for="group in ageGroupDisplay" :key="group.name" class="group-item">
                    <span class="group-name">{{ group.name }}</span>
                    <span class="group-range">{{ group.range }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">S 与 A 的条件分布矩阵 Pr(A|S)</h3>
              <el-button type="primary" plain :loading="matrixLoading" @click="recalculateMatrix">
                {{ fallAlarmMatrixData ? '重新计算' : '计算条件分布矩阵' }}
              </el-button>
            </div>

            <div v-if="matrixLoading" class="matrix-loading">
              <span>正在根据当前数据源模式重新统计睡眠异常提醒条件分布矩阵...</span>
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
              <p>点击“计算条件分布矩阵”后，将根据当前数据源模式自动统计 P(是否触发睡眠异常提醒 | 年龄段)。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">计算依据</h3>
            <div v-if="columnStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                  <tr>
                    <th>候选列</th>
                    <th>max</th>
                    <th>min</th>
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
              <p>条件分布矩阵计算完成后，这里会自动展示 α、β 的结果，无需额外点击计算。</p>
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
            <div class="calibration-tip">由 ε、α、β 自动校准</div>
            <div class="calibration-tip">满足 p + q = 1</div>
            <div v-if="calibratedParams" class="calibration-info">
              <p>隐私预算 ε = {{ calibratedParams.epsilon }}</p>
              <p>域大小 d = {{ calibratedParams.d || calibratedParams.k }}</p>
              <p>协议 = {{ calibratedParams.protocol }}</p>
              <p class="formula">p = e^ε / (e^ε + d - 1), q = 1 / (e^ε + d - 1)</p>
              <p>{{ calibratedParams.description }}</p>
              <p>数据源：{{ calibratedParams.dataSource }}</p>
            </div>
          </div>
        </div>



        <div v-else-if="currentAttribute.name === '日均站立时长分档'" class="attribute-details">
          <div class="form-item relation-row">
            <span class="relation-label">相关敏感属性 S：</span>
            <span class="relation-value">体重状态</span>
          </div>

          <div class="form-item">
            <label>体重状态分组</label>
            <div class="boundary-settings">
              <div class="boundary-group">
                <div class="boundary-title">体重状态分组</div>
                <div class="group-display">
                  <div v-for="status in WEIGHT_STATUS_ORDER" :key="status" class="group-item">
                    <span class="group-name">{{ status }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">S 与 A 的条件分布矩阵 Pr(A|S)</h3>
              <el-button type="primary" plain :loading="standMatrixLoading" @click="recalculateMatrix">
                {{ standMatrixData ? '重新计算' : '计算条件分布矩阵' }}
              </el-button>
            </div>

            <p class="scenario-description">{{ conditionPresetNotice }}</p>
            <p class="scenario-description">dataSourceMode：{{ standPresetSource.dataSourceMode }}；basis：{{ standPresetSource.basis }}</p>
            <div v-if="standMatrixLoading" class="matrix-loading">
              <span>正在从 conditionDistributionPresets.json 读取内置条件分布矩阵...</span>
            </div>
            <div v-else-if="standMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>体重状态(S) \ 日均站立时长分档(A)</th>
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
              <p>点击“计算条件分布矩阵”后，将从 conditionDistributionPresets.json 读取内置矩阵 Pr(A|S)。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">计算依据</h3>
            <div v-if="standColumnStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                  <tr>
                    <th>候选列</th>
                    <th>αk</th>
                    <th>βk</th>
                    <th>ratio</th>
                    <th>是否选中</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in standColumnStats" :key="stat.label">
                    <td>{{ stat.label }}</td>
                    <td>{{ formatProbability(stat.alpha) }}</td>
                    <td>{{ formatProbability(stat.beta) }}</td>
                    <td>{{ formatRatio(stat.ratio) }}</td>
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
                  选择原因：系统依据不确定性参数选择规则，从各候选列的 (αk, βk) 中选出最终 α、β；ratio 仅作为辅助展示指标。
                </div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>矩阵尚未计算，暂时无法展示各候选列的 αk / βk / ratio 比较结果。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数</h3>
            <div v-if="standAlphaBetaResult" class="result-grid">
              <div class="result-panel accent-panel">
                <div class="result-label">选定列</div>
                <div class="result-value">{{ standAlphaBetaResult.selectedLabel }}</div>
                <div class="result-subtext">系统按不确定性参数选择规则选中该列，ratio 仅用于辅助展示。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">α（最大条件概率）</div>
                <div class="result-value">{{ formatProbability(standAlphaBetaResult.alpha) }}</div>
                <div class="result-subtext">在选定列中，对所有体重状态取最大的 Pr(A=a*|S=s)。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">β（最小条件概率）</div>
                <div class="result-value">{{ formatProbability(standAlphaBetaResult.beta) }}</div>
                <div class="result-subtext">在选定列中，对所有体重状态取最小的 Pr(A=a*|S=s)。</div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>条件分布矩阵计算完成后，这里会自动展示 α、β 的结果，无需额外点击计算。</p>
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
            <div class="calibration-tip">由 ε、α、β 自动校准</div>
            <div class="calibration-tip">d = 3 表示 A 的域大小</div>
            <div class="calibration-tip">满足 p + (d-1)q = 1</div>
            <div class="calibration-tip">固定分档顺序：低活动 0-119，中活动 120-239，高活动 240+</div>
            <div v-if="standCalibratedParams" class="calibration-info">
              <p>隐私预算 ε = {{ standCalibratedParams.epsilon }}</p>
              <p>域大小 d = {{ standCalibratedParams.d || standCalibratedParams.k }}</p>
              <p>协议 = {{ standCalibratedParams.protocol }}</p>
              <p class="formula">当 α / β ≤ e^ε 时，直接取 p = 1, q = 0；否则 p = ((1 - α) - (1 - β)e^ε) / ((1 - dα) - (1 - dβ)e^ε)，q = (1 - p)/(d - 1)</p>
              <p>{{ standCalibratedParams.description }}</p>
              <p>数据源：{{ standCalibratedParams.dataSource }}</p>
            </div>
          </div>
        </div>

        <div v-else-if="currentAttribute.name === '每日步数分桶'" class="attribute-details">
          <div class="form-item relation-row">
            <span class="relation-label">相关敏感属性 S：</span>
            <span class="relation-value">体重状态</span>
          </div>

          <div class="form-item">
            <label>体重状态分组</label>
            <div class="boundary-settings">
              <div class="boundary-group">
                <div class="boundary-title">体重状态分组</div>
                <div class="group-display">
                  <div v-for="status in WEIGHT_STATUS_ORDER" :key="status" class="group-item">
                    <span class="group-name">{{ status }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">S 与 A 的条件分布矩阵 Pr(A|S)</h3>
              <el-button type="primary" plain :loading="stepsMatrixLoading" @click="recalculateMatrix">
                {{ stepsMatrixData ? '重新计算' : '计算条件分布矩阵' }}
              </el-button>
            </div>

            <p class="scenario-description">{{ conditionPresetNotice }}</p>
            <p class="scenario-description">dataSourceMode：{{ stepsPresetSource.dataSourceMode }}；basis：{{ stepsPresetSource.basis }}</p>
            <p class="scenario-description">每日步数分布主要参考 Kaggle Daily Steps 字段，并结合 NHANES 中 BMI 与身体活动水平趋势校准。由于 Kaggle 肥胖组样本较少，未直接采用原始极端分布。</p>
            <div v-if="stepsMatrixLoading" class="matrix-loading">
              <span>正在从 conditionDistributionPresets.json 读取内置条件分布矩阵...</span>
            </div>
            <div v-else-if="stepsMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>体重状态(S) \ 每日步数分桶(A)</th>
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
              <p>点击“计算条件分布矩阵”后，将从 conditionDistributionPresets.json 读取内置矩阵 Pr(A|S)。</p>
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
              <p>请先设置并保存隐私预算 ε，AOUE 才能按当前 ε 构造支持集 C_ij 并计算 α、β。</p>
            </div>
            <div v-else-if="!stepsMatrixData" class="empty-state-panel">
              <p>请先计算条件分布矩阵，再基于当前 ε 构造支持集与内在不确定性参数。</p>
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
                    <th>α_ij</th>
                    <th>β_ij</th>
                    <th>ratio</th>
                    <th>是否选中</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in stepsSupportStats" :key="stat.label">
                    <td>{{ stat.label }}</td>
                    <td>{{ `C_${stat.sourcePair[0]}${stat.sourcePair[1]}` }}</td>
                    <td>{{ stat.bucketText }}</td>
                    <td>{{ formatProbability(stat.alpha) }}</td>
                    <td>{{ formatProbability(stat.beta) }}</td>
                    <td>{{ formatRatio(stat.ratio) }}</td>
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
                <div class="final-selection-line">系统先按论文中的支持集规则构造各个 C_ij，再计算每个 (α_ij, β_ij)，最后按不确定性参数选择规则选出最终结果；ratio 仅作辅助展示。</div>
              </div>

              <div class="support-detail-list">
                <div
                  v-for="stat in stepsSupportStats"
                  :key="`${stat.label}-detail`"
                  :class="['support-detail-card', { 'selected-support-card': stepsAlphaBetaResult?.selectedLabel === stat.label }]"
                >
                  <div class="support-detail-header">
                    <div class="support-detail-title">{{ stat.label }}</div>
                    <el-tag v-if="stepsAlphaBetaResult?.selectedLabel === stat.label" type="success" effect="light">最终选中</el-tag>
                  </div>
                  <div class="support-detail-line">敏感状态对：{{ stat.sourcePair[0] }} vs {{ stat.sourcePair[1] }}</div>
                  <div class="support-detail-line">支持集：{{ `C_${stat.sourcePair[0]}${stat.sourcePair[1]}` }} = {{ stat.bucketText }}</div>
                  <div class="support-detail-line">选取依据：{{ stat.supportRule }}</div>
                  <div class="support-detail-line">当前规则：{{ stat.localRule }}</div>

                  <div class="support-detail-subtitle">支持集选取过程</div>
                  <div v-for="decision in stat.bucketDecisions" :key="`${stat.label}-${decision.bucket}`" class="support-detail-line mono-line">
                    {{ decision.bucket }}：Pr(A={{ decision.bucket }}|{{ decision.leftStatus }}) = {{ formatProbability(decision.leftProb) }}，
                    Pr(A={{ decision.bucket }}|{{ decision.rightStatus }}) = {{ formatProbability(decision.rightProb) }}，
                    {{ decision.reason }}
                  </div>

                  <div class="support-detail-subtitle">α、β 计算算式</div>
                  <div class="support-detail-line mono-line">{{ stat.alphaFormula }}</div>
                  <div class="support-detail-line mono-line">{{ stat.betaFormula }}</div>
                  <div class="support-detail-line mono-line">{{ stat.compareFormula }}</div>
                  <div v-if="stat.isEmptySet" class="support-detail-line">由于支持集为空，页面已按默认初始化展示 α_ij 与 β_ij。</div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>点击“计算支持集与 α/β”后，将按当前 ε 构造 C_ij，并展示 α_ij、β_ij 及其计算过程。</p>
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
                <div class="result-label">α（最大条件概率）</div>
                <div class="result-value">{{ formatProbability(stepsAlphaBetaResult.alpha) }}</div>
                <div class="result-subtext">在当前候选支持集对应的 sourcePair 内，对覆盖桶逐项求和后取较大值。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">β（最小条件概率）</div>
                <div class="result-value">{{ formatProbability(stepsAlphaBetaResult.beta) }}</div>
                <div class="result-subtext">在当前候选支持集对应的 sourcePair 内，对覆盖桶逐项求和后取较小值。</div>
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
                <div class="result-label">p（真实位保留为 1 的概率）</div>
                <div class="result-value">{{ stepsCalibratedParams ? stepsCalibratedParams.p : '--' }}</div>
              </div>
              <div class="result-panel">
                <div class="result-label">q（非真实位翻转为 1 的概率）</div>
                <div class="result-value">{{ stepsCalibratedParams ? stepsCalibratedParams.q : '--' }}</div>
              </div>
            </div>
            <div class="calibration-tip">先对 A 生成初始编码向量，再逐位扰动。</div>
            <div class="calibration-tip">AOUE 中真实位的 p 固定为 0.5，q 由 ε、α、β 自动校准。</div>
            <div v-if="!privacyBudgetSaved" class="calibration-tip">请先设置并保存隐私预算 ε。</div>
            <div v-else-if="!stepsAlphaBetaResult" class="calibration-tip">请先基于当前 ε 计算支持集与内在不确定性参数。</div>
            <div v-if="stepsCalibratedParams" class="calibration-info">
              <p>隐私预算 ε = {{ stepsCalibratedParams.epsilon }}</p>
              <p>域大小 d = {{ stepsCalibratedParams.d }}</p>
              <p>协议 = {{ stepsCalibratedParams.protocol }}</p>
              <p class="formula">调用 calculateAOUEParameters(α, β, ε) 计算 q，且 p 固定为 0.5。</p>
              <p>{{ stepsCalibratedParams.description }}</p>
              <p>数据源：{{ stepsCalibratedParams.dataSource }}</p>
            </div>
          </div>
        </div>

        <div v-else-if="currentAttribute.name === '睡眠质量评分'" class="attribute-details">
          <div class="form-item relation-row">
            <span class="relation-label">防护模式：</span>
            <span class="relation-value">混合隐私风险</span>
          </div>

          <div class="form-item relation-row">
            <span class="relation-label">相关敏感属性 S：</span>
            <span class="relation-value">年龄段</span>
          </div>

          <div class="form-item">
            <label>年龄段分组</label>
            <div class="boundary-settings">
              <div class="boundary-group">
                <div class="boundary-title">年龄段分组</div>
                <div class="group-display">
                  <div v-for="group in ageGroupDisplay" :key="group.name" class="group-item">
                    <span class="group-name">{{ group.name }}</span>
                    <span class="group-range">{{ group.range }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">年龄段 -> 睡眠质量评分缺失状态 Pr(M|S)</h3>
              <el-button type="primary" plain :loading="sleepMissingMatrixLoading" @click="recalculateMatrix">
                {{ sleepMissingMatrixData ? '重新计算' : '计算条件分布矩阵' }}
              </el-button>
            </div>

            <p class="scenario-description">该场景属于混合隐私风险：睡眠质量评分有效值本身具有直接隐私风险，而评分缺失状态虽然不是评分值本身，但可能与年龄段相关，从而产生间接隐私风险。系统先基于 P(M|S) 计算缺失状态的内在不确定性，再向有效评分值注入等量不确定性，最后对缺失值与有效值统一扰动，以满足 ε-LDP。</p>
            <p class="scenario-description">dataSourceMode：{{ sleepMissingPresetSource.dataSourceMode }}；basis：{{ sleepMissingPresetSource.basis }}</p>
            <div v-if="sleepMissingMatrixLoading" class="matrix-loading">
              <span>正在从 conditionDistributionPresets.json 读取内置 Pr(M|S)...</span>
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
              <p>点击“计算条件分布矩阵”后，将从 conditionDistributionPresets.json 读取内置矩阵 Pr(M|S)。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数计算依据</h3>
            <div v-if="sleepMissingColumnStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                  <tr>
                    <th>候选列</th>
                    <th>max</th>
                    <th>min</th>
                    <th>ratio</th>
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
                <div class="final-selection-line">最终选定列：{{ sleepMissingAlphaBetaResult?.selectedLabel }}</div>
                <div class="final-selection-line">系统根据缺失状态两列的区分度比较结果，选出 α、β 来源列。</div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>矩阵尚未计算，暂时无法展示缺失状态列的 max / min / ratio 比较。</p>
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
              <p>缺失状态条件分布矩阵计算完成后，这里会自动展示 α、β。</p>
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
            <div class="section-header">
              <h3 class="module-title">扰动参数重校准</h3>
              <el-button type="primary" :loading="sleepMissingCalibrationLoading" @click="calibrateParams">校准扰动参数</el-button>
            </div>
            <div class="stage-panel-group">
              <div class="stage-panel">
                <div class="stage-title">第一阶段：有效评分值扰动参数</div>
                <div class="stage-desc">仅对非缺失样本的有效评分值 {1,2,3,4,5} 执行多值扰动</div>
                <div class="result-grid compact-grid">
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">p1</div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.p1 : '--' }}</div>
                    <div class="result-subtext">保留第一阶段原始有效评分值的概率</div>
                  </div>
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">q1</div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.q1 : '--' }}</div>
                    <div class="result-subtext">扰动到其他有效评分值的概率</div>
                  </div>
                </div>
                <div class="stage-check-line">满足 p1 + (d - 1)q1 = 1；这里 d = 5，因为第一阶段只在有效评分域 {1,2,3,4,5} 上扰动，真值之外只有 4 个错误候选。</div>
              </div>

              <div class="stage-panel">
                <div class="stage-title">第二阶段：统一域扰动参数</div>
                <div class="stage-desc">对缺失值 0 与第一阶段后的有效评分值统一在 {0,1,2,3,4,5} 上执行扰动</div>
                <div class="result-grid compact-grid">
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">p2</div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.p2 : '--' }}</div>
                    <div class="result-subtext">保留第二阶段输入值的概率</div>
                  </div>
                  <div class="result-panel stage-result-panel">
                    <div class="result-label">q2</div>
                    <div class="result-value">{{ sleepMissingCalibratedParams ? sleepMissingCalibratedParams.q2 : '--' }}</div>
                    <div class="result-subtext">扰动到统一域其他取值的概率</div>
                  </div>
                </div>
                <div class="stage-check-line">满足 p2 + dq2 = 1；这里 d = 5、统一域总大小是 d + 1 = 6，因为第二阶段在 {0,1,2,3,4,5} 上扰动时，真值之外只有 5 个错误候选。</div>
              </div>
            </div>
            <div v-if="sleepMissingCalibratedParams" class="calibration-summary-bar">
              已完成两阶段扰动参数校准
            </div>
            <div v-if="sleepMissingCalibratedParams" class="light-summary-card">
              <div class="light-summary-item">隐私预算 ε：{{ sleepMissingCalibratedParams.epsilon }}</div>
              <div class="light-summary-item">TSP 版本：{{ sleepMissingCalibratedParams.versionLabel }}</div>
              <div class="light-summary-item">α / β：{{ sleepMissingCalibratedParams.alpha }} / {{ sleepMissingCalibratedParams.beta }}</div>
              <div class="light-summary-item">第一阶段有效值域：d = 5，对应 {1,2,3,4,5}</div>
              <div class="light-summary-item">第二阶段统一域：d + 1 = 6，对应 {0,1,2,3,4,5}</div>
              <div class="light-summary-item">组合恢复参数 p*：{{ sleepMissingCalibratedParams.pStar }}</div>
              <div class="light-summary-item">组合恢复参数 q*：{{ sleepMissingCalibratedParams.qStar }}</div>
              <div class="light-summary-item">协议：{{ sleepMissingCalibratedParams.protocol }}</div>
              <div class="light-summary-item">数据源：{{ sleepMissingCalibratedParams.dataSource }}</div>
              <div class="light-summary-item">机制说明：{{ sleepMissingCalibratedParams.budgetExplanation || sleepMissingCalibratedParams.description }}</div>
              <div class="light-summary-item">组合恢复参数：p* = p1 × p2 + (1 - p1) × q2，q* = q1 × p2 + (1 - q1) × q2</div>
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
import { ArrowDown, DataAnalysis, Delete, Document, House, Monitor, QuestionFilled, Setting } from '@element-plus/icons-vue';
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
import { AGE_GROUP_DISPLAY, FALL_ALARM_ORDER, STEP_BUCKET_ORDER, WEIGHT_STATUS_ORDER } from '../../utils/constants.js';
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
  dataSource: '模拟数据',
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
    tooltip: '日均站立时长分档与体重状态存在关联关系，使用间接隐私风险 + AGRR协议。'
  },
  {
    id: 3,
    name: '每日步数分桶',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'aoue',
    status: '未配置',
    fixed: true,
    tooltip: '每日步数分桶与体重状态存在关联关系，使用间接隐私风险 + AOUE协议。'
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

const ageGroupDisplay = AGE_GROUP_DISPLAY;
const matrixHeaders = FALL_ALARM_ORDER;

const tableAttributes = computed(() =>
  attributes.value.map(attribute => ({
    ...attribute,
    configStatus: attributeConfigStore.hasConfigById(attribute.id) ? '已配置' : '未配置'
  }))
);

const matrixLoading = ref(false);
const fallAlarmMatrixData = ref(null);
const alphaBetaResult = ref(null);
const columnStats = ref([]);
const calibrationLoading = ref(false);
const calibratedParams = ref(null);
const arrDataSourceMode = ref(ARR_DEFAULT_DATA_SOURCE_MODE);
const arrDataSourceLabel = computed(() => (
  ARR_DATA_SOURCE_MODES[arrDataSourceMode.value]?.label || '内置多源校准矩阵'
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
      sensitiveAttribute: '体重状态',
      userProcessSummary: 'AGRR：分档后多值扰动',
      parameterSummary: [
        `α=${config?.alphaBetaResult?.alpha != null ? formatProbability(config.alphaBetaResult.alpha) : '--'}`,
        `β=${config?.alphaBetaResult?.beta != null ? formatProbability(config.alphaBetaResult.beta) : '--'}`,
        `p=${calibratedParams.p ?? '--'}`,
        `q=${calibratedParams.q ?? '--'}`
      ]
    },
    '每日步数分桶': {
      sensitiveAttribute: '体重状态',
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
        `p1=${calibratedParams.p1 ?? '--'}`,
        `q1=${calibratedParams.q1 ?? '--'}`,
        `p2=${calibratedParams.p2 ?? '--'}`,
        `q2=${calibratedParams.q2 ?? '--'}`
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
    const nextStepsResult = calculateStepsAlphaBeta(stepsMatrixData.value, nextValue);
    stepsAlphaBetaResult.value = nextStepsResult;
    stepsSupportStats.value = nextStepsResult.supportStats;
  }
  if (sleepMissingMatrixData.value) {
    const nextTspResult = calculateSleepMissingAlphaBeta(sleepMissingMatrixData.value, nextValue);
    sleepMissingAlphaBetaResult.value = nextTspResult;
    sleepMissingColumnStats.value = nextTspResult.stats;
  }
  if (currentAttribute.value?.name === '每日步数分桶') {
    stepsAlphaBetaResult.value = null;
    stepsSupportStats.value = [];
    if (stepsMatrixData.value) {
      const nextStepsResult = calculateStepsAlphaBeta(stepsMatrixData.value, nextValue);
      stepsAlphaBetaResult.value = nextStepsResult;
      stepsSupportStats.value = nextStepsResult.supportStats;
    }
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
    ElMessage.warning('请先计算条件分布矩阵');
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
      ElMessage.warning('请先计算条件分布矩阵');
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
        description: `基于 ${alphaBetaResult.value.selectedLabel} 列自动校准扰动参数。`,
        dataSource: fallAlarmMatrixData.value?.source?.label || '内置多源校准矩阵'
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
      ElMessage.warning('请先计算条件分布矩阵');
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
          : `系统依据不确定性参数选择规则选中 ${standAlphaBetaResult.value.selectedLabel} 列，并基于该列的 α、β 自动校准扰动参数。`,
        dataSource: standMatrixData.value?.source?.label || '内置多源校准矩阵'
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
      ElMessage.warning('请先计算条件分布矩阵');
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
        dataSource: stepsMatrixData.value?.source?.label || '内置多源校准矩阵'
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
        budgetExplanation: 'TSP 使用统一的总隐私预算 ε。记有效值域大小 d = 5、统一域总大小 d + 1 = 6。第二阶段先在统一域 {0,1,2,3,4,5} 上求得 p2 / q2，其中满足 p2 + dq2 = 1；第一阶段再在有效评分域 {1,2,3,4,5} 上求得 p1 / q1，其中满足 p1 + (d - 1)q1 = 1。整体满足论文中的统一 ε-LDP 约束。',
        dataSource: sleepMissingMatrixData.value?.source?.label || '内置多源校准矩阵'
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

function createGeneratedTaskId(attribute) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const nameSlug = String(attribute?.algorithm || 'task').toUpperCase();
  
  // 生成两位有序序号
  const todayTaskPrefix = `Task_${nameSlug}_${dateStr}_`;
  const todayTasks = taskStore.taskList.filter(task => task.id.startsWith(todayTaskPrefix));
  const sequenceNumber = todayTasks.length.toString().padStart(2, '0');
  
  return `${todayTaskPrefix}${sequenceNumber}`;
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
    ElMessage.warning('请先完成当前属性配置保存，再执行下发');
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
    ElMessage.warning('当前属性尚无可下发的已保存配置');
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

.config-content {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.basic-config,
.attr-config {
  padding: 20px 0;
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
  padding: 14px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #ffffff;
}

.selected-support-card {
  border-color: #bfd7ff;
  background: #eef5ff;
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
  min-height: 132px;
}

.stage-check-line {
  margin-top: 10px;
  color: #6b7785;
  font-size: 13px;
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
  padding: 12px 14px;
  background-color: #f0fff4;
  border-left: 4px solid #67c23a;
  border-radius: 4px;
}

.calibration-info p {
  margin: 5px 0;
  color: #303133;
}

.calibration-info .formula {
  font-family: 'Courier New', monospace;
  color: #606266;
  font-style: italic;
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

@media (max-width: 768px) {
  .section-header,
  .epsilon-card,
  .distribute-task-row {
    flex-direction: column;
    align-items: stretch;
  }

  .result-grid,
  .compact-grid,
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .action-cell,
  .dialog-footer {
    justify-content: flex-start;
  }
}
</style>
