import React from 'react';
import { HistoryEntry } from '../types';
import { Star, Clock, ChevronRight, Utensils, Heart, Calendar } from 'lucide-react';

interface HistoryListProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  variant?: 'history' | 'favorites';
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, variant = 'history' }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${variant === 'favorites' ? 'bg-red-50' : 'bg-gray-100'}`}>
          {variant === 'favorites' ? (
             <Heart size={32} className="text-red-400 fill-red-400" />
          ) : (
             <Clock size={32} className="text-gray-300" />
          )}
        </div>
        <h3 className="text-gray-800 font-bold text-lg">
            {variant === 'favorites' ? 'No favorites yet' : 'No history yet'}
        </h3>
        <p className="text-gray-400 text-sm mt-2 max-w-[200px] mx-auto leading-relaxed">
            {variant === 'favorites' 
                ? 'Mark items as favorites after analysis to see them here.' 
                : 'Scan your first meal to start tracking your nutrition journey.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in">
      {history.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry)}
          className="w-full bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-100 transition-all flex gap-4 group text-left relative overflow-hidden"
        >
          {/* Thumbnail Image */}
          <div className="w-24 h-24 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
            {entry.image ? (
              <img src={`data:image/jpeg;base64,${entry.image}`} alt={entry.data.foodName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-200">
                <Utensils size={24} />
              </div>
            )}
            
            {/* Rating Badge Overlay */}
            <div className="absolute bottom-1 left-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm border border-gray-100">
                <Star size={8} className="fill-orange-500 text-orange-500" /> 
                <span className="text-gray-800">{entry.data.starRating}</span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
            <div>
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-gray-800 truncate text-base pr-6">{entry.data.foodName}</h4>
                    {variant === 'favorites' && (
                        <div className="bg-red-50 p-1.5 rounded-full">
                            <Heart size={12} className="fill-red-500 text-red-500" />
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                    {entry.data.verdict}
                </p>
            </div>
            
            <div className="flex items-center justify-between mt-3">
               <div className="flex items-center gap-3">
                   {variant === 'favorites' && (
                       <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                           Favorite
                       </span>
                   )}
                   <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md font-medium truncate max-w-[80px]">
                      {entry.profileSnapshot}
                   </span>
                   <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                      <Calendar size={10} />
                      {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </div>
               </div>
            </div>
          </div>
          
          {/* Chevron for affordance */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <ChevronRight size={20} />
          </div>
        </button>
      ))}
    </div>
  );
};