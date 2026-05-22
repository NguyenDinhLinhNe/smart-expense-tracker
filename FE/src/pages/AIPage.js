import React, { useState, useEffect } from 'react';
import { getAIPredictions, getAIRecommendations } from '../services/api';
import { FaBrain, FaChartLine, FaLightbulb, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const AIPage = () => {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('2024-12');

  useEffect(() => {
    fetchAIData();
  }, [selectedMonth]);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <FaBrain className="text-3xl" />
          <div>
            <h2 className="text-2xl font-bold">AI Financial Assistant</h2>
            <p className="text-purple-100">Smart insights powered by machine learning</p>
          </div>
        </div>
      </div>

      {/* Predictions */}
      {predictions && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
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

          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <FaLightbulb className="text-yellow-400 text-xl" />
              <h3 className="text-xl font-bold text-white">Smart Recommendations</h3>
            </div>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-lg">
                  <p className="text-white">{rec.message}</p>
                  <p className="text-sm text-gray-400 mt-1">Potential savings: ${rec.potential_savings}/month</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spending Alerts */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <FaExclamationTriangle className="text-orange-400 text-xl" />
          <h3 className="text-xl font-bold text-white">Spending Alerts</h3>
        </div>
        <div className="space-y-3">
          {predictions?.alerts?.map((alert, index) => (
            <div key={index} className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
              <p className="text-orange-300">{alert}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-white mb-4">Monthly Spending Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 text-gray-400">Category</th>
                <th className="text-right py-3 text-gray-400">This Month</th>
                <th className="text-right py-3 text-gray-400">Last Month</th>
                <th className="text-right py-3 text-gray-400">Change</th>
              </tr>
            </thead>
            <tbody>
              {predictions?.category_comparison?.map((cat, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-3 text-gray-300">{cat.name}</td>
                  <td className="py-3 text-right text-gray-300">${(cat.current ?? 0).toFixed(2)}</td>
                  <td className="py-3 text-right text-gray-300">${(cat.previous ?? 0).toFixed(2)}</td>
                  <td className={`py-3 text-right font-semibold ${
                    (cat.change ?? 0) > 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {(cat.change ?? 0) > 0 ? '+' : ''}{(cat.change ?? 0).toFixed(1)}%
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

export default AIPage;