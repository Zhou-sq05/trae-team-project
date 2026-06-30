import { computed, onBeforeUnmount, ref } from 'vue';

function wait(ms, runTokenRef, expectedToken) {
  return new Promise(resolve => {
    window.setTimeout(() => {
      resolve(runTokenRef.value === expectedToken);
    }, ms);
  });
}

export function useAoueAnimation(initialDelay = 520) {
  const playMode = ref('idle');
  const animationStage = ref('idle');
  const stepDelayMs = ref(560);
  const currentBitIndex = ref(-1);
  const encodingStepIndex = ref(-1);
  const originalVector = ref([]);
  const encodingVector = ref([]);
  const resultVector = ref([]);
  const bitSteps = ref([]);
  const runToken = ref(0);
  const isPaused = ref(false);

  const targetBitIndex = computed(() => originalVector.value.findIndex(bit => bit === 1));

  const currentBitStep = computed(() => {
    if (currentBitIndex.value < 0 || currentBitIndex.value >= bitSteps.value.length) {
      return null;
    }
    return bitSteps.value[currentBitIndex.value];
  });

  const completedBitsCount = computed(() => resultVector.value.filter(bit => bit !== null).length);
  const hasPreparedAnimation = computed(() => originalVector.value.length > 0 && bitSteps.value.length > 0);
  const hasCompletedPerturbation = computed(() => (
    hasPreparedAnimation.value && completedBitsCount.value === bitSteps.value.length
  ));

  function cancelAnimation() {
    runToken.value += 1;
  }

  function resetProgress() {
    cancelAnimation();
    playMode.value = 'idle';
    animationStage.value = 'idle';
    isPaused.value = false;
    currentBitIndex.value = -1;
    encodingStepIndex.value = -1;
    encodingVector.value = new Array(originalVector.value.length).fill(0);
    resultVector.value = new Array(originalVector.value.length).fill(null);
  }

  function clearAnimation() {
    cancelAnimation();
    playMode.value = 'idle';
    animationStage.value = 'idle';
    isPaused.value = false;
    currentBitIndex.value = -1;
    encodingStepIndex.value = -1;
    originalVector.value = [];
    encodingVector.value = [];
    resultVector.value = [];
    bitSteps.value = [];
  }

  function prepareAnimation(simulationResult) {
    originalVector.value = Array.isArray(simulationResult?.encodedValue)
      ? [...simulationResult.encodedValue]
      : [];
    bitSteps.value = Array.isArray(simulationResult?.bitSteps)
      ? simulationResult.bitSteps.map(step => ({ ...step }))
      : [];
    resetProgress();
  }

  function advanceDemo() {
    if (!hasPreparedAnimation.value) {
      return false;
    }

    if (animationStage.value === 'done') {
      return false;
    }

    if (animationStage.value === 'idle') {
      animationStage.value = 'bucketing';
      return true;
    }

    if (animationStage.value === 'bucketing') {
      animationStage.value = 'encoding';
      encodingStepIndex.value = 0;
      encodingVector.value = new Array(originalVector.value.length).fill(0);
      return true;
    }

    if (animationStage.value === 'encoding') {
      if (encodingStepIndex.value < 1) {
        encodingStepIndex.value = 1;
        return true;
      }

      if (encodingStepIndex.value === 1) {
        encodingStepIndex.value = 2;
        if (targetBitIndex.value >= 0) {
          encodingVector.value.splice(targetBitIndex.value, 1, 1);
        }
        return true;
      }

      animationStage.value = 'perturbing';
      const firstIndex = resultVector.value.findIndex(bit => bit === null);
      if (firstIndex !== -1) {
        currentBitIndex.value = firstIndex;
        resultVector.value.splice(firstIndex, 1, bitSteps.value[firstIndex].resultBit);
      }
      return true;
    }

    if (animationStage.value === 'perturbing') {
      const nextIndex = resultVector.value.findIndex(bit => bit === null);
      if (nextIndex !== -1) {
        currentBitIndex.value = nextIndex;
        resultVector.value.splice(nextIndex, 1, bitSteps.value[nextIndex].resultBit);
        return true;
      }

      animationStage.value = 'done';
      return true;
    }

    return false;
  }

  async function runAutoLoop() {
    if (!hasPreparedAnimation.value) {
      return false;
    }

    const token = ++runToken.value;
    isPaused.value = false;

    while (runToken.value === token && !isPaused.value && animationStage.value !== 'done') {
      const advanced = advanceDemo();
      if (!advanced) {
        return false;
      }

      const delay = animationStage.value === 'perturbing'
        ? stepDelayMs.value
        : Math.max(220, Math.round(initialDelay * 0.9));
      const continued = await wait(delay, runToken, token);
      if (!continued || isPaused.value) {
        return false;
      }
    }

    return animationStage.value === 'done';
  }

  function startManualPlayback() {
    if (!hasPreparedAnimation.value) {
      return false;
    }

    cancelAnimation();
    playMode.value = 'manual';
    isPaused.value = false;
    return true;
  }

  function startAutoPlayback() {
    if (!hasPreparedAnimation.value) {
      return false;
    }

    playMode.value = 'auto';
    isPaused.value = false;
    return runAutoLoop();
  }

  function pausePlayback() {
    if (playMode.value !== 'auto' || animationStage.value === 'done' || animationStage.value === 'idle') {
      return false;
    }

    isPaused.value = true;
    cancelAnimation();
    return true;
  }

  function resumeAutoPlayback() {
    if (!hasPreparedAnimation.value || animationStage.value === 'done') {
      return false;
    }

    playMode.value = 'auto';
    isPaused.value = false;
    return runAutoLoop();
  }

  onBeforeUnmount(() => {
    cancelAnimation();
  });

  return {
    playMode,
    animationStage,
    stepDelayMs,
    currentBitIndex,
    encodingStepIndex,
    originalVector,
    encodingVector,
    resultVector,
    bitSteps,
    isPaused,
    currentBitStep,
    completedBitsCount,
    hasPreparedAnimation,
    hasCompletedPerturbation,
    targetBitIndex,
    prepareAnimation,
    advanceDemo,
    startAutoPlayback,
    startManualPlayback,
    pausePlayback,
    resumeAutoPlayback,
    resetProgress,
    clearAnimation,
    cancelAnimation
  };
}
