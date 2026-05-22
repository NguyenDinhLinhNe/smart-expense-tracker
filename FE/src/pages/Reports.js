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
import { FaDownload, FaChevronDown, FaCalendarAlt, FaDatabase } from 'react-icons/fa';
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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-premium"></div>
        <span className="text-xs text-gray-500 tracking-wide uppercase font-semibold">Compiling financial indexes...</span>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-16 bg-dark-glass border border-dark-border rounded-2xl p-8 shadow-xl max-w-xl mx-auto font-body">
        <FaDatabase className="text-4xl text-cyan-premium mb-4 mx-auto animate-pulse" />
        <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-heading">
          No records captured
        </h3>
        <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
          Please verify that the backend services are running and you have transactions logged under the chosen parameters.
        </p>
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
        backgroundColor: '#10b981', // Emerald premium
        borderRadius: 8,
        borderWidth: 0
      },
      {
        label: 'Expense',
        data: allLabels.map(label => reportData.category_breakdown?.[label] || 0),
        backgroundColor: '#f43f5e', // Rose premium
        borderRadius: 8,
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
          color: '#94a3b8',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: '#101622',
        titleColor: '#ffffff',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(255, 255, 255, 0.08)',
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
          color: '#64748b',
          font: {
            family: 'Inter, sans-serif',
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.02)'
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Inter, sans-serif',
            size: 10
          },
          callback: (value) => '$' + value
        }
      }
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-body">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-dark-glass border border-dark-border p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute w-24 h-24 bg-cyan-premium blur-[30px] -bottom-10 -left-10 opacity-[0.08] rounded-full pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide uppercase font-heading">
            Financial Reports
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Interactive statistics, data breakdowns, and document sheets</p>
        </div>
        
        <div className="flex items-center flex-wrap gap-3.5 self-start sm:self-center">
          {/* Month selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="appearance-none pl-4 pr-9 py-2.5 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>Month {month}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 text-xs">
              <FaChevronDown />
            </div>
          </div>
          
          {/* Year selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none pl-4 pr-9 py-2.5 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
            >
              {[2023, 2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 text-xs">
              <FaChevronDown />
            </div>
          </div>
          
          <button
            onClick={() => handleExport('csv')}
            className="py-2.5 px-5 bg-gradient-to-r from-emerald-premium to-teal-premium text-white font-heading font-extrabold text-xs tracking-wide shadow-md shadow-emerald-premium/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-premium/45 active:translate-y-0 transition-all flex items-center gap-2.5 rounded-xl font-heading"
          >
            <FaDownload /> <span>EXPORT SHEET (CSV)</span>
          </button>
        </div>
      </div>

      {/* 3 Columns KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI: Total Income */}
        <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-emerald-premium/40 hover:shadow-emerald-premium/5 transition-all duration-300 group">
          <div className="absolute w-36 h-36 bg-emerald-premium blur-[35px] -top-12 -right-12 opacity-[0.12] rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-20"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-heading">
            TOTAL INCOME
          </p>
          <h3 className="text-3xl font-extrabold text-white mt-2 font-heading tracking-tight font-mono">
            ${reportData.total_income?.toFixed(2) || 0}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">Gross earnings for period</p>
        </div>
        
        {/* KPI: Total Expense */}
        <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-rose-premium/40 hover:shadow-rose-premium/5 transition-all duration-300 group">
          <div className="absolute w-36 h-36 bg-rose-premium blur-[35px] -top-12 -right-12 opacity-[0.12] rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-20"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-heading">
            TOTAL EXPENSES
          </p>
          <h3 className="text-3xl font-extrabold text-white mt-2 font-heading tracking-tight font-mono">
            ${reportData.total_expense?.toFixed(2) || 0}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">Paid bills and charges</p>
        </div>
        
        {/* KPI: Net Savings */}
        <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl hover:-translate-y-1 hover:border-cyan-premium/40 hover:shadow-cyan-premium/5 transition-all duration-300 group">
          <div className="absolute w-36 h-36 bg-cyan-premium blur-[35px] -top-12 -right-12 opacity-[0.12] rounded-full pointer-events-none transition-opacity duration-300 group-hover:opacity-20"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest font-heading">
            NET SAVINGS
          </p>
          <h3 className="text-3xl font-extrabold text-white mt-2 font-heading tracking-tight font-mono">
            ${(reportData.total_income - reportData.total_expense)?.toFixed(2) || 0}
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">Net accumulated margins</p>
        </div>
      </div>

      {/* Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category breakdown bar chart */}
        <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col h-[380px] hover:border-white/[0.1] transition-colors">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-white tracking-wide font-heading">
              CATEGORY BREAKDOWN
            </h3>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1.5 font-semibold">
              <FaCalendarAlt /> Breakdown comparative
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
        
        {/* Analysis Summary */}
        <div className="bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl flex flex-col justify-between hover:border-white/[0.1] transition-colors">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide mb-6 font-heading">
              INDEX SUMMARY
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white/[0.01] border border-dark-border rounded-xl hover:bg-white/[0.03] transition-colors">
                <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase font-heading">Total Transactions</span>
                <span className="text-white font-bold font-mono text-sm">{reportData.transaction_count || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-white/[0.01] border border-dark-border rounded-xl hover:bg-white/[0.03] transition-colors">
                <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase font-heading">Average Expenses</span>
                <span className="text-white font-bold font-mono text-sm">
                  ${(reportData.total_expense / (reportData.transaction_count || 1)).toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-white/[0.01] border border-dark-border rounded-xl hover:bg-white/[0.03] transition-colors">
                <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase font-heading">Index Range</span>
                <span className="text-white font-bold font-mono text-sm">Month {selectedMonth}/{selectedYear}</span>
              </div>
            </div>
          </div>
          
          <div className="text-center p-3 text-[10px] text-gray-600 tracking-wider uppercase mt-6 border-t border-dark-border/40">
            Smart Expense Tracker Indexes
          </div>
        </div>
      </div>

      {/* Transaction Details Table */}
      <div className="bg-dark-glass border border-dark-border rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute w-36 h-36 bg-purple-premium blur-[45px] -top-12 -right-12 opacity-[0.05] rounded-full pointer-events-none"></div>
        <div className="p-6 border-b border-dark-border/40">
          <h3 className="text-base font-bold text-white tracking-wide font-heading">
            REPORT TRANSACTION DETAILS
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-dark-border text-gray-500">
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Date</th>
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Category</th>
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Note</th>
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40">
              {(!reportData.transactions || reportData.transactions.length === 0) ? (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-500 text-xs uppercase tracking-widest font-medium">
                    No transactions captured in range.
                  </td>
                </tr>
              ) : (
                reportData.transactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-white/[0.01] transition-colors duration-150">
                    <td className="py-4 px-6 text-gray-400 font-mono text-xs">{transaction.date}</td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-2.5">
                        <span className="text-xl leading-none drop-shadow">{transaction.category_icon}</span>
                        <span className="text-white font-medium text-xs">{transaction.category_name}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400 max-w-[240px] truncate text-xs">{transaction.note || '-'}</td>
                    <td className={`py-4 px-6 text-right font-bold tracking-tight text-xs ${
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

export default Reports;