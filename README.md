# Weekly Recipes Planner

A Python web application for planning weekly meals based on available ingredients and past meal prep history.

## Features

- **Inventory Parsing**: Parse Weee purchase text or tab-separated inventory data
- **Smart Recipe Matching**: Match available ingredients with dishes using partial matching
- **Weekly Meal Planning**: Generate balanced 7-day meal plans with:
  - At least one vegetable dish per day
  - At least one meat/seafood dish per day
  - Avoids recently prepared dishes (last 7 days)
- **Dish Library Management**: Add, edit, and delete dishes through the web UI
- **Chinese Day Format**: Output uses Chinese day names (周日, 周一, etc.)

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open your browser to `http://localhost:5001`

## Project Structure

```
weekly-recipes/
├── app.py                 # Flask application entry point
├── requirements.txt       # Python dependencies
├── data/
│   ├── dishes.json        # Dish library
│   └── past_meals.csv     # Historical meal prep data
├── src/
│   ├── inventory_parser.py    # Weee text parsing logic
│   ├── recipe_planner.py      # Meal planning algorithm
│   └── dish_manager.py        # Dish library management
├── static/
│   ├── css/
│   │   └── style.css      # Responsive styling
│   └── js/
│       └── app.js         # Frontend interactivity
└── templates/
    └── index.html         # Main UI template
```

## Usage

1. Paste Weee purchase text or tab-separated inventory data
2. Click "解析库存" to parse the inventory
3. Click "生成餐单" to generate a weekly meal plan
4. Manage dishes in the dish library section

## Technologies

- Python 3.9+
- Flask 3.0+
- HTML/CSS/JavaScript

