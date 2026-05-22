import React, { useState, useEffect, useRef } from 'react';
import { getAIPredictions, getAIRecommendations, askAIChat } from '../services/api';
import { 
  FaBrain, 
  FaChartLine, 
  FaLightbulb, 
  FaExclamationTriangle, 
  FaPaperPlane, 
  FaRobot, 
  FaUser, 
  FaCommentDots 
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const AIPage = () => {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'chat'
  
  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Xin chào! Tôi là **Trợ lý Tài chính AI** của bạn. 🧠🤖\n\nTôi ở đây để tư vấn và phân tích số liệu tài chính trực tiếp từ tài khoản của bạn. Bạn có thể hỏi tôi bất kỳ câu hỏi nào hoặc sử dụng các gợi ý nhanh bên trái để trải nghiệm thử nhé!",
      timestamp: new Date()
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchAIData();
  }, [selectedMonth]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending]);

  const fetchAIData = async () => {
    try {
      setLoading(true);
      const [predRes, recRes] = await Promise.all([
        getAIPredictions(selectedMonth),
        getAIRecommendations()
      ]);
      setPredictions(predRes.data);
      setRecommendations(recRes.data.recommendations);
    } catch (error) {
      toast.error("Failed to fetch AI insights");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputVal.trim();
    if (!text) return;

    if (!textToSend) {
      setInputVal('');
    }

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setSending(true);

    try {
      const response = await askAIChat(text);
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response.data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      toast.error("AI Assistant is offline");
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "🚨 *Lỗi:* Không thể kết nối với Trợ lý AI. Vui lòng đảm bảo Flask server đang chạy.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };



  // Simple custom inline style parser for bullet points, bold and inline code
  const parseInlineStyle = (text) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const splitParts = text.split(regex);
    
    return splitParts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="bg-gray-900 text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  // Basic Markdown parser for paragraphs, headers and list items
  const renderMarkdown = (text) => {
    if (!text) return '';
    const lines = text.split('\n');
    return lines.map((line, index) => {
      let content = line;
      if (content.startsWith('### ')) {
        return <h4 key={index} className="text-lg font-bold text-purple-300 mt-4 mb-2 border-b border-gray-700/50 pb-1">{content.replace('### ', '')}</h4>;
      }
      if (content.startsWith('## ')) {
        return <h3 key={index} className="text-xl font-bold text-purple-400 mt-4 mb-2">{content.replace('## ', '')}</h3>;
      }
      if (content.startsWith('* ') || content.startsWith('- ')) {
        const cleanText = content.replace(/^[\*\-]\s+/, '');
        return (
          <li key={index} className="ml-4 list-disc text-gray-300 my-1">
            {parseInlineStyle(cleanText)}
          </li>
        );
      }
      if (content.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }
      return <p key={index} className="text-gray-300 my-1 leading-relaxed">{parseInlineStyle(content)}</p>;
    });
  };

  const suggestions = [
    { label: "📊 Spending Analysis", query: "Phân tích chi tiêu tháng này" },
    { label: "💰 Income Streams", query: "Thu nhập tháng này của tôi" },
    { label: "💡 Savings Advice", query: "Tư vấn cách tiết kiệm tiền" },
    { label: "🛡️ Budget Status", query: "Kiểm tra hạn mức ngân sách" },
    { label: "🏆 Top Category", query: "Danh mục chi tiêu cao nhất" },
    { label: "🚨 Anomaly Check", query: "Chi tiêu bất thường" }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Cosmic Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-blue-900 rounded-2xl p-6 text-white shadow-xl border border-purple-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 bg-purple-600/30 rounded-xl border border-purple-400/20">
            <FaBrain className="text-3xl text-purple-300 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-wide">AI Financial Copilot</h2>
            <p className="text-purple-200 mt-1">Smart advisor and real-time automated forecasting</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-gray-700/60 pb-px mb-4">
        <button
          onClick={() => setActiveTab('insights')}
          className={`pb-3 px-4 font-semibold transition-all duration-300 relative ${
            activeTab === 'insights' 
              ? 'text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <FaChartLine />
            AI Dashboard & Insights
          </span>
          {activeTab === 'insights' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 px-4 font-semibold transition-all duration-300 relative ${
            activeTab === 'chat' 
              ? 'text-white' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <FaCommentDots />
            Talk to AI Advisor
          </span>
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          )}
        </button>
      </div>

      {/* Tab Content 1: Dashboard Insights */}
      {activeTab === 'insights' && predictions && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Predictions Card */}
            <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <FaChartLine className="text-blue-400 text-xl" />
                <h3 className="text-xl font-bold text-white">Next Month Prediction</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Predicted Expense</p>
                  <p className="text-3xl font-bold text-white">${(predictions.predicted_expense ?? 0).toFixed(2)}</p>
                  <p className={`text-sm mt-1 ${
                    (predictions.change_percentage ?? 0) > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {(predictions.change_percentage ?? 0) > 0 ? '↑' : '↓'} 
                    {Math.abs(predictions.change_percentage ?? 0).toFixed(1)}% from this month
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Top predicted category</p>
                  <p className="text-lg font-semibold text-white">
                    {predictions.top_category || 'None'} - ${(predictions.top_category_amount ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations Card */}
            <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <FaLightbulb className="text-yellow-400 text-xl" />
                <h3 className="text-xl font-bold text-white">Smart Recommendations</h3>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-gray-700/40 rounded-xl border border-gray-700/30">
                    <p className="text-gray-200 text-sm">{rec.message}</p>
                    <p className="text-xs text-purple-300 mt-1.5 font-medium">Potential savings: ${rec.potential_savings}/month</p>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-gray-400 text-sm italic">No active recommendations for now.</p>
                )}
              </div>
            </div>
          </div>

          {/* Spending Alerts */}
          <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <FaExclamationTriangle className="text-orange-400 text-xl" />
              <h3 className="text-xl font-bold text-white">Spending Alerts</h3>
            </div>
            <div className="space-y-3">
              {predictions?.alerts?.map((alert, index) => (
                <div key={index} className="p-4 bg-orange-950/20 border border-orange-500/20 rounded-xl">
                  <p className="text-orange-300 text-sm leading-relaxed">{alert}</p>
                </div>
              ))}
              {(!predictions?.alerts || predictions.alerts.length === 0) && (
                <p className="text-gray-400 text-sm italic">You have no budgeting alerts this month! Great job!</p>
              )}
            </div>
          </div>

          {/* Monthly Comparison */}
          <div className="bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-gray-700/50">
            <h3 className="text-xl font-bold text-white mb-4">Monthly Spending Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-3 text-gray-400 text-sm">Category</th>
                    <th className="text-right py-3 text-gray-400 text-sm">This Month</th>
                    <th className="text-right py-3 text-gray-400 text-sm">Last Month</th>
                    <th className="text-right py-3 text-gray-400 text-sm">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions?.category_comparison?.map((cat, index) => (
                    <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-700/10 transition-colors">
                      <td className="py-3.5 text-gray-300 text-sm font-medium">{cat.name}</td>
                      <td className="py-3.5 text-right text-gray-300 text-sm">${(cat.current ?? 0).toFixed(2)}</td>
                      <td className="py-3.5 text-right text-gray-300 text-sm">${(cat.previous ?? 0).toFixed(2)}</td>
                      <td className={`py-3.5 text-right text-sm font-bold ${
                        (cat.change ?? 0) > 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {(cat.change ?? 0) > 0 ? '+' : ''}{(cat.change ?? 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {(!predictions?.category_comparison || predictions.category_comparison.length === 0) && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-gray-500 italic text-sm">No transaction categories logged for comparison.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Interactive AI Chatbot */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[550px] relative">
          
          {/* Quick Suggestions Panel */}
          <div className="lg:col-span-1 bg-gray-800/80 backdrop-blur-md rounded-2xl p-5 border border-gray-700/50 flex flex-col justify-between shadow-lg">
            <div>
              <h4 className="text-white font-bold text-md mb-3 pb-2 border-b border-gray-700/50 flex items-center gap-1.5">
                <FaLightbulb className="text-yellow-400" />
                Quick Suggestions
              </h4>
              <p className="text-xs text-gray-400 mb-4">Click any option below to ask the AI financial assistant immediately:</p>
              <div className="space-y-2.5">
                {suggestions.map((s, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(s.query)}
                    disabled={sending}
                    className="w-full text-left py-2.5 px-3 bg-gray-700/30 hover:bg-purple-600/20 hover:border-purple-500/40 border border-gray-700/50 rounded-xl text-gray-300 hover:text-purple-300 text-xs font-semibold tracking-wide transition-all duration-300"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-[10px] text-purple-300/80 leading-relaxed">
              🤖 <strong>AI Copilot</strong> analyses your live transactions, global limits and budgets instantly to output maximum precision.
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="lg:col-span-3 bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-700/50 flex flex-col h-full overflow-hidden shadow-lg">
            
            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[460px] custom-scrollbar">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`p-2 rounded-xl border shrink-0 ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' 
                        : 'bg-purple-600/20 border-purple-500/30 text-purple-400'
                    }`}>
                      {msg.sender === 'user' ? <FaUser className="text-sm" /> : <FaRobot className="text-sm" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`p-4 rounded-2xl text-sm shadow-md leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-tr-none' 
                        : 'bg-gray-750/90 border border-gray-700/70 text-gray-200 rounded-tl-none'
                    }`}>
                      {msg.sender === 'user' ? (
                        <p>{msg.text}</p>
                      ) : (
                        <div className="space-y-1">
                          {renderMarkdown(msg.text)}
                        </div>
                      )}
                      <span className="block text-[10px] text-gray-400 mt-2 text-right">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2.5 max-w-[85%]">
                    <div className="p-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 shrink-0 animate-pulse">
                      <FaRobot className="text-sm" />
                    </div>
                    <div className="flex gap-1.5 items-center bg-gray-750/50 border border-gray-700/40 rounded-2xl px-4 py-3 shadow-inner">
                      <div className="h-1.5 w-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-1.5 w-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-1.5 w-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-gray-900/40 border-t border-gray-700/60 flex items-center gap-3 w-full"
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me about your spending, saving advice, or budgets..."
                disabled={sending}
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 text-sm font-medium transition-all duration-300"
              />
              <button
                type="submit"
                disabled={sending || !inputVal.trim()}
                className="p-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition-all duration-300 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/20"
              >
                <FaPaperPlane className="text-sm" />
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default AIPage;