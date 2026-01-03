import json
import os
from typing import List, Dict, Optional


class InventoryManager:
    """Manage inventory with CRUD operations."""
    
    def __init__(self, inventory_file: str = "data/inventory.json"):
        # Make path relative to project root
        if not os.path.isabs(inventory_file):
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.inventory_file = os.path.join(project_root, inventory_file)
        else:
            self.inventory_file = inventory_file
        self._ensure_file_exists()
    
    def _ensure_file_exists(self):
        """Ensure inventory.json file exists, create if not."""
        if not os.path.exists(self.inventory_file):
            os.makedirs(os.path.dirname(self.inventory_file), exist_ok=True)
            with open(self.inventory_file, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False, indent=2)
    
    def load_inventory(self) -> List[Dict]:
        """Load all inventory items from JSON file."""
        try:
            with open(self.inventory_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def save_inventory(self, inventory: List[Dict]):
        """Save inventory to JSON file."""
        os.makedirs(os.path.dirname(self.inventory_file), exist_ok=True)
        with open(self.inventory_file, 'w', encoding='utf-8') as f:
            json.dump(inventory, f, ensure_ascii=False, indent=2)
    
    def get_all_items(self) -> List[Dict]:
        """Get all inventory items."""
        return self.load_inventory()
    
    def get_item_by_name(self, item_name: str) -> Optional[Dict]:
        """Get an inventory item by name."""
        inventory = self.load_inventory()
        for item in inventory:
            if item.get("item", "").lower() == item_name.lower():
                return item
        return None
    
    def add_item(self, item_data: Dict) -> tuple:
        """
        Add a new inventory item or update existing one.
        Returns (success, error_message, item).
        """
        if "item" not in item_data or not item_data["item"]:
            return False, "Item name is required", None
        
        inventory = self.load_inventory()
        item_name = item_data["item"]
        
        # Check if item already exists
        existing_item = None
        existing_index = None
        for i, item in enumerate(inventory):
            if item.get("item", "").lower() == item_name.lower():
                existing_item = item
                existing_index = i
                break
        
        if existing_item:
            # Update existing item (merge quantities if same unit, otherwise replace)
            if existing_item.get("unit") == item_data.get("unit"):
                # Add quantities
                existing_item["quantity"] = existing_item.get("quantity", 0) + item_data.get("quantity", 0)
            else:
                # Replace with new data
                existing_item.update(item_data)
            inventory[existing_index] = existing_item
            self.save_inventory(inventory)
            return True, None, existing_item
        else:
            # Add new item
            new_item = {
                "item": item_data.get("item"),
                "quantity": item_data.get("quantity", 0),
                "unit": item_data.get("unit", "包"),
                "category": item_data.get("category", "其他")
            }
            if "weight" in item_data:
                new_item["weight"] = item_data["weight"]
            
            inventory.append(new_item)
            self.save_inventory(inventory)
            return True, None, new_item
    
    def update_item(self, item_name: str, updates: Dict) -> tuple:
        """
        Update an inventory item.
        Returns (success, error_message, updated_item).
        """
        inventory = self.load_inventory()
        
        for i, item in enumerate(inventory):
            if item.get("item", "").lower() == item_name.lower():
                item.update(updates)
                # Ensure item name doesn't change
                item["item"] = item_name
                inventory[i] = item
                self.save_inventory(inventory)
                return True, None, item
        
        return False, f"Item '{item_name}' not found", None
    
    def delete_item(self, item_name: str) -> tuple:
        """
        Delete an inventory item.
        Returns (success, error_message).
        """
        inventory = self.load_inventory()
        original_count = len(inventory)
        
        inventory = [item for item in inventory 
                    if item.get("item", "").lower() != item_name.lower()]
        
        if len(inventory) == original_count:
            return False, f"Item '{item_name}' not found"
        
        self.save_inventory(inventory)
        return True, None
    
    def decrease_item_quantity(self, item_name: str, amount: float) -> tuple:
        """
        Decrease item quantity by amount.
        Returns (success, error_message, updated_item).
        """
        inventory = self.load_inventory()
        
        for i, item in enumerate(inventory):
            if item.get("item", "").lower() == item_name.lower():
                current_qty = item.get("quantity", 0)
                new_qty = max(0, current_qty - amount)  # Don't go below 0
                item["quantity"] = new_qty
                inventory[i] = item
                self.save_inventory(inventory)
                return True, None, item
        
        return False, f"Item '{item_name}' not found", None
    
    def consume_ingredients(self, ingredients: List[str], amount: float = 1.0) -> Dict[str, tuple]:
        """
        Consume ingredients (decrease quantity) when a dish is cooked.
        Uses partial matching to find inventory items.
        Returns dict mapping ingredient_name -> (success, error_message, updated_item).
        """
        results = {}
        inventory = self.load_inventory()
        
        for ingredient in ingredients:
            # Try exact match first
            matched_item = None
            for item in inventory:
                item_name = item.get("item", "").lower()
                ingredient_lower = ingredient.lower()
                
                # Exact match
                if item_name == ingredient_lower:
                    matched_item = item
                    break
                
                # Partial match: ingredient contains item name or vice versa
                if ingredient_lower in item_name or item_name in ingredient_lower:
                    matched_item = item
                    break
            
            if matched_item:
                success, error, updated_item = self.decrease_item_quantity(matched_item.get("item"), amount)
                results[ingredient] = (success, error, updated_item)
            else:
                results[ingredient] = (False, f"'{ingredient}' not found in inventory", None)
        
        return results

