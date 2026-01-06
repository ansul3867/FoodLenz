import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis, UserProfile, UserPreferences, Ingredient } from "../types";

// Use the Vite standard (import.meta.env)
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned;
};

const getSystemContext = (profile: UserProfile, prefs: UserPreferences) => {
  return `User Profile: ${profile}. 
  Specific Allergies/Restrictions: ${prefs.allergies || 'None'}.
  Specific Nutritional Goals: ${prefs.customGoals || 'Standard for this profile'}.`;
};

const ANALYSIS_SCHEMA_PROMPT = `
  Return the result strictly as a valid JSON object with this structure:
  {
    "foodName": "Name of food",
    "starRating": 4.5,
    "verdict": "Short headline summary",
    "detailedAnalysis": "2-3 sentences explaining the rating based on the profile.",
    "portionRecommendation": "How much to eat",
    "nutritionalValues": {
      "per100g": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "perServing": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "servingSize": "e.g. 1 cup (240g)"
    },
    "ingredients": [
      {
        "name": "Ingredient Name", 
        "quantity": "Estimated amount (e.g. '100g', '1 cup', '2 slices')",
        "category": "One of: Vegetable, Fruit, Grain, Protein, Dairy, Fat, Sugar, Additive, Water, Spice, Beverage, Other",
        "explanation": "Brief explanation of what this ingredient is", 
        "isGood": true/false/null,
        "impact": "Short nutritional impact tag (e.g. 'High Sugar', 'Fiber Rich', 'Additive')",
        "healthNote": "Specific sentence on how this affects the user's profile/health"
      }
    ],
    "pairingRecommendations": ["Food A", "Food B"],
    "recipes": [
      {
        "name": "Recipe Name", 
        "time": "20 mins", 
        "calories": "300 kcal", 
        "description": "Brief instruction",
        "url": "https://www.google.com/search?q=Recipe+Name"
      }
    ]
  }
`;

export const analyzeFoodImage = async (base64Image: string, profile: UserProfile, prefs: UserPreferences): Promise<FoodAnalysis> => {
  const prompt = `
    Analyze this food image.
    ${getSystemContext(profile, prefs)}
    
    Identify the food/ingredients.
    Provide a star rating (0-5) specifically for MY profile and goals.
    Suggest 3 healthy recipes using this item. IMPORTANT: The recipes MUST strictly align with my 'Specific Nutritional Goals' (e.g. if my goal is 'Low Sodium' or 'Keto', the recipes must reflect that).
    For the recipes, construct a Google Search URL for the recipe name (e.g. https://www.google.com/search?q=...) so the user can find it.
    Provide detailed breakdown of key ingredients, focusing on their impact on my health profile.
    Estimate quantities for ingredients where visible/possible.
    Estimate nutritional values per 100g and per typical serving.
    
    ${ANALYSIS_SCHEMA_PROMPT}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash-latest",
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]
    }
  });

  const text = response.text || "{}";
  try {
    return JSON.parse(cleanJsonString(text)) as FoodAnalysis;
  } catch (e) {
    console.error("Failed to parse JSON", e);
    throw new Error("Could not analyze image. Please try again.");
  }
};

export const analyzeFoodText = async (query: string, profile: UserProfile, prefs: UserPreferences): Promise<FoodAnalysis> => {
  const prompt = `
    I am searching for: "${query}".
    ${getSystemContext(profile, prefs)}
    
    Simulate a nutritional analysis for this item.
    Provide a star rating (0-5) specifically for MY profile and goals.
    Suggest 3 healthy recipes using this item. IMPORTANT: The recipes MUST strictly align with my 'Specific Nutritional Goals' (e.g. if my goal is 'Low Sodium' or 'Keto', the recipes must reflect that).
    For the recipes, construct a Google Search URL for the recipe name.
    Provide detailed breakdown of key ingredients, focusing on their impact on my health profile.
    Estimate typical quantities for ingredients.
    Estimate nutritional values per 100g and per typical serving.
    
    ${ANALYSIS_SCHEMA_PROMPT}
  `;

  // Using gemini-3-flash-preview for better JSON adherence on text tasks
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash-latest",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text || "{}";
  return JSON.parse(cleanJsonString(text)) as FoodAnalysis;
};

export const recalculateAnalysis = async (
  currentAnalysis: FoodAnalysis, 
  profile: UserProfile, 
  prefs: UserPreferences,
  updatedIngredients?: Ingredient[]
): Promise<FoodAnalysis> => {
  
  let ingredientContext = "";
  if (updatedIngredients) {
    ingredientContext = `
      USER HAS UPDATED THE INGREDIENT QUANTITIES. 
      Please recalculate the analysis based on these NEW specific quantities:
      ${JSON.stringify(updatedIngredients.map(i => ({name: i.name, quantity: i.quantity})))}
      
      Adjust the "impact" and "healthNote" for each ingredient based on its new quantity. 
      (e.g. if sugar increased, impact might change from 'Moderate' to 'High Sugar').
      Adjust the overall Nutritional Values and Calories to reflect these quantities.
    `;
  } else {
    ingredientContext = `Previous Ingredients: ${JSON.stringify(currentAnalysis.ingredients.map(i => i.name))}`;
  }

  const prompt = `
    I have a previous analysis for "${currentAnalysis.foodName}".
    My profile or goals may have changed, or I have updated the ingredient quantities.
    ${getSystemContext(profile, prefs)}

    ${ingredientContext}
    
    Re-evaluate the Star Rating, Verdict, Detailed Analysis, and Portion Recommendation.
    Update the ingredients analysis (impact, health notes, and category) for the new profile/quantities.
    Update the suggested recipes to ensure they strictly align with the NEW 'Specific Nutritional Goals'.
    Ensure nutritional values are updated to reflect the new ingredient quantities if provided.
    
    ${ANALYSIS_SCHEMA_PROMPT}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash-latest",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  const text = response.text || "{}";
  return JSON.parse(cleanJsonString(text)) as FoodAnalysis;
};

export const chatWithFoodAI = async (
  message: string, 
  currentContext: FoodAnalysis, 
  profile: UserProfile,
  prefs: UserPreferences,
  history: {role: string, parts: {text: string}[]}[]
): Promise<string> => {
  
  const chat = ai.chats.create({
    model: "gemini-1.5-flash-latest",
    history: [
      {
        role: 'user',
        parts: [{ text: `System Context: You are FoodLenz. 
        User Profile: ${profile}.
        Allergies: ${prefs.allergies}.
        Goals: ${prefs.customGoals}.
        Current Food Context: ${JSON.stringify(currentContext)}.
        
        Answer questions about ingredients, nutrition, preparation methods, and pairings.
        Be concise and helpful.` }]
      },
      {
        role: 'model',
        parts: [{ text: `Understood. I will answer based on the profile ${profile} and the food ${currentContext.foodName}.` }]
      },
      ...history
    ],
  });

  const response = await chat.sendMessage({ message });
  return response.text || "I couldn't generate a response.";
};