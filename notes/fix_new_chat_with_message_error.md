## 问题分析

  1. 用户发送消息时，先创建了userMessage对象
  2. 如果没有chatId，会创建新聊天
  3. 然后通过setMessages添加用户消息（这是异步的）
  4. 但是prepareRequestBody使用的是旧的messages数组，不包含刚添加的用户消息
  5. 这导致发送给模型的请求中没有用户的消息，所以模型无法生成回复

  解决方案

  创建一个包含新消息的临时数组messagesWithNewMessage，确保prepareRequestBody能够
  获取到完整的消息历史：

  // 创建包含新消息的消息数组，用于请求
  const messagesWithNewMessage = [...messages, userMessage];

  const requestBody = prepareRequestBody(
    userInput,
    messagesWithNewMessage,  // 使用包含新消息的数组
    selectedModel,
    modelSettings
  );

  工作流程

  现在的流程是：
  1. 用户在"/"路由发送消息
  2. 创建userMessage对象
  3. 如果没有chatId，创建新聊天（同步更新currentChatId）
  4. 更新UI显示用户消息
  5. 使用包含新消息的完整数组准备API请求
  6. 发送请求给模型并获取回复
  7. 显示模型的回复