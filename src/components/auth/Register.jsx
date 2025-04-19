import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROLES = {
  FARMER: 'farmer',
  TRANSPORTER: 'transporter',
  DISTRIBUTOR: 'distributor',
  RETAILER: 'retailer'
};

const ROLE_FIELDS = {
  [ROLES.FARMER]: [
    { name: 'farmName', label: 'Farm Name', type: 'text' },
    { name: 'location', label: 'Farm Location', type: 'text' },
    { name: 'farmingType', label: 'Type of Farming', type: 'text' }
  ],
  [ROLES.TRANSPORTER]: [
    { name: 'companyName', label: 'Company/Business Name', type: 'text' },
    { name: 'address', label: 'Business Address', type: 'text' },
    { name: 'transportLicense', label: 'Transport Business License Number', type: 'text' },
    { name: 'phone', label: 'Contact Phone', type: 'tel' }
  ],
  [ROLES.DISTRIBUTOR]: [
    { name: 'companyName', label: 'Company Name', type: 'text' },
    { name: 'warehouseAddress', label: 'Warehouse Address', type: 'text' },
    { name: 'storageCapacity', label: 'Storage Capacity (in kg)', type: 'number' },
    { name: 'gstin', label: 'GSTIN', type: 'text' }
  ],
  [ROLES.RETAILER]: [
    { name: 'storeName', label: 'Store Name', type: 'text' },
    { name: 'storeAddress', label: 'Store Address', type: 'text' },
    { name: 'gstin', label: 'GSTIN', type: 'text' }
  ]
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [additionalFields, setAdditionalFields] = useState({});
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleFieldChange = (fieldName, value) => {
    setAdditionalFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const renderField = (field) => {
    if (field.type === 'select') {
      return (
        <select
          required
          className="mt-1 block w-full py-3 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          value={additionalFields[field.name] || ''}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
        >
          <option value="">Select {field.label}</option>
          {field.options.map(option => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type}
        required
        className="mt-1 block w-full py-3 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        value={additionalFields[field.name] || ''}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
      />
    );
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!role) {
      toast.error('Please select a role');
      return;
    }

    try {
      setLoading(true);
      await signup(email, password, role, additionalFields);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create New Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              login to existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-b-md relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Select Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 block w-full py-3 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                required
              >
                <option value="">Select a role</option>
                <option value={ROLES.FARMER}>Farmer</option>
                <option value={ROLES.TRANSPORTER}>Transporter</option>
                <option value={ROLES.DISTRIBUTOR}>Distributor</option>
                <option value={ROLES.RETAILER}>Retailer</option>
              </select>
            </div>

            {role && ROLE_FIELDS[role]?.map((field) => (
              <div key={field.name}>
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-leaf-primary hover:bg-leaf-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-leaf-primary disabled:bg-leaf-primary/50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 