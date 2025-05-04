<template>
  <div class="container">
    <div class="header">
      <h1>HelloBoss 招聘打招呼语生成器</h1>
      <p>基于AI自动生成个性化岗位打招呼语</p>
    </div>
    
    <div v-if="isMobile && !hasRequestedPermission" class="mobile-notice">
      <el-alert
        title="需要剪贴板访问权限"
        type="info"
        show-icon
        :closable="false"
      >
        <p>要自动读取剪贴板，需要授予权限。</p>
        <el-button type="primary" @click="requestClipboardPermission">
          请求剪贴板权限
        </el-button>
      </el-alert>
    </div>
    
    <div v-if="isMobile && permissionDenied" class="mobile-notice">
      <el-alert
        title="剪贴板访问被拒绝"
        type="warning"
        show-icon
        :closable="true"
      >
        <p>请手动复制岗位JD后粘贴到输入框中。</p>
      </el-alert>
    </div>
    
    <div v-if="errorMessage" class="global-error">
      <el-alert
        :title="errorMessage"
        type="error"
        show-icon
        :closable="true"
        @close="errorMessage = ''"
      >
        <template #default>
          <p>如果问题持续存在，请尝试:</p>
          <ul>
            <li>检查API密钥是否正确 (在高级设置中)</li>
            <li>检查API域名是否正确</li>
            <li>验证您的网络连接</li>
            <li>使用"测试API连接"按钮进行诊断</li>
          </ul>
        </template>
      </el-alert>
    </div>
    
    <el-card class="card">
      <el-form :model="form" label-position="top">
        <el-form-item label="岗位描述(JD)">
          <el-input
            ref="jdInput"
            v-model="form.jd"
            type="textarea"
            :rows="6"
            placeholder="请输入或粘贴岗位JD..."
            @focus="handleInputFocus"
          />
          <div class="form-actions">
            <el-button 
              type="primary" 
              @click="pasteJdAndGenerate"
            >
              <el-icon><DocumentCopy /></el-icon>
              从剪贴板粘贴并生成
            </el-button>
            <div v-if="greeting" class="form-result-actions">
              <el-button
                type="primary"
                plain
                @click="copyToClipboard"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制到剪贴板
              </el-button>
              <el-button
                type="info"
                plain
                @click="regenerateGreeting"
                :disabled="loading"
              >
                <el-icon><Refresh /></el-icon>
                重新生成
              </el-button>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="个人简历">
          <el-input
            v-model="form.resume"
            type="textarea"
            :rows="4"
            placeholder="请输入您的个人简历摘要..."
          />
        </el-form-item>
        
        <el-collapse class="settings-collapse">
          <el-collapse-item title="提示词编辑" name="prompt">
            <el-form-item label="自定义提示词 (基于默认提示词修改)">
              <el-input
                v-model="form.customPrompt"
                type="textarea"
                :rows="6"
                placeholder="编辑提示词，可使用变量 {{jd}} 和 {{resume}} 代表岗位和简历..."
              />
              <div class="prompt-actions">
                <el-button size="small" @click="resetToDefaultPrompt">恢复默认提示词</el-button>
              </div>
            </el-form-item>
          </el-collapse-item>
          
          <el-collapse-item title="高级设置" name="settings">
            <el-form-item label="AI模型">
              <el-input
                v-model="form.model"
                placeholder="留空则使用GPT-3.5-Turbo"
              />
              <div class="model-tips">
                可填写其他模型如：gpt-4-turbo、gpt-4o等
              </div>
            </el-form-item>
            
            <el-form-item label="API Key">
              <el-input
                v-model="form.key"
                placeholder="输入您的API Key..."
                show-password
              />
              <div class="api-key-tips">
                默认API密钥可能已失效，请使用自己的API密钥
              </div>
            </el-form-item>
            
            <el-form-item label="API域名">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-select v-model="form.protocol" style="width: 90px;">
                  <el-option label="https" value="https" />
                  <el-option label="http" value="http" />
                </el-select>
                <el-input
                  v-model="form.apiDomain"
                  placeholder="API域名(或者ip+端口)"
                  style="flex: 1;"
                />
              </div>
            </el-form-item>
            
            <div class="api-test">
              <el-button
                type="primary"
                size="small"
                plain
                @click="testApiConnection"
                :loading="apiTesting"
              >
                测试API连接
              </el-button>
              <span v-if="apiTestResult" :class="['api-test-result', apiTestResult.success ? 'success' : 'error']">
                {{ apiTestResult.message }}
              </span>
            </div>
          </el-collapse-item>
        </el-collapse>
        
        <el-form-item>
          <div class="main-actions">
            <el-button
              type="primary"
              :loading="loading"
              @click="generateGreeting"
              style="flex: 1;"
              :disabled="!form.jd"
            >
              生成打招呼语
            </el-button>
            
            <el-button
              type="danger"
              plain
              @click="confirmReset"
            >
              <el-icon><Delete /></el-icon>
              重置所有设置
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 生成结果卡片移回原位置 -->
    <el-card v-if="greeting" class="card result-card">
      <div class="result-header">
        <h3>生成结果 <span class="edit-tip">(支持编辑)</span></h3>
        <div class="result-actions">
          <el-button
            type="primary"
            plain
            @click="copyToClipboard"
          >
            <el-icon><DocumentCopy /></el-icon>
            复制到剪贴板
          </el-button>
          <el-button
            type="info"
            plain
            @click="regenerateGreeting"
            :disabled="loading"
          >
            <el-icon><Refresh /></el-icon>
            重新生成
          </el-button>
        </div>
      </div>
      <div class="result-content">
        <el-input
          v-model="editableGreeting"
          type="textarea"
          :rows="8"
          resize="none"
          placeholder="编辑生成的打招呼语..."
        />
      </div>
      
      <!-- 在移动设备上添加指导 -->
      <div v-if="isMobile" class="mobile-copy-guide">
        <p>在移动设备上，您可以：</p>
        <ol>
          <li>长按上面的文本框</li>
          <li>在弹出菜单中选择"全选"</li>
          <li>选择"复制"即可将结果复制到剪贴板</li>
        </ol>
      </div>
      
      <!-- 隐藏的复制辅助元素 -->
      <textarea
        ref="hiddenTextarea"
        :value="editableGreeting"
        style="position: absolute; top: -9999px; left: -9999px;"
        readonly
      ></textarea>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DocumentCopy, Refresh, Delete, Right } from '@element-plus/icons-vue'
