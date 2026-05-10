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
              {{ user?.username || '管理员' }} <el-icon class="el-icon--right"><ArrowDown /></el-icon>
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
          <div class="aggregate-content">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <div class="header-title-group">
                    <span class="page-title">聚合结果</span>
                  </div>
                  <div class="header-actions">
                    <span class="task-select-label">任务 ID</span>
                    <el-select v-model="selectedTaskId" placeholder="选择任务ID" style="width: 220px">
                      <el-option
                        v-for="task in tasks"
                        :key="task.id"
                        :label="task.id"
                        :value="task.id"
                      />
                    </el-select>
                    <span v-if="usesTspAlignedView" class="task-select-label">批次</span>
                    <el-select v-if="usesTspAlignedView" v-model="selectedBatchId" placeholder="全部批次" clearable style="width: 220px">
                      <el-option label="全部批次" value="" />
                      <el-option
                        v-for="batch in batchOptions"
                        :key="batch.batchId"
                        :label="batch.batchId"
                        :value="batch.batchId"
                      />
                    </el-select>
                  </div>
                </div>
              </template>

              <div v-if="perturbationData.length === 0" class="no-data">
                <el-empty description="暂无聚合结果" />
                <p class="empty-tip">{{ emptyAggregateTip }}</p>
              </div>

              <template v-else-if="currentData">
                <section class="summary-section summary-section--compact">
                  <div class="section-heading">
                    <h3>任务与参数总览</h3>
                  </div>
                  <div class="aggregate-overview">
                    <div class="aggregate-overview__group">
                      <div class="aggregate-overview__title">基础信息</div>
                      <div class="summary-strip">
                        <div class="summary-card summary-card--adaptive" v-for="item in aggregateOverviewBasicCards" :key="item.label">
                          <div class="summary-label">{{ item.label }}</div>
                          <div class="summary-value">{{ item.value }}</div>
                        </div>
                      </div>
                    </div>
                    <div class="aggregate-overview__group">
                      <div class="aggregate-overview__title">协议参数</div>
                      <div v-if="isTspAggregateView" class="tsp-param-groups">
                        <div v-for="group in tspProtocolParameterGroups" :key="group.title" class="tsp-param-group">
                          <div class="tsp-param-group__title">{{ group.title }}</div>
                          <div class="tsp-param-group__items">
                            <div v-for="item in group.items" :key="item.label" class="tsp-param-chip">
                              <span>{{ item.label }}</span>
                              <strong>{{ item.value }}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div v-else class="summary-strip">
                        <div class="summary-card summary-card--adaptive" v-for="item in protocolParameterCards" :key="item.label">
                          <div class="summary-label">{{ item.label }}</div>
                          <div class="summary-value">{{ item.value }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section v-if="isArrAggregateView" class="summary-section">
                  <div class="section-heading section-heading--with-action">
                    <div>
                      <h3>ARR 服务端统计与频数估计</h3>
                      <p>服务端观测计数表示服务器实际接收到的扰动后上报数据统计；聚合频数估计表示基于 ARR 协议参数 p、q 校正后的群体频数估计结果。</p>
                    </div>
                    <el-button type="primary" plain @click="arrEstimateVisible = true" :disabled="arrEstimateVisible">
                      聚合估计
                    </el-button>
                  </div>
                  <div class="detail-table-wrap">
                    <table class="detail-table">
                      <thead>
                        <tr>
                          <th>取值类别</th>
                          <th>服务端观测计数</th>
                          <th>聚合频数估计</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in arrAggregateRows" :key="row.label">
                          <td class="detail-table__label">{{ row.label }}</td>
                          <td class="detail-table__value">{{ row.reportCount }}</td>
                          <td class="detail-table__value arr-estimate-value">{{ arrEstimateVisible ? formatEstimateCount(row.estimatedCount) : '--' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section v-if="isArrAggregateView" class="summary-section compact-section">
                  <div class="section-heading">
                    <h3>ARR 聚合频数估计公式</h3>
                  </div>
                  <div class="formula-card">
                    <p>
                      设服务器收到某一类别的服务端观测计数为 <strong>y</strong>，样本总数为 <strong>n</strong>。由于真实属于该类别的用户以概率 <strong>p</strong> 上报该类别，真实不属于该类别的用户也可能以概率 <strong>q</strong> 被扰动为该类别，因此有：
                    </p>
                    <div class="formula-expression">
                      <span>E[<span class="formula-var">y</span>]</span>
                      <span>=</span>
                      <span><span class="formula-var">p</span> · <span class="formula-var">x</span> + <span class="formula-var">q</span> · (<span class="formula-var">n</span> - <span class="formula-var">x</span>)</span>
                    </div>
                    <p>由此可得到该类别真实计数的无偏估计：</p>
                    <div class="formula-expression">
                      <span><span class="formula-hat">x</span></span>
                      <span>=</span>
                      <span>(<span class="formula-var">y</span> - <span class="formula-var">n</span><span class="formula-var">q</span>) / (<span class="formula-var">p</span> - <span class="formula-var">q</span>)</span>
                    </div>
                    <div class="formula-flow">
                      <span>服务端观测计数 y</span>
                      <span>→</span>
                      <span>代入 ARR 参数 p、q</span>
                      <span>→</span>
                      <span>校正随机扰动偏差</span>
                      <span>→</span>
                      <span>得到群体频数估计 x̂</span>
                    </div>
                    <p class="formula-note">该公式得到的是群体频数估计结果，不会恢复任何单个用户的原始数据。</p>
                  </div>
                </section>

                <section v-if="isAgrrAggregateView" class="summary-section">
                  <div class="section-heading section-heading--with-action">
                    <div>
                      <h3>AGRR 服务端统计与频数估计</h3>
                      <p>服务端观测计数是服务器实际接收到的扰动后数据统计；聚合频数估计是基于 AGRR 随机响应概率进行校正后的群体频数估计结果。</p>
                    </div>
                    <el-button type="primary" plain @click="agrrEstimateVisible = true" :disabled="agrrEstimateVisible">
                      聚合估计
                    </el-button>
                  </div>
                  <div class="detail-table-wrap">
                    <table class="detail-table">
                      <thead>
                        <tr>
                          <th>取值类别</th>
                          <th>服务端观测计数</th>
                          <th>聚合频数估计</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in agrrAggregateRows" :key="row.label">
                          <td class="detail-table__label">{{ row.label }}</td>
                          <td class="detail-table__value">{{ row.reportCount }}</td>
                          <td class="detail-table__value arr-estimate-value">{{ agrrEstimateVisible ? formatEstimateCount(row.estimatedCount) : '--' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p class="arr-table-note">聚合频数估计并不直接等同于服务端观测计数，而是基于 AGRR 随机响应概率进行校正后的群体统计结果。</p>
                </section>

                <section v-if="isAgrrAggregateView" class="summary-section compact-section">
                  <div class="section-heading">
                    <h3>AGRR 聚合频数估计公式</h3>
                  </div>
                  <div class="formula-card">
                    <p>
                      设第 <strong>i</strong> 类的真实群体计数为 <strong>x<sub>i</sub></strong>，服务端观测计数为 <strong>y<sub>i</sub></strong>，样本总数为 <strong>n</strong>，取值域大小为 <strong>d</strong>。在 AGRR 多分类随机响应中，真实属于第 i 类的用户以概率 <strong>p</strong> 上报第 i 类，真实不属于第 i 类的用户也可能以概率 <strong>q</strong> 被扰动为第 i 类，因此有：
                    </p>
                    <div class="formula-expression">
                      <span>E[<span class="formula-var">y<sub>i</sub></span>]</span>
                      <span>=</span>
                      <span><span class="formula-var">p</span> · <span class="formula-var">x<sub>i</sub></span> + <span class="formula-var">q</span> · (<span class="formula-var">n</span> - <span class="formula-var">x<sub>i</sub></span>)</span>
                    </div>
                    <p>整理上式，可得到第 i 类群体频数的无偏估计：</p>
                    <div class="formula-expression">
                      <span><span class="formula-hat">x</span><sub>i</sub></span>
                      <span>=</span>
                      <span>(<span class="formula-var">y<sub>i</sub></span> - <span class="formula-var">n</span><span class="formula-var">q</span>) / (<span class="formula-var">p</span> - <span class="formula-var">q</span>)</span>
                    </div>
                    <div class="formula-flow">
                      <span>扰动后类别计数 y<sub>i</sub></span>
                      <span>→</span>
                      <span>代入 AGRR 参数 p、q</span>
                      <span>→</span>
                      <span>校正多分类随机响应偏差</span>
                      <span>→</span>
                      <span>得到各类别群体频数估计 x̂<sub>i</sub></span>
                    </div>
                    <p class="formula-note">该公式估计的是群体频数，不会恢复任何单个用户的原始数据或敏感属性。</p>
                  </div>
                </section>

                <section v-if="isAoueAggregateView" class="summary-section">
                  <div class="section-heading section-heading--with-action">
                    <div>
                      <h3>AOUE 服务端按维求和与校正估计</h3>
                    </div>
                    <el-button type="primary" plain @click="aoueEstimateVisible = true" :disabled="aoueEstimateVisible">
                      聚合估计
                    </el-button>
                  </div>
                  <div class="detail-table-wrap">
                    <table class="detail-table">
                      <thead>
                        <tr>
                          <th>取值类别</th>
                          <th>one-hot 对应位</th>
                          <th>扰动后 bit=1 求和 y<sub>i</sub></th>
                          <th>观测频率 y<sub>i</sub>/n</th>
                          <th>AOUE 校正计数 x̂<sub>i</sub></th>
                          <th>AOUE 校正频率 x̂<sub>i</sub>/n</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in aoueAggregateRows" :key="row.label">
                          <td class="detail-table__label">{{ row.label }}</td>
                          <td class="detail-table__value">第 {{ row.bitIndex }} 位</td>
                          <td class="detail-table__value">{{ row.reportCount }}</td>
                          <td class="detail-table__value">{{ formatDisplayFrequency(row.observedFrequency) }}</td>
                          <td class="detail-table__value arr-estimate-value">{{ aoueEstimateVisible ? formatEstimateCount(row.estimatedCount) : '--' }}</td>
                          <td class="detail-table__value arr-estimate-value">{{ aoueEstimateVisible ? formatDisplayFrequency(row.correctedFrequency) : '--' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p class="arr-table-note">服务端先按 bit 维度累计 y<sub>i</sub>，再代入 x̂<sub>i</sub> = (y<sub>i</sub> - nq) / (p - q) 得到校正计数。</p>
                </section>

                <section v-if="isAoueAggregateView" class="summary-section compact-section">
                  <div class="section-heading">
                    <h3>AOUE 聚合频数估计公式</h3>
                </div>
                <div class="formula-card">
                  <p>
                      AOUE 中，客户端先将本地取值编码为 one-hot 向量，再对每一位独立扰动。服务端对第 i 个 one-hot 位置上报为 1 的次数求和，记为 y<sub>i</sub>。
                    </p>
                    <p>设 x<sub>i</sub> 表示真实属于第 i 类的用户数，则 y<sub>i</sub> 的期望为：</p>
                    <div class="formula-expression">
                      <span>E[<span class="formula-var">y<sub>i</sub></span>]</span>
                      <span>=</span>
                      <span><span class="formula-var">p</span><span class="formula-var">x<sub>i</sub></span> + <span class="formula-var">q</span>(<span class="formula-var">n</span> - <span class="formula-var">x<sub>i</sub></span>)</span>
                    </div>
                    <p>
                      其中 x<sub>i</sub> 个用户原始 bit 为 1，以概率 p 上报 1；其余 n - x<sub>i</sub> 个用户原始 bit 为 0，以概率 q 上报 1。
                    </p>
                    <p>整理可得：</p>
                    <div class="formula-expression">
                      <span>E[<span class="formula-var">y<sub>i</sub></span>]</span>
                      <span>=</span>
                      <span><span class="formula-var">n</span><span class="formula-var">q</span> + (<span class="formula-var">p</span> - <span class="formula-var">q</span>)<span class="formula-var">x<sub>i</sub></span></span>
                    </div>
                    <p>因此第 i 类的群体频数估计为：</p>
                    <div class="formula-expression">
                      <span><span class="formula-hat">x</span><sub>i</sub></span>
                      <span>=</span>
                      <span>(<span class="formula-var">y<sub>i</sub></span> - <span class="formula-var">n</span><span class="formula-var">q</span>) / (<span class="formula-var">p</span> - <span class="formula-var">q</span>)</span>
                    </div>
                    <div class="formula-flow">
                      <span>扰动后 bit 计数 y<sub>i</sub></span>
                      <span>→</span>
                      <span>建立期望关系 E[y<sub>i</sub>] = px<sub>i</sub> + q(n - x<sub>i</sub>)</span>
                      <span>→</span>
                      <span>解出 x<sub>i</sub></span>
                      <span>→</span>
                      <span>得到各类别群体频数估计 x̂<sub>i</sub></span>
                    </div>
                    <p class="formula-note">该公式得到的是群体频数估计结果，不会恢复任何单个用户的本地采集取值。</p>
                  </div>
                </section>

                <section v-if="isTspAggregateView" class="summary-section">
                  <div class="section-heading">
                    <h3>TSP 聚合校正估计结果</h3>
                    <p>该表基于第二阶段最终上报计数，以及 TSP 的 p1、q1、p2、q2 参数，整体反推缺失值和各有效取值的计数估计。</p>
                  </div>
                  <div class="detail-table-wrap">
                    <table class="detail-table">
                      <thead>
                        <tr>
                          <th>取值类别</th>
                          <th>最终上报频率</th>
                          <th>TSP 校正频数估计</th>
                          <th>TSP 校正频率</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in tspCorrectedRows" :key="row.label">
                          <td class="detail-table__label">{{ row.label }}</td>
                          <td class="detail-table__value">{{ formatDisplayFrequency(row.observedFrequency) }}</td>
                          <td class="detail-table__value arr-estimate-value">{{ formatEstimateCount(row.estimatedCount) }}</td>
                          <td class="detail-table__value arr-estimate-value">{{ formatDisplayFrequency(row.correctedFrequency) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section v-if="isTspAggregateView" class="summary-section compact-section">
                  <div class="section-heading">
                    <h3>TSP 聚合频数估计公式</h3>
                  </div>
                  <div class="formula-card">
                    <p>
                      设样本总数为 <strong>n</strong>，统一上报值域为 {0,1,2,...,K}，其中 <strong>0</strong> 表示缺失值，<strong>1~K</strong> 表示评分取值。记真实缺失计数为 <strong>x<sub>0</sub></strong>，真实第 <strong>v</strong> 类有效评分计数为 <strong>x<sub>v</sub></strong>，服务端观测到的扰动后计数分别为 <strong>y<sub>0</sub></strong>、<strong>y<sub>v</sub></strong>。TSP 协议采用两阶段扰动机制，参数为 <strong>p1</strong>、<strong>q1</strong>、<strong>p2</strong>、<strong>q2</strong>。
                    </p>
                    <p>
                      对于缺失值 <strong>0</strong>，由于其不参与第一阶段，仅在第二阶段随机响应中以概率 <strong>p2</strong> 保持为 0、以概率 <strong>q2</strong> 扰动到其他值，因此有：
                    </p>
                    <div class="formula-expression">
                      <span>E[<span class="formula-var">y<sub>0</sub></span>]</span>
                      <span>=</span>
                      <span><span class="formula-var">p<sub>2</sub></span> · <span class="formula-var">x<sub>0</sub></span> + <span class="formula-var">q<sub>2</sub></span> · (<span class="formula-var">n</span> - <span class="formula-var">x<sub>0</sub></span>)</span>
                    </div>
                    <p>整理上式，可得到缺失值计数的无偏估计：</p>
                    <div class="formula-expression">
                      <span><span class="formula-hat">x</span><sub>0</sub></span>
                      <span>=</span>
                      <span>(<span class="formula-var">y<sub>0</sub></span> - <span class="formula-var">n</span><span class="formula-var">q<sub>2</sub></span>) / (<span class="formula-var">p<sub>2</sub></span> - <span class="formula-var">q<sub>2</sub></span>)</span>
                    </div>
                    <p>
                      对于某个有效评分类别 <strong>v</strong>，原始属于第 v 类的用户在两阶段扰动后仍上报为第 v 类的概率记为 <strong>p*</strong>，原始属于其他有效类别的用户最终上报为第 v 类的概率记为 <strong>q*</strong>，其中：
                    </p>
                    <div class="formula-expression">
                      <span><span class="formula-var">p*</span></span>
                      <span>=</span>
                      <span><span class="formula-var">p<sub>1</sub></span>·<span class="formula-var">p<sub>2</sub></span> + (<span class="formula-var">K</span> - 1)·<span class="formula-var">q<sub>1</sub></span>·<span class="formula-var">q<sub>2</sub></span></span>
                    </div>
                    <div class="formula-expression">
                      <span><span class="formula-var">q*</span></span>
                      <span>=</span>
                      <span><span class="formula-var">q<sub>1</sub></span>·<span class="formula-var">p<sub>2</sub></span> + <span class="formula-var">q<sub>2</sub></span>·(1 - <span class="formula-var">q<sub>1</sub></span>)</span>
                    </div>
                    <p>因此，第 v 类扰动后观测计数满足：</p>
                    <div class="formula-expression">
                      <span>E[<span class="formula-var">y<sub>v</sub></span>]</span>
                      <span>=</span>
                      <span><span class="formula-var">q<sub>2</sub></span>·<span class="formula-var">x<sub>0</sub></span> + <span class="formula-var">p*</span>·<span class="formula-var">x<sub>v</sub></span> + <span class="formula-var">q*</span>·((<span class="formula-var">n</span> - <span class="formula-var">x<sub>0</sub></span>) - <span class="formula-var">x<sub>v</sub></span>)</span>
                    </div>
                    <p>整理上式，可得到第 v 类有效评分计数的无偏估计：</p>
                    <div class="formula-expression">
                      <span><span class="formula-hat">x</span><sub>v</sub></span>
                      <span>=</span>
                      <span>(<span class="formula-var">y<sub>v</sub></span> - <span class="formula-hat">x</span><sub>0</sub><span class="formula-var">q<sub>2</sub></span> - (<span class="formula-var">n</span> - <span class="formula-hat">x</span><sub>0</sub>)<span class="formula-var">q*</span>) / (<span class="formula-var">p*</span> - <span class="formula-var">q*</span>)</span>
                    </div>
                    <div class="formula-flow">
                      <span>扰动后缺失计数 y<sub>0</sub> / 类别计数 y<sub>v</sub></span>
                      <span>→</span>
                      <span>代入 TSP 参数 p1、q1、p2、q2</span>
                      <span>→</span>
                      <span>先校正缺失值频数偏差</span>
                      <span>→</span>
                      <span>再校正有效评分类别偏差</span>
                      <span>→</span>
                      <span>得到各类别群体频数估计 x̂<sub>0</sub>、x̂<sub>v</sub></span>
                    </div>
                    <p class="formula-note">该公式估计的是群体频数，不会恢复任何单个用户的原始评分或缺失状态。</p>
                  </div>
                </section>

                <el-alert
                  v-if="isArrAggregateView"
                  class="server-view-alert server-view-alert--bottom"
                  type="info"
                  show-icon
                  :closable="false"
                >
                  <template #title>
                    <div class="server-view-alert__content">
                      <span>
                        服务端视角说明：真实系统中，服务器只能接收客户端上传的扰动后值，并基于协议参数进行频率估计。本页面不展示用户原始值、真实计数和误差指标；这些内容仅在误差评估页面中用于模拟验证。
                      </span>
                      <el-button size="small" type="primary" plain @click="goToExperimentComparison">
                        查看误差评估
                      </el-button>
                    </div>
                  </template>
                </el-alert>

                <el-alert
                  v-if="isAgrrAggregateView"
                  class="server-view-alert server-view-alert--bottom"
                  type="info"
                  show-icon
                  :closable="false"
                >
                  <template #title>
                    <div class="server-view-alert__content">
                      <span>
                        服务端视角说明：真实系统中，服务器只能接收客户端上传的扰动后值，并基于 AGRR 协议参数进行频率估计。本页面不展示用户原始值、真实计数和误差指标；这些内容仅在误差评估页面中用于模拟验证。
                      </span>
                      <el-button size="small" type="primary" plain @click="goToExperimentComparison">
                        查看误差评估
                      </el-button>
                    </div>
                  </template>
                </el-alert>

                <el-alert
                  v-if="isAoueAggregateView"
                  class="server-view-alert server-view-alert--bottom"
                  type="info"
                  show-icon
                  :closable="false"
                >
                  <template #title>
                    <div class="server-view-alert__content">
                      <span>
                        服务端接收客户端上传的 AOUE 扰动后 one-hot 编码向量，并对每个 bit 维度上报为 1 的次数进行求和，再基于 AOUE 参数 p、q 进行频数校正。本页面仅展示服务端可见的扰动后向量统计与校正估计结果。
                      </span>
                      <el-button size="small" type="primary" plain @click="goToExperimentComparison">
                        查看误差评估
                      </el-button>
                    </div>
                  </template>
                </el-alert>

                <el-alert
                  v-if="isTspAggregateView"
                  class="server-view-alert server-view-alert--bottom"
                  type="info"
                  show-icon
                  :closable="false"
                >
                  <template #title>
                    <div class="server-view-alert__content">
                      <span>
                        服务端视角说明：TSP 聚合端基于两阶段扰动后的观测结果和协议参数进行校正估计。本页面仅展示服务端可见的扰动观测统计与 TSP 聚合校正估计结果；用户原始值、真实计数和误差指标仅在误差评估页面中用于模拟验证。
                      </span>
                      <el-button size="small" type="primary" plain @click="goToExperimentComparison">
                        查看误差评估
                      </el-button>
                    </div>
                  </template>
                </el-alert>

                <section v-if="!isArrAggregateView && !isAgrrAggregateView && !isAoueAggregateView && !isTspAggregateView" class="summary-section">
                  <div class="section-heading">
                    <h3>核心结果指标</h3>
                    <p v-if="coreSectionDescription">{{ coreSectionDescription }}</p>
                  </div>
                  <div class="summary-grid core-grid">
                    <div class="core-card" :class="item.cardClass" v-for="item in coreMetricCards" :key="item.label">
                      <div class="summary-label metric-title-row">
                        <span>{{ item.label }}</span>
                        <el-tooltip
                          v-if="item.tooltip"
                          placement="top"
                          effect="light"
                        >
                          <template #content>
                            <div class="formula-tooltip">
                              <div class="formula-line">{{ item.tooltip.formula }}</div>
                              <div class="formula-line" v-for="line in item.tooltip.notes" :key="line">{{ line }}</div>
                            </div>
                          </template>
                          <el-icon class="metric-info-icon"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                      <div class="core-value">{{ item.value }}</div>
                      <div v-if="item.isStatus" class="status-chip">{{ item.value }}</div>
                      <div class="core-subtext">{{ item.helper }}</div>
                    </div>
                  </div>
                </section>

                <section v-if="!isArrAggregateView && !isAgrrAggregateView && !isAoueAggregateView && !isTspAggregateView && currentData.algorithm === 'TSP' && tspDiagnostics" class="summary-section">
                  <div class="section-heading">
                    <h3>服务端接收计数</h3>
                    <p>这里直接展示服务端收到的统一域计数 c0, c1, ..., c5，其中 c0 对应上报值 0，ci 对应上报值 i（i=1..5）。</p>
                  </div>
                  <div class="summary-strip">
                    <div class="summary-card summary-card--adaptive" v-for="item in tspReportedCountCards" :key="item.label">
                      <div class="summary-label">{{ item.label }}</div>
                      <div class="summary-value">{{ item.value }}</div>
                    </div>
                  </div>
                  <div class="metric-tip metric-tip--highlight">
                    当前参与聚合记录数：{{ tspDiagnostics.scope.recordCount }}；
                    task_id 分布：{{ formatDistributionMap(tspDiagnostics.scope.taskDistribution) }}；
                    batch_id 分布：{{ formatDistributionMap(tspDiagnostics.scope.batchDistribution) }}
                  </div>
                </section>

                <section v-if="!isArrAggregateView && !isAgrrAggregateView && !isAoueAggregateView && !isTspAggregateView" class="summary-section">
                  <div class="section-heading">
                    <h3>{{ currentData.algorithm === 'TSP' ? '聚合结果分块' : `${currentData.algorithm} 服务端统计与频数估计` }}</h3>
                  </div>

                  <div class="result-blocks">
                    <div v-for="(section, index) in resultSections" :key="section.key" class="result-block">
                      <div class="section-heading result-block__heading">
                        <h4>{{ section.title }}</h4>
                        <p>{{ section.description }}</p>
                      </div>
                      <div class="compare-layout">
                        <div class="compare-panel compare-panel--table">
                          <table class="compare-table">
                            <thead>
                              <tr class="group-header">
                                <th rowspan="2">状态</th>
                                <th colspan="3">计数</th>
                                <th colspan="3">频率</th>
                              </tr>
                              <tr>
                                <th>真实值</th>
                                <th>聚合频数估计</th>
                                <th>计数误差</th>
                                <th>真实频率</th>
                                <th>估计频率</th>
                                <th>频率误差</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="row in section.compareRows" :key="`${section.key}-${row.label}`">
                                <td>{{ row.label }}</td>
                                <td>{{ formatMetric(row.trueCount) }}</td>
                                <td>{{ formatMetric(row.estimatedCount) }}</td>
                                <td :class="['error-text', row.countError > 0 ? 'increase' : row.countError < 0 ? 'decrease' : 'neutral']">
                                  {{ formatArrowDelta(row.countError) }}
                                </td>
                                <td>{{ formatFrequency(row.trueFreq) }}</td>
                                <td>{{ formatFrequency(row.estimatedFreq) }}</td>
                                <td :class="['error-text', row.freqError > 0 ? 'increase' : row.freqError < 0 ? 'decrease' : 'neutral']">
                                  {{ formatFrequencyArrowDelta(row.freqError) }}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div class="compare-panel compare-panel--chart">
                          <div class="mini-chart-title">{{ section.chartTitle }}</div>
                          <div class="mini-chart-box">
                            <div class="chart-container" :ref="el => setComparisonChartRef(el, index)"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section v-if="!isArrAggregateView && !isAgrrAggregateView && !isAoueAggregateView && !isTspAggregateView && currentData.algorithm === 'TSP'" class="summary-section compact-section">
                  <div class="section-heading">
                    <h3>{{ detailSectionTitle }}</h3>
                    <p>{{ detailSectionDescription }}</p>
                  </div>
                  <div class="detail-table-wrap">
                    <table class="detail-table">
                      <thead>
                        <tr>
                          <th>指标名称</th>
                          <th>数值</th>
                          <th>说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in detailMetricCards" :key="item.label">
                          <td class="detail-table__label">{{ item.label }}</td>
                          <td class="detail-table__value">{{ item.value }}</td>
                          <td class="detail-table__desc">{{ item.description || '--' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </template>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Setting, Document, DataAnalysis, ArrowDown, QuestionFilled, Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'
import { getAggregateResults as getTspAlignedAggregateResults } from '../../services/taskAggregateResultService'
import { getAvailableBatches, getTspAggregateDiagnostics } from '../../services/aggregateDiagnosticsService'
import { getAggregateResults as getLegacyAggregateResults } from '../../services/taskAggregateMetricsService'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activeMenu = computed(() => route.path)
const user = computed(() => userStore.user)

const tasks = ref([])
const selectedTaskId = ref('')
const selectedBatchId = ref('')
const perturbationData = ref([])
const selectedData = ref(1)
const comparisonChartRefs = ref([])
const arrEstimateVisible = ref(false)
const agrrEstimateVisible = ref(false)
const aoueEstimateVisible = ref(false)
const arrChartRef = ref(null)
const agrrChartRef = ref(null)
const tspStageFlowChartRef = ref(null)
const tspFrequencyChartRef = ref(null)
const tspVarianceChartRef = ref(null)
const tspDiagnostics = ref(null)
let comparisonChartInstances = []
let arrChartInstance = null
let agrrChartInstance = null
let tspStageFlowChartInstance = null
let tspFrequencyChartInstance = null
let tspVarianceChartInstance = null

const currentData = computed(() => perturbationData.value.find(item => item.id === selectedData.value) || null)
const selectedTask = computed(() => tasks.value.find(task => String(task.id) === String(selectedTaskId.value)) || null)
const usesTspAlignedView = computed(() => String(selectedTask.value?.protocol || '').toUpperCase() === 'TSP')
const isSelectedArrTask = computed(() => {
  const attribute = selectedTask.value?.attributes?.[0]
  return selectedTask.value?.algorithm === 'arr'
    || attribute?.algorithm === 'arr'
    || attribute?.name === '是否触发睡眠异常提醒'
})
const isArrAggregateView = computed(() => currentData.value?.algorithm === 'ARR')
const isAgrrAggregateView = computed(() => currentData.value?.algorithm === 'AGRR')
const isAoueAggregateView = computed(() => currentData.value?.algorithm === 'AOUE')
const isTspAggregateView = computed(() => currentData.value?.algorithm === 'TSP')
const emptyAggregateTip = computed(() => (
  isSelectedArrTask.value
    ? '请先通过用户端“演示：ARR 多客户端上报”生成扰动后上报数据，再查看聚合结果。'
    : '请先完成用户端上报当前任务的数据，再查看聚合结果。'
))

const compactSummaryCards = computed(() => {
  return currentData.value?.summaryCards || []
})

const aggregateSampleCount = computed(() => {
  const count = isTspAggregateView.value ? tspSampleCount.value : Number(currentData.value?.sampleCount ?? 0)
  return Number.isFinite(count) ? String(Math.round(count)) : '0'
})

const aggregateEpsilon = computed(() => {
  if (isTspAggregateView.value) {
    return String(tspConfigValues.value.epsilon ?? '--')
  }
  return String(currentData.value?.epsilon ?? selectedTask.value?.configSnapshot?.epsilon ?? selectedTask.value?.privacyBudget ?? '--')
})

const aggregateProtectionMode = computed(() => {
  const attribute = selectedTask.value?.attributes?.[0] || {}
  return currentData.value?.protectionMode
    || selectedTask.value?.protectionMode
    || selectedTask.value?.configSnapshot?.protectionMode
    || attribute.protectionMode
    || attribute.mode
    || attribute.privacyMode
    || '--'
})

const aggregateOverviewBasicCards = computed(() => {
  const cards = [
    { label: '任务名称', value: currentData.value?.attributeName || selectedTask.value?.name || selectedTask.value?.title || '--' },
    { label: '任务 ID', value: currentData.value?.taskId || selectedTask.value?.id || '--' },
    { label: '协议', value: currentData.value?.algorithm || selectedTask.value?.protocol || '--' },
    { label: '防护模式', value: aggregateProtectionMode.value },
    { label: '样本量 n', value: aggregateSampleCount.value },
    { label: '隐私预算 ε', value: aggregateEpsilon.value }
  ]
  if (isAgrrAggregateView.value) {
    cards.splice(1, 0,
      { label: '收集属性', value: '日均站立时长分档' },
      { label: '关联敏感属性', value: 'BMI类别' }
    )
  }
  return cards
})

const protocolParameterCards = computed(() => {
  if (isArrAggregateView.value) {
    return arrParamCards.value.filter(item => item.label.startsWith('p') || item.label.startsWith('q'))
  }
  if (isAgrrAggregateView.value) {
    return agrrParamCards.value.filter(item => item.label.includes('d') || item.label.startsWith('p') || item.label.startsWith('q'))
  }
  if (isAoueAggregateView.value) {
    return aoueParamCards.value.filter(item => item.label.includes('d') || item.label.startsWith('p') || item.label.startsWith('q'))
  }
  return []
})

const tspProtocolParameterGroups = computed(() => {
  const config = tspConfigValues.value
  return [
    {
      title: '第一阶段参数',
      items: [
        { label: 'p1', value: formatProbability(config.p1) },
        { label: 'q1', value: formatProbability(config.q1) }
      ]
    },
    {
      title: '第二阶段参数',
      items: [
        { label: 'p2', value: formatProbability(config.p2) },
        { label: 'q2', value: formatProbability(config.q2) }
      ]
    },
    {
      title: '组合恢复参数',
      items: [
        { label: 'p*', value: formatProbability(config.pStar) },
        { label: 'q*', value: formatProbability(config.qStar) }
      ]
    }
  ]
})

const coreMetricCards = computed(() => {
  return currentData.value?.coreMetricCards || []
})

const coreSectionDescription = computed(() => {
  if (currentData.value?.algorithm === 'TSP') {
    return '核心指标以频率估计方差衡量协议精度，MSE / MAE 仅用于辅助展示本次实验与真实分布之间的误差。'
  }
  return ''
})

const detailMetricCards = computed(() => {
  return currentData.value?.detailMetricCards || []
})

const detailSectionTitle = computed(() => {
  return currentData.value?.algorithm === 'TSP' ? '实验对照指标与参数' : '详细指标'
})

const detailSectionDescription = computed(() => {
  if (currentData.value?.algorithm === 'TSP') {
    return '这里保留 MSE / MAE、计数误差以及参数口径，用于实验对照、答辩补充和公式核查，不作为 TSP 的核心理论主指标。'
  }
  return '这些指标用于补充评估和参数说明，不作为页面的第一视觉重点。'
})

const resultSections = computed(() => {
  return currentData.value?.resultSections || []
})

const batchOptions = computed(() => {
  if (!selectedTaskId.value) return []
  return getAvailableBatches(selectedTaskId.value)
})

const tspReportedCountCards = computed(() => {
  const counts = tspDiagnostics.value?.reportDomainCounts || []
  return counts.map((value, index) => ({
    label: `c${index}`,
    value: String(value ?? 0)
  }))
})

const tspSampleCount = computed(() => Number(currentData.value?.sampleCount ?? 0) || 0)

const tspLabels = computed(() => {
  const rows = currentData.value?.compareRows || []
  return rows.length ? rows.map(row => row.label) : ['缺失值 0', '1 分', '2 分', '3 分', '4 分', '5 分']
})

const tspReportCounts = computed(() => {
  return tspLabels.value.map((_, index) => Number(currentData.value?.reportCounts?.[index] ?? 0))
})

const tspDisplayEstimatedCounts = computed(() => {
  const total = tspSampleCount.value
  const rawCounts = tspLabels.value.map((_, index) => Number(currentData.value?.estimatedCounts?.[index] ?? currentData.value?.compareRows?.[index]?.estimatedCount ?? 0))
  const nonNegativeCounts = rawCounts.map(value => Math.max(0, Number(value) || 0))
  const currentSum = nonNegativeCounts.reduce((sum, value) => sum + value, 0)

  if (!total || !nonNegativeCounts.length) {
    return nonNegativeCounts.map(() => 0)
  }

  if (currentSum <= 0) {
    const uniformValue = total / nonNegativeCounts.length
    return nonNegativeCounts.map(() => Number(uniformValue.toFixed(4)))
  }

  return nonNegativeCounts.map(value => Number(((value / currentSum) * total).toFixed(4)))
})

const tspConfigValues = computed(() => {
  const params = currentData.value?.perturbParams || currentData.value?.diagnostics?.config || tspDiagnostics.value?.config || {}
  const d2 = Number(currentData.value?.domainSize ?? tspLabels.value.length)
  const d1 = Math.max(1, d2 - 1)
  return {
    epsilon: currentData.value?.epsilon ?? selectedTask.value?.privacyBudget ?? '--',
    d1,
    d2,
    p1: Number(params.p1),
    q1: Number(params.q1),
    p2: Number(params.p2),
    q2: Number(params.q2),
    pStar: Number(params.pStar),
    qStar: Number(params.qStar),
    alpha: Number(currentData.value?.alpha),
    beta: Number(currentData.value?.beta)
  }
})

const tspOverviewCards = computed(() => {
  const config = tspConfigValues.value
  const intrinsicEnabled = Number(config.alpha) > 0 || Number(config.beta) > 0
  return [
    { label: '任务名称', value: currentData.value?.attributeName || '睡眠质量评分' },
    { label: '采集属性', value: '睡眠质量评分' },
    { label: '样本总数', value: String(tspSampleCount.value || 0) },
    { label: '隐私预算 ε', value: String(config.epsilon) },
    { label: '第一阶段取值域大小 d1', value: String(config.d1) },
    { label: '第二阶段取值域大小 d2', value: String(config.d2) },
    { label: '第一阶段 p1 / q1', value: `${formatProbability(config.p1)} / ${formatProbability(config.q1)}` },
    { label: '第二阶段 p2 / q2', value: `${formatProbability(config.p2)} / ${formatProbability(config.q2)}` },
    { label: '内在不确定性参数', value: intrinsicEnabled ? '已启用' : '无' }
  ]
})

const tspStageOneRows = computed(() => {
  const rows = currentData.value?.diagnostics?.recordsTable || tspDiagnostics.value?.recordsTable || []
  const counts = new Array(tspConfigValues.value.d1).fill(0)

  rows.forEach(row => {
    const value = row.stage1Result
    if (value === 'skipped' || value == null || Number(value) === 0) {
      return
    }
    const numericValue = Number(value)
    if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= tspConfigValues.value.d1) {
      counts[numericValue - 1] += 1
    }
  })

  const total = counts.reduce((sum, value) => sum + value, 0) || 1
  return counts.map((count, index) => ({
    label: `${index + 1} 分`,
    count,
    frequency: count / total
  }))
})

const tspStageOneNote = computed(() => (
  tspSampleCount.value > 0 && tspStageOneRows.value.every(row => Number(row.count) === 0)
    ? '当前参与聚合记录未保存第一阶段中间结果，因此该中间分布无法展开；最终 TSP 聚合校正估计仍以第二阶段最终上报统计为输入。'
    : ''
))

const tspStageTwoRows = computed(() => {
  const total = tspSampleCount.value || 1
  return tspLabels.value.map((label, index) => {
    const count = tspReportCounts.value[index] ?? 0
    return {
      label,
      count,
      frequency: count / total
    }
  })
})

const tspVarianceByCategory = computed(() => {
  const total = tspSampleCount.value || 0
  const config = tspConfigValues.value
  if (!total) return tspLabels.value.map(() => 0)

  return tspLabels.value.map((_, index) => {
    const observedFrequency = Number(tspReportCounts.value[index] ?? 0) / total
    const delta = index === 0
      ? Number(config.p2) - Number(config.q2)
      : Number(config.pStar) - Number(config.qStar)

    if (!Number.isFinite(delta) || Math.abs(delta) < 1e-8) {
      return 0
    }

    const theta = Math.min(1, Math.max(0, observedFrequency))
    return Math.max(0, theta * (1 - theta) / (total * delta * delta))
  })
})

const tspCorrectedRows = computed(() => {
  const total = tspSampleCount.value || 1
  return tspLabels.value.map((label, index) => {
    const observedCount = tspReportCounts.value[index] ?? 0
    const estimatedCount = tspDisplayEstimatedCounts.value[index] ?? 0
    const observedFrequency = observedCount / total
    const correctedFrequency = estimatedCount / total
    return {
      label,
      observedCount,
      observedFrequency,
      estimatedCount,
      correctedFrequency,
      correctionOffset: correctedFrequency - observedFrequency,
      variance: tspVarianceByCategory.value[index] ?? 0
    }
  })
})

const arrReportCounts = computed(() => {
  if (!selectedTaskId.value) return [0, 0]
  try {
    const records = JSON.parse(localStorage.getItem('submittedData') || '[]')
    return records.reduce((counts, item) => {
      const taskMatches = String(item.task_id ?? item.taskId) === String(selectedTaskId.value)
      const protocol = item?.reportData?.protocol || item?.protocol
      if (!taskMatches || protocol !== 'ARR') return counts

      const reportValue = Number(item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value) === 1 ? 1 : 0
      counts[reportValue] += 1
      return counts
    }, [0, 0])
  } catch (error) {
    console.error('加载 ARR 上报计数失败:', error)
    return [0, 0]
  }
})

const arrAggregateRows = computed(() => {
  const labels = ['未触发提醒', '触发提醒']
  return labels.map((label, index) => ({
    label,
    reportCount: arrReportCounts.value[index] ?? 0,
    estimatedCount: currentData.value?.compareRows?.[index]?.estimatedCount ?? 0
  }))
})

const agrrAggregateRows = computed(() => {
  return (currentData.value?.compareRows || []).map((row, index) => ({
    label: row.label,
    reportCount: currentData.value?.reportCounts?.[index] ?? 0,
    estimatedCount: row.estimatedCount ?? currentData.value?.estimatedCounts?.[index] ?? 0
  }))
})

const aoueAggregateRows = computed(() => {
  const sampleCount = Number(currentData.value?.sampleCount ?? 0) || 1
  return (currentData.value?.compareRows || []).map((row, index) => ({
    label: row.label,
    bitIndex: index + 1,
    reportCount: currentData.value?.reportCounts?.[index] ?? 0,
    estimatedCount: row.estimatedCount ?? currentData.value?.estimatedCounts?.[index] ?? 0,
    observedFrequency: Number(currentData.value?.reportCounts?.[index] ?? 0) / sampleCount,
    correctedFrequency: Number(row.estimatedCount ?? currentData.value?.estimatedCounts?.[index] ?? 0) / sampleCount,
    correctionOffset: (
      Number(row.estimatedCount ?? currentData.value?.estimatedCounts?.[index] ?? 0)
      - Number(currentData.value?.reportCounts?.[index] ?? 0)
    ) / sampleCount
  }))
})

const arrParamCards = computed(() => {
  const config = selectedTask.value?.configSnapshot || {}
  const params = config.calibratedParams || {}
  const sampleCount = Number(currentData.value?.sampleCount ?? 0)
  return [
    { label: '隐私预算 ε', value: String(config.epsilon ?? selectedTask.value?.privacyBudget ?? '--') },
    { label: '样本数 n', value: Number.isFinite(sampleCount) ? String(Math.round(sampleCount)) : '0' },
    { label: 'p（保持真实类别概率）', value: Number.isFinite(Number(params.p)) ? Number(params.p).toFixed(4) : '--' },
    { label: 'q（扰动到其他类别概率）', value: Number.isFinite(Number(params.q)) ? Number(params.q).toFixed(4) : '--' }
  ]
})

const agrrParamCards = computed(() => {
  const params = currentData.value?.perturbParams || {}
  const sampleCount = Number(currentData.value?.sampleCount ?? 0)
  const domainSize = Number(currentData.value?.domainSize ?? agrrAggregateRows.value.length)
  return [
    { label: '隐私预算 ε', value: String(currentData.value?.epsilon ?? selectedTask.value?.privacyBudget ?? '--') },
    { label: '样本数 n', value: Number.isFinite(sampleCount) ? String(Math.round(sampleCount)) : '0' },
    { label: '取值域大小 d', value: Number.isFinite(domainSize) ? String(Math.round(domainSize)) : '--' },
    { label: 'p（保持真实类别概率）', value: Number.isFinite(Number(params.p)) ? Number(params.p).toFixed(4) : '--' },
    { label: 'q（扰动到其他类别概率）', value: Number.isFinite(Number(params.q)) ? Number(params.q).toFixed(4) : '--' }
  ]
})

const aoueParamCards = computed(() => {
  const params = currentData.value?.perturbParams || {}
  const sampleCount = Number(currentData.value?.sampleCount ?? 0)
  const domainSize = Number(currentData.value?.domainSize ?? aoueAggregateRows.value.length)
  return [
    { label: '隐私预算 ε', value: String(currentData.value?.epsilon ?? selectedTask.value?.privacyBudget ?? '--') },
    { label: '样本数 n', value: Number.isFinite(sampleCount) ? String(Math.round(sampleCount)) : '0' },
    { label: '向量维度 d', value: Number.isFinite(domainSize) ? String(Math.round(domainSize)) : '--' },
    { label: 'p（原始 bit 为 1 时上报 1 的概率）', value: Number.isFinite(Number(params.p)) ? Number(params.p).toFixed(4) : '--' },
    { label: 'q（原始 bit 为 0 时上报 1 的概率）', value: Number.isFinite(Number(params.q)) ? Number(params.q).toFixed(4) : '--' }
  ]
})

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

function goToExperimentComparison() {
  router.push({
    path: '/admin/demo/arr-experiment-comparison',
    query: selectedTaskId.value ? { taskId: selectedTaskId.value } : {}
  })
}

function loadTasks() {
  try {
    const items = JSON.parse(localStorage.getItem('tasks') || '[]')
    tasks.value = items.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime()
      const timeB = new Date(b.createdAt || 0).getTime()
      return timeB - timeA
    })
  } catch (error) {
    console.error('加载任务失败:', error)
    tasks.value = []
  }
}

function loadAggregateData() {
  if (usesTspAlignedView.value) {
    const scope = {
      taskId: selectedTaskId.value,
      batchId: selectedBatchId.value
    }
    perturbationData.value = getTspAlignedAggregateResults(scope)
    tspDiagnostics.value = getTspAggregateDiagnostics(scope)
  } else {
    perturbationData.value = getLegacyAggregateResults(selectedTaskId.value)
    tspDiagnostics.value = null
  }
  selectedData.value = perturbationData.value.length > 0 ? perturbationData.value[0].id : null
}

function formatDistributionMap(distribution) {
  const entries = Object.entries(distribution || {})
  if (!entries.length) return '--'
  return entries.map(([key, value]) => `${key}: ${value}`).join(' | ')
}

function formatMetric(value) {
  return Number(value).toFixed(4)
}

function formatEstimateCount(value) {
  return Number(value).toFixed(2)
}

function formatStageOneCount(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '--'
  return String(Math.round(numericValue))
}

function formatProbability(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(4) : '--'
}

function formatDisplayFrequency(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toFixed(4) : '--'
}

function formatVariance(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '--'
  if (numericValue > 0 && numericValue < 0.0001) {
    return numericValue.toExponential(2)
  }
  return numericValue.toFixed(8)
}

function formatAoueCorrectionOffset(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '--'
  if (numericValue > 0) return `↑ 上调 ${numericValue.toFixed(4)}`
  if (numericValue < 0) return `↓ 下调 ${Math.abs(numericValue).toFixed(4)}`
  return '0.0000'
}

function getAoueOffsetClass(value) {
  const numericValue = Number(value)
  if (numericValue > 0) return 'is-positive'
  if (numericValue < 0) return 'is-negative'
  return 'is-neutral'
}

function getStabilityLabel(value) {
  const numericValue = Number(value)
  if (numericValue < 0.0005) return '方差较低：估计较稳定'
  if (numericValue < 0.002) return '方差中等：存在一定波动'
  return '方差较高：建议增加样本量'
}

function getStabilityTagType(value) {
  const numericValue = Number(value)
  if (numericValue < 0.0005) return 'success'
  if (numericValue < 0.002) return 'warning'
  return 'danger'
}

function formatDelta(value) {
  const numericValue = Number(value)
  return numericValue > 0 ? `+${numericValue.toFixed(4)}` : numericValue.toFixed(4)
}

function formatArrowDelta(value) {
  const numericValue = Number(value)
  if (numericValue > 0) return `↑ ${numericValue.toFixed(4)}`
  if (numericValue < 0) return `↓ ${Math.abs(numericValue).toFixed(4)}`
  return '0.0000'
}

function formatFrequency(value) {
  return Number(value).toFixed(6)
}

function formatFrequencyDelta(value) {
  const numericValue = Number(value)
  return numericValue > 0 ? `+${numericValue.toFixed(6)}` : numericValue.toFixed(6)
}

function formatFrequencyArrowDelta(value) {
  const numericValue = Number(value)
  if (numericValue > 0) return `↑ ${numericValue.toFixed(6)}`
  if (numericValue < 0) return `↓ ${Math.abs(numericValue).toFixed(6)}`
  return '0.000000'
}

function setComparisonChartRef(element, index) {
  comparisonChartRefs.value[index] = element || null
}

function disposeComparisonCharts() {
  comparisonChartInstances.forEach(instance => {
    if (instance) {
      instance.dispose()
    }
  })
  comparisonChartInstances = []
}

function disposeArrChart() {
  if (arrChartInstance) {
    arrChartInstance.dispose()
    arrChartInstance = null
  }
}

function disposeAgrrChart() {
  if (agrrChartInstance) {
    agrrChartInstance.dispose()
    agrrChartInstance = null
  }
}

function disposeTspCharts() {
  if (tspStageFlowChartInstance) {
    tspStageFlowChartInstance.dispose()
    tspStageFlowChartInstance = null
  }
  if (tspFrequencyChartInstance) {
    tspFrequencyChartInstance.dispose()
    tspFrequencyChartInstance = null
  }
  if (tspVarianceChartInstance) {
    tspVarianceChartInstance.dispose()
    tspVarianceChartInstance = null
  }
}

function updateArrChart() {
  if (!arrChartInstance) return

  arrChartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['服务端观测计数', '聚合频数估计'],
      top: 0
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: arrAggregateRows.value.map(row => row.label),
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: '计数'
    },
    series: [
      {
        name: '服务端观测计数',
        type: 'bar',
        barGap: '0%',
        data: arrAggregateRows.value.map(row => row.reportCount),
        itemStyle: { color: '#8fb9f5', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '聚合频数估计',
        type: 'bar',
        barGap: '0%',
        data: arrAggregateRows.value.map(row => Number(row.estimatedCount.toFixed?.(2) ?? row.estimatedCount)),
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
      }
    ]
  })
}

function initArrChart() {
  disposeArrChart()
  if (!isArrAggregateView.value || !arrChartRef.value) return
  arrChartInstance = echarts.init(arrChartRef.value)
  updateArrChart()
}

function updateAgrrChart() {
  if (!agrrChartInstance) return

  agrrChartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['服务端观测计数', '聚合频数估计'],
      top: 0
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: agrrAggregateRows.value.map(row => row.label),
      axisTick: { alignWithLabel: true },
      axisLabel: { interval: 0 }
    },
    yAxis: {
      type: 'value',
      name: '计数'
    },
    series: [
      {
        name: '服务端观测计数',
        type: 'bar',
        barGap: '0%',
        data: agrrAggregateRows.value.map(row => row.reportCount),
        itemStyle: { color: '#8fb9f5', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '聚合频数估计',
        type: 'bar',
        barGap: '0%',
        data: agrrAggregateRows.value.map(row => Number(row.estimatedCount.toFixed?.(2) ?? row.estimatedCount)),
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
      }
    ]
  })
}

function initAgrrChart() {
  disposeAgrrChart()
  if (!isAgrrAggregateView.value || !agrrChartRef.value) return
  agrrChartInstance = echarts.init(agrrChartRef.value)
  updateAgrrChart()
}

function updateTspCharts() {
  const rows = tspCorrectedRows.value

  if (tspStageFlowChartInstance) {
    const stageOneCounts = [0, ...tspStageOneRows.value.map(row => Number(row.count) || 0)]
    const stageOneTotal = stageOneCounts.reduce((sum, value) => sum + value, 0) || 1
    const stageOneFrequency = tspLabels.value.map((_, index) => Number(((stageOneCounts[index] || 0) / stageOneTotal).toFixed(4)))
    const finalReportFrequency = tspStageTwoRows.value.map(row => Number(row.frequency.toFixed(4)))

    tspStageFlowChartInstance.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: ['第一阶段中间频率', '第二阶段最终上报频率'],
        top: 0
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: tspLabels.value,
        axisTick: { alignWithLabel: true },
        axisLabel: { interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: '频率'
      },
      series: [
        {
          name: '第一阶段中间频率',
          type: 'bar',
          barGap: '0%',
          data: stageOneFrequency,
          itemStyle: { color: '#9bb7d8', borderRadius: [6, 6, 0, 0] }
        },
        {
          name: '第二阶段最终上报频率',
          type: 'bar',
          barGap: '0%',
          data: finalReportFrequency,
          itemStyle: { color: '#67c23a', borderRadius: [6, 6, 0, 0] }
        }
      ]
    })
  }

  if (tspFrequencyChartInstance) {
    tspFrequencyChartInstance.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: ['最终上报频率', 'TSP 校正频率'],
        top: 0
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: rows.map(row => row.label),
        axisTick: { alignWithLabel: true },
        axisLabel: { interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: '频率'
      },
      series: [
        {
          name: '最终上报频率',
          type: 'bar',
          barGap: '0%',
          data: rows.map(row => Number(row.observedFrequency.toFixed(4))),
          itemStyle: { color: '#8fb9f5', borderRadius: [6, 6, 0, 0] }
        },
        {
          name: 'TSP 校正频率',
          type: 'bar',
          barGap: '0%',
          data: rows.map(row => Number(row.correctedFrequency.toFixed(4))),
          itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
        }
      ]
    })
  }

  if (tspVarianceChartInstance) {
    tspVarianceChartInstance.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: value => formatVariance(value)
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: rows.map(row => row.label),
        axisTick: { alignWithLabel: true },
        axisLabel: { interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: '估计方差'
      },
      series: [
        {
          name: '估计方差',
          type: 'bar',
          data: rows.map(row => Number(row.variance.toPrecision(6))),
          itemStyle: { color: '#7c8cf8', borderRadius: [6, 6, 0, 0] }
        }
      ]
    })
  }
}

