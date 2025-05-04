#!/usr/bin/env node

import clipboardy from 'clipboardy';
import axios from 'axios';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// 命令行参数配置
const argv = yargs(hideBin(process.argv))
  .option('model', {
    alias: 'm',
    description: 'AI模型名称',
    type: 'string',
    default: 'gpt-3.5-turbo'
  })
  .option('key', {
    alias: 'k',
    description: 'OpenAI API密钥',
    type: 'string',
    default: ''
  })
  .option('domain', {
    alias: 'd',
    description: 'API域名前缀',
    type: 'string',
    default: 'api.openai.com'
  })
  .option('resume', {
    alias: 'r',
    description: '个人简历',
    type: 'string',
    default: '我是一名经验丰富的软件工程师，有5年开发经验，精通Java、Python和JavaScript等编程语言。曾参与多个大型项目开发，具有良好的团队协作能力和解决问题的能力。'
  })
  .help()
  .alias('help', 'h')
  .parse();

/**
 * 从剪贴板读取岗位JD，生成打招呼语并写回剪贴板
 */
async function main() {
  try {
    // 从剪贴板读取岗位JD
    const jd = await clipboardy.read();
    
    if (!jd || jd.trim() === '') {
      console.error('错误：剪贴板内容为空，请先复制岗位JD到剪贴板');
      process.exit(1);
    }
    
    console.log('已从剪贴板读取岗位JD：');
    console.log('-'.repeat(50));
    console.log(jd.substring(0, 200) + (jd.length > 200 ? '...' : ''));
    console.log('-'.repeat(50));
    
    // 构建提示词
    const prompt = `根据以下信息生成一段简短的打招呼语：
岗位信息：${jd}
我的简历：${argv.resume}
要求：
1. 语气友好专业
2. 简洁有力
3. 突出我与岗位的匹配点
4. 表达应聘意向`;
    
    console.log('正在生成打招呼语...');
    
    // 调用API生成打招呼语
    const greeting = await generateGreeting(
      argv.model,
      argv.key,
      argv.domain,
      prompt
    );
    
    // 将打招呼语写入剪贴板
    await clipboardy.write(greeting);
    
    console.log('打招呼语已生成并写入剪贴板：');
    console.log('-'.repeat(50));
    console.log(greeting);
    console.log('-'.repeat(50));
    console.log('提示：打招呼语已复制到剪贴板，可直接粘贴使用');
    
  } catch (error) {
    console.error('程序运行出错：', error.message);
    process.exit(1);
  }
}

/**
 * 调用API生成打招呼语
 * @param {string} model - AI模型名称
 * @param {string} key - API密钥
 * @param {string} apiDomain - API域名前缀
 * @param {string} prompt - 提示词
 * @returns {Promise<string>} - 生成的打招呼语
 */
async function generateGreeting(model, key, apiDomain, prompt) {
  try {
    const apiUrl = `https://${apiDomain}/v1/chat/completions`;
    
    const response = await axios({
      method: 'POST',
      url: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      data: {
        model: model,
        messages: [{ role: 'user', content: prompt }]
      },
      timeout: 30000 // 30秒超时
    });
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content.trim();
    } else {
      throw new Error('API响应格式不正确');
    }
  } catch (error) {
    console.warn('API调用失败，使用备用打招呼语', error.message);
    // 备用打招呼语
    return `您好！我看到贵公司的招聘信息后非常感兴趣。作为一名拥有5年开发经验的软件工程师，我精通Java、Python和JavaScript等多种编程语言，并参与过多个大型项目的开发。我相信我的技能和经验与贵公司的需求非常匹配，希望能有机会进一步交流。期待您的回复！`;
  }
}

// 启动程序
main(); 