import { generateGreeting as callApi, getDefaultPrompt, testApiConnection as testApi } from './services/apiService'

// 存储键
const STORAGE_KEY = 'helloboss_settings'

// 默认表单数据
const defaultForm = {
  jd: '',
  resume: '我是一名经验丰富的软件工程师，有5年开发经验，精通Java、Python和JavaScript等编程语言。曾参与多个大型项目开发，具有良好的团队协作能力和解决问题的能力。',
  model: 'gpt-3.5-turbo',
  key: '',
  apiDomain: 'api.openai.com',
  customPrompt: '',
  protocol: 'https'
}

// 表单数据
const form = reactive({...defaultForm})

const loading = ref(false)
const greeting = ref('')
const editableGreeting = ref('')
const hiddenTextarea = ref(null)
const jdInput = ref(null)
const errorMessage = ref('')
const apiTesting = ref(false)
const apiTestResult = ref(null)
const hasRequestedPermission = ref(false)
const permissionDenied = ref(false)

// 检测是否为移动设备
const isMobile = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

// 默认备用响应，当API调用完全失败时使用
const fallbackGreeting = '您好！我看到贵公司的招聘信息后非常感兴趣。熟悉岗位所需的核心技术，并有相关项目经验。期待和您有关于岗位的深度沟通，方便的话发您我的附件简历。';

// 监听greeting变化，同步到可编辑区域
watch(greeting, (newValue) => {
  editableGreeting.value = newValue
})

// 监听表单变化，保存到本地存储
watch(form, () => {
  saveToLocalStorage()
}, { deep: true })

