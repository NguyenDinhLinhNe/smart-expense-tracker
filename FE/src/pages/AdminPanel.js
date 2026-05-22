import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, getUsers } from '../services/api';
import { 
  FaUserShield, 
  FaUsers, 
  FaTags, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaTimes, 
  FaCheck, 
  FaFolderOpen 
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#10B981', 
  '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899'
];

const PRESET_EMOJIS = [
  '🍔', '🚗', '🛍️', '🎬', '💡', '🏥', '📚', '💰', 
  '💻', '📈', '✈️', '🏠', '🎁', '🍕', '☕', '👟', 
  '🏋️', '🎮', '📞', '🛡️', '📌', '⭐', '🐾', '🌍'
];

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('categories');
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Editing States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Category Form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: '📌',
    color: '#FF6B6B',
    type: 'expense'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, catRes] = await Promise.all([
        getUsers(),
        getCategories()
      ]);
      setUsers(userRes.data.users);
      const globalCats = catRes.data.categories.filter(c => c.user_id === null || c.user_id === undefined);
      setCategories(globalCats);
    } catch (error) {
      toast.error('Failed to load data from server.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category name cannot be empty.');
      return;
    }

    try {
      if (editingCategory) {
        // Calling update API for the global category
        await updateCategory(editingCategory.id, categoryForm);
        toast.success('Global category updated successfully!');
      } else {
        // Creating a new Global category requires passing is_global: true
        await createCategory({ ...categoryForm, is_global: true });
        toast.success('Global category created successfully!');
      }
      setShowCategoryModal(false);
      resetCategoryForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not complete this operation.');
    }
  };

  const handleEditCategoryClick = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type
    });
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this global category? It will no longer be available for any users.')) {
      try {
        await deleteCategory(id);
        toast.success('Global category deleted successfully!');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to delete category. It might be linked to existing transactions.');
      }
    }
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      icon: '📌',
      color: '#FF6B6B',
      type: 'expense'
    });
    setEditingCategory(null);
  };

  // Stats calculation
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const userCount = totalUsers - adminCount;
  const totalGlobalCategories = categories.length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header section with glow */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-10"></div>
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-indigo-400">
            <FaUserShield className="text-indigo-400 animate-pulse" />
            System Administration (Admin Panel)
          </h1>
          <p className="text-gray-400 mt-1">
            Manage system resources, global categories, and monitor registered users.
          </p>
        </div>
        
        {activeTab === 'categories' && (
          <button
            onClick={() => {
              resetCategoryForm();
              setShowCategoryModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all hover:scale-105 duration-200 shadow-lg shadow-indigo-600/30"
          >
            <FaPlus className="text-sm" />
            <span>Add Global Category</span>
          </button>
        )}
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-indigo-500/50 transition-all duration-300 shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gray-400 font-semibold uppercase text-xs tracking-wider">Total Users</h3>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <FaUsers size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : totalUsers}</p>
          <div className="mt-1.5 text-xs text-gray-400">Registered across the system</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-purple-500/50 transition-all duration-300 shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gray-400 font-semibold uppercase text-xs tracking-wider">Administrators</h3>
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
              <FaUserShield size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : adminCount}</p>
          <div className="mt-1.5 text-xs text-gray-400">Members with Admin role</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-emerald-500/50 transition-all duration-300 shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gray-400 font-semibold uppercase text-xs tracking-wider">Standard Users</h3>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <FaUsers size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : userCount}</p>
          <div className="mt-1.5 text-xs text-gray-400">Customers using the service</div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-amber-500/50 transition-all duration-300 shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gray-400 font-semibold uppercase text-xs tracking-wider">Global Categories</h3>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <FaTags size={20} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white">{loading ? '...' : totalGlobalCategories}</p>
          <div className="mt-1.5 text-xs text-gray-400">Shared system default categories</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-700 mb-8 bg-gray-800/40 p-1.5 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'categories'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <FaTags />
          <span>Global Categories</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <FaUsers />
          <span>User Directory</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
          {activeTab === 'categories' ? (
            /* Category Management Tab */
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-300">
                <FaFolderOpen />
                Manage Default Categories (Global)
              </h2>
              
              {categories.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  No global categories found. Please click "Add Global Category" to start.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400 font-semibold text-sm">
                        <th className="py-4 px-4">Icon</th>
                        <th className="py-4 px-4">Category Name</th>
                        <th className="py-4 px-4">Color</th>
                        <th className="py-4 px-4">Type</th>
                        <th className="py-4 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {categories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-gray-700/30 transition-colors text-sm">
                          <td className="py-4 px-4 text-2xl">{cat.icon}</td>
                          <td className="py-4 px-4 font-medium text-white">{cat.name}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span 
                                className="inline-block w-4 h-4 rounded-full border border-gray-600" 
                                style={{ backgroundColor: cat.color }}
                              ></span>
                              <span className="font-mono text-gray-400 text-xs">{cat.color}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              cat.type === 'expense' 
                                ? 'bg-red-500/10 text-red-400' 
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {cat.type === 'expense' ? 'Expense' : 'Income'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => handleEditCategoryClick(cat)}
                                className="p-2 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* User Directory Tab */
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-300">
                <FaUsers />
                System User Directory
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 font-semibold text-sm">
                      <th className="py-4 px-4">Full Name</th>
                      <th className="py-4 px-4">Email Address</th>
                      <th className="py-4 px-4">Role</th>
                      <th className="py-4 px-4">Join Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-700/30 transition-colors text-sm">
                        <td className="py-4 px-4 font-semibold text-white">{u.name}</td>
                        <td className="py-4 px-4 text-gray-300 font-mono">{u.email}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            u.role === 'admin' 
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                              : 'bg-gray-700 text-gray-400 border border-gray-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Category Modal (Add/Edit) */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-gray-900 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">
                {editingCategory ? 'Edit Global Category' : 'Add New Global Category'}
              </h3>
              <button 
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Travel, Shopping, Pets..."
                  className="w-full bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Type</label>
                  <select
                    className="w-full bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white outline-none transition-all"
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">Current Icon</label>
                  <div className="w-full bg-gray-900 border border-gray-700 rounded-xl py-2 px-4 text-3xl text-center">
                    {categoryForm.icon}
                  </div>
                </div>
              </div>

              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Select Icon (Emoji)</label>
                <div className="grid grid-cols-8 gap-2 bg-gray-900 p-3 rounded-xl max-h-32 overflow-y-auto border border-gray-700">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, icon: emoji })}
                      className={`text-2xl p-1.5 rounded-lg hover:bg-gray-800 transition-all ${
                        categoryForm.icon === emoji ? 'bg-indigo-600 hover:bg-indigo-600 scale-110' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Representative Color</label>
                <div className="flex gap-3 items-center mb-3">
                  <input
                    type="color"
                    className="w-10 h-10 bg-transparent cursor-pointer rounded-lg overflow-hidden"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-white font-mono placeholder-gray-500 outline-none transition-all"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-2 bg-gray-900 p-3 rounded-xl border border-gray-700">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, color: color })}
                      className={`w-7 h-7 rounded-full transition-all flex items-center justify-center hover:scale-110`}
                      style={{ backgroundColor: color }}
                    >
                      {categoryForm.color === color && <FaCheck size={10} className="text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    resetCategoryForm();
                  }}
                  className="bg-gray-700 hover:bg-gray-650 text-white font-semibold py-2 px-5 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-5 rounded-xl transition-all shadow-md shadow-indigo-600/20"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
