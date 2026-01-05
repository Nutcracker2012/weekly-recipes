import json
import os
from typing import List, Dict, Optional
from datetime import datetime


class MealPlanManager:
    """Manage saved meal plans with CRUD operations."""
    
    def __init__(self, meal_plans_file: str = "data/meal_plans.json"):
        # Make path relative to project root
        if not os.path.isabs(meal_plans_file):
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.meal_plans_file = os.path.join(project_root, meal_plans_file)
        else:
            self.meal_plans_file = meal_plans_file
        self._ensure_file_exists()
    
    def _ensure_file_exists(self):
        """Ensure meal_plans.json file exists, create if not."""
        if not os.path.exists(self.meal_plans_file):
            os.makedirs(os.path.dirname(self.meal_plans_file), exist_ok=True)
            with open(self.meal_plans_file, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)
    
    def load_meal_plans(self) -> List[Dict]:
        """Load all meal plans from JSON file."""
        try:
            with open(self.meal_plans_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def save_meal_plans(self, meal_plans: List[Dict]):
        """Save meal plans to JSON file."""
        os.makedirs(os.path.dirname(self.meal_plans_file), exist_ok=True)
        with open(self.meal_plans_file, 'w', encoding='utf-8') as f:
            json.dump(meal_plans, f, ensure_ascii=False, indent=2)
    
    def get_all_meal_plans(self) -> List[Dict]:
        """Get all saved meal plans."""
        return self.load_meal_plans()
    
    def get_meal_plan_by_name(self, plan_name: str) -> Optional[Dict]:
        """Get a meal plan by name."""
        meal_plans = self.load_meal_plans()
        for plan in meal_plans:
            if plan.get("name", "").lower() == plan_name.lower():
                return plan
        return None
    
    def save_meal_plan(self, plan_name: str, plan_text: str) -> tuple:
        """
        Save a new meal plan or update existing one.
        Returns (success, error_message, saved_plan).
        """
        if not plan_name or not plan_name.strip():
            return False, "Plan name is required", None
        
        if not plan_text or not plan_text.strip():
            return False, "Plan content is required", None
        
        meal_plans = self.load_meal_plans()
        plan_name = plan_name.strip()
        
        # Check if plan with same name already exists
        existing_plan = None
        existing_index = None
        for i, plan in enumerate(meal_plans):
            if plan.get("name", "").lower() == plan_name.lower():
                existing_plan = plan
                existing_index = i
                break
        
        new_plan = {
            "name": plan_name,
            "plan": plan_text.strip(),
            "date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        if existing_plan:
            # Update existing plan
            new_plan["date"] = existing_plan.get("date", new_plan["date"])  # Keep original date
            new_plan["updated_date"] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            meal_plans[existing_index] = new_plan
        else:
            # Add new plan
            meal_plans.append(new_plan)
        
        self.save_meal_plans(meal_plans)
        return True, None, new_plan
    
    def delete_meal_plan(self, plan_name: str) -> tuple:
        """
        Delete a meal plan by name.
        Returns (success, error_message).
        """
        meal_plans = self.load_meal_plans()
        original_count = len(meal_plans)
        
        meal_plans = [plan for plan in meal_plans 
                     if plan.get("name", "").lower() != plan_name.lower()]
        
        if len(meal_plans) == original_count:
            return False, f"Meal plan '{plan_name}' not found"
        
        self.save_meal_plans(meal_plans)
        return True, None

