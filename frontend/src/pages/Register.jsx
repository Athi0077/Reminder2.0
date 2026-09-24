import { useState, useContext } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Bell, Mail, Lock, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If already logged in, redirect
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white mb-4">
            <Bell size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Create an account</h2>
          <p className="text-slate-500 mt-2">Start managing your tasks today.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="Enter your name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-slate-50 focus:bg-white"
                placeholder="Create a password"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="block w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl text-center transition-colors shadow-md shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
