import json
import csv
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional

# Add src directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dish_manager import DishManager


class RecipePlanner:
    """Plan recipes based on available ingredients and past meal prep."""
    
    CHINESE_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    VEGETABLE_CATEGORY = "蔬菜"
    MEAT_CATEGORIES = ["肉类", "海鲜"]
    
    def __init__(self, dishes_file: str = "data/dishes.json", 
                 past_meals_file: str = "data/past_meals.csv"):
        self.dish_manager = DishManager(dishes_file)
        # Make path relative to project root
        if not os.path.isabs(past_meals_file):
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.past_meals_file = os.path.join(project_root, past_meals_file)
        else:
            self.past_meals_file = past_meals_file
    
    def match_ingredient(self, inventory_item: str, dish_ingredient: str) -> bool:
        """
        Check if inventory item matches dish ingredient using partial matching.
        Example: "鸡翅" matches "鸡翅根", "鸡翅中"
        """
        inventory_lower = inventory_item.lower()
        ingredient_lower = dish_ingredient.lower()
        
        # Exact match
        if inventory_lower == ingredient_lower:
            return True
        
        # Partial match: inventory item contains ingredient or vice versa
        if inventory_lower in ingredient_lower or ingredient_lower in inventory_lower:
            return True
        
        # Check for common variations (e.g., "鸡翅" variations)
        # This handles cases like "鸡翅" matching "鸡翅根", "鸡翅中"
        if len(inventory_lower) >= 2 and len(ingredient_lower) >= 2:
            # If one is a substring of the other (minimum 2 chars)
            if inventory_lower[:2] == ingredient_lower[:2]:
                return True
        
        return False
    
    def score_dish(self, dish: Dict, inventory_items: List[str]) -> tuple:
        """
        Score a dish based on ingredient availability.
        Returns (score, matched_ingredients_set).
        Score is ratio of matched ingredients to total ingredients.
        """
        dish_ingredients = dish.get("ingredients", [])
        if not dish_ingredients:
            return 0.0, set()
        
        matched = set()
        for ingredient in dish_ingredients:
            for inv_item in inventory_items:
                if self.match_ingredient(inv_item, ingredient):
                    matched.add(ingredient)
                    break
        
        score = len(matched) / len(dish_ingredients) if dish_ingredients else 0.0
        return score, matched
    
    def load_past_meals(self, days: int = 7) -> Set[str]:
        """Load dishes prepared in the last N days."""
        if not os.path.exists(self.past_meals_file):
            return set()
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            recent_dishes = set()
            
            with open(self.past_meals_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    date_str = row.get('date', '')
                    dish_name = row.get('dish_name', '')
                    
                    if date_str and dish_name:
                        try:
                            meal_date = datetime.strptime(date_str, '%Y-%m-%d')
                            if meal_date >= cutoff_date:
                                recent_dishes.add(dish_name)
                        except ValueError:
                            continue
            
            return recent_dishes
        except Exception:
            return set()
    
    def get_feasible_dishes(self, inventory_items: List[str]) -> List:
        """
        Get all feasible dishes scored by ingredient availability.
        Returns list of (dish, score) tuples sorted by score descending.
        """
        dishes = self.dish_manager.get_all_dishes()
        recent_dishes = self.load_past_meals(7)
        
        scored_dishes = []
        for dish in dishes:
            # Skip recent dishes
            if dish.get("name") in recent_dishes:
                continue
            
            score, matched = self.score_dish(dish, inventory_items)
            # Only include dishes with at least one matched ingredient
            if score > 0:
                scored_dishes.append((dish, score))
        
        # Sort by score descending
        scored_dishes.sort(key=lambda x: x[1], reverse=True)
        return scored_dishes
    
    def generate_meal_plan(self, inventory_items: List[str], start_day: int = 0) -> str:
        """
        Generate a 7-day meal plan.
        start_day: 0 = Sunday, 1 = Monday, etc.
        Returns formatted text string.
        """
        feasible_dishes = self.get_feasible_dishes(inventory_items)
        
        if not feasible_dishes:
            return "无法生成餐单：没有找到匹配的菜品。"
        
        # Separate dishes by category
        vegetable_dishes = [(d, s) for d, s in feasible_dishes 
                           if d.get("category") == self.VEGETABLE_CATEGORY]
        meat_dishes = [(d, s) for d, s in feasible_dishes 
                      if d.get("category") in self.MEAT_CATEGORIES]
        other_dishes = [(d, s) for d, s in feasible_dishes 
                       if d.get("category") not in [self.VEGETABLE_CATEGORY] + self.MEAT_CATEGORIES]
        
        # Plan for 7 days
        plan_lines = []
        used_dishes = {}  # Track usage count: dish_name -> count
        MAX_REPEATS = 2  # Maximum times a dish can appear in a week
        
        def can_use_dish(dish_name: str) -> bool:
            """Check if a dish can still be used (hasn't exceeded max repeats)."""
            return used_dishes.get(dish_name, 0) < MAX_REPEATS
        
        def get_best_unused_dish(dish_list: List) -> Optional[tuple]:
            """Get the best unused dish from a list."""
            for dish, score in dish_list:
                dish_name = dish.get("name")
                if can_use_dish(dish_name):
                    return (dish, score)
            return None
        
        def get_best_reusable_dish(dish_list: List) -> Optional[tuple]:
            """Get the dish with lowest usage count (for reuse)."""
            available = [(d, s) for d, s in dish_list if used_dishes.get(d.get("name"), 0) < MAX_REPEATS]
            if not available:
                return None
            return min(available, key=lambda x: used_dishes.get(x[0].get("name"), 0))
        
        for day_offset in range(7):
            day_index = (start_day + day_offset) % 7
            day_name = self.CHINESE_DAYS[day_index]
            
            plan_lines.append(day_name)
            
            day_dishes = []
            
            # Ensure at least one vegetable dish
            veg_added = False
            best_veg = get_best_unused_dish(vegetable_dishes)
            if best_veg:
                dish, score = best_veg
                dish_name = dish.get("name")
                day_dishes.append(dish_name)
                used_dishes[dish_name] = used_dishes.get(dish_name, 0) + 1
                veg_added = True
            else:
                # Try to reuse if no unused available
                best_veg = get_best_reusable_dish(vegetable_dishes)
                if best_veg:
                    dish, score = best_veg
                    dish_name = dish.get("name")
                    day_dishes.append(dish_name)
                    used_dishes[dish_name] = used_dishes.get(dish_name, 0) + 1
                    veg_added = True
            
            # Ensure at least one meat/seafood dish
            meat_added = False
            best_meat = get_best_unused_dish(meat_dishes)
            if best_meat:
                dish, score = best_meat
                dish_name = dish.get("name")
                day_dishes.append(dish_name)
                used_dishes[dish_name] = used_dishes.get(dish_name, 0) + 1
                meat_added = True
            else:
                # Try to reuse if no unused available
                best_meat = get_best_reusable_dish(meat_dishes)
                if best_meat:
                    dish, score = best_meat
                    dish_name = dish.get("name")
                    day_dishes.append(dish_name)
                    used_dishes[dish_name] = used_dishes.get(dish_name, 0) + 1
                    meat_added = True
            
            # Add more dishes if available (prioritize unused dishes)
            # Try to add 1-2 more dishes per day, but only if we have unused dishes
            remaining_unused = [(d, s) for d, s in feasible_dishes 
                               if d.get("name") not in day_dishes and can_use_dish(d.get("name"))]
            
            # Sort by score descending
            remaining_unused.sort(key=lambda x: x[1], reverse=True)
            
            # Add 1-2 additional dishes (prefer unused)
            added_count = 0
            for dish, score in remaining_unused:
                if added_count >= 2:  # Limit to 2 additional dishes
                    break
                dish_name = dish.get("name")
                day_dishes.append(dish_name)
                used_dishes[dish_name] = used_dishes.get(dish_name, 0) + 1
                added_count += 1
            
            # Only reuse if we have very few dishes and need to fill the day
            # But limit reuse to maintain variety
            if len(day_dishes) < 2:
                # Try to add one more dish from any category if available
                all_available = [(d, s) for d, s in feasible_dishes 
                               if d.get("name") not in day_dishes and can_use_dish(d.get("name"))]
                if all_available:
                    all_available.sort(key=lambda x: x[1], reverse=True)
                    dish, score = all_available[0]
                    dish_name = dish.get("name")
                    day_dishes.append(dish_name)
                    used_dishes[dish_name] = used_dishes.get(dish_name, 0) + 1
            
            # Add dish names to plan
            for dish_name in day_dishes:
                plan_lines.append(dish_name)
            
            # If no dishes were added, add a placeholder
            if not day_dishes:
                plan_lines.append("(待定)")
            
            # Add empty line between days (except after last day)
            if day_offset < 6:
                plan_lines.append("")
        
        return "\n".join(plan_lines)
    
    def record_meal(self, date: str, dish_name: str):
        """Record a meal prep in the past meals CSV."""
        file_exists = os.path.exists(self.past_meals_file)
        
        os.makedirs(os.path.dirname(self.past_meals_file), exist_ok=True)
        
        mode = 'a' if file_exists else 'w'
        with open(self.past_meals_file, mode, encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['date', 'dish_name'])
            writer.writerow([date, dish_name])

