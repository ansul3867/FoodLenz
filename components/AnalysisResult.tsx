import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FoodAnalysis, UserProfile, ChatMessage, UserPreferences, Recipe, Ingredient } from '../types';
import { chatWithFoodAI, recalculateAnalysis } from '../services/geminiService';
import { PreferencesModal } from './PreferencesModal';
import { 
  Star, ArrowLeft, Send, CheckCircle, AlertTriangle, Info, ThumbsUp, Utensils, Sliders, 
  Loader2, Clock, Zap, HeartPulse, Heart, ExternalLink, Share2, Activity, Flame,
  Leaf, Apple, Wheat, Drumstick, Milk, Droplet, Candy, FlaskConical, GlassWater, Sparkles, CircleDot,
  Check, ChevronDown, RefreshCw, Scale
} from 'lucide-react';

interface AnalysisResultProps {
  analysis: FoodAnalysis;
  image?: string | null;
  profile: UserProfile;
  preferences: UserPreferences;
  onBack: () => void;
  onUpdateAnalysis: (newAnalysis: FoodAnalysis, newPrefs: UserPreferences) => void;
}

const getCategoryIcon = (category?: string) => {
  const c = category?.toLowerCase() || '';
  let icon;
  let colorClass = "bg-gray-100 text-gray-500";
  
  if (c.includes('veg')) { icon = <Leaf size={14} />; colorClass = "bg-green-100 text-green-600"; }
  else if (c.includes('fruit')) { icon = <Apple size={14} />; colorClass = "bg-red-100 text-red-600"; }
  else if (c.includes('grain') || c.includes('carb') || c.includes('flour')) { icon = <Wheat size={14} />; colorClass = "bg-amber-100 text-amber-600"; }
  else if (c.includes('protein') || c.includes('meat') || c.includes('egg')) { icon = <Drumstick size={14} />; colorClass = "bg-orange-100 text-orange-700"; }
  else if (c.includes('dairy') || c.includes('milk') || c.includes('cheese')) { icon = <Milk size={14} />; colorClass = "bg-blue-100 text-blue-600"; }
  else if (c.includes('fat') || c.includes('oil')) { icon = <Droplet size={14} />; colorClass = "bg-yellow-100 text-yellow-600"; }
  else if (c.includes('sugar') || c.includes('sweet')) { icon = <Candy size={14} />; colorClass = "bg-pink-100 text-pink-600"; }
  else if (c.includes('additive')) { icon = <FlaskConical size={14} />; colorClass = "bg-purple-100 text-purple-600"; }
  else if (c.includes('water')) { icon = <GlassWater size={14} />; colorClass = "bg-cyan-100 text-cyan-600"; }
  else if (c.includes('spice')) { icon = <Sparkles size={14} />; colorClass = "bg-orange-50 text-orange-500"; }
  else { icon = <CircleDot size={14} />; }

  return (
    <div className={`p-1.5 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`} title={category || 'Ingredient'}>
      {icon}
    </div>
  );
};