function initTspCharts() {
  disposeTspCharts()
  if (!isTspAggregateView.value) return
  if (tspStageFlowChartRef.value) {
    tspStageFlowChartInstance = echarts.init(tspStageFlowChartRef.value)
  }
  if (tspFrequencyChartRef.value) {
    tspFrequencyChartInstance = echarts.init(tspFrequencyChartRef.value)
  }
  if (tspVarianceChartRef.value) {
    tspVarianceChartInstance = echarts.init(tspVarianceChartRef.value)
  }
  updateTspCharts()
}

function updateComparisonCharts() {
  resultSections.value.forEach((section, index) => {
    const instance = comparisonChartInstances[index]
    if (!instance) return

    instance.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: ['真实分布', '聚合频数估计分布'],
        top: 0
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '6%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: section.compareRows.map(row => row.label),
        axisTick: { alignWithLabel: true }
      },
      yAxis: {
        type: 'value',
        name: '频率'
      },
      series: [
        {
          name: '真实频率',
          type: 'bar',
          barGap: '0%',
          data: section.chartData.map(row => row.trueFreq),
          itemStyle: { color: '#67c23a', borderRadius: [6, 6, 0, 0] }
        },
        {
          name: '聚合频数估计频率',
          type: 'bar',
          barGap: '0%',
          data: section.chartData.map(row => row.estimatedFreq),
          itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
        }
      ]
    })
  })
}