// 初始化时从本地存储加载数据
onMounted(() => {
  loadFromLocalStorage()
  
  // 获取默认的用户自定义提示词部分
  const defaultUserPrompt = getDefaultPrompt()
  
  // 检查是否是首次访问或自定义提示词为空
  const isFirstVisit = !localStorage.getItem('helloboss_custom_prompt_initialized')
  if (isFirstVisit) {
    // 将默认提示词设置为自定义提示词的初始值
    form.customPrompt = defaultUserPrompt
    
    // 标记已初始化提示词
    localStorage.setItem('helloboss_custom_prompt_initialized', 'true')
    saveToLocalStorage()
    console.log('已自动导入默认提示词作为自定义提示词')
  }
  
  // 如果是移动设备，检查是否已经有权限
  if (isMobile.value) {
    checkClipboardPermission()
  }
})

// 检查剪贴板权限
async function checkClipboardPermission() {
  try {
    // 检查Permissions API是否可用
    if (navigator.permissions) {
      const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
      
      if (permissionStatus.state === 'granted') {
        hasRequestedPermission.value = true
        permissionDenied.value = false
      } else if (permissionStatus.state === 'denied') {
        hasRequestedPermission.value = true
        permissionDenied.value = true
      } else {
        // 'prompt' 状态 - 尚未请求权限
        hasRequestedPermission.value = false
        permissionDenied.value = false
      }
    } else {
      // 浏览器不支持权限API，尝试调用clipboard看是否会抛出错误
      try {
        await navigator.clipboard.readText()
        hasRequestedPermission.value = true
        permissionDenied.value = false
      } catch (error) {
        if (error.name === 'NotAllowedError') {
          permissionDenied.value = true
        }
        // 如果是其他错误，可能是操作不支持，因此不认为权限被拒绝
        hasRequestedPermission.value = false
      }
    }
  } catch (error) {
    console.error('检查剪贴板权限失败:', error)
    // 失败默认为需要请求权限
    hasRequestedPermission.value = false
  }
}

// 请求剪贴板权限
async function requestClipboardPermission() {
  try {
    // 尝试读取剪贴板，这会触发权限请求
    await navigator.clipboard.readText()
    hasRequestedPermission.value = true
    permissionDenied.value = false
    ElMessage.success('剪贴板权限已授予')
    
    // 尝试立即读取剪贴板
    pasteJdAndGenerate()
  } catch (error) {
    console.error('请求剪贴板权限失败:', error)
    hasRequestedPermission.value = true
    permissionDenied.value = true
    ElMessage.error('剪贴板权限被拒绝')
  }
}

// 处理输入框聚焦事件，在移动设备上尝试立即读取剪贴板
async function handleInputFocus() {
  if (isMobile.value && !permissionDenied.value) {
    // 等待输入框完全获取焦点
    setTimeout(async () => {
      try {
        // 尝试在交互后立即读取剪贴板
        const text = await navigator.clipboard.readText()
        if (text && text.trim() !== '' && !form.jd) {
          form.jd = text
          ElMessage.success('自动从剪贴板获取内容成功')
        }
      } catch (error) {
        console.log('聚焦时读取剪贴板失败，这是预期的行为', error)
        // 输入框聚焦时无法读取剪贴板是预期行为，不显示错误
      }
    }, 300)
  }
}

