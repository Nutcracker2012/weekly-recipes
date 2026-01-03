// Global state
let currentInventory = [];
let currentDishes = [];

// DOM Elements
const weeeTextArea = document.getElementById('weee-text');
const parseBtn = document.getElementById('parse-btn');
const inventorySection = document.getElementById('inventory-section');
const inventoryTbody = document.getElementById('inventory-tbody');
const generatePlanBtn = document.getElementById('generate-plan-btn');
const mealPlanSection = document.getElementById('meal-plan-section');
const mealPlanText = document.getElementById('meal-plan-text');
const startDaySelect = document.getElementById('start-day');
const dishesTbody = document.getElementById('dishes-tbody');
const addDishBtn = document.getElementById('add-dish-btn');
const dishModal = document.getElementById('dish-modal');
const dishForm = document.getElementById('dish-form');
const modalTitle = document.getElementById('modal-title');
const cancelBtn = document.getElementById('cancel-btn');
const closeModal = document.querySelector('.close');
const pastMealsTbody = document.getElementById('past-meals-tbody');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDishes();
    loadPastMeals();
});

// Parse inventory
parseBtn.addEventListener('click', async () => {
    const text = weeeTextArea.value.trim();
    if (!text) {
        alert('请输入 Weee 购买文本');
        return;
    }

    try {
        const response = await fetch('/api/parse-inventory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        const data = await response.json();
        if (response.ok) {
            currentInventory = data.inventory;
            displayInventory(data.inventory);
            inventorySection.style.display = 'block';
            generatePlanBtn.style.display = 'block';
        } else {
            alert('解析失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
});

// Display inventory
function displayInventory(inventory) {
    inventoryTbody.innerHTML = '';
    inventory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.item || ''}</td>
            <td>${item.quantity || ''}</td>
            <td>${item.unit || ''}</td>
            <td>${item.category || '其他'}</td>
        `;
        inventoryTbody.appendChild(row);
    });
}

// Generate meal plan
generatePlanBtn.addEventListener('click', async () => {
    if (currentInventory.length === 0) {
        alert('请先解析库存');
        return;
    }

    try {
        const startDay = parseInt(startDaySelect.value);
        const response = await fetch('/api/generate-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inventory_items: currentInventory,
                start_day: startDay,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            mealPlanText.textContent = data.meal_plan;
            mealPlanSection.style.display = 'block';
            mealPlanSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('生成失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
});

// Load dishes
async function loadDishes() {
    try {
        const response = await fetch('/api/dishes');
        const data = await response.json();
        if (response.ok) {
            currentDishes = data.dishes;
            displayDishes(data.dishes);
        }
    } catch (error) {
        console.error('加载菜品失败:', error);
    }
}

// Display dishes
function displayDishes(dishes) {
    dishesTbody.innerHTML = '';
    dishes.forEach(dish => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${dish.id}</td>
            <td>${dish.name}</td>
            <td>${dish.category}</td>
            <td>${dish.ingredients.join(', ')}</td>
            <td>
                <button class="btn btn-edit" onclick="editDish(${dish.id})">编辑</button>
                <button class="btn btn-danger" onclick="deleteDish(${dish.id})">删除</button>
            </td>
        `;
        dishesTbody.appendChild(row);
    });
}

// Add dish
addDishBtn.addEventListener('click', () => {
    openDishModal();
});

// Open dish modal
function openDishModal(dish = null) {
    if (dish) {
        modalTitle.textContent = '编辑菜品';
        document.getElementById('dish-id').value = dish.id;
        document.getElementById('dish-name').value = dish.name;
        document.getElementById('dish-category').value = dish.category;
        document.getElementById('dish-ingredients').value = dish.ingredients.join(', ');
    } else {
        modalTitle.textContent = '添加菜品';
        dishForm.reset();
        document.getElementById('dish-id').value = '';
    }
    dishModal.style.display = 'block';
}

// Close modal
closeModal.addEventListener('click', () => {
    dishModal.style.display = 'none';
});

cancelBtn.addEventListener('click', () => {
    dishModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === dishModal) {
        dishModal.style.display = 'none';
    }
});

// Submit dish form
dishForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dishId = document.getElementById('dish-id').value;
    const dishData = {
        name: document.getElementById('dish-name').value.trim(),
        category: document.getElementById('dish-category').value,
        ingredients: document.getElementById('dish-ingredients').value
            .split(',')
            .map(i => i.trim())
            .filter(i => i),
    };

    try {
        let response;
        if (dishId) {
            // Update
            response = await fetch(`/api/dishes/${dishId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dishData),
            });
        } else {
            // Create
            response = await fetch('/api/dishes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dishData),
            });
        }

        const data = await response.json();
        if (response.ok) {
            dishModal.style.display = 'none';
            loadDishes();
        } else {
            alert('保存失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
});

// Edit dish
function editDish(dishId) {
    const dish = currentDishes.find(d => d.id === dishId);
    if (dish) {
        openDishModal(dish);
    }
}

// Delete dish
async function deleteDish(dishId) {
    if (!confirm('确定要删除这个菜品吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/dishes/${dishId}`, {
            method: 'DELETE',
        });

        const data = await response.json();
        if (response.ok) {
            loadDishes();
        } else {
            alert('删除失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

// Load past meals
async function loadPastMeals() {
    try {
        const response = await fetch('/api/past-meals');
        const data = await response.json();
        if (response.ok) {
            displayPastMeals(data.past_meals);
        }
    } catch (error) {
        console.error('加载历史记录失败:', error);
    }
}

// Display past meals
function displayPastMeals(meals) {
    pastMealsTbody.innerHTML = '';
    if (meals.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="2" style="text-align: center; color: #999;">暂无记录</td>';
        pastMealsTbody.appendChild(row);
        return;
    }

    // Show most recent first
    meals.reverse().forEach(meal => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${meal.date || ''}</td>
            <td>${meal.dish_name || ''}</td>
        `;
        pastMealsTbody.appendChild(row);
    });
}