function initComparisonCharts() {
  disposeComparisonCharts()
  comparisonChartInstances = resultSections.value.map((_, index) => {
    const element = comparisonChartRefs.value[index]
    return element ? echarts.init(element) : null
  })
  updateComparisonCharts()
}

onMounted(async () => {
  loadTasks()
  const routeTaskId = String(route.query.taskId || '')
  const routeBatchId = String(route.query.batchId || '')

  if (routeTaskId) {
    selectedTaskId.value = routeTaskId
  } else if (tasks.value.length > 0) {
    selectedTaskId.value = tasks.value[0].id
  }
  selectedBatchId.value = routeBatchId
  loadAggregateData()
  await nextTick()
  initComparisonCharts()
  initArrChart()
  initAgrrChart()
  initTspCharts()
  window.addEventListener('resize', handleWindowResize)
})

watch(selectedTaskId, async () => {
  arrEstimateVisible.value = false
  agrrEstimateVisible.value = false
  aoueEstimateVisible.value = false
  if (selectedBatchId.value && !batchOptions.value.some(item => item.batchId === selectedBatchId.value)) {
    selectedBatchId.value = ''
  }
  loadAggregateData()
  await nextTick()
  initComparisonCharts()
  initArrChart()
  initAgrrChart()
  initTspCharts()
})

