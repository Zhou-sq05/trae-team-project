export const MAX_LOCAL_SUBMISSION_RECORDS = 10000;

function safeParseSubmittedData() {
  try {
    const raw = localStorage.getItem('submittedData');
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('解析 submittedData 失败:', error);
    return [];
  }
}

function resolveProtocol(record = {}) {
  return String(record.protocol || record.reportData?.protocol || '').toUpperCase();
}

export function compactSubmissionRecord(record = {}) {
  if (Array.isArray(record.samples)) {
    return {
      ...record,
      samples: record.samples.map(sample => compactSubmissionRecord({
        ...sample,
        task_id: record.task_id ?? record.taskId,
        batch_id: record.batch_id,
        protocol: record.protocol,
        upload_time: record.upload_time ?? record.uploadTime
      }))
    };
  }

  const protocol = resolveProtocol(record);
  const compact = {
    user_id: record.user_id ?? record.userId ?? '客户端',
    task_id: record.task_id ?? record.taskId ?? '',
    batch_id: record.batch_id ?? record.sampleMeta?.batchId ?? '',
    protocol,
    upload_time: record.upload_time ?? record.uploadTime ?? new Date().toISOString(),
    report_value: record.report_value ?? record.reportData?.reportValue ?? record.reportData?.perturbedValue ?? null
  };

  if (record.batchSummary) {
    compact.batchSummary = record.batchSummary;
  }

  if (protocol === 'ARR') {
    compact.rawData = {
      fallAlarm: record.rawData?.fallAlarm ?? record.original_value ?? null
    };
    return compact;
  }

  if (protocol === 'AGRR') {
    compact.original_minutes = record.original_minutes ?? record.rawData?.standMinutes ?? null;
    compact.original_bucket = record.original_bucket ?? record.rawData?.standBucket ?? record.reportData?.rawBucket ?? null;
    compact.original_bucket_code = record.original_bucket_code ?? record.rawData?.standBucketCode ?? record.reportData?.rawBucketCode ?? null;
    compact.perturbed_bucket = record.perturbed_bucket ?? record.reportData?.perturbedBucket ?? record.reportData?.perturbedLabel ?? null;
    compact.perturbed_bucket_code = record.perturbed_bucket_code ?? record.reportData?.perturbedBucketCode ?? compact.report_value;
    return compact;
  }

  if (protocol === 'AOUE') {
    compact.original_steps = record.original_steps ?? record.rawData?.dailySteps ?? null;
    compact.original_bucket = record.original_bucket ?? record.rawData?.stepsBucket ?? record.reportData?.rawBucket ?? null;
    compact.original_bucket_code = record.original_bucket_code ?? record.rawData?.stepsBucketCode ?? record.reportData?.rawBucketCode ?? null;
    compact.perturbed_bucket = record.perturbed_bucket ?? record.reportData?.perturbedBucket ?? record.reportData?.perturbedLabel ?? null;
    compact.perturbed_bucket_code = record.perturbed_bucket_code ?? record.reportData?.perturbedBucketCode ?? null;
    return compact;
  }

  if (protocol === 'TSP') {
    compact.original_missing = record.original_missing ?? record.rawData?.sleepMissing ?? null;
    compact.original_score = record.original_score ?? record.rawData?.sleepScore ?? null;
    compact.stage1_result = record.stage1_result ?? record.reportData?.stageOneResult ?? null;
    compact.stage2_input = record.stage2_input ?? record.reportData?.stageTwoInput ?? null;
    return compact;
  }

  return compact;
}

export function readSubmittedData() {
  return safeParseSubmittedData().map(compactSubmissionRecord);
}

export function appendSubmissionRecords(records = []) {
  const incomingRecords = Array.isArray(records) ? records : [records];
  const compactRecords = [
    ...readSubmittedData(),
    ...incomingRecords.map(compactSubmissionRecord)
  ].slice(-MAX_LOCAL_SUBMISSION_RECORDS);

  localStorage.setItem('submittedData', JSON.stringify(compactRecords));
  return compactRecords;
}
