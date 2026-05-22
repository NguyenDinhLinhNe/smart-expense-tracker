import React, { useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FaTachometerAlt, 
  FaMoneyBillWave, 
  FaPiggyBank, 
  FaChartLine, 
  FaRobot, 
  FaSignOutAlt,
  FaBars,
  FaTimes
} from 'react-icons/fa';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
    { path: '/transactions', icon: FaMoneyBillWave, label: 'Transactions' },
    { path: '/budgets', icon: FaPiggyBank, label: 'Budgets' },
    { path: '/reports', icon: FaChartLine, label: 'Reports' },
    { path: '/ai', icon: FaRobot, label: 'AI Insights' },
  ];

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-gray-800 rounded-lg text-white"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <div className={`fixed lg:relative z-10 w-64 bg-gray-800 h-full transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Expense Tracker</h2>
          <p className="text-gray-400 text-sm">Welcome, {user?.name}</p>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-700 transition-colors ${
                  isActive ? 'bg-gray-700 text-blue-400 border-r-4 border-blue-400' : ''
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-700 transition-colors mt-8"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;