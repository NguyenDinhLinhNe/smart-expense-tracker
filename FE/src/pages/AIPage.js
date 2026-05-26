import React, { useState, useEffect, useRef } from 'react';
import { getAIPredictions, getAIRecommendations, askAIChat, getDashboardData } from '../services/api';
import { 
  FaBrain, 
  FaChartLine, 
  FaLightbulb, 
  FaExclamationTriangle, 
  FaPaperPlane, 
  FaRobot, 
  FaUser, 
  FaCommentDots,
  FaChevronRight,
  FaDatabase,
  FaPiggyBank,
  FaMoneyBillWave,
  FaRegCompass
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { formatVND } from '../services/utils';

const AIPage = () => {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
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
  const inputRef = useRef(null);

  // Auto focus input when chat tab is active or sending state completes
  useEffect(() => {
    if (!sending && activeTab === 'chat' && inputRef.current) {
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [sending, activeTab]);

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
      const [predRes, recRes, dashRes] = await Promise.all([
        getAIPredictions(selectedMonth),
        getAIRecommendations(),
        getDashboardData()
      ]);
      setPredictions(predRes.data);
      setRecommendations(recRes.data.recommendations);
      setDashboardData(dashRes.data);
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
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "Tôi đang gặp khó khăn khi kết nối với máy chủ phân tích tài chính. Vui lòng kiểm tra lại dịch vụ hệ thống của bạn nhé! 🤖💼",
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
        return <code key={idx} className="bg-[#090d16] text-[#06b6d4] px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
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
        return <h4 key={index} className="text-sm font-extrabold text-cyan-premium mt-4 mb-2 border-b border-dark-border pb-1 font-heading uppercase tracking-wide">{content.replace('### ', '')}</h4>;
      }
      if (content.startsWith('## ')) {
        return <h3 key={index} className="text-base font-extrabold text-purple-premium mt-4 mb-2 font-heading uppercase tracking-wide">{content.replace('## ', '')}</h3>;
      }
      if (content.startsWith('* ') || content.startsWith('- ')) {
        const cleanText = content.replace(/^[\*\-]\s+/, '');
        return (
          <li key={index} className="ml-4 list-disc text-gray-300 my-1 text-xs">
            {parseInlineStyle(cleanText)}
          </li>
        );
      }
      if (content.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }
      return <p key={index} className="text-gray-300 my-1 leading-relaxed text-xs">{parseInlineStyle(content)}</p>;
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
      <div className="flex flex-col items-center justify-center py-20 gap-3 font-body">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-premium"></div>
        <span className="text-xs text-gray-500 tracking-wide uppercase font-semibold">Tuning neural predictions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in font-body">
      {/* Dynamic Cosmic Header */}
      <div className="bg-dark-glass border border-dark-border p-6 rounded-2xl relative overflow-hidden group hover:border-white/10 transition-all duration-300 shadow-xl">
        <div className="absolute w-36 h-36 bg-cyan-premium blur-[45px] -top-12 -right-12 opacity-[0.08] rounded-full pointer-events-none"></div>
        <div className="absolute w-36 h-36 bg-purple-premium blur-[45px] -bottom-12 -left-12 opacity-[0.05] rounded-full pointer-events-none"></div>
        
        <div className="flex items-center gap-4.5 relative z-10">
          <div className="w-[50px] h-[50px] rounded-xl bg-gradient-to-br from-cyan-premium to-purple-premium flex items-center justify-center text-white text-xl shadow-lg shadow-cyan-premium/25 animate-pulse">
            <FaBrain className="text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-wide uppercase font-heading">AI Financial</h2>
            <p className="text-xs text-gray-500 mt-0.5">Smart advisor and real-time automated cashflow forecasting</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-6 border-b border-dark-border/40 pb-px">
        <button
          onClick={() => setActiveTab('insights')}
          className={`pb-3.5 px-4 text-xs uppercase font-extrabold tracking-wider font-heading transition-all duration-300 relative ${
            activeTab === 'insights' 
              ? 'text-cyan-premium' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <FaChartLine className="text-sm" />
            AI Dashboard & Insights
          </span>
          {activeTab === 'insights' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-premium to-teal-premium rounded-full"></div>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3.5 px-4 text-xs uppercase font-extrabold tracking-wider font-heading transition-all duration-300 relative ${
            activeTab === 'chat' 
              ? 'text-cyan-premium' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <FaCommentDots className="text-sm" />
            Talk to AI Advisor
          </span>
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-premium to-purple-premium rounded-full"></div>
          )}
        </button>
      </div>

      {/* Tab Content 1: Dashboard Insights */}
      {activeTab === 'insights' && predictions && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Predictions Card */}
            <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-white/10 transition-all duration-300 group">
              <div className="absolute w-32 h-32 bg-cyan-premium blur-[35px] -top-12 -right-12 opacity-[0.05] rounded-full pointer-events-none group-hover:opacity-10 transition-opacity"></div>
              <div className="flex items-center gap-2.5 mb-5 border-b border-dark-border/40 pb-3">
                <FaChartLine className="text-cyan-premium text-base" />
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-heading">Next Month Prediction</h3>
              </div>
              
              <div className="space-y-5">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">PREDICTED OUTFLOW</p>
                  <p className="text-3xl font-extrabold text-white mt-1.5 font-heading tracking-tight font-mono">{formatVND(predictions.predicted_expense ?? 0)}</p>
                  <p className={`text-xs font-semibold mt-2.5 flex items-center gap-1 ${
                    (predictions.change_percentage ?? 0) > 0 ? 'text-rose-premium' : 'text-emerald-premium'
                  }`}>
                    <span>{(predictions.change_percentage ?? 0) > 0 ? '▲ Increase of' : '▼ Reduction of'}</span>
                    <span className="font-mono">{Math.abs(predictions.change_percentage ?? 0).toFixed(1)}%</span>
                    <span className="text-gray-500 font-normal">from current period</span>
                  </p>
                </div>
                
                <div className="border-t border-dark-border/40 pt-4">
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">PROJECTED INTENSITY PEAK</p>
                  <p className="text-sm font-bold text-white mt-1">
                    {predictions.top_category || 'None'} <span className="font-mono text-cyan-premium text-xs ml-1.5">{formatVND(predictions.top_category_amount ?? 0)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations Card */}
            <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-white/10 transition-all duration-300 group">
              <div className="absolute w-32 h-32 bg-purple-premium blur-[35px] -top-12 -right-12 opacity-[0.05] rounded-full pointer-events-none group-hover:opacity-10 transition-opacity"></div>
              <div className="flex items-center gap-2.5 mb-5 border-b border-dark-border/40 pb-3">
                <FaLightbulb className="text-purple-premium text-base" />
                <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-heading">Smart Recommendations</h3>
              </div>
              
              <div className="space-y-4 max-h-[195px] overflow-y-auto pr-1">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-3.5 bg-white/[0.01] border border-dark-border rounded-xl hover:bg-white/[0.03] transition-colors">
                    <p className="text-gray-300 text-xs leading-relaxed">{rec.message}</p>
                    <p className="text-[10px] text-cyan-premium mt-2 font-bold uppercase tracking-wider">Potential savings: <span className="font-mono">${rec.potential_savings}</span> / month</p>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <p className="text-gray-500 text-xs italic py-4 text-center">No active optimization parameters found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Personalized 50/30/20 Spending & Savings Plan */}
          <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:border-white/10 transition-all duration-300">
            <div className="absolute w-40 h-40 bg-teal-premium blur-[45px] -top-12 -right-12 opacity-[0.03] rounded-full pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-dark-border/40 pb-4">
              <div className="flex items-center gap-2.5">
                <FaPiggyBank className="text-teal-premium text-base" />
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-heading">Personalized 50/30/20 Spending & Savings Plan</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Automated asset allocation and saving target blueprints</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab('chat');
                  const query = "Lập kế hoạch tiêu dùng tiết kiệm 50/30/20 cho tôi dựa trên số liệu thực tế";
                  handleSendMessage(query);
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-premium to-teal-premium hover:shadow-lg hover:shadow-cyan-premium/25 text-white text-xs font-bold tracking-wide uppercase rounded-xl transition-all duration-300 active:scale-95 flex items-center gap-2 self-start"
              >
                <FaRegCompass className="text-xs" />
                <span>Auto-Draft AI Strategy</span>
              </button>
            </div>

            {/* Plan calculations */}
            {(() => {
              const income = dashboardData?.total_income ? parseFloat(dashboardData.total_income) : 0;
              const spent = dashboardData?.total_expense ? parseFloat(dashboardData.total_expense) : 0;
              const displayIncome = income > 0 ? income : 1000; // Use $1000 generic base as a clean demo if income is 0
              const isDemo = income === 0;

              const needsLimit = displayIncome * 0.5;
              const wantsLimit = displayIncome * 0.3;
              const savingsGoal = displayIncome * 0.2;

              return (
                <div className="space-y-6">
                  {isDemo && (
                    <div className="p-3 bg-white/[0.02] border border-dashed border-dark-border rounded-xl text-center">
                      <p className="text-[11px] text-cyan-premium leading-relaxed">
                        💡 **Showing Starter Blueprint:** Please log your income in the ledger to activate your dynamic database allocation plan!
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Needs Column */}
                    <div className="bg-[#101622]/40 border border-dark-border/40 p-4.5 rounded-xl space-y-3.5 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 h-1 bg-emerald-premium w-1/2"></div>
                      <div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>Essential Needs</span>
                          <span className="text-emerald-premium">50% Cap</span>
                        </div>
                        <p className="text-xl font-extrabold text-white mt-1.5 font-mono">{formatVND(needsLimit)}</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Allocated Limit</span>
                          <span className="font-mono font-bold">{formatVND(needsLimit)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#090d16] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-premium rounded-full" style={{ width: '50%' }}></div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 italic">For food, utilities, cozy rent & transport.</p>
                    </div>

                    {/* Wants Column */}
                    <div className="bg-[#101622]/40 border border-dark-border/40 p-4.5 rounded-xl space-y-3.5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 bg-cyan-premium w-1/3"></div>
                      <div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>Personal Wants</span>
                          <span className="text-cyan-premium">30% Cap</span>
                        </div>
                        <p className="text-xl font-extrabold text-white mt-1.5 font-mono">{formatVND(wantsLimit)}</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Allocated Limit</span>
                          <span className="font-mono font-bold">{formatVND(wantsLimit)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#090d16] rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-premium rounded-full" style={{ width: '30%' }}></div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 italic">For self-care, coffee trips, & leisure.</p>
                    </div>

                    {/* Savings Column */}
                    <div className="bg-[#101622]/40 border border-dark-border/40 p-4.5 rounded-xl space-y-3.5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-1 bg-purple-premium w-1/5"></div>
                      <div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>Future Savings</span>
                          <span className="text-purple-premium">20% Goal</span>
                        </div>
                        <p className="text-xl font-extrabold text-white mt-1.5 font-mono">{formatVND(savingsGoal)}</p>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Target Reserve</span>
                          <span className="font-mono font-bold">{formatVND(savingsGoal)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#090d16] rounded-full overflow-hidden">
                          <div className="h-full bg-purple-premium rounded-full" style={{ width: '20%' }}></div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 italic">For your Peace Fund and financial freedom.</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Spending Alerts */}
          <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute w-36 h-36 bg-amber-premium blur-[45px] -top-12 -right-12 opacity-[0.03] rounded-full pointer-events-none"></div>
            <div className="flex items-center gap-2.5 mb-5 border-b border-dark-border/40 pb-3">
              <FaExclamationTriangle className="text-amber-premium text-base" />
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-heading">Spending Alerts</h3>
            </div>
            
            <div className="space-y-3.5">
              {predictions?.alerts?.map((alert, index) => (
                <div key={index} className="p-4 bg-amber-premium/5 border border-amber-premium/15 rounded-xl">
                  <p className="text-amber-300 text-xs leading-relaxed">{alert}</p>
                </div>
              ))}
              {(!predictions?.alerts || predictions.alerts.length === 0) && (
                <p className="text-gray-500 text-xs italic py-2 text-center uppercase tracking-widest font-medium">All financial limits healthy. Excellent asset governance!</p>
              )}
            </div>
          </div>

          {/* Monthly Comparison */}
          <div className="bg-dark-glass border border-dark-border rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute w-36 h-36 bg-purple-premium blur-[45px] -top-12 -right-12 opacity-[0.03] rounded-full pointer-events-none"></div>
            <div className="p-6 border-b border-dark-border/40">
              <h3 className="text-base font-bold text-white tracking-wide font-heading uppercase">Monthly Category Variance Comparison</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-dark-border text-gray-500">
                    <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Category</th>
                    <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading text-right">This Period</th>
                    <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading text-right">Last Period</th>
                    <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading text-right w-[140px]">Change Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {predictions?.category_comparison?.map((cat, index) => (
                    <tr key={index} className="hover:bg-white/[0.01] transition-colors duration-150">
                      <td className="py-4 px-6 text-white font-medium text-xs">{cat.name}</td>
                      <td className="py-4 px-6 text-right font-bold text-xs font-mono text-gray-300">{formatVND(cat.current ?? 0)}</td>
                      <td className="py-4 px-6 text-right font-bold text-xs font-mono text-gray-400">{formatVND(cat.previous ?? 0)}</td>
                      <td className={`py-4 px-6 text-right font-bold text-xs font-mono ${
                        (cat.change ?? 0) > 0 ? 'text-rose-premium' : 'text-emerald-premium'
                      }`}>
                        {(cat.change ?? 0) > 0 ? '+' : ''}{(cat.change ?? 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  {(!predictions?.category_comparison || predictions.category_comparison.length === 0) && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-gray-500 italic text-xs uppercase tracking-widest font-medium">No comparisons logged yet.</td>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[560px] relative font-body">
          
          {/* Quick Suggestions Panel */}
          <div className="lg:col-span-1 bg-dark-glass border border-dark-border rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute w-24 h-24 bg-cyan-premium blur-[30px] -bottom-10 -left-10 opacity-[0.05] rounded-full pointer-events-none"></div>
            <div>
              <div className="flex items-center gap-2 mb-4 border-b border-dark-border/40 pb-3">
                <FaLightbulb className="text-amber-premium text-sm animate-pulse" />
                <span className="text-white text-xs font-bold uppercase tracking-wider font-heading">
                  Quick Suggestions
                </span>
              </div>
              
              <div className="space-y-2.5">
                {suggestions.map((s, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(s.query)}
                    disabled={sending}
                    className="w-full text-left py-3 px-3.5 bg-white/[0.01] hover:bg-cyan-premium/10 border border-dark-border hover:border-cyan-premium rounded-xl text-gray-400 hover:text-cyan-premium text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 flex items-center justify-between"
                  >
                    <span>{s.label}</span>
                    <FaChevronRight className="text-[9px] opacity-40" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-purple-premium/5 border border-purple-premium/15 rounded-xl text-[10px] text-purple-300 leading-relaxed font-semibold">
              🤖 CO-PILOT: Asks directly analyze your financial databases in real time to present recommendations.
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="lg:col-span-3 bg-dark-glass border border-dark-border rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl relative">
            <div className="absolute w-36 h-36 bg-cyan-premium blur-[45px] -top-12 -right-12 opacity-[0.03] rounded-full pointer-events-none"></div>
            
            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[460px] custom-scrollbar bg-black/10">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`p-2.5 rounded-xl shrink-0 border ${
                      msg.sender === 'user' 
                        ? 'bg-cyan-premium/15 border-cyan-premium/25 text-cyan-premium' 
                        : 'bg-purple-premium/15 border-purple-premium/25 text-purple-premium shadow-lg shadow-purple-premium/5'
                    }`}>
                      {msg.sender === 'user' ? <FaUser className="text-xs" /> : <FaRobot className="text-xs" />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`p-4 rounded-2xl text-xs shadow-lg leading-relaxed ${
                      msg.sender === 'user' 
                        ? 'bg-gradient-to-r from-cyan-premium to-purple-premium text-white rounded-tr-none' 
                        : 'bg-[#101622]/90 border border-dark-border text-gray-200 rounded-tl-none'
                    }`}>
                      {msg.sender === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div className="space-y-1">
                          {renderMarkdown(msg.text)}
                        </div>
                      )}
                      <span className="block text-[9px] text-gray-500 mt-2.5 text-right font-mono font-bold tracking-wider uppercase">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-3 max-w-[85%]">
                    <div className="p-2.5 rounded-xl bg-purple-premium/15 border border-purple-premium/25 text-purple-premium shrink-0 animate-pulse">
                      <FaRobot className="text-xs" />
                    </div>
                    <div className="flex gap-1.5 items-center bg-[#101622]/70 border border-dark-border rounded-2xl px-4 py-3 shadow-inner">
                      <div className="h-1.5 w-1.5 bg-cyan-premium rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="h-1.5 w-1.5 bg-cyan-premium rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="h-1.5 w-1.5 bg-cyan-premium rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
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
              className="p-4 bg-[#0f172a]/60 border-t border-dark-border/40 flex items-center gap-3 w-full"
            >
              {/* Text Input area - Translucent Dark Background with White Text! Completely fixed styling and highly visible */}
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask financial advice or spending forecasts..."
                disabled={sending}
                className="flex-1 bg-[#0f172a]/85 border border-dark-border rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-premium focus:shadow-cyan-glow text-xs font-semibold transition-all duration-300"
              />
              
              <button
                type="submit"
                disabled={sending || !inputVal.trim()}
                className="p-3.5 bg-gradient-to-r from-cyan-premium to-purple-premium text-white rounded-xl transition-all duration-300 flex items-center justify-center disabled:opacity-40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-premium/30 active:translate-y-0"
              >
                <FaPaperPlane className="text-xs" />
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default AIPage;