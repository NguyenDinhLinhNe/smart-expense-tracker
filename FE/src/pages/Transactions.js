import React, { useState, useEffect } from 'react';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, createCategory } from '../services/api';
import { FaEdit, FaTrash, FaPlus, FaFilter, FaTimes, FaPlusCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';


const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false); // State cho modal category
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({ type: '', category_id: '', start_date: '', end_date: '' });
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  
  // State cho category mới
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '📌',
    type: 'expense'
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, catRes] = await Promise.all([
        getTransactions(filters),
        getCategories()
      ]);
      setTransactions(transRes.data.transactions);
      setCategories(catRes.data.categories);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, formData);
        toast.success('Transaction updated');
      } else {
        await createTransaction(formData);
        toast.success('Transaction created');
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        toast.success('Transaction deleted');
        fetchData();
      } catch (error) {
        toast.error('Delete failed');
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount,
      type: transaction.type,
      category_id: transaction.category_id,
      date: transaction.date,
      note: transaction.note || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTransaction(null);
    setFormData({
      amount: '',
      type: 'expense',
      category_id: '',
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategory.name.trim()) {
      toast.error('Please enter category name');
      return;
    }
    
    const categoryData = {
      name: newCategory.name,
      icon: newCategory.icon || '📌',
      type: newCategory.type,
      color: '#6B7280'
    };
    
    try {
      const response = await createCategory(categoryData);
      toast.success('Category created successfully!');
      setShowCategoryModal(false);
      setNewCategory({ name: '', icon: '📌', type: formData.type });
      
      // Refresh categories
      const catRes = await getCategories();
      setCategories(catRes.data.categories);
      
      // Auto-select the newly created category
      if (response.data?.category?.id) {
        setFormData(prev => ({ ...prev, category_id: response.data.category.id }));
      }
    } catch (error) {
      console.error("Create category error:", error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to create category');
    }
  };

  const filteredCategories = categories.filter(c => c.type === formData.type);

  // Danh sách icon gợi ý
  const iconSuggestions = ['🍔', '🚗', '🛍️', '🎬', '💡', '🏥', '📚', '💰', '💻', '📈', '☕', '🍕', '🎮', '📱', '✈️', '🏠'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Transactions</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FaPlus /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-gray-400" />
          <span className="text-white font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          
          <select
            value={filters.category_id}
            onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            placeholder="Start Date"
          />
          
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-gray-300">Category</th>
                <th className="px-6 py-3 text-left text-gray-300">Note</th>
                <th className="px-6 py-3 text-right text-gray-300">Amount</th>
                <th className="px-6 py-3 text-center text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">Loading...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">No transactions found</td>
                </tr>
              ) : (
                transactions.map(transaction => (
                  <tr key={transaction.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-gray-300">{transaction.date}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        <span>{transaction.category_icon}</span>
                        <span className="text-gray-300">{transaction.category_name}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{transaction.note || '-'}</td>
                    <td className={`px-6 py-4 text-right font-semibold ${
                      transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Transaction */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, category_id: '' })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Category</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select Category</option>
                    {filteredCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCategory({ ...newCategory, type: formData.type });
                      setShowCategoryModal(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    title="Add new category"
                  >
                    <FaPlusCircle />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Note (Optional)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  rows="3"
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
                  {editingTransaction ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nhỏ để tạo Category mới */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Create New Category</h3>
              <button 
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategory({ name: '', icon: '📌', type: formData.type });
                }} 
                className="text-gray-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            
            <form onSubmit={handleCreateCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Category Name</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g., Coffee, Shopping, Gym..."
                    autoFocus
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Icon (Emoji)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {iconSuggestions.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewCategory({ ...newCategory, icon })}
                        className={`text-2xl p-2 rounded-lg transition-all ${
                          newCategory.icon === icon ? 'bg-blue-600 scale-110' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white mt-2"
                    placeholder="Or enter custom emoji"
                    maxLength="2"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Type</label>
                  <select
                    value={newCategory.type}
                    onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory({ name: '', icon: '📌', type: formData.type });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition-colors"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;