watch(selectedBatchId, async () => {
  arrEstimateVisible.value = false
  agrrEstimateVisible.value = false
  aoueEstimateVisible.value = false
  loadAggregateData()
  await nextTick()
  initComparisonCharts()
  initArrChart()
  initAgrrChart()
  initTspCharts()
})

watch(selectedData, async () => {
  arrEstimateVisible.value = false
  agrrEstimateVisible.value = false
  aoueEstimateVisible.value = false
  await nextTick()
  initComparisonCharts()
  initArrChart()
  initAgrrChart()
  initTspCharts()
})

function handleWindowResize() {
  comparisonChartInstances.forEach(instance => {
    if (instance) {
      instance.resize()
    }
  })
  if (arrChartInstance) {
    arrChartInstance.resize()
  }
  if (agrrChartInstance) {
    agrrChartInstance.resize()
  }
  if (tspStageFlowChartInstance) {
    tspStageFlowChartInstance.resize()
  }
  if (tspFrequencyChartInstance) {
    tspFrequencyChartInstance.resize()
  }
  if (tspVarianceChartInstance) {
    tspVarianceChartInstance.resize()
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize)
  disposeComparisonCharts()
  disposeArrChart()
  disposeAgrrChart()
  disposeTspCharts()
})
</script>

<style scoped>
.admin-container {
  height: 100vh;
  overflow: hidden;
}

