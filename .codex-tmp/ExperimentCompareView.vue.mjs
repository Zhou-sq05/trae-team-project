
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getExperimentCompareData } from '../../api/experimentCompare'

const router = useRouter()
const mockData = ref(null)

const formattedMockData = computed(() => {
  return JSON.stringify(mockData.value, null, 2)
})

const goToDashboard = () => {
  router.push('/admin/dashboard')
}

onMounted(async () => {
  mockData.value = await getExperimentCompareData()
})

