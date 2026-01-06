export enum UserProfile {
  GENERAL = 'General',
  DIABETIC = 'Diabetic',
  GYM_RAT = 'Gym Rat / Athlete',
  LIVER_ISSUE = 'Liver Issues',
  WEIGHT_LOSS = 'Weight Loss',
  VEGAN = 'Vegan'
}

export interface UserPreferences {
  allergies: string;
  customGoals: string; // Free text for specific goals (e.g. "Low Sodium")
}

export interface NutritionalValues {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Ingredient {
  name: string;
  quantity?: string; // Estimated amount (e.g. "100g", "1 cup")
  category?: string; // e.g. "Vegetable", "Dairy", "Additive"
  explanation: string;
  isGood: boolean | null; // null if neutral
  impact?: string; // Short nutritional impact tag (e.g. "High Sugar")
  healthNote?: string; // Specific implication for the user profile
}

export interface Recipe {
  name: string;
  time: string;
  calories: string;
  description: string;
  url?: string;
}

export interface FoodAnalysis {
  foodName: string;
  starRating: number; // 0 to 5
  verdict: string; // Short summary
  detailedAnalysis: string;
  portionRecommendation: string;
  nutritionalValues?: {
    per100g: NutritionalValues;
    perServing: NutritionalValues;
    servingSize: string;
  };
  ingredients: Ingredient[];
  pairingRecommendations: string[];
  recipes: Recipe[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  data: FoodAnalysis;
  profileSnapshot: UserProfile;
  image?: string; // Base64 image string
}

export interface AppState {
  currentView: 'main' | 'analyzing' | 'result'; // 'main' encompasses the tab views
  activeTab: 'home' | 'history' | 'favorites' | 'profile';
  profile: UserProfile;
  preferences: UserPreferences;
  analysisData: FoodAnalysis | null;
  currentImage: string | null; // Temporary holding for current analysis
  history: HistoryEntry[];
  chatHistory: ChatMessage[];
}