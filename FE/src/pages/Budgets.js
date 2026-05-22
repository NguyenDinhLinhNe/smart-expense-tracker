import React, { useState, useEffect } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget, getCategories } from '../services/api';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    month: selectedMonth,
    year: selectedYear
  });

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetsRes, categoriesRes] = await Promise.all([
        getBudgets(selectedMonth, selectedYear),
        getCategories()
      ]);
      setBudgets(budgetsRes.data.budgets);
      setCategories(categoriesRes.data.categories.filter(c => c.type === 'expense'));
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, formData);
        toast.success('Budget updated');
      } else {
        await createBudget(formData);
        toast.success('Budget created');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await deleteBudget(id);
        toast.success('Budget deleted');
        fetchData();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category_id: budget.category_id,
      amount: budget.amount,
      month: budget.month,
      year: budget.year
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingBudget(null);
    setFormData({
      category_id: '',
      amount: '',
      month: selectedMonth,
      year: selectedYear
    });
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-white">Budget Management</h2>
        
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
          
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <FaPlus /> Add Budget
          </button>
        </div>
      </div>

      {/* Budget Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No budgets found for this month. Click "Add Budget" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map(budget => (
            <div key={budget.id} className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{budget.category_name}</h3>
                  <p className="text-gray-400 text-sm">Monthly Budget</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(budget)} className="text-blue-400 hover:text-blue-300">
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(budget.id)} className="text-red-400 hover:text-red-300">
                    <FaTrash />
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Spent</span>
                  <span className="text-white">${budget.spent.toFixed(2)} / ${budget.amount.toFixed(2)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${getProgressColor(budget.percentage)} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Remaining</span>
                <span className={`font-semibold ${budget.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${Math.abs(budget.remaining).toFixed(2)} {budget.remaining < 0 ? 'over budget' : 'left'}
                </span>
              </div>
              
              {budget.percentage >= 80 && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  budget.percentage >= 100 ? 'bg-red-900/30 text-red-300' : 'bg-yellow-900/30 text-yellow-300'
                }`}>
                  <FaExclamationTriangle />
                  <span>
                    {budget.percentage >= 100 
                      ? 'Budget exceeded! Consider reducing spending.' 
                      : 'Warning: Close to budget limit!'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingBudget ? 'Edit Budget' : 'Create Budget'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                  disabled={editingBudget}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Budget Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                >
                  {editingBudget ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;