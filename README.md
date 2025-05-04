# HireHello 招聘打招呼语生成器

一个基于AI的工具，可以读取岗位JD，自动生成个性化的打招呼语，方便直接粘贴使用，建议配合共享剪贴板使用。支持命令行和Web界面两种使用方式。

## 技术栈

- 前端框架：Vue.js 3
- 构建工具：Vite
- UI组件库：Element Plus
- HTTP客户端：Axios
- 命令行工具：yargs

## 功能特点

- 通过Web界面或命令行读取岗位JD
- 基于OpenAI API生成个性化打招呼语
- 自动将生成结果写入剪贴板
- 支持自定义模型、API密钥、个人简历等参数

## 安装方法

### 本地安装

```bash
# 克隆仓库
git clone https://github.com/liuruing/ HireHello.git
cd  HireHello

# 安装依赖
npm install
```

## 使用方法

### Web界面（推荐）

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 构建静态网站：
   ```bash
   npm run build
   ```
   
   构建完成后，静态文件将生成在`dist`目录中，可以部署到任何静态网站托管服务上。

3. 本地预览构建后的静态网站：
   ```bash
   npm run preview
   ```

### 命令行模式

1. 复制岗位JD到剪贴板
2. 运行程序：
   ```bash
   npm run cli
   ```
3. 程序会自动读取剪贴板中的岗位JD，生成打招呼语，并写回剪贴板
4. 直接粘贴使用生成的打招呼语

### 命令行高级选项

可以通过命令行参数自定义配置：

```bash
# 自定义模型和个人简历
npm run cli -- --model gpt-4 --resume "我是一名有10年经验的高级开发工程师..."

# 或使用简短参数
npm run cli -- -m gpt-4 -r "我是一名有10年经验的高级开发工程师..."

# 查看帮助信息
npm run cli -- --help
```

可用参数：

- `--model, -m`: AI模型名称（默认：gpt-3.5-turbo）
- `--key, -k`: OpenAI API密钥
- `--domain, -d`: API域名前缀（默认：api.openai.com）
- `--resume, -r`: 个人简历信息
- `--help, -h`: 显示帮助信息

## 技术栈

- 前端框架：Vue.js 3
- 构建工具：Vite
- UI组件库：Element Plus
- HTTP客户端：Axios
- 命令行工具：yargs
- 跨平台剪贴板访问：clipboardy

## 注意事项

- Web版使用浏览器的`navigator.clipboard` API，需要在安全上下文（HTTPS或localhost）中运行才能访问剪贴板
- 命令行版需要Node.js 14.0.0或更高版本
- 使用不同的API可能需要调整参数设置

## 常见问题

### clipboardy模块错误

如果在命令行模式下遇到以下错误：
```
Error [ERR_REQUIRE_ESM]: require() of ES Module [...] clipboardy [...]
```

这是因为clipboardy v3.0.0及以上版本是ESM模块。有两种解决方案：

1. **当前方案（推荐）**：项目已配置为使用ESM模块格式
   - package.json中已添加`"type": "module"`
   - 代码中使用`import`代替`require`

2. **替代方案**：如果需要使用CommonJS格式：
   ```bash
   # 卸载当前版本
   npm uninstall clipboardy
   
   # 安装兼容CommonJS的版本
   npm install clipboardy@2.3.0
   ```
   然后删除package.json中的`"type": "module"`行 