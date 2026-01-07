import React, { useState, useEffect } from 'react';
import { UserProfile, AppState, FoodAnalysis, UserPreferences, HistoryEntry } from './types';
import { analyzeFoodImage, analyzeFoodText } from './services/geminiService';
import { AnalysisResult } from './components/AnalysisResult';
import { ProfileSelector } from './components/ProfileSelector';
import { HistoryList } from './components/HistoryList';
import { PreferencesModal } from './components/PreferencesModal';
import { 
  Search, Camera, Upload, Loader2, Sparkles, Sliders, 
  Home, Clock, Heart, User, ScanLine, ArrowRight, Star
} from 'lucide-react';

const HISTORY_STORAGE_KEY = 'foodlenz_history';

export default function App() {
  const [state, setState] = useState<AppState>({
    currentView: 'main',
    activeTab: 'home',
    profile: UserProfile.GENERAL,
    preferences: { allergies: '', customGoals: '' },
    analysisData: null,
    currentImage: null,
    history: [],
    chatHistory: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setState(prev => ({ ...prev, history: parsed }));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (analysis: FoodAnalysis, profileSnapshot: UserProfile, image?: string) => {
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      data: analysis,
      profileSnapshot: profileSnapshot,
      image: image
    };
    
    // ✅ NEW CODE (Copy and paste this)
setState(prev => {
  const updatedHistory = [newEntry, ...prev.history].slice(0, 20);
  
  // Create a lightweight copy for storage (removes the heavy image)
  const historyForStorage = updatedHistory.map(item => ({ ...item, image: null }));
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyForStorage));
  
  return { ...prev, history: updatedHistory };
});
  };

  const startAnalysis = async (action: () => Promise<FoodAnalysis>, imageBase64?: string) => {
    setIsLoading(true);
    setState(prev => ({ ...prev, currentView: 'analyzing', currentImage: imageBase64 || null }));
    try {
      const data = await action();
      saveToHistory(data, state.profile, imageBase64);
      setState(prev => ({
        ...prev,
        currentView: 'result',
        analysisData: data,
        chatHistory: [] 
      }));
    } catch (error) {
      console.error(error);
      alert('Failed to analyze. Please try again.');
      setState(prev => ({ ...prev, currentView: 'main' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    // For text search, we don't have an image, so currentImage is null
    startAnalysis(() => analyzeFoodText(searchQuery, state.profile, state.preferences));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      startAnalysis(() => analyzeFoodImage(base64Data, state.profile, state.preferences), base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleHistorySelect = (entry: HistoryEntry) => {
    setState(prev => ({
      ...prev,
      currentView: 'result',
      analysisData: entry.data,
      currentImage: entry.image || null,
      chatHistory: [],
    }));
  };

  const getFavorites = () => {
    try {
      // Favorites in localStorage might not have the full types.HistoryEntry shape
      // but HistoryList expects HistoryEntry. Let's cast loosely or map it.
      // The AnalysisResult component saves favorites as FoodAnalysis objects.
      // We need to wrap them in HistoryEntry style to reuse the list component.
      const rawFavs = JSON.parse(localStorage.getItem('foodlenz_favorites') || '[]');
      return rawFavs.map((f: any, idx: number) => ({
        id: `fav-${idx}`,
        timestamp: Date.now(), // Fake timestamp or store it
        data: f,
        profileSnapshot: state.profile, // Just current profile context
        image: f.image // We saved trimmed image
      })) as HistoryEntry[];
    } catch {
      return [];
    }
  };

  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col h-full animate-fade-in pb-24">
      <div className="px-6 pt-10 pb-4">
         <h1 className="text-3xl font-bold text-gray-900 leading-tight">
           Hi, Foodie! <span className="inline-block animate-wave">👋</span>
         </h1>
         <p className="text-gray-500 mt-1">What are you consuming today?</p>
      </div>

      {/* Search Hero */}
      <div className="px-6 mb-8">
        <div className="relative group bg-white rounded-2xl shadow-lg shadow-gray-100/50 p-2 border border-gray-100 flex items-center">
            <Search className="ml-3 text-orange-500" size={24} />
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search food database..."
                className="w-full px-4 py-3 bg-transparent outline-none text-gray-700 placeholder-gray-400 font-medium"
            />
            {searchQuery && (
                <button 
                  onClick={handleSearch}
                  className="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 transition-colors"
                >
                  <ArrowRight size={20} />
                </button>
            )}
        </div>
      </div>

      {/* Primary Actions */}
      <div className="px-6 grid grid-cols-2 gap-4 mb-8">
         <label className="relative overflow-hidden cursor-pointer group bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-xl shadow-orange-500/20 transition-transform transform active:scale-95">
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <ScanLine size={80} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[120px]">
               <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Camera size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-lg">Scan Food</h3>
                  <p className="text-white/80 text-xs mt-1">Camera Analysis</p>
               </div>
            </div>
         </label>

         <label className="relative overflow-hidden cursor-pointer group bg-white border border-gray-100 rounded-3xl p-6 text-gray-800 shadow-lg shadow-gray-100 transition-transform transform active:scale-95">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <div className="absolute top-0 right-0 p-4 text-gray-50 opacity-50 group-hover:text-gray-100 transition-colors">
               <Upload size={80} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[120px]">
               <div className="bg-orange-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                  <Upload size={24} className="text-orange-500" />
               </div>
               <div>
                  <h3 className="font-bold text-lg">Upload</h3>
                  <p className="text-gray-400 text-xs mt-1">From Gallery</p>
               </div>
            </div>
         </label>
      </div>

      {/* Horizontal Recent Scans */}
      <div className="pl-6 mb-4">
         <div className="flex justify-between items-center pr-6 mb-4">
            <h3 className="font-bold text-lg text-gray-800">Recent Analysis</h3>
            <button onClick={() => setState(prev => ({...prev, activeTab: 'history'}))} className="text-orange-500 text-sm font-medium">See All</button>
         </div>
         {state.history.length > 0 ? (
           <div className="flex gap-4 overflow-x-auto pb-6 pr-6 no-scrollbar snap-x">
              {state.history.slice(0, 5).map(entry => (
                <button 
                  key={entry.id}
                  onClick={() => handleHistorySelect(entry)}
                  className="flex-shrink-0 w-48 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm snap-start hover:shadow-md transition-all text-left"
                >
                   <div className="w-full h-32 bg-gray-100 rounded-xl mb-3 overflow-hidden relative">
                      {entry.image ? (
                        <img src={`data:image/jpeg;base64,${entry.image}`} className="w-full h-full object-cover" alt={entry.data.foodName} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                          <Sparkles size={24} />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                         <Star size={10} className="fill-orange-500 text-orange-500" /> {entry.data.starRating}
                      </div>
                   </div>
                   <h4 className="font-bold text-gray-800 truncate">{entry.data.foodName}</h4>
                   <p className="text-xs text-gray-400 mt-1">{new Date(entry.timestamp).toLocaleDateString()}</p>
                </button>
              ))}
           </div>
         ) : (
           <p className="text-gray-400 text-sm italic pr-6">No recent scans. Try scanning something tasty!</p>
         )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="px-6 pt-10 pb-24 h-full flex flex-col">
       <h1 className="text-2xl font-bold text-gray-900 mb-6">History</h1>
       <div className="flex-1 overflow-y-auto no-scrollbar">
          <HistoryList history={state.history} onSelect={handleHistorySelect} variant="history" />
       </div>
    </div>
  );

  const renderFavorites = () => (
    <div className="px-6 pt-10 pb-24 h-full flex flex-col">
       <h1 className="text-2xl font-bold text-gray-900 mb-6">Favorites</h1>
       <div className="flex-1 overflow-y-auto no-scrollbar">
          <HistoryList history={getFavorites()} onSelect={handleHistorySelect} variant="favorites" />
       </div>
    </div>
  );

  const renderProfile = () => (
    <div className="px-6 pt-10 pb-24 h-full flex flex-col animate-fade-in">
       <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-500/30">
             {state.profile.charAt(0)}
          </div>
          <div>
             <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
             <p className="text-gray-500 text-sm">{state.profile} Mode</p>
          </div>
       </div>

       <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <ProfileSelector currentProfile={state.profile} onProfileChange={(p) => setState(prev => ({...prev, profile: p}))} />
       </div>

       <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex-1">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-gray-800">Preferences</h3>
             <button onClick={() => setShowPreferences(true)} className="text-orange-500 p-2 hover:bg-orange-50 rounded-xl transition-colors">
                <Sliders size={20} />
             </button>
          </div>
          
          <div className="space-y-4">
             <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Allergies</span>
                <p className="text-gray-800 font-medium mt-1">{state.preferences.allergies || "None set"}</p>
             </div>
             <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Dietary Goals</span>
                <p className="text-gray-800 font-medium mt-1">{state.preferences.customGoals || "Standard Healthy"}</p>
             </div>
          </div>
       </div>
    </div>
  );

  // --- Main Render ---

  if (state.currentView === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-orange-200 rounded-full blur-2xl opacity-60 animate-pulse"></div>
          <Loader2 size={64} className="text-orange-500 animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Food...</h2>
        <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">
          AI is identifying ingredients and matching them to your <span className="text-orange-500 font-semibold">{state.profile}</span> profile.
        </p>
      </div>
    );
  }

  if (state.currentView === 'result' && state.analysisData) {
    return (
      <AnalysisResult 
        analysis={state.analysisData}
        image={state.currentImage}
        profile={state.profile}
        preferences={state.preferences}
        onBack={() => setState(prev => ({ ...prev, currentView: 'main' }))}
        onUpdateAnalysis={(newData, newPrefs) => setState(prev => ({...prev, analysisData: newData, preferences: newPrefs}))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-orange-100 flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden relative">
      <PreferencesModal 
        isOpen={showPreferences}
        onClose={() => setShowPreferences(false)}
        preferences={state.preferences}
        onSave={(prefs) => setState(prev => ({ ...prev, preferences: prefs }))}
        profile={state.profile}
      />
      
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
         {state.activeTab === 'home' && renderHome()}
         {state.activeTab === 'history' && renderHistory()}
         {state.activeTab === 'favorites' && renderFavorites()}
         {state.activeTab === 'profile' && renderProfile()}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl">
         {[
           { id: 'home', icon: Home, label: 'Home' },
           { id: 'history', icon: Clock, label: 'History' },
           { id: 'favorites', icon: Heart, label: 'Saved' },
           { id: 'profile', icon: User, label: 'Profile' }
         ].map((tab) => {
            const isActive = state.activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setState(prev => ({...prev, activeTab: tab.id as any}))}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-orange-500 -translate-y-1' : 'text-gray-400 hover:text-gray-600'}`}
              >
                 <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-orange-50' : 'bg-transparent'}`}>
                    <tab.icon size={24} className={isActive ? 'fill-current' : ''} />
                 </div>
                 {isActive && <span className="text-[10px] font-bold">{tab.label}</span>}
              </button>
            )
         })}
      </div>
    </div>
  );
}