.el-container {
  height: 100%;
}

.el-main {
  height: calc(100vh - 60px);
  overflow: hidden;
  padding: 0;
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

.aggregate-content {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}

.aggregate-content::-webkit-scrollbar {
  width: 10px;
}

.aggregate-content::-webkit-scrollbar-track {
  background: #eef3f8;
  border-radius: 999px;
}

.aggregate-content::-webkit-scrollbar-thumb {
  background: #c2d2e6;
  border-radius: 999px;
}

.aggregate-content::-webkit-scrollbar-thumb:hover {
  background: #9eb7d4;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
}

.total-count {
  color: #6b7a90;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-select-label {
  color: #607086;
  font-size: 14px;
}

.summary-section {
  margin-bottom: 26px;
}

.summary-section--compact {
  margin-bottom: 18px;
}

.server-view-alert {
  margin: 0 0 22px;
  border: 1px solid #cfe5ff;
  background: #f3f9ff;
}

.server-view-alert__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  line-height: 1.6;
}

.compact-section {
  border-top: 1px solid #edf2f8;
  padding-top: 22px;
}

.section-heading {
  margin-bottom: 16px;
}

.section-heading--with-action {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-heading--with-action > div {
  min-width: 0;
}

.section-heading--with-action .el-button {
  flex-shrink: 0;
}

.section-heading h3 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #1f2d3d;
}

