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
import { FaWallet, FaArrowUp, FaArrowDown, FaChartLine } from 'react-icons/fa';
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
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      },
      {
        label: 'Expense',
        data: trendData.map(item => item.expense),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }
    ]
  };

  const doughnutChartData = {
    labels: categoryData.labels || [],
    datasets: [
      {
        data: categoryData.data || [],
        backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
        borderWidth: 0
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Total Income</p>
              <h3 className="text-3xl font-bold text-white mt-1">${summary.total_income.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-green-500/10 text-green-500 rounded-lg">
              <FaArrowUp />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Total Expense</p>
              <h3 className="text-3xl font-bold text-white mt-1">${summary.total_expense.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
              <FaArrowDown />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">Net Balance</p>
              <h3 className="text-3xl font-bold text-white mt-1">${summary.balance.toFixed(2)}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <FaWallet />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg h-[350px] flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4">Cashflow Trend</h3>
          <div className="flex-1 min-h-0">
            <Line 
              data={lineChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#E5E7EB' } } },
                scales: {
                  x: { ticks: { color: '#9CA3AF' } },
                  y: { ticks: { color: '#9CA3AF' } }
                }
              }} 
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg h-[350px] flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4">Expense Breakdown</h3>
          <div className="flex-1 min-h-0 flex justify-center">
            <Doughnut 
              data={doughnutChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#E5E7EB' } } }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 text-gray-400">Date</th>
                <th className="text-left py-3 text-gray-400">Category</th>
                <th className="text-left py-3 text-gray-400">Note</th>
                <th className="text-right py-3 text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(transaction => (
                <tr key={transaction.id} className="border-b border-gray-700">
                  <td className="py-3 text-gray-300">{transaction.date}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-2">
                      <span>{transaction.category_icon}</span>
                      <span className="text-gray-300">{transaction.category_name}</span>
                    </span>
                  </td>
                  <td className="py-3 text-gray-300">{transaction.note || '-'}</td>
                  <td className={`py-3 text-right font-semibold ${
                    transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;