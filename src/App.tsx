import {
  Button,
  Input,
  Layout,
  List,
  Popconfirm,
  Typography,
  Upload,
  message,
} from "antd";
import {
  PictureOutlined,
  PoweroffOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import {
  httpConversationGet,
  httpDelConvertById,
  httpConversationlistTitle,
  httpCoversationCreate,
  httpLLMRequest,
  stopLLMRequest,
  uploadImage,
} from "./api/index";
import "./App.less";
import MarkdownCard from "./components/markdownCard";
import EatCard from "./components/cards/eatCard";

const { Sider, Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

type MessageRole = string;

interface ChatMessage {
  id?: number;
  role: MessageRole;
  content: string|any[];
  cardName?: string;
  _arguments?: any;
}

interface ChatHistory {
  id?: number;
  convertId?: string;
  title: string;
  time?: string;
}

function App() {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]); //会话记录详情
  const [historyList, setHistorylist] = useState<ChatHistory[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [deletingConvertId, setDeletingConvertId] = useState("");
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRafId = useRef<number | null>(null);
  const [imageUrl, setImageUrl] = useState(""); // 存放上传后返回的 base64
  // 定义一个 ref 存控制器
  const conversationRequestIdRef = useRef(0);
  // Demo 场景：为了调用后端 `/llm`，需要携带 userId / convertId。
  // 这里用固定 userId + 当前会话的 convertId（页面刷新后会变）。
  const [userId] = useState("001");
  const [convertId, setCovertId] = useState("");

  // 发送消息
  const sendMessage = async (input?: string) => {
    const value = inputValue.trim() || input;
    if (!value || isRequesting) {
      return;
    }
    const currentId = Date.now();
    let userObj:any = {
      id: currentId,
      role: "user" as const,
      content: value,
    };
    if (imageUrl) {
      userObj.content = [
        {
          type: "image_url",
          image_url: imageUrl,
        },
        {
          type:'text',
          text:value
        }
      ];
    }
    // 这里要先判断有没有图片 有的话 就得用数组
    setMessages((prev) => [...prev, userObj]);
    setInputValue("");
    // ✅ 1. 发送前立刻开 loading（最重要！）
    setIsRequesting(true);
    
    try {
      httpLLMRequest(
        {
          keyword: userObj.content,
          userId,
          convertId,
        },
        (event: any) => {
          // 我们要的数据就在event.data里面 他是一个字符串
          let convertObj = JSON.parse(event.data);
          if (convertObj.done) {
            setIsRequesting(false);
            return;
          } else {
            // 2. 安全更新：必须用函数式更新 prev
            setMessages((prev) => {
              // 查找是否已存在
              const index = prev.findIndex((item) => item.id === convertObj.id);
              // 不存在 → 新增
              if (index === -1) {
                return [...prev, convertObj];
              }
              // 存在 → 替换更新
              const newList = [...prev];
              newList[index] = convertObj;
              return newList;
            });
          }
        },
      );
    } catch (error) {
      setIsRequesting(false);
      const errorMessage =
        error instanceof Error ? error.message : "请求失败，请稍后重试";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: `请求失败：${errorMessage}`,
        },
      ]);
    } finally {
    }
  };
  // 单独写一个获取右侧历史记录的方法
  const getHistoryTitle = async () => {
    let ConversationList = await httpConversationlistTitle({ userId });
    // 先判断有没有数据
    setHistorylist(ConversationList.data || []);
    return ConversationList;
  };
  // 单独写一个获取单条记录的全部对话方法
  const getConversationList = async (_convertId?: string) => {
    const targetConvertId = _convertId || convertId;
    if (!targetConvertId) {
      return;
    }
    const requestId = ++conversationRequestIdRef.current;
    setIsConversationLoading(true);
    try {
      const singleList = await httpConversationGet({
        userId,
        convertId: targetConvertId,
      });
      // 只使用最后一次请求结果，避免快速切换时旧请求覆盖新结果
      if (requestId !== conversationRequestIdRef.current) {
        return;
      }
      setMessages(singleList.data.list || []);
    } finally {
      if (requestId === conversationRequestIdRef.current) {
        setIsConversationLoading(false);
      }
    }
  };
  const init = async () => {
    let ConversationList = await getHistoryTitle();
    // 拿到历史记录后,调用查找接口,
    let _convertId = "";
    if (ConversationList.data.length) {
      _convertId = ConversationList.data[0].convertId;
      getConversationList(_convertId);
    } else {
      // 没有历史会话就新建一条会话记录
      let convertResult = await httpCoversationCreate({
        userId: "001",
      });
      _convertId = convertResult.data;
    }
    setCovertId(_convertId);
  };
  // 创建新的会话
  const createNewConversation = async () => {
    if (isCreatingConversation) {
      return;
    }
    setIsCreatingConversation(true);
    try {
      // 先获取历史记录
      await getHistoryTitle();
      //然后再创建新的会话
      const result = await httpCoversationCreate({ userId });
      if (result?.data) {
        setCovertId(result.data);
        setMessages([]);
      }
    } finally {
      setIsCreatingConversation(false);
    }
  };
  //点击左侧的历史会话记录
  const handleHistoryItemClick = async (item: ChatHistory) => {
    // 先判断是否是相同会话,相同会话不需要掉接口
    if (item.convertId == convertId) {
      return;
    }
    if (!item.convertId) {
      return;
    }
    setCovertId(item.convertId);
    // 先获取一下title
    await getHistoryTitle();
    await getConversationList(item.convertId);
  };
  // 点击右侧历史会话记录的删除
  const handleHistoryDeleteClick = async (item: ChatHistory) => {
    if (!item.convertId || deletingConvertId) {
      return;
    }
    const deleteIndex = historyList.findIndex(
      (history) => history.convertId === item.convertId,
    );
    if (deleteIndex < 0) {
      return;
    }
    const previousItem = historyList[deleteIndex - 1];
    const nextItem = historyList[deleteIndex + 1];
    const neighborItem = previousItem || nextItem;

    setDeletingConvertId(item.convertId);
    try {
      await httpDelConvertById({
        userId,
        convertId: item.convertId,
      });
      message.success("删除成功");

      // 删除的是最后一条，直接新建会话
      if (historyList.length === 1) {
        const createResult = await httpCoversationCreate({ userId });
        if (createResult?.data) {
          setCovertId(createResult.data);
          setMessages([]);
        }
        await getHistoryTitle();
        return;
      }

      // 删除后切换到相邻记录（优先上一条，没有就下一条）
      if (neighborItem?.convertId) {
        setCovertId(neighborItem.convertId);
        await getConversationList(neighborItem.convertId);
      } else {
        setMessages([]);
      }
      await getHistoryTitle();
    } finally {
      setDeletingConvertId("");
    }
  };

  const scrollToLatestMessage = () => {
    if (!chatMessagesRef.current || !messageEndRef.current) {
      return;
    }
    if (autoScrollRafId.current) {
      cancelAnimationFrame(autoScrollRafId.current);
    }
    autoScrollRafId.current = requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    });
  };
  // handlefrontTool 是工具卡片的调用方法
  const handlefrontTool = (type: string, content: string) => {
    switch (type) {
      case "wm_card":
        sendMessage(content);
        break;
      default:
        return;
    }
  };
  // 点击loading关闭请求
  const handleStopMessage = () => {
    // 这里写点击暂停按钮的逻辑的地方
    stopLLMRequest();
    setIsRequesting(false);
    setIsConversationLoading(false);
  };
  // 图片上传前的校验
  const beforeUpload = (file) => {
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("只能上传图片文件！");
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error("图片必须小于 5MB！");
    }
    return isImage && isLt5M;
  };
  const handleImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // 调用你自己的上传接口
      const res: any = await uploadImage(formData);
      console.log("=res", res);
      setImageUrl(res.imageBase64);
    } catch (err) {
      console.error(err);
      message.error("上传接口异常");
    }
  };
  useEffect(() => {
    scrollToLatestMessage();
    return () => {
      if (autoScrollRafId.current) {
        cancelAnimationFrame(autoScrollRafId.current);
      }
    };
  }, [messages, isRequesting]);
  // 初始化获取消息
  useEffect(() => {
    init();
  }, []);
  return (
    <Layout className="chat-layout">
      <Sider width={280} className="chat-sider">
        <div className="sider-header">
          <div className="sider-header-top">
            <Title level={4}>历史记录</Title>
            <Button
              type="primary"
              size="small"
              onClick={createNewConversation}
              loading={isCreatingConversation}
            >
              创建新对话
            </Button>
          </div>
          <Text type="secondary">最近会话</Text>
        </div>
        <List
          itemLayout="horizontal"
          dataSource={historyList}
          renderItem={(item) => (
            <List.Item
              className="history-item"
              onClick={() => handleHistoryItemClick(item)}
            >
              <div className="history-item-content">
                <List.Item.Meta
                  title={<span className="history-title">{item.title}</span>}
                  description={item.time}
                />
                <Popconfirm
                  title="确认删除这条会话吗？"
                  okText="确认"
                  cancelText="取消"
                  onConfirm={() => handleHistoryDeleteClick(item)}
                >
                  <Button
                    type="text"
                    danger
                    size="small"
                    className="history-delete-btn"
                    loading={deletingConvertId === item.convertId}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    删除
                  </Button>
                </Popconfirm>
              </div>
            </List.Item>
          )}
        />
      </Sider>

      <Content className="chat-main">
        <div className="chat-header">
          <Title level={3}>AI 对话</Title>
          <Text type="secondary">
            单页面聊天示例（React + TS + Vite + Ant Design）
          </Text>
        </div>
        {/* 聊天区 */}
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((message, index) => {
            let position = "";
            let cardName = message.cardName || "";
            if (message.role == "user") {
              position = "right";
            } else if (message.role == "assistant" && message.content) {
              position = "left";
            } else if (cardName) {
              position = "left";
            }
            return (
              position && (
                <div
                  key={message.id || index}
                  className={`message-row ${position || "left"}`}
                >
                  {cardName ? (
                    cardName == "wm_card" && (
                      <EatCard
                        _arguments={message._arguments}
                        handlefrontTool={handlefrontTool}
                      ></EatCard>
                    )
                  ) : (
                    <MarkdownCard message={message}></MarkdownCard>
                  )}
                </div>
              )
            );
          })}
          {/* 这里展示卡片 */}

          {(isRequesting || isConversationLoading) && (
            <div className="message-row assistant">
              <div className="message-bubble">
                <div className="message-loading">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
        {/* 输入框区 */}
        {/* <div className="chat-input">
          <TextArea
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="输入你的问题，按 Enter 发送（Shift + Enter 换行）"
            autoSize={{ minRows: 2, maxRows: 5 }}
            onPressEnter={(event) => {
              if (!event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
          />
          {isRequesting && (
            <Button
              onClick={handleStopMessage}
              type="primary"
              icon={<PoweroffOutlined />}
            />
          )}
          {!isRequesting && (
            <Button type="primary" onClick={sendMessage}>
              发送
            </Button>
          )}
        </div> */}
        <div className="chat-input-wrapper">
          {/* 图片预览 */}
          {imageUrl && (
            <div className="image-preview">
              <img src={imageUrl} alt="预览" />
              <span
                className="close"
                onClick={() => {
                  setImageUrl("");
                }}
              >
                ×
              </span>
            </div>
          )}

          <div className="chat-input">
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="输入问题，按Enter发送（Shift+Enter换行）"
              autoSize={{ minRows: 2, maxRows: 5 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="send-btn-container">
              <div>
                {/* 上传图片按钮 */}
                <Upload
                  name="file"
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  customRequest={({ file }) => handleImageUpload(file)}
                >
                  <Button
                    icon={<PictureOutlined />}
                    type="text"
                    disabled={isRequesting}
                    className="img-btn"
                  />
                </Upload>
              </div>
              <div>
                {isRequesting ? (
                  <Button
                    onClick={handleStopMessage}
                    type="primary"
                    danger
                    icon={<PoweroffOutlined />}
                  >
                    停止
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    onClick={sendMessage}
                    icon={<SendOutlined />}
                  >
                    发送
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default App;
