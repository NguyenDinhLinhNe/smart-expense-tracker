import React, { useState, useEffect } from 'react';
import { getReports, exportReport } from '../services/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { FaDownload } from 'react-icons/fa';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);


const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await getReports({ month: selectedMonth, year: selectedYear });
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await exportReport(format, { month: selectedMonth, year: selectedYear });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expense_report_${selectedMonth}_${selectedYear}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-xl p-6 shadow-lg">
        <p className="text-xl font-bold mb-2">No report data available</p>
        <p className="text-sm">Please make sure the backend is running and you have transactions recorded.</p>
      </div>
    );
  }


  // Get all unique categories from both breakdown lists
  const expenseCategories = reportData && reportData.category_breakdown ? Object.keys(reportData.category_breakdown) : [];
  const incomeCategories = reportData && reportData.income_category_breakdown ? Object.keys(reportData.income_category_breakdown) : [];
  
  // Combine unique category names as chart labels
  const allLabels = Array.from(new Set([...expenseCategories, ...incomeCategories]));

  const chartData = {
    labels: allLabels,
    datasets: [
      {
        label: 'Income',
        data: allLabels.map(label => reportData.income_category_breakdown?.[label] || 0),
        backgroundColor: '#10B981', // Emerald Green for Income
        borderRadius: 6,
        borderWidth: 0
      },
      {
        label: 'Expense',
        data: allLabels.map(label => reportData.category_breakdown?.[label] || 0),
        backgroundColor: '#EF4444', // Red for Expense
        borderRadius: 6,
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#E5E7EB', // Tailwind gray-200
          font: {
            family: 'Outfit, Inter, sans-serif',
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: '#1F2937', // Tailwind gray-800
        titleColor: '#F9FAFB',
        bodyColor: '#F3F4F6',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            family: 'Outfit, Inter, sans-serif'
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)' // Subtle grid line
        },
        ticks: {
          color: '#9CA3AF',
          font: {
            family: 'Outfit, Inter, sans-serif'
          },
          callback: (value) => '$' + value
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">Financial Reports</h2>
        
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>Month {month}</option>
            ))}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            {[2023, 2024, 2025].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaDownload /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <p className="text-green-100">Total Income</p>
          <h3 className="text-3xl font-bold mt-2">${reportData.total_income?.toFixed(2) || 0}</h3>
        </div>
        
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
          <p className="text-red-100">Total Expense</p>
          <h3 className="text-3xl font-bold mt-2">${reportData.total_expense?.toFixed(2) || 0}</h3>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-blue-100">Net Savings</p>
          <h3 className="text-3xl font-bold mt-2">${(reportData.total_income - reportData.total_expense)?.toFixed(2) || 0}</h3>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 flex flex-col h-[360px]">
          <h3 className="text-xl font-bold text-white mb-4">Category Breakdown</h3>
          <div className="flex-1 min-h-0">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Total Transactions</span>
              <span className="text-white font-semibold">{reportData.transaction_count || 0}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Average Expense</span>
              <span className="text-white font-semibold">
                ${(reportData.total_expense / (reportData.transaction_count || 1)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300">Report Period</span>
              <span className="text-white font-semibold">Month {selectedMonth}/{selectedYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Transaction Details</h3>
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
              {reportData.transactions?.map(transaction => (
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

export default Reports;