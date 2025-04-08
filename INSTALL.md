## Ollama
首先需要安装ollama并且拉取模型，运行起来，默认端口开放在 11434
这里以 deepseek-r1:7b 为例
```bash
ollama pull deepseek-r1:7b
ollama run deepseek-r1:7b
```


## 启动项目
```bash
pnpm install
```

配置完依赖后，可以启动项目：

```bash
pnpm dev
```