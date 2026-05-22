import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDashboardData } from '../services/api';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { FaWallet, FaArrowUp, FaArrowDown, FaCalendarAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    balance: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await getDashboardData();
      const data = response.data;
      setSummary(data.summary);
      setRecentTransactions(data.recent_transactions);
      setTrendData(data.trend_data);
      setCategoryData(data.category_data);
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const lineChartData = {
    labels: trendData.map(item => item.month),
    datasets: [
      {
        label: 'Income',
        data: trendData.map(item => item.income),
        borderColor: '#10b981', // emerald-premium
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointHoverRadius: 6,
      },
      {
        label: 'Expense',
        data: trendData.map(item => item.expense),
        borderColor: '#f43f5e', // rose-premium
        backgroundColor: 'rgba(244, 63, 94, 0.05)',
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#f43f5e',
        pointHoverRadius: 6,
      }
    ]
  };

  const doughnutChartData = {
    labels: categoryData.labels || [],
    datasets: [
      {
        data: categoryData.data || [],
        backgroundColor: ['#06b6d4', '#8b5cf6', '#14b8a6', '#f59e0b', '#f43f5e', '#FF6B6B', '#4ECDC4'],
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-premium"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 3 Columns KPI Grid with Glowing circles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI: Total Income */}
        <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-emerald-premium/40 hover:shadow-emerald-premium/5 transition-all duration-300 group">
          <div className="absolute w-36 h-36 bg-emerald-premium blur-[35px] -top-12 -right-12 opacity-[0.12] rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-20"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-heading">
                TOTAL INCOME
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-heading tracking-tight">
                ${summary.total_income.toFixed(2)}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">Earnings for this period</p>
            </div>
            <div className="p-3.5 bg-emerald-premium/15 text-emerald-premium rounded-xl shadow-inner">
              <FaArrowUp className="text-xl" />
            </div>
          </div>
        </div>

        {/* KPI: Total Expense */}
        <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-rose-premium/40 hover:shadow-rose-premium/5 transition-all duration-300 group">
          <div className="absolute w-36 h-36 bg-rose-premium blur-[35px] -top-12 -right-12 opacity-[0.12] rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-20"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-heading">
                TOTAL EXPENSES
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-heading tracking-tight">
                ${summary.total_expense.toFixed(2)}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">Spendings and bills paid</p>
            </div>
            <div className="p-3.5 bg-rose-premium/15 text-rose-premium rounded-xl shadow-inner">
              <FaArrowDown className="text-xl" />
            </div>
          </div>
        </div>

        {/* KPI: Net Balance */}
        <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-cyan-premium/40 hover:shadow-cyan-premium/5 transition-all duration-300 group">
          <div className="absolute w-36 h-36 bg-cyan-premium blur-[35px] -top-12 -right-12 opacity-[0.12] rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-20"></div>
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-heading">
                NET BALANCE
              </p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-heading tracking-tight">
                ${summary.balance.toFixed(2)}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">Available net cash reserves</p>
            </div>
            <div className="p-3.5 bg-cyan-premium/15 text-cyan-premium rounded-xl shadow-inner">
              <FaWallet className="text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* 2 Column Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* cashflow trend */}
        <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col h-[380px] hover:border-white/[0.1] transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white tracking-wide font-heading">
              CASHFLOW TREND
            </h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-semibold">
              <FaCalendarAlt /> Monthly analysis
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <Line 
              data={lineChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    position: 'top',
                    labels: { 
                      color: '#94a3b8',
                      font: { family: 'Inter', size: 11, weight: '500' }
                    } 
                  } 
                },
                scales: {
                  x: { 
                    grid: { color: 'rgba(255, 255, 255, 0.02)' },
                    ticks: { color: '#64748b', font: { size: 10 } } 
                  },
                  y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.02)' },
                    ticks: { color: '#64748b', font: { size: 10 } } 
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* expense breakdown */}
        <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col h-[380px] hover:border-white/[0.1] transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white tracking-wide font-heading">
              EXPENSE BREAKDOWN
            </h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-semibold">
              Categorized spendings
            </span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <Doughnut 
              data={doughnutChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    position: 'right', 
                    labels: { 
                      color: '#94a3b8',
                      font: { family: 'Inter', size: 11 } 
                    } 
                  } 
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Recent Transactions list */}
      <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:border-white/[0.1] transition-colors">
        <h3 className="text-base font-bold text-white tracking-wide mb-6 font-heading">
          RECENT TRANSACTIONS
        </h3>
        <div className="table-responsive">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-dark-border text-gray-500">
                <th className="py-4 px-4 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Date</th>
                <th className="py-4 px-4 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Category</th>
                <th className="py-4 px-4 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Note</th>
                <th className="py-4 px-4 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No transactions logged yet. Add one in the Transactions menu.
                  </td>
                </tr>
              ) : (
                recentTransactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-white/[0.01] transition-colors duration-150">
                    <td className="py-4 px-4 text-gray-400 font-mono text-xs">{transaction.date}</td>
                    <td className="py-4 px-4">
                      <span className="flex items-center gap-2">
                        <span className="text-xl leading-none drop-shadow">{transaction.category_icon}</span>
                        <span className="text-white font-medium">{transaction.category_name}</span>
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-400 max-w-[200px] truncate">{transaction.note || '-'}</td>
                    <td className={`py-4 px-4 text-right font-bold tracking-tight ${
                      transaction.type === 'income' ? 'text-emerald-premium' : 'text-rose-premium'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;