// 保存设置到本地存储
function saveToLocalStorage() {
  try {
    const data = JSON.stringify(form)
    localStorage.setItem(STORAGE_KEY, data)
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

// 从本地存储加载设置
function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const savedSettings = JSON.parse(data)
      Object.assign(form, savedSettings)
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 重置所有设置
function resetAllSettings() {
  Object.assign(form, defaultForm)
  localStorage.removeItem(STORAGE_KEY)
  // 同时删除提示词初始化标记
  localStorage.removeItem('helloboss_custom_prompt_initialized')
  ElMessage.success('所有设置已重置')
}

// 确认重置
function confirmReset() {
  ElMessageBox.confirm(
    '确定要重置所有设置吗？这将清除所有保存的数据，包括简历、API设置和自定义提示词。',
    '重置确认',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    resetAllSettings()
  }).catch(() => {})
}

// 测试API连接
async function testApiConnection() {
  if (!form.apiDomain || !form.key) {
    ElMessage.warning('请先输入API域名和密钥')
    return
  }
  
  apiTesting.value = true
  apiTestResult.value = null
  
  try {
    const result = await testApi(form.apiDomain, form.key, form.protocol)
    apiTestResult.value = result
    
    if (result.success) {
      ElMessage.success('API连接测试成功')
    } else {
      ElMessage.error(`API连接测试失败: ${result.message}`)
    }
  } catch (error) {
    apiTestResult.value = {
      success: false,
      message: `测试失败: ${error.message}`
    }
    ElMessage.error(`API连接测试出错: ${error.message}`)
  } finally {
    apiTesting.value = false
  }
}

// 重置为默认提示词
function resetToDefaultPrompt() {
  // 获取最新的默认提示词
  const latestDefaultPrompt = getDefaultPrompt()
  
  // 更新用户自定义提示词
  form.customPrompt = latestDefaultPrompt
  
  ElMessage.success('已恢复为默认提示词，可继续编辑')
}

// 处理自定义提示词
function processCustomPrompt(jd, resume) {
  // 用户自定义提示词部分，如果为空则使用默认提示词
  const userPrompt = form.customPrompt || getDefaultPrompt()
  
  // 不需要替换变量，因为JD和简历部分在generateGreeting时会处理
  return userPrompt
}

// 尝试不同的方法从剪贴板粘贴文本
async function tryReadClipboard() {
  // 首先尝试标准Clipboard API
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      return await navigator.clipboard.readText()
    } catch (error) {
      console.warn('标准Clipboard API失败:', error)
    }
  }
  
  // 如果是移动设备，尝试使用document.execCommand('paste')
  if (isMobile.value && jdInput.value) {
    try {
      const element = jdInput.value.$el.querySelector('textarea')
      if (element) {
        // 聚焦输入框
        element.focus()
        
        // 尝试使用execCommand粘贴
        const result = document.execCommand('paste')
        if (result) {
          // 立即返回输入框的值
          return element.value
        }
      }
    } catch (error) {
      console.warn('execCommand paste失败:', error)
    }
  }
  
  throw new Error('无法访问剪贴板')
}

// 从剪贴板粘贴JD并自动生成打招呼语
async function pasteJdAndGenerate() {
  try {
    const text = await tryReadClipboard()
    if (!text || text.trim() === '') {
      ElMessage.warning('剪贴板内容为空')
      return
    }
    
    form.jd = text
    ElMessage.info('已从剪贴板粘贴内容，正在生成...')
    
    // 自动生成打招呼语
    await generateGreeting(true)
  } catch (error) {
    console.error('无法访问剪贴板:', error)
    
    if (isMobile.value) {
      ElMessage({
        message: '无法自动读取剪贴板，请尝试点击"请求剪贴板权限"或手动粘贴',
        type: 'warning',
        duration: 5000
      })
    } else {
      ElMessage.error('无法从剪贴板读取内容，请确保已授予权限')
    }
  }
}