const DAILY_VALUES = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78
};

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, image, profile, preferences, onBack, onUpdateAnalysis }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  
  // Nutrition Unit State
  const [nutritionUnit, setNutritionUnit] = useState<'serving' | '100g' | 'custom'>('serving');
  const [customGrams, setCustomGrams] = useState<string>('100');

  const [copiedRecipeIndex, setCopiedRecipeIndex] = useState<number | null>(null);
  
  // Local state for ingredients to support quantity editing
  const [ingredients, setIngredients] = useState<Ingredient[]>(analysis.ingredients);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync state if prop updates (e.g. after a recalculation is saved)
  useEffect(() => {
    setIngredients(analysis.ingredients);
    setHasUnsavedChanges(false);
  }, [analysis.ingredients]);

  useEffect(() => {
    try {
      const favorites = JSON.parse(localStorage.getItem('foodlenz_favorites') || '[]');
      const exists = favorites.some((f: FoodAnalysis) => f.foodName === analysis.foodName);
      setIsFavorite(exists);
    } catch (e) {
      console.error("Error reading favorites", e);
    }
  }, [analysis.foodName]);

  const toggleFavorite = () => {
    try {
      const favorites = JSON.parse(localStorage.getItem('foodlenz_favorites') || '[]');
      if (isFavorite) {
        const newFavorites = favorites.filter((f: FoodAnalysis) => f.foodName !== analysis.foodName);
        localStorage.setItem('foodlenz_favorites', JSON.stringify(newFavorites));
        setIsFavorite(false);
      } else {
        favorites.push({ ...analysis, image: image ? image.substring(0, 50) + '...' : undefined }); 
        localStorage.setItem('foodlenz_favorites', JSON.stringify(favorites));
        setIsFavorite(true);
      }
    } catch (e) {
      console.error("Error updating favorites", e);
    }
  };

  const handleShare = async () => {
    const text = `Check out this analysis for ${analysis.foodName} on FoodLenz!\nRating: ${analysis.starRating}/5\nVerdict: ${analysis.verdict}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FoodLenz: ${analysis.foodName}`,
          text: text,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      } catch (err) {
        console.error("Error copying to clipboard:", err);
      }
    }
  };

  const handleRecipeShare = async (e: React.MouseEvent, recipe: Recipe, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const shareData = {
        title: `Recipe: ${recipe.name}`,
        text: `Check out this healthy recipe for ${recipe.name} recommended by FoodLenz!\n\n${recipe.description}\n\nCalories: ${recipe.calories}\nPrep time: ${recipe.time}`,
        url: recipe.url
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.error("Error sharing recipe:", err); }
    } else {
      const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url || ''}`;
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedRecipeIndex(index);
        setTimeout(() => setCopiedRecipeIndex(null), 2000);
      } catch (err) { console.error("Error copying to clipboard:", err); }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loadingChat) return;
    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoadingChat(true);
    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await chatWithFoodAI(userMsg.text, analysis, profile, preferences, history);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleRecalculate = async (newPrefs: UserPreferences) => {
    setIsRecalculating(true);
    try {
      // Pass the current ingredients state (which might have modified quantities)
      const updatedAnalysis = await recalculateAnalysis(analysis, profile, newPrefs, ingredients);
      onUpdateAnalysis(updatedAnalysis, newPrefs);
    } catch (e) {
      alert("Failed to update rating. Please try again.");
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleIngredientQuantityChange = (index: number, newQuantity: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], quantity: newQuantity };
    setIngredients(updated);
    setHasUnsavedChanges(true);
  };

  const handleUpdateQuantities = async () => {
      setIsRecalculating(true);
      try {
        const updatedAnalysis = await recalculateAnalysis(analysis, profile, preferences, ingredients);
        onUpdateAnalysis(updatedAnalysis, preferences);
        setHasUnsavedChanges(false);
      } catch (e) {
          alert("Failed to update analysis. Please try again.");
      } finally {
          setIsRecalculating(false);
      }
  };

  const calculateDV = (value: number, nutrient: keyof typeof DAILY_VALUES) => {
    if (value === undefined || value === null) return null;
    return Math.round((value / DAILY_VALUES[nutrient]) * 100);
  };

  const currentNutrition = useMemo(() => {
    if (!analysis.nutritionalValues) return null;
    
    if (nutritionUnit === 'serving') return analysis.nutritionalValues.perServing;
    if (nutritionUnit === '100g') return analysis.nutritionalValues.per100g;
    
    // Custom calculation based on 100g base values
    const factor = (parseFloat(customGrams) || 0) / 100;
    const base = analysis.nutritionalValues.per100g;
    return {
      calories: Math.round(base.calories * factor),
      protein: Math.round(base.protein * factor * 10) / 10,
      carbs: Math.round(base.carbs * factor * 10) / 10,
      fat: Math.round(base.fat * factor * 10) / 10,
    };
  }, [analysis.nutritionalValues, nutritionUnit, customGrams]);


  if (isRecalculating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center animate-fade-in bg-gray-50">
        <Loader2 size={48} className="text-orange-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Recalculating...</h2>
        <p className="text-gray-500 mt-2">Adjusting analysis based on updates.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24 relative overflow-x-hidden">
      <PreferencesModal 
        isOpen={showPreferences} 
        onClose={() => setShowPreferences(false)}
        preferences={preferences}
        onSave={handleRecalculate}
        profile={profile}
      />

      {/* Hero Header with Image */}
      <div className="relative h-72 w-full">
        {image ? (
          <img src={`data:image/jpeg;base64,${image}`} alt={analysis.foodName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
             <Utensils size={64} className="text-orange-300 opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
        
        {/* Top Nav */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button onClick={onBack} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all">
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all relative">
              <Share2 size={24} />
              {showShareTooltip && (
                  <span className="absolute top-12 right-0 text-xs bg-gray-900 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap">
                      Copied!
                  </span>
              )}
            </button>
            <button onClick={toggleFavorite} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all">
              <Heart size={24} className={isFavorite ? "fill-orange-500 text-orange-500" : "text-white"} />
            </button>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
           <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg uppercase tracking-wide">
                {profile}
              </span>
              <span className="px-2 py-1 bg-black/30 backdrop-blur-sm text-white text-xs font-medium rounded-lg">
                Verified Analysis
              </span>
           </div>
           <h1 className="text-3xl font-bold leading-tight shadow-sm">{analysis.foodName}</h1>
        </div>
      </div>

      {/* Content Container - Overlapping the image slightly */}
      <div className="relative -mt-6 rounded-t-3xl bg-gray-50 px-4 pt-6 space-y-6">
        
        {/* Rating & Verdict Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
             <div>
               <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">Health Score</p>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-4xl font-bold text-gray-900">{analysis.starRating}</span>
                 <div className="flex flex-col">
                   <div className="flex text-orange-400">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <Star key={star} size={16} className={`${star <= Math.round(analysis.starRating) ? 'fill-current' : 'text-gray-200'} `} />
                     ))}
                   </div>
                   <span className="text-xs text-gray-400">out of 5</span>
                 </div>
               </div>
             </div>
             <button onClick={() => setShowPreferences(true)} className="p-2 bg-gray-50 rounded-xl text-gray-500 hover:bg-gray-100">
               <Sliders size={20} />
             </button>
          </div>
          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
             <h3 className="font-semibold text-orange-900 mb-1">Verdict</h3>
             <p className="text-orange-800 text-sm leading-relaxed">{analysis.verdict}</p>
          </div>
          <div className="mt-4 text-gray-600 text-sm leading-relaxed">
            {analysis.detailedAnalysis}
          </div>
        </div>

        {/* Segmented Control for Nutrition */}
        {analysis.nutritionalValues && currentNutrition && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
           <div className="flex flex-col mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900">Nutrition</h3>
                <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-medium">
                    <button onClick={() => setNutritionUnit('serving')} className={`px-3 py-1.5 rounded-lg transition-all ${nutritionUnit === 'serving' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Serving</button>
                    <button onClick={() => setNutritionUnit('100g')} className={`px-3 py-1.5 rounded-lg transition-all ${nutritionUnit === '100g' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>100g</button>
                    <button onClick={() => setNutritionUnit('custom')} className={`px-3 py-1.5 rounded-lg transition-all ${nutritionUnit === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Custom</button>
                </div>
              </div>
              
              {nutritionUnit === 'custom' && (
                  <div className="flex justify-end items-center gap-2 animate-fade-in bg-orange-50/50 p-2 rounded-lg border border-orange-100">
                     <Scale size={14} className="text-orange-400" />
                     <span className="text-sm text-gray-600 font-medium">Custom Amount:</span>
                     <div className="relative">
                        <input 
                          type="number" 
                          value={customGrams} 
                          onChange={(e) => setCustomGrams(e.target.value)}
                          className="w-20 pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all font-semibold text-gray-800"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">g</span>
                     </div>
                  </div>
              )}
           </div>

           <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Cals', val: currentNutrition.calories, unit: '', color: 'text-orange-500', bg: 'bg-orange-50' },
                { label: 'Prot', val: currentNutrition.protein, unit: 'g', color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Carbs', val: currentNutrition.carbs, unit: 'g', color: 'text-amber-500', bg: 'bg-amber-50' },
                { label: 'Fats', val: currentNutrition.fat, unit: 'g', color: 'text-rose-500', bg: 'bg-rose-50' },
              ].map((n, i) => (
                <div key={i} className={`rounded-2xl p-3 ${n.bg} transition-all duration-300`}>
                   <span className={`block text-lg font-bold ${n.color}`}>{n.val}{n.unit}</span>
                   <span className="text-xs text-gray-500 font-medium">{n.label}</span>
                </div>
              ))}
           </div>
           
           {nutritionUnit === 'serving' && (
             <p className="text-xs text-center text-gray-400 mt-4">Serving Size: {analysis.nutritionalValues.servingSize}</p>
           )}
           {nutritionUnit === '100g' && (
             <p className="text-xs text-center text-gray-400 mt-4">Values per 100 grams</p>
           )}
           {nutritionUnit === 'custom' && (
             <p className="text-xs text-center text-gray-400 mt-4">Calculated values for {customGrams}g</p>
           )}
        </div>
        )}

        {/* Ingredients List */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-gray-900">Ingredients Breakdown</h3>
            {hasUnsavedChanges && (
                <button 
                    onClick={handleUpdateQuantities}
                    className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md animate-pulse hover:bg-orange-600 transition-colors"
                >
                    <RefreshCw size={12} className="animate-spin-slow" /> Update Impact
                </button>
            )}
          </div>
          <div className="space-y-4">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                 {getCategoryIcon(ing.category)}
                 <div className="flex-1">
                    <div className="flex justify-between items-start">
                       <h4 className="font-medium text-gray-900">{ing.name}</h4>
                       {ing.isGood !== null && (
                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ing.isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {ing.isGood ? 'Healthy' : 'Limit'}
                         </span>
                       )}
                    </div>
                    
                    {/* Quantity Input */}
                    <div className="flex items-center mt-1.5 mb-2 gap-2">
                        <span className="text-xs text-gray-400 font-medium">Qty:</span>
                        <input 
                            type="text" 
                            value={ing.quantity || ''} 
                            onChange={(e) => handleIngredientQuantityChange(idx, e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 font-medium w-24 focus:ring-2 focus:ring-orange-200 focus:border-orange-300 outline-none transition-all"
                            placeholder="e.g. 100g"
                        />
                    </div>

                    {ing.impact && <span className="text-xs text-gray-400 font-medium block mb-1">{ing.impact}</span>}
                    <p className="text-xs text-gray-500 leading-relaxed mb-2">{ing.explanation}</p>
                    {ing.healthNote && (
                      <div className="flex gap-2 items-start bg-gray-50 p-2 rounded-lg">
                         <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                         <p className="text-xs text-blue-700 font-medium">{ing.healthNote}</p>
                      </div>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Healthy Recipes */}
        {analysis.recipes && analysis.recipes.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Healthy Pairings</h3>
            <div className="space-y-3">
              {analysis.recipes.map((recipe, idx) => (
                <div key={idx} className="group relative bg-white border border-gray-100 rounded-2xl p-3 flex gap-4 hover:shadow-md transition-all">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <Utensils size={24} className="text-gray-300" />
                  </div>
                  <div className="flex-1 py-1">
                     <div className="flex justify-between">
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{recipe.name}</h4>
                        <div className="flex gap-2">
                           <button onClick={(e) => handleRecipeShare(e, recipe, idx)} className="text-gray-400 hover:text-orange-500 transition-colors">
                              {copiedRecipeIndex === idx ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                           </button>
                           {recipe.url && (
                             <a href={recipe.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-orange-500 transition-colors">
                               <ExternalLink size={16} />
                             </a>
                           )}
                        </div>
                     </div>
                     <p className="text-xs text-gray-500 line-clamp-2 mt-1">{recipe.description}</p>
                     <div className="flex gap-3 mt-2 text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-1"><Flame size={12} /> {recipe.calories}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {recipe.time}</span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
           <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                 <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                 FoodAI Assistant
              </h3>
              <span className="text-xs text-gray-400">Online</span>
           </div>
           <div className="flex-1 bg-gray-50 overflow-y-auto p-4 space-y-3">
              <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-600 rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm max-w-[85%]">
                     Hi! I'm your food assistant. Ask me anything about this meal!
                  </div>
              </div>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                    m.role === 'user' 
                    ? 'bg-orange-500 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loadingChat && (
                <div className="flex justify-start">
                   <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                      </div>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
           </div>
           <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about substitutes, recipes..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || loadingChat}
                className="p-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};