
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activeMenu = computed(() => route.path)
const trendChart = ref(null)
const deviceChart = ref(null)
const user = computed(() => userStore.user)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const goToExperimentCompare = () => {
  router.push('/demo/experiment-compare')
}

onMounted(() => {
  // 鍒濆鍖栬秼鍔垮浘琛?
  const trendChartInstance = echarts.init(trendChart.value)
  trendChartInstance.setOption({
    xAxis: {
      type: 'category',
      data: ['1鏃?, '2鏃?, '3鏃?, '4鏃?, '5鏃?, '6鏃?, '7鏃?]
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: [1200, 1900, 3000, 2500, 2700, 3500, 4000],
      type: 'line',
      smooth: true
    }]
  })

  // 鍒濆鍖栬澶囧垎甯冨浘琛?
  const deviceChartInstance = echarts.init(deviceChart.value)
  deviceChartInstance.setOption({
    series: [{
      type: 'pie',
      data: [
        { value: 60, name: '鎵嬬幆' },
        { value: 30, name: '鎵嬭〃' },
        { value: 10, name: '鍏朵粬' }
      ]
    }]
  })
})

