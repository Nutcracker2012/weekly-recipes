// Global state
let currentInventory = [];
let currentDishes = [];
let currentMealPlan = '';
let mealPlanData = {}; // Structured meal plan data: {day: [dishes]}
let isEditingMealPlan = false;
let cookedDishes = new Set(); // Track which dishes are marked as cooked

// DOM Elements
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

// Mark cooked modal elements
const markCookedModal = document.getElementById('mark-cooked-modal');
const closeMarkCookedModal = document.querySelector('.close-mark-cooked');
const cancelMarkCookedBtn = document.getElementById('cancel-mark-cooked-btn');

// Close mark cooked modal
if (closeMarkCookedModal) {
    closeMarkCookedModal.addEventListener('click', () => {
        markCookedModal.style.display = 'none';
    });
}

if (cancelMarkCookedBtn) {
    cancelMarkCookedBtn.addEventListener('click', () => {
        markCookedModal.style.display = 'none';
    });
}

window.addEventListener('click', (event) => {
    if (event.target === markCookedModal) {
        markCookedModal.style.display = 'none';
    }
});

// Edit meal plan dish modal elements
const editMealPlanDishModal = document.getElementById('edit-meal-plan-dish-modal');
const closeEditMealPlanDishModal = document.querySelector('.close-edit-meal-plan-dish');
const cancelEditMealPlanDishBtn = document.getElementById('cancel-edit-meal-plan-dish-btn');
const editMealPlanDishForm = document.getElementById('edit-meal-plan-dish-form');

// Close edit meal plan dish modal
if (closeEditMealPlanDishModal) {
    closeEditMealPlanDishModal.addEventListener('click', () => {
        editMealPlanDishModal.style.display = 'none';
    });
}

if (cancelEditMealPlanDishBtn) {
    cancelEditMealPlanDishBtn.addEventListener('click', () => {
        editMealPlanDishModal.style.display = 'none';
    });
}

window.addEventListener('click', (event) => {
    if (event.target === editMealPlanDishModal) {
        editMealPlanDishModal.style.display = 'none';
    }
});

// Weee import modal elements
const pasteWeeeBtn = document.getElementById('paste-weee-btn');
const weeeModal = document.getElementById('weee-modal');
const weeeTextArea = document.getElementById('weee-text');
const weeeParseBtn = document.getElementById('weee-parse-btn');
const weeeCancelBtn = document.getElementById('weee-cancel-btn');
const weeeCancelStep2Btn = document.getElementById('weee-cancel-step2-btn');
const weeeBackBtn = document.getElementById('weee-back-btn');
const weeeConfirmBtn = document.getElementById('weee-confirm-btn');
const weeePreviewTbody = document.getElementById('weee-preview-tbody');
const closeWeeeModal = document.querySelector('.close-weee');
let previewInventory = []; // Store parsed inventory for preview

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDishes();
    loadPastMeals();
    loadCurrentInventory();
    initTabs();
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
            parseMealPlan(data.meal_plan);
            // Reset cooked dishes when generating new plan
            cookedDishes.clear();
            // Ensure dishes are loaded before displaying
            if (currentDishes.length === 0) {
                await loadDishes();
            }
            displayMealPlan(false); // false = view mode
            // Show meal plan output and hint
            document.getElementById('meal-plan-output').style.display = 'block';
            document.getElementById('meal-plan-hint').style.display = 'block';
            document.getElementById('edit-plan-btn').style.display = 'inline-block';
            regeneratePlanBtn.style.display = 'inline-block';
            // Switch to meal plan tab
            switchToTab('meal-plan');
        } else {
            alert('生成失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

// Parse meal plan text into structured data
function parseMealPlan(planText) {
    const lines = planText.split('\n');
    mealPlanData = {};
    let currentDay = null;
    
    // Initialize all 7 days
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    days.forEach(day => {
        mealPlanData[day] = [];
    });
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        if (['周日', '周一', '周二', '周三', '周四', '周五', '周六'].includes(trimmed)) {
            currentDay = trimmed;
            if (!mealPlanData[currentDay]) {
                mealPlanData[currentDay] = [];
            }
        } else if (currentDay) {
            // Include all dishes, including "(待定)" placeholder
            mealPlanData[currentDay].push(trimmed);
        }
    });
}