// 生成打招呼语
async function generateGreeting(autoCopy = false) {
  if (!form.jd) {
    ElMessage.warning('请先输入岗位JD')
    return
  }
  
  // 清除之前的错误
  errorMessage.value = ''
  loading.value = true
  
  try {
    const customPrompt = processCustomPrompt(form.jd, form.resume)
    // 如果model为空，使用默认的gpt-3.5-turbo
    const modelToUse = form.model || 'gpt-3.5-turbo'
    
    greeting.value = await callApi({
      model: modelToUse,
      key: form.key,
      apiDomain: form.apiDomain,
      jd: form.jd,
      resume: form.resume,
      customPrompt,
      protocol: form.protocol
    })
    
    // 确保结果已更新到UI
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (autoCopy && !isMobile.value) {
      // 自动复制到剪贴板，使用更可靠的方法
      setTimeout(() => {
        copyToClipboardFallback(true)
      }, 500)
    } else {
      ElMessage.success('打招呼语生成成功')
    }
  } catch (error) {
    console.error('生成失败:', error)
    errorMessage.value = error.message || '生成打招呼语失败，请检查网络和API配置'
    
    // 使用默认备用响应
    greeting.value = fallbackGreeting
    ElMessage.error('使用备用打招呼语。错误: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 重新生成打招呼语
function regenerateGreeting() {
  generateGreeting()
}

// 复制到剪贴板 (优先使用Clipboard API)
async function copyToClipboard(silent = false) {
  // 在移动设备上尝试使用Clipboard API
  try {
    await navigator.clipboard.writeText(editableGreeting.value)
    if (!silent) {
      ElMessage.success('已复制到剪贴板')
    } else {
      ElMessage.success('打招呼语已生成并自动复制到剪贴板')
    }
    return true
  } catch (error) {
    console.error('复制失败 (API方法):', error)
    
    // 移动设备上显示手动复制提示
    if (isMobile.value) {
      ElMessage.info('请长按文本框，然后选择"全选"和"复制"')
      return false
    }
    
    // 尝试备用方法
    return copyToClipboardFallback(silent)
  }
}

// 备用的复制方法 (使用document.execCommand)
function copyToClipboardFallback(silent = false) {
  try {
    // 确保内容是最新的
    if (hiddenTextarea.value) {
      hiddenTextarea.value.value = editableGreeting.value
      hiddenTextarea.value.select()
      document.execCommand('copy')
      
      if (!silent) {
        ElMessage.success('已复制到剪贴板')
      } else {
        ElMessage.success('打招呼语已生成并自动复制到剪贴板')
      }
      return true
    } else {
      throw new Error('找不到辅助元素')
    }
  } catch (error) {
    console.error('复制失败 (备用方法):', error)
    ElMessage.error('复制到剪贴板失败，请手动复制')
    return false
  }
}
</script>

<style scoped>
.settings-collapse {
  margin: 20px 0;
}

.form-actions {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.form-result-actions {
  display: flex;
  gap: 10px;
}

.prompt-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.main-actions {
  display: flex;
  gap: 10px;
}

.result-card {
  margin-top: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.result-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--primary-color);
}

.edit-tip {
  font-size: 14px;
  color: var(--text-color-secondary);
  font-weight: normal;
}

.result-actions {
  display: flex;
  gap: 10px;
}

.result-content {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 10px;
}

.result-content :deep(.el-textarea__inner) {
  background-color: transparent;
  border: 1px solid transparent;
  padding: 5px;
  font-size: 14px;
  line-height: 1.6;
  min-height: 150px;
}

.result-content :deep(.el-textarea__inner:focus) {
  border-color: var(--border-color-light);
  background-color: #fff;
}

.result-content :deep(.el-textarea__inner:hover) {
  border-color: var(--border-color-light);
}

.global-error {
  margin-bottom: 20px;
}

.global-error ul {
  margin-top: 8px;
  padding-left: 20px;
}

.global-error li {
  margin-bottom: 4px;
}

.api-key-tips {
  margin-top: 5px;
  color: #e6a23c;
  font-size: 12px;
}

.model-tips {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
}

.api-test {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.api-test-result {
  font-size: 13px;
}

.api-test-result.success {
  color: #67c23a;
}

.api-test-result.error {
  color: #f56c6c;
}

/* 移动设备优化 */
.mobile-notice {
  margin-bottom: 20px;
}

.mobile-notice .el-button {
  margin-top: 10px;
}

.mobile-copy-guide {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f9ff;
  border-radius: 4px;
  font-size: 14px;
}

.mobile-copy-guide p {
  margin-top: 0;
  margin-bottom: 8px;
  font-weight: bold;
}

.mobile-copy-guide ol {
  margin-top: 5px;
  margin-bottom: 5px;
  padding-left: 20px;
}

.mobile-copy-guide li {
  margin-bottom: 5px;
}

@media (max-width: 768px) {
  .container {
    padding: 10px;
  }
  
  .header h1 {
    font-size: 22px;
  }
  
  .header p {
    font-size: 14px;
  }
  
  .result-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .main-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .form-result-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .api-test {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .api-test-result {
    margin-top: 5px;
  }
}
</style> 