.section-heading p {
  margin: 0;
  color: #7c8ca3;
  font-size: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
}

.summary-grid--adaptive {
  grid-template-columns: repeat(auto-fit, minmax(128px, max-content));
  justify-content: flex-start;
  align-items: stretch;
}

.summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.aggregate-overview {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.aggregate-overview__group {
  padding: 12px;
  border: 1px solid #e5eef8;
  border-radius: 14px;
  background: #fbfdff;
}

.aggregate-overview__title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #31435a;
}

.tsp-param-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 12px;
}

.tsp-param-group {
  padding: 10px 12px;
  border: 1px solid #e5eef8;
  border-radius: 12px;
  background: #f7fbff;
}

.tsp-param-group__title {
  margin-bottom: 8px;
  color: #4a5f78;
  font-size: 13px;
  font-weight: 700;
}

.tsp-param-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tsp-param-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #eef6ff;
  color: #6b7c91;
  font-size: 12px;
}

.tsp-param-chip strong {
  color: #183153;
  font-size: 14px;
}

.summary-card,
.core-card {
  background: #f7fbff;
  border: 1px solid #e5eef8;
  border-radius: 14px;
  padding: 16px 18px;
}

.summary-card--adaptive {
  min-width: 128px;
  width: fit-content;
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
}

