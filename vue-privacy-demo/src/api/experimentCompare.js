export async function getExperimentCompareData(taskId = 'task_aoue_001') {
  return {
    taskId,
    protocol: 'AOUE',
    categories: ['A', 'B', 'C', 'D'],
    trueCounts: [120, 180, 90, 110],
    newSchemeCounts: [118, 176, 95, 111],
    baselineCounts: [130, 160, 100, 120]
  }
}
