import json
import os
from typing import List, Dict, Optional


class DishManager:
    """Manage dish library with CRUD operations."""
    
    VALID_CATEGORIES = ["肉类", "海鲜", "蔬菜", "豆类", "蛋类", "主食"]
    
    def __init__(self, dishes_file: str = "data/dishes.json"):
        # Make path relative to project root
        if not os.path.isabs(dishes_file):
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.dishes_file = os.path.join(project_root, dishes_file)
        else:
            self.dishes_file = dishes_file
        self._ensure_file_exists()
    
    def _ensure_file_exists(self):
        """Ensure dishes.json file exists, create if not."""
        if not os.path.exists(self.dishes_file):
            os.makedirs(os.path.dirname(self.dishes_file), exist_ok=True)
            with open(self.dishes_file, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)
    
    def load_dishes(self) -> List[Dict]:
        """Load all dishes from JSON file."""
        try:
            with open(self.dishes_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def save_dishes(self, dishes: List[Dict]):
        """Save dishes to JSON file."""
        os.makedirs(os.path.dirname(self.dishes_file), exist_ok=True)
        with open(self.dishes_file, 'w', encoding='utf-8') as f:
            json.dump(dishes, f, ensure_ascii=False, indent=2)
    
    def validate_dish(self, dish: Dict) -> tuple:
        """Validate dish structure. Returns (is_valid, error_message)."""
        if not isinstance(dish, dict):
            return False, "Dish must be a dictionary"
        
        if "name" not in dish or not dish["name"]:
            return False, "Dish must have a name"
        
        if "category" not in dish or dish["category"] not in self.VALID_CATEGORIES:
            return False, f"Category must be one of: {', '.join(self.VALID_CATEGORIES)}"
        
        if "ingredients" not in dish or not isinstance(dish["ingredients"], list):
            return False, "Dish must have ingredients as a list"
        
        if not dish["ingredients"]:
            return False, "Dish must have at least one ingredient"
        
        return True, None
    
    def get_all_dishes(self) -> List[Dict]:
        """Get all dishes."""
        return self.load_dishes()
    
    def get_dish_by_id(self, dish_id: int) -> Optional[Dict]:
        """Get a dish by ID."""
        dishes = self.load_dishes()
        for dish in dishes:
            if dish.get("id") == dish_id:
                return dish
        return None
    
    def add_dish(self, dish: Dict) -> tuple:
        """
        Add a new dish. Returns (success, error_message, dish_with_id).
        """
        is_valid, error = self.validate_dish(dish)
        if not is_valid:
            return False, error, None
        
        dishes = self.load_dishes()
        
        # Check for duplicate name
        if any(d.get("name") == dish["name"] for d in dishes):
            return False, f"Dish '{dish['name']}' already exists", None
        
        # Generate new ID
        max_id = max([d.get("id", 0) for d in dishes], default=0)
        dish["id"] = max_id + 1
        
        dishes.append(dish)
        self.save_dishes(dishes)
        
        return True, None, dish
    
    def update_dish(self, dish_id: int, dish_data: Dict) -> tuple:
        """
        Update an existing dish. Returns (success, error_message, updated_dish).
        """
        dishes = self.load_dishes()
        
        # Find dish
        dish_index = None
        for i, dish in enumerate(dishes):
            if dish.get("id") == dish_id:
                dish_index = i
                break
        
        if dish_index is None:
            return False, f"Dish with ID {dish_id} not found", None
        
        # Merge updates
        updated_dish = {**dishes[dish_index], **dish_data}
        updated_dish["id"] = dish_id  # Ensure ID doesn't change
        
        # Validate
        is_valid, error = self.validate_dish(updated_dish)
        if not is_valid:
            return False, error, None
        
        # Check for duplicate name (excluding current dish)
        if any(d.get("id") != dish_id and d.get("name") == updated_dish["name"] 
               for d in dishes):
            return False, f"Dish '{updated_dish['name']}' already exists", None
        
        dishes[dish_index] = updated_dish
        self.save_dishes(dishes)
        
        return True, None, updated_dish
    
    def delete_dish(self, dish_id: int) -> tuple:
        """
        Delete a dish. Returns (success, error_message).
        """
        dishes = self.load_dishes()
        
        original_count = len(dishes)
        dishes = [d for d in dishes if d.get("id") != dish_id]
        
        if len(dishes) == original_count:
            return False, f"Dish with ID {dish_id} not found"
        
        self.save_dishes(dishes)
        return True, None

