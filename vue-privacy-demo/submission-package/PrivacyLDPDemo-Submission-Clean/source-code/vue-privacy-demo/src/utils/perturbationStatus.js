const EPSILON_TOLERANCE = 1e-8;

const PROTOCOL_PERTURBATION_LABELS = {
  ARR: '二值扰动',
  AGRR: '多值扰动',
  AOUE: '逐位扰动',
  TSP: '两阶段扰动'
};

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getProtocolPerturbationLabel(protocol) {
  return PROTOCOL_PERTURBATION_LABELS[String(protocol || '').toUpperCase()] || '本地随机扰动';
}

export function getPerturbationStatus(protocol, params = {}) {
  const normalizedProtocol = String(protocol || '').toUpperCase();
  const p = normalizeNumber(params?.p);
  const q = normalizeNumber(params?.q);
  const perturbationLabel = getProtocolPerturbationLabel(normalizedProtocol);

  if (p == null || q == null) {
    return {
      statusKey: 'pending',
      tagType: 'info',
      title: '当前模式：参数待校准',
      shortLabel: '参数待校准',
      description: `当前还无法判断 ${normalizedProtocol || '该协议'} 是否需要执行 ${perturbationLabel}，请先完成参数校准与保存。`,
      protocol: normalizedProtocol,
      perturbationLabel,
      p,
      q
    };
  }

  const needsRandomization = p < 1 - EPSILON_TOLERANCE || q > EPSILON_TOLERANCE;

  if (!needsRandomization) {
    return {
      statusKey: 'no_extra_perturbation',
      tagType: 'success',
      title: '当前模式：无需额外扰动',
      shortLabel: '无需额外扰动',
      description: `当前参数组合下已满足隐私约束，本轮无需额外随机扰动，因此上报结果可能与原始值保持一致。`,
      protocol: normalizedProtocol,
      perturbationLabel,
      p,
      q
    };
  }

  return {
    statusKey: 'active_perturbation',
    tagType: 'warning',
    title: '当前模式：执行本地随机扰动',
    shortLabel: '执行扰动',
    description: `当前参数组合下，${normalizedProtocol || '该协议'} 需执行${perturbationLabel}，上报结果可能与原始值存在偏移。`,
    protocol: normalizedProtocol,
    perturbationLabel,
    p,
    q
  };
}
