import { useState } from 'react';
import { useAuthStore, useUIStore } from '../context/store';
import { authAPI, uploadAPI } from '../services/api';
import { FaUser, FaEnvelope, FaCamera, FaMoon, FaSun, FaSignOutAlt } from 'react-icons/fa';
import { AVATAR_UPLOAD_ACCEPT_STRING, getUploadErrorMessage, validateAvatarUpload } from '../utils/uploadValidation';

function Profile() {
  const { user, updateUser, logout } = useAuthStore();
  const { addToast } = useUIStore();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data } = await authAPI.updateProfile({ name, bio, avatar });
      updateUser(data);
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateAvatarUpload(file);
    if (!validation.isValid) {
      addToast({ type: 'error', message: validation.errorMessage });
      e.target.value = '';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const { data } = await uploadAPI.uploadAvatar(formData);
      setAvatar(data.url);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      addToast({
        type: 'error',
        message: getUploadErrorMessage(error, 'Unable to upload avatar right now. Please try again.')
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      {/* Avatar Section */}
      <div className="flex items-center gap-6 mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={name} className="w-24 h-24 object-cover" />
            ) : (
              <FaUser className="w-12 h-12 text-primary-500" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-primary-500 rounded-full text-white cursor-pointer hover:bg-primary-600">
            <FaCamera className="w-4 h-4" />
            <input 
              type="file" 
              accept={AVATAR_UPLOAD_ACCEPT_STRING}
              className="hidden" 
              onChange={handleAvatarUpload}
            />
          </label>
        </div>
        <div>
          <h2 className="text-xl font-semibold">{user?.name}</h2>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Full Name
          </label>
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email
          </label>
          <div className="relative">
            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg opacity-60 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={3}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            maxLength={150}
          />
          <p className="text-xs text-gray-500 mt-1">{bio.length}/150</p>
        </div>

        {message && (
          <p className={`text-sm ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full mt-6 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
      >
        <FaSignOutAlt /> Logout
      </button>
    </div>
  );
}

export default Profile;