// Display meal plan
function displayMealPlan(editMode) {
    const container = document.getElementById('meal-plan-display');
    container.innerHTML = '';
    
    if (editMode) {
        container.classList.add('editing-mode');
        // In edit mode, show the old format
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        days.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'meal-day';
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'meal-day-header';
            dayHeader.textContent = day;
            dayDiv.appendChild(dayHeader);
            
            const dishes = mealPlanData[day] || [];
            dishes.forEach((dish, index) => {
                if (dish === '(待定)') return;
                
                const dishDiv = document.createElement('div');
                dishDiv.className = 'meal-dish';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'meal-dish-input';
                input.value = dish;
                input.onchange = (e) => updateDishName(day, index, e.target.value);
                dishDiv.appendChild(input);
                
                const actions = document.createElement('div');
                actions.className = 'meal-dish-actions';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-small';
                deleteBtn.textContent = '删除';
                deleteBtn.onclick = () => deleteMealPlanDish(day, index);
                actions.appendChild(deleteBtn);
                
                dishDiv.appendChild(actions);
                dayDiv.appendChild(dishDiv);
            });
            
            const addDishDiv = document.createElement('div');
            addDishDiv.className = 'meal-day-add-dish';
            const addDishBtn = document.createElement('button');
            addDishBtn.className = 'btn btn-secondary btn-small';
            addDishBtn.textContent = '+ 添加菜品';
            addDishBtn.onclick = () => addDishToDay(day);
            addDishDiv.appendChild(addDishBtn);
            dayDiv.appendChild(addDishDiv);
            
            container.appendChild(dayDiv);
        });
    } else {
        container.classList.remove('editing-mode');
        // In view mode, show table format
        displayMealPlanTable();
    }
}