.summary-label {
  font-size: 13px;
  color: #7b8aa0;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 20px;
  line-height: 1.35;
  font-weight: 700;
  color: #183153;
  word-break: break-word;
}

.summary-card--adaptive .summary-value {
  width: fit-content;
  max-width: 240px;
  font-size: 16px;
}

.tag-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 999px;
  background: #f2f7fc;
  border: 1px solid #dfe9f4;
}

.metric-pill-label {
  font-size: 13px;
  color: #6f8097;
}

.metric-pill-value {
  font-size: 18px;
  font-weight: 700;
  color: #23415f;
}

.core-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.metric-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-info-icon {
  color: #7a93b1;
  cursor: pointer;
  font-size: 14px;
}

.formula-tooltip {
  max-width: 280px;
  line-height: 1.6;
}

.formula-line:first-child {
  font-weight: 700;
  color: #1d3557;
  margin-bottom: 6px;
}

.core-card--highlight {
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
  border-color: #cfe0f5;
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.08);
}

.core-card--soft {
  background: linear-gradient(180deg, #fbfcff 0%, #f3f7ff 100%);
}

.core-card--highlight .core-value {
  color: #0f5db8;
}

.core-card--status {
  background: #fbfdff;
}

.core-value {
  font-size: 28px;
  font-weight: 800;
  color: #17406d;
  margin-bottom: 8px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: #eef5ff;
  color: #275ea8;
  font-weight: 700;
  margin-bottom: 8px;
  width: fit-content;
}

.core-subtext {
  font-size: 13px;
  color: #7c8ca3;
  line-height: 1.5;
}

.metric-tip--highlight {
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f5f9ff;
  border: 1px solid #d8e7fb;
  color: #58718f;
}

.arr-estimate-value {
  color: #0f5db8;
  font-weight: 800;
}

.arr-table-note {
  margin: 12px 2px 0;
  color: #607086;
  font-size: 13px;
  line-height: 1.6;
}

.aoue-offset-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 106px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
}

