import React, { useState, useEffect } from 'react';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getCategories, createCategory } from '../services/api';
import { FaEdit, FaTrash, FaPlus, FaFilter, FaTimes, FaPlusCircle, FaChevronDown, FaCalendarAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false); // State for category modal
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filters, setFilters] = useState({ type: '', category_id: '', start_date: '', end_date: '' });
  const [formData, setFormData] = useState({
    amount: '',
    type: 'expense',
    category_id: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  
  // State for new category
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
      // Fail silently or handle error
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

  // Suggested emojis
  const iconSuggestions = ['🍔', '🚗', '🛍️', '🎬', '💡', '🏥', '📚', '💰', '💻', '📈', '☕', '🍕', '🎮', '📱', '✈️', '🏠'];

  return (
    <div className="space-y-8 animate-fade-in font-body">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-dark-glass border border-dark-border p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute w-24 h-24 bg-cyan-premium blur-[30px] -bottom-10 -left-10 opacity-[0.08] rounded-full pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide uppercase font-heading">
            Transactions Ledger
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Filter, search, or add physical financial logs</p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="self-start sm:self-center py-2.5 px-5 bg-gradient-to-r from-cyan-premium to-purple-premium text-white font-heading font-extrabold text-xs tracking-wide shadow-md shadow-cyan-premium/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-premium/40 active:translate-y-0 transition-all flex items-center gap-2 rounded-xl"
        >
          <FaPlus /> <span>ADD TRANSACTION</span>
        </button>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="relative overflow-hidden bg-dark-glass border border-dark-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-5">
          <div className="p-1.5 bg-cyan-premium/15 text-cyan-premium rounded-lg">
            <FaFilter className="text-sm" />
          </div>
          <span className="text-white text-xs font-bold uppercase tracking-wider font-heading">
            Filter Ledger Cashflows
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Filter: Type */}
          <div className="relative">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full appearance-none pl-4 pr-10 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
            >
              <option value="">All Cashflow Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expenses Only</option>
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-xs">
              <FaChevronDown />
            </div>
          </div>
          
          {/* Filter: Category */}
          <div className="relative">
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="w-full appearance-none pl-4 pr-10 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}{(!cat.user_id) ? ' 🔒' : ''}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-xs">
              <FaChevronDown />
            </div>
          </div>
          
          {/* Filter: Start Date */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full pl-4 pr-4 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
              placeholder="Start Date"
            />
          </div>
          
          {/* Filter: End Date */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full pl-4 pr-4 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-gray-300 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-dark-glass border border-dark-border rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute w-36 h-36 bg-purple-premium blur-[45px] -top-12 -right-12 opacity-[0.05] rounded-full pointer-events-none"></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-dark-border text-gray-500">
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Date</th>
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Category</th>
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading">Note</th>
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading text-right">Amount</th>
                <th className="py-4 px-6 bg-white/[0.01] font-semibold text-xs tracking-wider uppercase font-heading text-center w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-premium"></div>
                      <span className="text-xs text-gray-500 tracking-wide uppercase font-semibold">Tuning databases...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-500 text-xs uppercase tracking-widest font-medium">
                    No transactions found in this range.
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => (
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
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center items-center gap-3.5">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-cyan-premium hover:text-cyan-300 transition-colors p-1.5 hover:bg-cyan-premium/10 rounded-lg"
                          title="Edit log"
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-rose-premium hover:text-rose-300 transition-colors p-1.5 hover:bg-rose-premium/10 rounded-lg"
                          title="Delete log"
                        >
                          <FaTrash className="text-sm" />
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
        <div className="fixed inset-0 bg-[#090d16]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#101622]/95 border border-dark-border rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-modal-scale">
            <div className="absolute w-24 h-24 bg-cyan-premium blur-[30px] -top-10 -left-10 opacity-[0.08] rounded-full pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-heading">
                {editingTransaction ? 'Edit Log Entry' : 'Create New Log'}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1.5 bg-white/[0.03] border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={12} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <div className="relative">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value, category_id: '' })}
                      className="w-full appearance-none pl-4 pr-10 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-xs">
                      <FaChevronDown />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all font-mono"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full appearance-none pl-4 pr-10 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
                      required
                    >
                      <option value="">Select Category</option>
                      {filteredCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}{(!cat.user_id) ? ' 🔒' : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-xs">
                      <FaChevronDown />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewCategory({ ...newCategory, type: formData.type });
                      setShowCategoryModal(true);
                    }}
                    className="px-4 bg-teal-premium/15 hover:bg-teal-premium/25 border border-teal-premium/30 hover:border-teal-premium/60 text-teal-premium rounded-xl transition-all active:scale-95 flex items-center justify-center"
                    title="Add custom category"
                  >
                    <FaPlusCircle className="text-base" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
                  rows="3"
                  placeholder="Add descriptions..."
                />
              </div>
              
              <div className="flex gap-3.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/[0.02] border border-dark-border rounded-xl text-xs text-gray-400 hover:text-white font-heading font-extrabold transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-premium to-purple-premium text-white font-heading font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-md shadow-cyan-premium/10 hover:shadow-cyan-premium/30"
                >
                  {editingTransaction ? 'UPDATE LOG' : 'CREATE LOG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal create Category */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-[#090d16]/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#101622]/95 border border-dark-border rounded-3xl max-w-md w-full p-8 shadow-2xl relative animate-modal-scale">
            <div className="absolute w-24 h-24 bg-teal-premium blur-[30px] -top-10 -left-10 opacity-[0.08] rounded-full pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase font-heading">
                Create New Category
              </h3>
              <button 
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategory({ name: '', icon: '📌', type: formData.type });
                }} 
                className="p-1.5 bg-white/[0.03] border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={12} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCategory} className="space-y-5">
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
                  placeholder="e.g., Coffee, Shopping, Gym..."
                  autoFocus
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Quick Select Icon
                </label>
                <div className="flex flex-wrap gap-2.5 p-3 bg-white/[0.01] border border-dark-border rounded-2xl justify-center">
                  {iconSuggestions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, icon })}
                      className={`text-xl p-2 rounded-xl transition-all duration-150 active:scale-90 ${
                        newCategory.icon === icon ? 'bg-cyan-premium/20 border border-cyan-premium scale-110 shadow-cyan-premium/25 shadow-md' : 'bg-white/[0.02] border border-dark-border hover:bg-white/[0.05]'
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
                  className="w-full px-4 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all mt-3 font-mono text-center text-lg"
                  placeholder="Or enter custom emoji..."
                  maxLength="2"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Cashflow Association
                </label>
                <div className="relative">
                  <select
                    value={newCategory.type}
                    onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-[#0f172a]/80 border border-dark-border rounded-xl text-xs text-white outline-none focus:border-cyan-premium focus:shadow-cyan-glow transition-all"
                  >
                    <option value="expense">Expense Category</option>
                    <option value="income">Income Category</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500 text-xs">
                    <FaChevronDown />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3.5 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory({ name: '', icon: '📌', type: formData.type });
                  }}
                  className="flex-1 py-3 bg-white/[0.02] border border-dark-border rounded-xl text-xs text-gray-400 hover:text-white font-heading font-extrabold transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-teal-premium to-cyan-premium text-white font-heading font-extrabold text-xs tracking-wider rounded-xl transition-all shadow-md shadow-teal-premium/10 hover:shadow-teal-premium/30"
                >
                  CREATE CATEGORY
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