// Display meal plan as table
function displayMealPlanTable() {
    const container = document.getElementById('meal-plan-display');
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    // Create table
    const table = document.createElement('table');
    table.id = 'meal-plan-table';
    
    // Create header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>日期</th>
            <th>菜品名称</th>
            <th>类别</th>
            <th>食材清单</th>
            <th>操作</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    days.forEach(day => {
        const dishes = mealPlanData[day] || [];
        
        if (dishes.length === 0) {
            // Show placeholder row
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${day}</td>
                <td colspan="4" style="text-align: center; color: #999; font-style: italic;">(待定)</td>
            `;
            tbody.appendChild(row);
        } else {
            dishes.forEach((dish, dishIndex) => {
                if (dish === '(待定)') return;
                
                // Find dish info from currentDishes
                const dishInfo = currentDishes.find(d => d.name === dish);
                const category = dishInfo ? dishInfo.category : '未知';
                const ingredients = dishInfo ? dishInfo.ingredients : [];
                const ingredientsText = ingredients.length > 0 
                    ? ingredients.join(', ') 
                    : '无';
                
                const isCooked = cookedDishes.has(dish);
                
                const row = document.createElement('tr');
                if (isCooked) {
                    row.style.opacity = '0.6';
                    row.style.textDecoration = 'line-through';
                }
                
                // Escape single quotes in dish name for onclick
                const escapedDish = dish.replace(/'/g, "\\'");
                
                // Build action buttons
                let actionButtons = '';
                if (isCooked) {
                    actionButtons = '<span style="color: #28a745; font-weight: 600;">已做</span>';
                } else {
                    actionButtons = `
                        <button class="btn btn-primary btn-small" onclick="openMarkCookedModal('${escapedDish}', '${day}')">标记为已做</button>
                        <button class="btn btn-edit btn-small" onclick="editMealPlanDish('${day}', ${dishIndex})">编辑</button>
                        <button class="btn btn-danger btn-small" onclick="deleteMealPlanDishFromTable('${day}', ${dishIndex})">删除</button>
                    `;
                }
                
                row.innerHTML = `
                    <td>${day}</td>
                    <td>${dish}</td>
                    <td>${category}</td>
                    <td>${ingredientsText}</td>
                    <td style="display: flex; gap: 5px; flex-wrap: wrap;">
                        ${actionButtons}
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

// Update dish name
function updateDishName(day, index, newName) {
    if (mealPlanData[day] && mealPlanData[day][index] !== undefined) {
        mealPlanData[day][index] = newName.trim();
    }
}

// Delete dish from meal plan
function deleteMealPlanDish(day, index) {
    if (!confirm(`确定要删除"${mealPlanData[day][index]}"吗？`)) {
        return;
    }
    
    if (mealPlanData[day]) {
        mealPlanData[day].splice(index, 1);
        displayMealPlan(true); // Refresh in edit mode
    }
}

// Delete dish from meal plan table
function deleteMealPlanDishFromTable(day, dishIndex) {
    const dishName = mealPlanData[day] && mealPlanData[day][dishIndex];
    if (!dishName) return;
    
    if (!confirm(`确定要删除"${dishName}"吗？`)) {
        return;
    }
    
    if (mealPlanData[day]) {
        mealPlanData[day].splice(dishIndex, 1);
        // Update cookedDishes if this dish was marked as cooked
        cookedDishes.delete(dishName);
        // Refresh display
        displayMealPlan(false);
    }
}

// Edit dish in meal plan table
function editMealPlanDish(day, dishIndex) {
    const dishName = mealPlanData[day] && mealPlanData[day][dishIndex];
    if (!dishName) return;
    
    // Find dish info from currentDishes
    const dishInfo = currentDishes.find(d => d.name === dishName);
    
    // Open edit modal
    openMealPlanDishEditModal(day, dishIndex, dishName, dishInfo);
}

// Open edit meal plan dish modal
function openMealPlanDishEditModal(day, dishIndex, dishName, dishInfo) {
    document.getElementById('edit-meal-plan-day').value = day;
    document.getElementById('edit-meal-plan-dish-index').value = dishIndex;
    document.getElementById('edit-meal-plan-dish-name').value = dishName;
    
    // Set ingredients - use from dishInfo if available, otherwise empty
    const ingredients = dishInfo && dishInfo.ingredients ? dishInfo.ingredients.join(', ') : '';
    document.getElementById('edit-meal-plan-dish-ingredients').value = ingredients;
    
    editMealPlanDishModal.style.display = 'block';
}

// Submit edit meal plan dish form
if (editMealPlanDishForm) {
    editMealPlanDishForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const day = document.getElementById('edit-meal-plan-day').value;
        const dishIndex = parseInt(document.getElementById('edit-meal-plan-dish-index').value);
        const newDishName = document.getElementById('edit-meal-plan-dish-name').value.trim();
        const ingredientsText = document.getElementById('edit-meal-plan-dish-ingredients').value.trim();
        
        if (!newDishName) {
            alert('请输入菜品名称');
            return;
        }
        
        if (!ingredientsText) {
            alert('请输入食材');
            return;
        }
        
        const ingredients = ingredientsText.split(',').map(i => i.trim()).filter(i => i);
        
        if (ingredients.length === 0) {
            alert('请输入至少一个食材');
            return;
        }
        
        // Get old dish name for updating cookedDishes
        const oldDishName = mealPlanData[day] && mealPlanData[day][dishIndex];
        
        // Update meal plan data
        if (mealPlanData[day] && mealPlanData[day][dishIndex] !== undefined) {
            mealPlanData[day][dishIndex] = newDishName;
        }
        
        // Update cookedDishes if name changed
        if (oldDishName && oldDishName !== newDishName && cookedDishes.has(oldDishName)) {
            cookedDishes.delete(oldDishName);
            cookedDishes.add(newDishName);
        }
        
        // Check if dish exists in currentDishes, update or create
        const existingDish = currentDishes.find(d => d.name === newDishName);
        
        try {
            if (existingDish) {
                // Update existing dish
                const response = await fetch(`/api/dishes/${existingDish.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: newDishName,
                        category: existingDish.category, // Keep existing category
                        ingredients: ingredients,
                    }),
                });
                
                const data = await response.json();
                if (!response.ok) {
                    alert('更新菜品失败: ' + data.error);
                    return;
                }
            } else {
                // Create new dish if it doesn't exist
                const response = await fetch('/api/dishes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: newDishName,
                        category: '其他', // Default category
                        ingredients: ingredients,
                    }),
                });
                
                const data = await response.json();
                if (!response.ok) {
                    alert('创建菜品失败: ' + data.error);
                    return;
                }
            }
            
            // Reload dishes to get updated data
            await loadDishes();
            
            // Close modal
            editMealPlanDishModal.style.display = 'none';
            
            // Refresh meal plan display
            displayMealPlan(false);
        } catch (error) {
            alert('错误: ' + error.message);
        }
    });
}

// Add dish to a specific day
function addDishToDay(day) {
    // Initialize day array if it doesn't exist
    if (!mealPlanData[day]) {
        mealPlanData[day] = [];
    }
    
    // Remove placeholder if it exists
    const placeholderIndex = mealPlanData[day].indexOf('(待定)');
    if (placeholderIndex !== -1) {
        mealPlanData[day].splice(placeholderIndex, 1);
    }
    
    // Add new empty dish
    mealPlanData[day].push('');
    
    // Refresh display
    displayMealPlan(true);
    
    // Focus on the newly added input
    const container = document.getElementById('meal-plan-display');
    const dayDiv = Array.from(container.querySelectorAll('.meal-day')).find(d => 
        d.querySelector('.meal-day-header').textContent === day
    );
    if (dayDiv) {
        const inputs = dayDiv.querySelectorAll('.meal-dish-input');
        if (inputs.length > 0) {
            const lastInput = inputs[inputs.length - 1];
            lastInput.focus();
            lastInput.select();
        }
    }
}

// Enter edit mode
document.getElementById('edit-plan-btn').addEventListener('click', () => {
    isEditingMealPlan = true;
    displayMealPlan(true);
    document.getElementById('edit-plan-btn').style.display = 'none';
    document.getElementById('save-plan-btn').style.display = 'inline-block';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
});

// Cancel edit
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    if (!confirm('确定要取消编辑吗？所有修改将丢失。')) {
        return;
    }
    
    // Restore original meal plan
    parseMealPlan(currentMealPlan);
    isEditingMealPlan = false;
    displayMealPlan(false);
    document.getElementById('edit-plan-btn').style.display = 'inline-block';
    document.getElementById('save-plan-btn').style.display = 'none';
    document.getElementById('cancel-edit-btn').style.display = 'none';
});

// Save meal plan
document.getElementById('save-plan-btn').addEventListener('click', () => {
    const planName = document.getElementById('meal-plan-name').value.trim();
    
    if (!planName) {
        alert('请输入餐单名称');
        return;
    }
    
    // Convert mealPlanData back to text format
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    let planText = '';
    
    // Always save all 7 days
    days.forEach((day, index) => {
        planText += day + '\n';
        const dishes = (mealPlanData[day] || []).filter(dish => dish && dish.trim() !== '');
        if (dishes.length > 0) {
            dishes.forEach(dish => {
                planText += dish.trim() + '\n';
            });
        } else {
            // If no dishes, add placeholder
            planText += '(待定)\n';
        }
        if (index < days.length - 1) {
            planText += '\n';
        }
    });
    
    currentMealPlan = planText.trim();
    
    // Save to localStorage for now (you can implement backend saving later)
    const savedPlans = JSON.parse(localStorage.getItem('savedMealPlans') || '[]');
    savedPlans.push({
        name: planName,
        plan: currentMealPlan,
        date: new Date().toISOString()
    });
    localStorage.setItem('savedMealPlans', JSON.stringify(savedPlans));
    
    alert(`餐单"${planName}"已保存！`);
    
    // Exit edit mode
    isEditingMealPlan = false;
    displayMealPlan(false);
    document.getElementById('edit-plan-btn').style.display = 'inline-block';
    document.getElementById('save-plan-btn').style.display = 'none';
    document.getElementById('cancel-edit-btn').style.display = 'none';
});

// Open mark cooked modal
async function openMarkCookedModal(dishName, day) {
    // Find dish info
    const dishInfo = currentDishes.find(d => d.name === dishName);
    if (!dishInfo) {
        alert('找不到菜品信息');
        return;
    }
    
    const ingredients = dishInfo.ingredients || [];
    if (ingredients.length === 0) {
        alert('该菜品没有食材信息');
        return;
    }
    
    // Load current inventory
    await loadCurrentInventory();
    
    // Prepare ingredient data with current inventory info
    const ingredientData = [];
    for (const ingredient of ingredients) {
        // Find matching inventory item
        const inventoryItem = currentInventory.find(item => {
            const itemName = (item.item || '').toLowerCase();
            const ingName = ingredient.toLowerCase();
            return itemName === ingName || itemName.includes(ingName) || ingName.includes(itemName);
        });
        
        ingredientData.push({
            name: ingredient,
            inventoryItem: inventoryItem,
            defaultAmount: 1.0,
            adjustedAmount: 1.0
        });
    }
    
    // Display modal
    displayMarkCookedModal(dishName, day, ingredientData);
}

// Display mark cooked modal
function displayMarkCookedModal(dishName, day, ingredientData) {
    const modal = document.getElementById('mark-cooked-modal');
    const modalTitle = document.getElementById('mark-cooked-modal-title');
    const modalBody = document.getElementById('mark-cooked-modal-body');
    
    modalTitle.textContent = `标记为已做：${dishName}`;
    
    // Create table for ingredients
    let tableHTML = `
        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
            <table>
                <thead>
                    <tr>
                        <th>食材名称</th>
                        <th>当前库存</th>
                        <th>扣减数量</th>
                        <th>扣减后库存</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    ingredientData.forEach((item, index) => {
        const invItem = item.inventoryItem;
        const currentQty = invItem ? (invItem.quantity || 0) : 0;
        const unit = invItem ? (invItem.unit || '') : '';
        const afterQty = Math.max(0, currentQty - item.adjustedAmount);
        
        tableHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${currentQty > 0 ? `${currentQty} ${unit}` : '<span style="color: #dc3545;">无库存</span>'}</td>
                <td>
                    <input type="number" 
                           id="ingredient-amount-${index}" 
                           value="${item.adjustedAmount}" 
                           step="0.1" 
                           min="0" 
                           max="${currentQty}"
                           style="width: 80px; padding: 4px;"
                           onchange="updateIngredientAmount(${index}, ${currentQty})">
                    ${unit ? `<span style="margin-left: 5px;">${unit}</span>` : ''}
                </td>
                <td id="after-qty-${index}">${afterQty >= 0 ? `${afterQty} ${unit}` : '<span style="color: #dc3545;">不足</span>'}</td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    modalBody.innerHTML = tableHTML;
    
    // Store ingredient data in modal for later use
    modal.dataset.dishName = dishName;
    modal.dataset.day = day;
    modal.dataset.ingredientData = JSON.stringify(ingredientData);
    
    modal.style.display = 'block';
}

// Update ingredient amount in modal
function updateIngredientAmount(index, maxQty) {
    const input = document.getElementById(`ingredient-amount-${index}`);
    const amount = parseFloat(input.value) || 0;
    const adjustedAmount = Math.min(Math.max(0, amount), maxQty);
    input.value = adjustedAmount;
    
    // Update after quantity
    const afterQtyCell = document.getElementById(`after-qty-${index}`);
    const modal = document.getElementById('mark-cooked-modal');
    const ingredientData = JSON.parse(modal.dataset.ingredientData || '[]');
    
    if (ingredientData[index]) {
        ingredientData[index].adjustedAmount = adjustedAmount;
        const invItem = ingredientData[index].inventoryItem;
        const currentQty = invItem ? (invItem.quantity || 0) : 0;
        const unit = invItem ? (invItem.unit || '') : '';
        const afterQty = Math.max(0, currentQty - adjustedAmount);
        afterQtyCell.innerHTML = afterQty >= 0 ? `${afterQty} ${unit}` : '<span style="color: #dc3545;">不足</span>';
        
        // Update stored data
        modal.dataset.ingredientData = JSON.stringify(ingredientData);
    }
}

// Confirm mark as cooked
async function confirmMarkCooked() {
    const modal = document.getElementById('mark-cooked-modal');
    const dishName = modal.dataset.dishName;
    const ingredientData = JSON.parse(modal.dataset.ingredientData || '[]');
    
    // Prepare consumption data - read from input fields to get latest values
    const consumptionData = {};
    ingredientData.forEach((item, index) => {
        if (item.inventoryItem) {
            // Read the current value from the input field
            const input = document.getElementById(`ingredient-amount-${index}`);
            const amount = parseFloat(input ? input.value : item.adjustedAmount) || 0;
            consumptionData[item.inventoryItem.item] = amount;
        }
    });
    
    try {
        const response = await fetch('/api/past-meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dish_name: dishName,
                consume_ingredients: true,
                ingredient_amounts: consumptionData,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            // Mark as cooked
            cookedDishes.add(dishName);
            
            // Close modal
            modal.style.display = 'none';
            
            // Refresh display
            loadCurrentInventory();
            loadPastMeals();
            displayMealPlan(false);
            
            alert(`"${dishName}" 已标记为已做！\n库存已更新。`);
        } else {
            alert('标记失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
}

// Mark dish as cooked (old function, kept for compatibility)
async function markDishAsCooked(dishName) {
    await openMarkCookedModal(dishName, '');
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

// Tab switching functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            switchToTab(targetTab);
        });
    });
}

function switchToTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Remove active class from all buttons and contents
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Add active class to target button and content
    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`${tabName}-tab`);
    
    if (targetButton && targetContent) {
        targetButton.classList.add('active');
        targetContent.classList.add('active');
    }
}

// Open Weee import modal
pasteWeeeBtn.addEventListener('click', () => {
    openWeeeModal();
});

function openWeeeModal() {
    weeeModal.style.display = 'block';
    showWeeeStep(1);
    weeeTextArea.value = '';
    previewInventory = [];
}

// Close Weee modal
function closeWeeeModalFunc() {
    weeeModal.style.display = 'none';
    showWeeeStep(1);
    weeeTextArea.value = '';
    previewInventory = [];
}

closeWeeeModal.addEventListener('click', () => {
    closeWeeeModalFunc();
});

weeeCancelBtn.addEventListener('click', () => {
    closeWeeeModalFunc();
});

weeeCancelStep2Btn.addEventListener('click', () => {
    closeWeeeModalFunc();
});

window.addEventListener('click', (event) => {
    if (event.target === weeeModal) {
        closeWeeeModalFunc();
    }
});

// Show specific step in Weee modal
function showWeeeStep(stepNumber) {
    // Hide all steps
    document.getElementById('weee-step-1').classList.remove('active');
    document.getElementById('weee-step-2').classList.remove('active');
    document.getElementById('weee-step-1').style.display = 'none';
    document.getElementById('weee-step-2').style.display = 'none';
    
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < stepNumber) {
            step.classList.add('completed');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
        }
    });
    
    // Show target step
    if (stepNumber === 1) {
        document.getElementById('weee-step-1').classList.add('active');
        document.getElementById('weee-step-1').style.display = 'block';
    } else if (stepNumber === 2) {
        document.getElementById('weee-step-2').classList.add('active');
        document.getElementById('weee-step-2').style.display = 'block';
    }
}

// Parse Weee text (Step 1)
weeeParseBtn.addEventListener('click', async () => {
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
            body: JSON.stringify({ text, save: false }), // Don't save yet, just parse
        });

        const data = await response.json();
        if (response.ok) {
            previewInventory = data.inventory;
            if (previewInventory.length === 0) {
                alert('未能解析出任何库存项目，请检查文本格式');
                return;
            }
            displayPreviewInventory(previewInventory);
            showWeeeStep(2);
        } else {
            alert('解析失败: ' + data.error);
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
});

// Display preview inventory (Step 2)
function displayPreviewInventory(inventory) {
    weeePreviewTbody.innerHTML = '';
    if (inventory.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center; color: #999;">暂无库存项目</td>';
        weeePreviewTbody.appendChild(row);
        return;
    }

    inventory.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" value="${item.item || ''}" data-field="item" data-index="${index}"></td>
            <td><input type="number" value="${item.quantity || 0}" step="0.1" min="0" data-field="quantity" data-index="${index}"></td>
            <td><input type="text" value="${item.unit || ''}" data-field="unit" data-index="${index}"></td>
            <td>
                <select data-field="category" data-index="${index}">
                    <option value="肉类" ${item.category === '肉类' ? 'selected' : ''}>肉类</option>
                    <option value="海鲜" ${item.category === '海鲜' ? 'selected' : ''}>海鲜</option>
                    <option value="蔬菜" ${item.category === '蔬菜' ? 'selected' : ''}>蔬菜</option>
                    <option value="豆制品" ${item.category === '豆制品' ? 'selected' : ''}>豆制品</option>
                    <option value="蛋类" ${item.category === '蛋类' ? 'selected' : ''}>蛋类</option>
                    <option value="主食" ${item.category === '主食' ? 'selected' : ''}>主食</option>
                    <option value="调料" ${item.category === '调料' ? 'selected' : ''}>调料</option>
                    <option value="其他" ${item.category === '其他' || !item.category ? 'selected' : ''}>其他</option>
                </select>
            </td>
            <td>
                <button class="btn btn-danger" onclick="removePreviewItem(${index})">删除</button>
            </td>
        `;
        weeePreviewTbody.appendChild(row);
    });

    // Add event listeners for input changes
    weeePreviewTbody.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('change', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            const field = e.target.getAttribute('data-field');
            if (previewInventory[index]) {
                if (field === 'quantity') {
                    previewInventory[index][field] = parseFloat(e.target.value) || 0;
                } else {
                    previewInventory[index][field] = e.target.value.trim();
                }
            }
        });
    });
}

// Remove item from preview
function removePreviewItem(index) {
    if (confirm('确定要删除这个项目吗？')) {
        previewInventory.splice(index, 1);
        displayPreviewInventory(previewInventory);
    }
}

// Back to step 1
weeeBackBtn.addEventListener('click', () => {
    showWeeeStep(1);
});

// Confirm and add to inventory (Step 2)
weeeConfirmBtn.addEventListener('click', async () => {
    if (previewInventory.length === 0) {
        alert('没有可添加的库存项目');
        return;
    }

    try {
        // Add each item to inventory
        let successCount = 0;
        let errorCount = 0;
        
        for (const item of previewInventory) {
            try {
                const response = await fetch('/api/inventory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(item),
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }

        if (successCount > 0) {
            alert(`成功添加 ${successCount} 个库存项目${errorCount > 0 ? `，${errorCount} 个项目添加失败` : ''}`);
            closeWeeeModalFunc();
            loadCurrentInventory();
            switchToTab('inventory');
        } else {
            alert('添加失败，请重试');
        }
    } catch (error) {
        alert('错误: ' + error.message);
    }
});
