import React from 'react';
import { UserProfile } from '../types';
import { User, Activity, AlertCircle, Heart, Dumbbell, Leaf } from 'lucide-react';

interface ProfileSelectorProps {
  currentProfile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
}

const profiles = [
  { id: UserProfile.GENERAL, icon: <User size={16} />, label: 'General' },
  { id: UserProfile.DIABETIC, icon: <Activity size={16} />, label: 'Diabetic' },
  { id: UserProfile.GYM_RAT, icon: <Dumbbell size={16} />, label: 'Athlete' },
  { id: UserProfile.LIVER_ISSUE, icon: <AlertCircle size={16} />, label: 'Liver Care' },
  { id: UserProfile.WEIGHT_LOSS, icon: <Heart size={16} />, label: 'Weight Loss' },
  { id: UserProfile.VEGAN, icon: <Leaf size={16} />, label: 'Vegan' },
];

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ currentProfile, onProfileChange }) => {
  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select Profile</h3>
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => {
          const isActive = currentProfile === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onProfileChange(p.id)}
              className={`
                flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 border
                ${isActive 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' 
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-200 hover:bg-orange-50'}
              `}
            >
              <span className={isActive ? 'text-white' : 'text-orange-500'}>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};