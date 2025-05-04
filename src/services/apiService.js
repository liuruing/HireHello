import axios from 'axios';

/**
 * 生成系统提示词前缀（包含JD和简历数据）
 * @param {string} jd - 岗位描述
 * @param {string} resume - 个人简历
 * @returns {string} - 系统提示词前缀
 */
export function getSystemPromptPrefix(jd, resume) {
  return `任务：根据以下岗位JD和个人简历生成一条招聘平台打招呼语

岗位JD：
${jd}

个人简历：
${resume}

`;
}

/**
 * 生成默认用户自定义提示词
 * @returns {string} - 默认的用户自定义提示词部分
 */
export function getDefaultPrompt() {
  return `要求：
1. 直接以"您好，我"开头，不需要自我介绍姓名
2. 重点突出与Golang开发相关的核心技能(如Gin、Beego等框架使用经验)，尤其是与安全开发相关的能力
3. 技术点不超过4个，优先选择与岗位JD中要求和加分项匹配的内容
4. 提及简历中确实具备的经验，不要虚构不存在的技能
5. 对于岗位JD中的加分项，优势，技术栈 如有相关经验应当在前半部分优先展示，占据前20个字的60%
6. 保持谦虚专业的语气，避免"精通"、"拥有多年经验"等自我评价
7. 不提及具体公司名称和项目名称
8. 结尾固定为："期待和您有关于岗位的深度沟通，方便的话发您我的附件简历。"
9. 整体字数控制在100-150字之间

禁止：
1. 不要使用套话、空洞赞美或过于正式的表达
2. 不要使用分点列举的形式
3. 不要提及简历中没有的技能
4. 不要同时突出多种编程语言，以岗位需求为主
5. 不要有其他的语气助词

仅输出最终生成的打招呼语文本，不包含任何其他说明或解释。`;
}

/**
 * 统一处理API域名，自动补全协议
 * @param {string} apiDomain - 用户输入的API域名（不带协议）
 * @param {string} [protocol='https'] - 协议
 * @returns {string} - 完整的API基础URL（带协议，无结尾斜杠）
 */
function getApiBaseUrl(apiDomain, protocol = 'https') {
  let domain = (apiDomain || '').trim();
  domain = domain.replace(/^https?:\/\//, '');
  domain = domain.replace(/\/$/, '');
  return `${protocol}://${domain}`;
}

/**
 * 测试API连接
 * @param {string} apiDomain - API域名
 * @param {string} key - API密钥
 * @param {string} [protocol='https'] - 协议
 * @returns {Promise<{success: boolean, message: string}>} - 测试结果
 */
export async function testApiConnection(apiDomain, key, protocol = 'https') {
  try {
    const apiUrl = `${getApiBaseUrl(apiDomain, protocol)}/v1/models`;
    
    const response = await axios({
      method: 'GET',
      url: apiUrl,
      headers: {
        'Authorization': `Bearer ${key}`
      },
      timeout: 10000 // 10秒超时
    });
    
    if (response.status === 200) {
      return {
        success: true,
        message: '连接成功！API密钥有效'
      };
    } else {
      return {
        success: false,
        message: `连接失败: 状态码 ${response.status}`
      };
    }
  } catch (error) {
    console.error('API连接测试失败:', error);
    let errorMessage = 'API连接测试失败';
    
    if (error.response) {
      // 服务器返回错误响应
      errorMessage += `: ${error.response.status} - ${error.response.data?.error?.message || '未知错误'}`;
    } else if (error.request) {
      // 请求已发送但没有收到响应
      errorMessage += ': 没有收到服务器响应，请检查API域名和网络连接';
    } else {
      // 设置请求时发生错误
      errorMessage += `: ${error.message}`;
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * 调用API生成打招呼语
 * @param {Object} options - 配置选项
 * @param {string} options.model - AI模型名称
 * @param {string} options.key - API密钥
 * @param {string} options.apiDomain - API域名前缀
 * @param {string} options.jd - 岗位描述
 * @param {string} options.resume - 个人简历
 * @param {string} options.customPrompt - 自定义提示词（如果提供）
 * @param {string} options.protocol - 协议
 * @returns {Promise<string>} - 生成的打招呼语
 */
export async function generateGreeting(options) {
  const { model, key, apiDomain, jd, resume, customPrompt, protocol = 'https' } = options;
  
  try {
    // 验证必要参数
    if (!apiDomain) throw new Error('API域名不能为空');
    if (!key) throw new Error('API密钥不能为空');
    if (!model) throw new Error('AI模型不能为空');
    
    const apiUrl = `${getApiBaseUrl(apiDomain, protocol)}/v1/chat/completions`;
    
    // 生成系统提示词前缀
    const systemPrefix = getSystemPromptPrefix(jd, resume);
    
    // 使用自定义提示词或默认提示词
    const userPrompt = customPrompt || getDefaultPrompt();
    
    // 拼接完整提示词
    const fullPrompt = systemPrefix + userPrompt;
    
    console.log('准备发送API请求:', {
      url: apiUrl,
      model: model,
      promptLength: fullPrompt.length,
      hasKey: !!key
    });
    
    const response = await axios({
      method: 'POST',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      data: {
        model: model,
        messages: [{ role: 'user', content: fullPrompt }]
      },
      timeout: 60000 // 60秒超时，增加超时时间
    });
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const result = response.data.choices[0].message.content.trim();
      console.log('API响应成功, 生成结果长度:', result.length);
      return result;
    } else {
      console.error('API响应格式不正确:', response.data);
      throw new Error('API响应格式不正确');
    }
  } catch (error) {
    // 新增：打印完整请求参数
    console.error('[生成失败] API请求参数:', {
      url: `${getApiBaseUrl(apiDomain, protocol)}/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      data: {
        model: model,
        messages: [{ role: 'user', content: (typeof fullPrompt !== 'undefined' ? fullPrompt : '（未生成）') }]
      }
    });
    
    console.error('API调用失败:', error);
    
    let errorMsg = '生成失败: ';
    
    if (error.response) {
      // 服务器返回了错误响应
      const status = error.response.status;
      const errorData = error.response.data;
      
      console.error('API错误详情:', {
        status,
        data: errorData
      });
      
      if (status === 401) {
        errorMsg += '无效的API密钥';
      } else if (status === 404) {
        errorMsg += 'API域名不正确或路径错误';
      } else if (status === 429) {
        errorMsg += '请求次数超限，请稍后再试';
      } else if (errorData && errorData.error) {
        errorMsg += errorData.error.message || JSON.stringify(errorData.error);
      } else {
        errorMsg += `服务器返回 ${status} 错误`;
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      errorMsg += '未收到服务器响应，请检查API域名和网络连接';
    } else {
      // 请求设置出错
      errorMsg += error.message;
    }
    
    // 抛出详细错误以供上层处理
    throw new Error(errorMsg);
  }
} 