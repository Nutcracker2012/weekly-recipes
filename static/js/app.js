// Global state
let currentInventory = [];
let currentDishes = [];
let currentMealPlan = '';

// DOM Elements
const weeeTextArea = document.getElementById('weee-text');
const parseBtn = document.getElementById('parse-btn');
const inventorySection = document.getElementById('inventory-section');
const inventoryTbody = document.getElementById('inventory-tbody');
const generatePlanBtn = document.getElementById('generate-plan-btn');
const regeneratePlanBtn = document.getElementById('regenerate-plan-btn');
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

// Inventory management elements
const currentInventoryTbody = document.getElementById('current-inventory-tbody');
const addInventoryBtn = document.getElementById('add-inventory-btn');
const loadInventoryBtn = document.getElementById('load-inventory-btn');
const inventoryModal = document.getElementById('inventory-modal');
const inventoryForm = document.getElementById('inventory-form');
const closeInventoryModal = document.querySelector('.close-inventory');
const cancelInventoryBtn = document.getElementById('cancel-inventory-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDishes();
    loadPastMeals();
    loadCurrentInventory();
});

// Load current inventory
async function loadCurrentInventory() {
    try {
        const response = await fetch('/api/inventory');
        const data = await response.json();
        if (response.ok) {
            currentInventory = data.inventory;
            displayCurrentInventory(data.inventory);
        }
    } catch (error) {
        console.error('加载库存失败:', error);
    }
}

// Display current inventory
function displayCurrentInventory(inventory) {
    currentInventoryTbody.innerHTML = '';
    if (inventory.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center; color: #999;">暂无库存，请添加或解析库存</td>';
        currentInventoryTbody.appendChild(row);
        return;
    }

    inventory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.item || ''}</td>
            <td>${item.quantity || 0}</td>
            <td>${item.unit || ''}</td>
            <td>${item.category || '其他'}</td>
            <td>
                <button class="btn btn-edit" onclick="editInventoryItem('${item.item}')">编辑</button>
                <button class="btn btn-danger" onclick="deleteInventoryItem('${item.item}')">删除</button>
            </td>
        `;
        currentInventoryTbody.appendChild(row);
    });
}

// Load inventory button
loadInventoryBtn.addEventListener('click', () => {
    loadCurrentInventory();
});

// Add inventory button
addInventoryBtn.addEventListener('click', () => {
    openInventoryModal();
});

// Open inventory modal
function openInventoryModal(item = null) {
    if (item) {
        document.getElementById('inventory-modal-title').textContent = '编辑库存';
        document.getElementById('inventory-item-name-original').value = item.item;
        document.getElementById('inventory-item-name').value = item.item;
        document.getElementById('inventory-quantity').value = item.quantity || 0;
        document.getElementById('inventory-unit').value = item.unit || '';
        document.getElementById('inventory-category').value = item.category || '其他';
    } else {
        document.getElementById('inventory-modal-title').textContent = '添加库存';
        inventoryForm.reset();
        document.getElementById('inventory-item-name-original').value = '';
    }
    inventoryModal.style.display = 'block';
}

// Close inventory modal
closeInventoryModal.addEventListener('click', () => {
    inventoryModal.style.display = 'none';
});

cancelInventoryBtn.addEventListener('click', () => {
    inventoryModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === inventoryModal) {
        inventoryModal.style.display = 'none';
    }
});

// Submit inventory form
inventoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const originalName = document.getElementById('inventory-item-name-original').value;
    const itemData = {
        item: document.getElementById('inventory-item-name').value.trim(),
        quantity: parseFloat(document.getElementById('inventory-quantity').value) || 0,
        unit: document.getElementById('inventory-unit').value.trim(),
        category: document.getElementById('inventory-category').value,
    };

    try {
        let response;
        if (originalName) {
            // Update - need to delete old and add new if name changed
            if (originalName.toLowerCase() !== itemData.item.toLowerCase()) {
                // Name changed, delete old and add new
                await fetch(`/api/inventory/${encodeURIComponent(originalName)}`, {
                    method: 'DELETE',
                });
                response = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(itemData),
                });
            } else {
                // Just update
                response = await fetch(`/api/inventory/${encodeURIComponent(originalName)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(itemData),
                });
            }
        } else {
            // Create
            response = await fetch('/api/inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(itemData),
            });
        }

        const data = await response.json();
        if (response.ok) {
            inventoryModal.style.display = 'none';
            loadCurrentInventory();
        } else {
            alert('保存失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
});

// Edit inventory item
function editInventoryItem(itemName) {
    const item = currentInventory.find(i => i.item === itemName);
    if (item) {
        openInventoryModal(item);
    }
}

// Delete inventory item
async function deleteInventoryItem(itemName) {
    if (!confirm(`确定要删除 "${itemName}" 吗？`)) {
        return;
    }

    try {
        const response = await fetch(`/api/inventory/${encodeURIComponent(itemName)}`, {
            method: 'DELETE',
        });

        const data = await response.json();
        if (response.ok) {
            loadCurrentInventory();
        } else {
            alert('删除失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

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
            body: JSON.stringify({ text, save: true }),
        });

        const data = await response.json();
        if (response.ok) {
            currentInventory = data.inventory;
            displayInventory(data.inventory);
            inventorySection.style.display = 'block';
            generatePlanBtn.style.display = 'block';
            // Reload current inventory to show updated list
            loadCurrentInventory();
        } else {
            alert('解析失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
});

// Display inventory (parsed)
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
    await generateMealPlan();
});

regeneratePlanBtn.addEventListener('click', async () => {
    await generateMealPlan();
});

async function generateMealPlan() {
    try {
        const startDay = parseInt(startDaySelect.value);
        const response = await fetch('/api/generate-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                start_day: startDay,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            currentMealPlan = data.meal_plan;
            displayMealPlan(data.meal_plan);
            mealPlanSection.style.display = 'block';
            mealPlanSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('生成失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

// Display meal plan with clickable dish names
function displayMealPlan(mealPlan) {
    const lines = mealPlan.split('\n');
    let html = '';
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            html += '\n';
        } else if (['周日', '周一', '周二', '周三', '周四', '周五', '周六'].includes(trimmed)) {
            html += `<strong>${trimmed}</strong>\n`;
        } else if (trimmed !== '(待定)') {
            // Make dish names clickable
            html += `<span class="dish-name-clickable" onclick="markDishAsCooked('${trimmed}')" title="点击标记为已做">${trimmed}</span>\n`;
        } else {
            html += `${trimmed}\n`;
        }
    });
    
    mealPlanText.innerHTML = html;
}

// Mark dish as cooked
async function markDishAsCooked(dishName) {
    if (!confirm(`确定要将 "${dishName}" 标记为已做吗？\n这将自动减少相应配料的库存。`)) {
        return;
    }

    try {
        const response = await fetch('/api/past-meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dish_name: dishName,
                consume_ingredients: true,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            alert(`"${dishName}" 已标记为已做！\n库存已自动更新。`);
            loadCurrentInventory();
            loadPastMeals();
            // Regenerate meal plan to reflect changes
            await generateMealPlan();
        } else {
            alert('标记失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

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