.aoue-offset-chip.is-positive {
  background: #fff1f2;
  color: #c24155;
}

.aoue-offset-chip.is-negative {
  background: #ecfdf3;
  color: #15803d;
}

.aoue-offset-chip.is-neutral {
  background: #f2f5f8;
  color: #7b8aa0;
}

.result-blocks {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.result-block {
  border: 1px solid #e6edf7;
  border-radius: 16px;
  background: linear-gradient(180deg, #fcfdff 0%, #f7fbff 100%);
  padding: 18px;
}

.result-block__heading {
  margin-bottom: 14px;
}

.result-block__heading h4 {
  margin: 0 0 6px;
  font-size: 16px;
  color: #1f2d3d;
}

.compare-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  gap: 16px;
  align-items: stretch;
}

.compare-panel {
  border: 1px solid #e7eef7;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}

.compare-panel--table {
  overflow-x: auto;
}

.compare-panel--chart {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.mini-chart-title {
  font-size: 14px;
  font-weight: 700;
  color: #27405f;
  margin-bottom: 10px;
}

.mini-chart-box {
  flex: 1;
  min-height: 280px;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.compare-table th,
.compare-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #eef3f8;
  text-align: left;
}

.compare-table th {
  background: #f7fbff;
  color: #5b6f86;
  font-weight: 700;
}

.compare-table .group-header th {
  background: #edf4fb;
  color: #48627f;
  border-bottom: 1px solid #dbe7f4;
  text-align: center;
}

.error-text.increase {
  color: #d9485f;
  font-weight: 700;
}

.error-text.decrease {
  color: #1f9d55;
  font-weight: 700;
}

.error-text.neutral {
  color: #607086;
  font-weight: 700;
}

.chart-box {
  height: 360px;
  border: 1px solid #e6edf7;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f3f8fd 100%);
  padding: 12px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.arr-chart-card {
  height: 320px;
  border: 1px solid #e6edf7;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f3f8fd 100%);
  padding: 14px;
  box-sizing: border-box;
}

.arr-chart-container {
  width: 100%;
  height: 100%;
}

.formula-card {
  padding: 18px;
  border: 1px solid #dfeaf7;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f5f9ff 100%);
  color: #516276;
  line-height: 1.7;
}

.formula-card p {
  margin: 0 0 12px;
}

.formula-expression {
  width: fit-content;
  max-width: 100%;
  margin: 10px 0 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #eef6ff;
  border: 1px solid #d8e9fb;
  color: #183153;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.formula-expression sub,
.formula-flow sub,
.formula-card sub {
  font-size: 0.7em;
  line-height: 0;
  vertical-align: sub;
}

.formula-var {
  font-style: italic;
}

.formula-hat {
  position: relative;
  display: inline-block;
  font-style: italic;
}

.formula-hat::before {
  content: '^';
  position: absolute;
  left: 50%;
  top: -0.72em;
  transform: translateX(-50%);
  font-size: 0.78em;
  line-height: 1;
}

.formula-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 14px 0;
}

.formula-flow span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e3edf8;
  color: #2f4b68;
  font-size: 13px;
}

.formula-flow span:nth-child(even) {
  border: none;
  background: transparent;
  color: #7a93b1;
  padding: 0;
  font-weight: 700;
}

.formula-note {
  margin-bottom: 0;
  color: #1f5f99;
  font-weight: 700;
}

.bit-sum-note-card {
  color: #4b6178;
  font-size: 14px;
}

.tsp-stage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.tsp-stage-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid #e6edf7;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f5f9ff 100%);
}

.stage-note {
  margin: 10px 2px 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.source-section {
  background: #f8fbff;
  border: 1px solid #e4edf7;
  border-radius: 14px;
  padding: 18px;
}

.perturbation-status-panel {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f4f8ff;
  border: 1px solid #d7e7ff;
}

.perturbation-status-panel.is-no_extra_perturbation {
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.perturbation-status-panel.is-active_perturbation {
  background: #fff7e8;
  border-color: #f3d19e;
}

.perturbation-status-panel__title {
  font-size: 14px;
  font-weight: 700;
  color: #1f2d3d;
}

.perturbation-status-panel__desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #5f6b7a;
}

.detail-table-wrap {
  border: 1px solid #e6edf7;
  border-radius: 14px;
  overflow: hidden;
  background: #fbfcfe;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th,
.detail-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  vertical-align: top;
}

.detail-table th {
  background: #eef6ff;
  color: #365a7c;
  font-size: 13px;
  font-weight: 700;
}

.detail-table tr:last-child td {
  border-bottom: none;
}

.detail-table__label {
  width: 180px;
  color: #425466;
  font-weight: 700;
}

.detail-table__value {
  width: 180px;
  color: #1f2d3d;
  font-weight: 700;
}

@media (max-width: 1200px) {
  .tsp-param-groups,
  .tsp-stage-grid {
    grid-template-columns: 1fr;
  }
}

.detail-table__desc {
  color: #6b7b8d;
  line-height: 1.6;
}

.no-data {
  text-align: center;
  padding: 60px 0;
}

.empty-tip {
  margin-top: 20px;
  color: #909399;
}

@media (max-width: 1200px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .compare-layout {
    grid-template-columns: 1fr;
  }
}
</style>
