import { useCallback } from 'react';
import { ApiRequestBody, ApiTaskType } from '@/lib/types';
import { DisplayMessage } from '@/components/ChatMessage';

type StreamResponseCallback = (updates: Partial<DisplayMessage>) => void;

/**
 * MARK: 流式响应Hook
 * 用于处理流式响应的自定义Hook
 */
export function useStreamResponse() {
  /**
   * 处理来自API的流式响应
   * @param response 从fetch API获得的响应对象
   * @param updateCallback 用于更新UI的回调函数
   * @param currentTask 当前执行的任务类型
   * @param abortSignal 用于中断请求的AbortSignal
   */
  const processStream = useCallback(async (
    response: Response,
    updateCallback: StreamResponseCallback,
    currentTask: ApiTaskType,
    abortSignal?: AbortSignal
  ) => {
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // 如果无法解析JSON，尝试获取文本
        const textError = await response.text();
        throw new Error(`API请求失败，状态码: ${response.status}, 错误: ${textError || '未知错误'}`);
      }
      
      // 处理特定错误类型
      if (errorData.model) {
        throw new Error(`模型错误: ${errorData.detail || errorData.error || '未知模型错误'} (模型: ${errorData.model})`);
      } else {
        throw new Error(errorData.detail || errorData.error || `API请求失败，状态码: ${response.status}`);
      }
    }
    
    if (!response.body) {
      throw new Error("响应体为空");
    }

    // MARK: SSE 流处理逻辑
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let partialLine = ''; // 用于处理跨块的行

    let isParsingThinking = false;
    let currentThinkContent = '';
    let currentMainContent = ''; // 用于拼接主要内容
    let thinkingDone = false;
    let accumulatedJson = ''; // 用于拼接 JSON 分析任务的输出
    
    // MARK: 添加超时保护
    let lastActivityTimestamp = Date.now();
    const INACTIVITY_TIMEOUT = 30000; // 30秒无活动判定为超时

    try {
      while (true) {
        // 检查是否已请求中断
        if (abortSignal?.aborted) {
          throw new Error('请求已中断');
        }
        
        // 检查流是否超时无响应
        if (Date.now() - lastActivityTimestamp > INACTIVITY_TIMEOUT) {
          throw new Error('从模型获取响应超时，请检查网络连接或服务器状态');
        }

        const { done, value } = await reader.read();
        if (done) break;
        
        // 更新活动时间戳
        lastActivityTimestamp = Date.now();

        // 将接收到的数据块解码并与上一块剩余的部分拼接
        partialLine += decoder.decode(value, { stream: true });

        // 按换行符分割处理 SSE 消息行
        const lines = partialLine.split('\n');
        // 最后一行可能不完整，保留在 partialLine 中等待下一块
        partialLine = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataContent = line.substring('data: '.length).trim();

            if (dataContent === '[DONE]') {
              console.log("流结束 [DONE]");
              thinkingDone = true; // 标记思考结束（即使没有</think>）
              updateCallback({ isThinkingComplete: thinkingDone });
              break; // 跳出内层 for 循环 (不是 while)
            }

            try {
              const parsedData = JSON.parse(dataContent);
              
              // 检查是否有错误信息
              if (parsedData.error) {
                throw new Error(`模型响应错误: ${parsedData.error}`);
              }
              
              // 提取实际的文本增量
              const textChunk = parsedData.choices?.[0]?.delta?.content ?? '';

              if (textChunk) {
                // MARK: 处理 <think> 标签
                let remainingChunk = textChunk;
                while(remainingChunk.length > 0) {
                  if (isParsingThinking) {
                    const endThinkIndex = remainingChunk.indexOf('</think>');
                    if (endThinkIndex !== -1) {
                      currentThinkContent += remainingChunk.substring(0, endThinkIndex);
                      isParsingThinking = false;
                      thinkingDone = true;
                      remainingChunk = remainingChunk.substring(endThinkIndex + '</think>'.length);
                      // 更新 UI (标记思考完成)
                      updateCallback({
                        thinkContent: currentThinkContent,
                        isThinkingComplete: thinkingDone,
                        mainContent: currentMainContent + remainingChunk // 处理紧跟在</think>后的内容
                      });
                      currentMainContent += remainingChunk; // 更新累积的 main content
                      remainingChunk = ''; // 这个 chunk 处理完了

                    } else {
                      currentThinkContent += remainingChunk;
                      remainingChunk = ''; // 这个 chunk 处理完了
                      // 更新 UI (持续更新思考内容)
                      updateCallback({ thinkContent: currentThinkContent, isThinkingComplete: false });
                    }
                  } else { // 不在解析 thinking 块
                    const startThinkIndex = remainingChunk.indexOf('<think>');
                    if (startThinkIndex !== -1) {
                      const textBeforeThink = remainingChunk.substring(0, startThinkIndex);
                      currentMainContent += textBeforeThink;
                      isParsingThinking = true;
                      thinkingDone = false;
                      // 处理 <think> 之后的部分
                      currentThinkContent += remainingChunk.substring(startThinkIndex + '<think>'.length);
                      remainingChunk = ''; // 这个 chunk 处理完了
                      // 更新 UI
                      updateCallback({
                        mainContent: currentMainContent,
                        thinkContent: currentThinkContent, // 开始填充思考内容
                        isThinkingComplete: false,
                      });
                    } else {
                      // 没有 think 标签，全部是 main content
                      currentMainContent += remainingChunk;
                      remainingChunk = ''; // 这个 chunk 处理完了
                      // 更新 UI
                      updateCallback({ mainContent: currentMainContent });
                    }
                  }
                }
                // MARK: 结束think标签处理

                // 如果是 JSON 分析任务，将 mainContent 累加到 accumulatedJson
                if (currentTask === 'analyze_json_add_tags' && !isParsingThinking && currentMainContent.length > 0) {
                  accumulatedJson = currentMainContent; // 直接使用当前的mainContent，避免重复累加
                }
              } // end if (textChunk)

              // MARK: 处理流结束标志
              if (parsedData.choices?.[0]?.finish_reason === 'stop') {
                console.log("流结束 (finish_reason=stop)");
                thinkingDone = true; // 标记思考结束
                updateCallback({ isThinkingComplete: thinkingDone });
                break; // 跳出内层 for 循环
              }

            } catch (e) {
              console.error('解析SSE数据块失败:', dataContent, e);
              // 如果持续解析失败，可以考虑抛出错误终止流
              if (dataContent.includes('error') || dataContent.includes('Error')) {
                throw new Error(`解析模型响应出错: ${e instanceof Error ? e.message : String(e)}`);
              }
            }
          }
        }

        if (lines.includes('[DONE]') || thinkingDone && !isParsingThinking) {
          // 检查是否是因为 [DONE] 或 finish_reason='stop' 跳出的
          if(lines.includes('[DONE]') || decoder.decode(value).includes('"finish_reason":"stop"')) break; // 退出外层 while
        }
      } 

      // MARK: 流结束后处理 JSON 分析任务的最终结果
      if (currentTask === 'analyze_json_add_tags') {
        if (accumulatedJson.trim()) {
          try {
            console.log("尝试解析累积的JSON内容");
            // 清理可能的 markdown (虽然 prompt 要求不加，但以防万一)
            const finalCleanedJson = accumulatedJson.replace(/^```json\s*|```$/g, '').trim();
            const finalResult = JSON.parse(finalCleanedJson);
            // 成功解析，用格式化的 JSON 更新最后一条消息
            updateCallback({
              mainContent: JSON.stringify(finalResult, null, 2) // 最终显示格式化的 JSON
            });
          } catch (e) {
            console.error("解析最终JSON失败:", e);
            updateCallback({
              role: 'error',
              mainContent: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}\n\n接收到的内容: ${accumulatedJson.substring(0, 200)}${accumulatedJson.length > 200 ? '...' : ''}`
            });
          }
        } else if (thinkingDone && !accumulatedJson.trim()) {
          // 只有思考过程，没有 JSON 输出
          console.warn("JSON Analysis 任务完成，但<think>块后没有累积任何JSON内容");
          updateCallback({
            mainContent: "(模型仅输出了思考过程，未找到有效的 JSON 输出)"
          });
        }
      }
    } catch (error) {
      // 处理特定的错误类型
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('流处理被中断');
        throw new Error('请求已被用户中断');
      }
      
      // 重新抛出错误，让调用者处理
      throw error;
    } finally {
      // 确保读取器已关闭
      try {
        await reader.cancel();
      } catch (e) {
        console.warn('关闭流读取器时出错:', e);
      }
    }
  }, []);

  /**
   * MARK: 发送请求&处理流式响应
   * @param requestBody API请求体
   * @param updateCallback 用于更新UI的回调函数
   * @param abortController 用于中断请求的AbortController
   */
  const sendStreamRequest = useCallback(async (
    requestBody: ApiRequestBody,
    updateCallback: StreamResponseCallback,
    abortController?: AbortController
  ) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: abortController?.signal
      });

      await processStream(response, updateCallback, requestBody.task, abortController?.signal);
      return true;
    } catch (error) {
      console.error('流式API调用失败:', error);
      
      // 检查是否是中断错误
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('中断'))) {
        console.log('请求已中断');
        updateCallback({
          mainContent: '[请求已中断]',
          isThinkingComplete: true,
        });
        return false;
      } 
      // 检查是否是模型错误
      else if (error instanceof Error && (
          error.message.includes('模型') || 
          error.message.includes('model') || 
          error.message.includes('找不到')
      )) {
        updateCallback({
          role: 'error',
          content: '',
          mainContent: `模型错误: ${error.message}`,
          isThinkingComplete: true,
        });
        // 重新抛出错误，让上层组件处理特定的模型错误
        throw new Error(`模型错误: ${error.message}`);
      } 
      // 其他一般错误
      else {
        updateCallback({
          role: 'error',
          content: '',
          mainContent: `流式请求错误: ${error instanceof Error ? error.message : String(error)}`,
          isThinkingComplete: true,
        });
        return false;
      }
    }
  }, [processStream]);

  return { sendStreamRequest };
} 