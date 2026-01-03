from flask import Flask, render_template, request, jsonify
import sys
import os
from datetime import datetime

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from inventory_parser import parse_weee_text
from dish_manager import DishManager
from recipe_planner import RecipePlanner

app = Flask(__name__)

# Initialize managers
dish_manager = DishManager("data/dishes.json")
recipe_planner = RecipePlanner("data/dishes.json", "data/past_meals.csv")


@app.route('/')
def index():
    """Serve the main page."""
    return render_template('index.html')


@app.route('/api/parse-inventory', methods=['POST'])
def parse_inventory():
    """Parse Weee purchase text into structured inventory."""
    try:
        data = request.get_json()
        weee_text = data.get('text', '')
        
        if not weee_text:
            return jsonify({"error": "No text provided"}), 400
        
        inventory = parse_weee_text(weee_text)
        return jsonify({"inventory": inventory}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/generate-plan', methods=['POST'])
def generate_plan():
    """Generate meal plan based on inventory."""
    try:
        data = request.get_json()
        inventory_items = data.get('inventory_items', [])
        start_day = data.get('start_day', 0)  # 0 = Sunday
        
        if not inventory_items:
            return jsonify({"error": "No inventory items provided"}), 400
        
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
    """Record a meal prep."""
    try:
        data = request.get_json()
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        dish_name = data.get('dish_name', '')
        
        if not dish_name:
            return jsonify({"error": "Dish name required"}), 400
        
        recipe_planner.record_meal(date, dish_name)
        return jsonify({"message": "Meal recorded successfully"}), 201
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


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

