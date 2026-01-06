import React, { useState } from 'react';
import { UserPreferences, UserProfile } from '../types';
import { X, Save, AlertCircle, Target } from 'lucide-react';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSave: (prefs: UserPreferences) => void;
  profile: UserProfile;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose, preferences, onSave, profile }) => {
  const [allergies, setAllergies] = useState(preferences.allergies);
  const [goals, setGoals] = useState(preferences.customGoals);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ allergies, customGoals: goals });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800">Customize Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              Allergies & Restrictions
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Peanuts, Gluten, Lactose"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
            />
            <p className="text-xs text-gray-400">Comma separated list of things to avoid.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Target size={16} className="text-blue-500" />
              Specific Goals for {profile}
            </label>
            <input
              type="text"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Low Sodium, High Protein, Keto"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
            />
            <p className="text-xs text-gray-400">Priorities for the rating algorithm.</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button 
            onClick={handleSave}
            className="w-full flex justify-center items-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Save size={18} />
            Save & Apply
          </button>
        </div>
      </div>
    </div>
  );
};