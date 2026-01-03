from flask import Flask, render_template, request, jsonify
import sys
import os
from datetime import datetime

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from inventory_parser import parse_weee_text
from dish_manager import DishManager
from recipe_planner import RecipePlanner
from inventory_manager import InventoryManager

app = Flask(__name__)

# Initialize managers
dish_manager = DishManager("data/dishes.json")
recipe_planner = RecipePlanner("data/dishes.json", "data/past_meals.csv")
inventory_manager = InventoryManager("data/inventory.json")


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/api/parse-inventory', methods=['POST'])
def parse_inventory():
    """Parse Weee purchase text into structured inventory and save to inventory."""
    try:
        data = request.get_json()
        weee_text = data.get('text', '')
        save_to_inventory = data.get('save', True)  # Default to saving
        
        if not weee_text:
            return jsonify({"error": "No text provided"}), 400
        
        inventory = parse_weee_text(weee_text)
        
        # Save to inventory if requested
        if save_to_inventory:
            for item in inventory:
                inventory_manager.add_item(item)
        
        return jsonify({"inventory": inventory}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-plan', methods=['POST'])
def generate_plan():
    """Generate meal plan based on current inventory."""
    try:
        data = request.get_json()
        start_day = data.get('start_day', 0)  # 0 = Sunday
        
        # Get current inventory from storage
        inventory_items = inventory_manager.get_all_items()
        
        if not inventory_items:
            return jsonify({"error": "No inventory items available. Please add inventory first."}), 400
        
        # Extract item names from inventory list
        item_names = [item.get('item', '') for item in inventory_items if item.get('item')]
        
        meal_plan = recipe_planner.generate_meal_plan(item_names, start_day)
        
        return jsonify({"meal_plan": meal_plan}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dishes', methods=['GET'])
def get_dishes():
    """Get all dishes."""
    try:
        dishes = dish_manager.get_all_dishes()
        return jsonify({"dishes": dishes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dishes', methods=['POST'])
def add_dish():
    """Add a new dish."""
    try:
        data = request.get_json()
        success, error, dish = dish_manager.add_dish(data)
        
        if success:
            return jsonify({"dish": dish}), 201
        else:
            return jsonify({"error": error}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dishes/<int:dish_id>', methods=['PUT'])
def update_dish(dish_id):
    """Update an existing dish."""
    try:
        data = request.get_json()
        success, error, dish = dish_manager.update_dish(dish_id, data)
        
        if success:
            return jsonify({"dish": dish}), 200
        else:
            return jsonify({"error": error}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/dishes/<int:dish_id>', methods=['DELETE'])
def delete_dish(dish_id):
    """Delete a dish."""
    try:
        success, error = dish_manager.delete_dish(dish_id)
        
        if success:
            return jsonify({"message": "Dish deleted successfully"}), 200
        else:
            return jsonify({"error": error}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/past-meals', methods=['POST'])
def record_meal():
    """Record a meal prep and consume ingredients."""
    try:
        data = request.get_json()
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        dish_name = data.get('dish_name', '')
        consume_ingredients = data.get('consume_ingredients', True)  # Default to consuming
        
        if not dish_name:
            return jsonify({"error": "Dish name required"}), 400
        
        # Record the meal
        recipe_planner.record_meal(date, dish_name)
        
        # Consume ingredients if requested
        consumption_results = {}
        if consume_ingredients:
            # Find the dish to get its ingredients
            dishes = dish_manager.get_all_dishes()
            dish = None
            for d in dishes:
                if d.get("name") == dish_name:
                    dish = d
                    break
            
            if dish:
                ingredients = dish.get("ingredients", [])
                consumption_results = inventory_manager.consume_ingredients(ingredients, amount=1.0)
        
        return jsonify({
            "message": "Meal recorded successfully",
            "ingredients_consumed": consumption_results
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/past-meals', methods=['GET'])
def get_past_meals():
    """Get past meals."""
    try:
        import csv
        past_meals = []
        
        past_meals_path = os.path.join(os.path.dirname(__file__), "data/past_meals.csv")
        if os.path.exists(past_meals_path):
            with open(past_meals_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                past_meals = list(reader)
        
        return jsonify({"past_meals": past_meals}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Inventory Management API
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    """Get all inventory items."""
    try:
        inventory = inventory_manager.get_all_items()
        return jsonify({"inventory": inventory}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/inventory', methods=['POST'])
def add_inventory_item():
    """Add or update an inventory item."""
    try:
        data = request.get_json()
        success, error, item = inventory_manager.add_item(data)
        
        if success:
            return jsonify({"item": item}), 201
        else:
            return jsonify({"error": error}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/inventory/<item_name>', methods=['PUT'])
def update_inventory_item(item_name):
    """Update an inventory item."""
    try:
        data = request.get_json()
        success, error, item = inventory_manager.update_item(item_name, data)
        
        if success:
            return jsonify({"item": item}), 200
        else:
            return jsonify({"error": error}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/inventory/<item_name>', methods=['DELETE'])
def delete_inventory_item(item_name):
    """Delete an inventory item."""
    try:
        success, error = inventory_manager.delete_item(item_name)
        
        if success:
            return jsonify({"message": "Item deleted successfully"}), 200
        else:
            return jsonify({"error": error}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

