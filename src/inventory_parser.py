import re
from typing import List, Dict, Optional


# Category mapping based on ingredient keywords
CATEGORY_KEYWORDS = {
    "肉类": ["肉", "排骨", "鸡", "鸭", "鹅", "牛", "羊", "猪", "鱼", "虾", "蟹", "贝", "翅", "腿", "胸", "咸肉"],
    "海鲜": ["鱼", "虾", "蟹", "贝", "花甲", "扇贝", "三文鱼", "带鱼", "鱿鱼", "章鱼"],
    "蔬菜": ["菜", "白菜", "菠菜", "青菜", "韭菜", "芹菜", "莴笋", "萝卜", "胡萝卜", "土豆", "地瓜", "红薯", "香菇", "蘑菇", "葱", "蒜", "姜", "辣椒", "茄子", "黄瓜", "西红柿", "西兰花", "花菜", "包菜", "卷心菜", "高丽菜", "空心菜", "毛豆", "青豆", "豆芽", "丝瓜", "冬瓜", "南瓜", "芦笋", "乌笋", "扁尖笋"],
    "豆制品": ["豆腐", "豆干", "香干", "百叶", "面筋", "腐竹", "豆皮", "豆泡", "油豆腐"],
    "蛋类": ["蛋", "鸡蛋", "鸭蛋", "鹌鹑蛋"],
    "主食": ["米", "面", "粉", "饺子", "包子", "馒头", "饼", "面包"],
    "调料": ["油", "盐", "酱", "醋", "糖", "淀粉", "蚝油", "生抽", "老抽", "料酒", "调料", "酸菜"]
}


def categorize_ingredient(ingredient_name: str) -> str:
    """Categorize ingredient based on name keywords."""
    ingredient_lower = ingredient_name.lower()
    
    # Check each category
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in ingredient_name:
                # Special handling: if it contains both meat and seafood keywords, prioritize seafood
                if category == "肉类" and any(k in ingredient_name for k in ["鱼", "虾", "蟹", "贝"]):
                    continue
                return category
    
    # Default to "其他" if no match
    return "其他"


def parse_weee_text(text: str) -> List[Dict[str, any]]:
    """
    Parse unstructured Weee purchase text into structured inventory.
    
    Supports two formats:
    1. Tab-separated table format (from spreadsheet):
       Ingredient Name	Quantity	Unit	Category
       排骨	1	磅	肉类
    
    2. Weee text format:
       weee_牧民人家 奶疙瘩 原味 400 克
       单价: $5.79 |数量: 1
    
    Returns list of inventory items with item, quantity, unit, category.
    """
    text = text.strip()
    
    # Check if it's tab-separated table format
    if '\t' in text or (text.count('\t') > 0 or any(line.count('\t') >= 2 for line in text.split('\n')[:3])):
        return parse_table_format(text)
    
    # Otherwise parse as Weee format
    return parse_weee_format(text)


def parse_table_format(text: str) -> List[Dict[str, any]]:
    """Parse tab-separated table format."""
    inventory = []
    lines = text.strip().split('\n')
    
    # Skip header if present
    start_idx = 0
    if lines and ('Ingredient Name' in lines[0] or '食材名称' in lines[0] or 'Item' in lines[0]):
        start_idx = 1
    
    for line in lines[start_idx:]:
        line = line.strip()
        if not line:
            continue
        
        # Split by tab or multiple spaces
        parts = re.split(r'\t+|\s{2,}', line)
        if len(parts) < 3:
            # Try single space split
            parts = line.split()
        
        if len(parts) >= 3:
            item_name = parts[0].strip()
            quantity_str = parts[1].strip()
            unit = parts[2].strip()
            category = parts[3].strip() if len(parts) > 3 else categorize_ingredient(item_name)
            
            # Parse quantity (supports decimals)
            try:
                quantity = float(quantity_str)
            except ValueError:
                quantity = 1
            
            inventory.append({
                "item": item_name,
                "quantity": quantity,
                "unit": unit,
                "category": category
            })
    
    return inventory


def parse_weee_format(text: str) -> List[Dict[str, any]]:
    """Parse Weee text format."""
    inventory = []
    lines = text.strip().split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Look for lines starting with "weee_"
        if line.startswith('weee_'):
            # Extract item information
            item_info = parse_item_line(line)
            
            # Look for quantity in next line
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                quantity_info = parse_quantity_line(next_line)
                
                if item_info:
                    item_info.update(quantity_info)
                    # Add category
                    if item_info.get("item"):
                        item_info["category"] = categorize_ingredient(item_info["item"])
                    inventory.append(item_info)
                    i += 2
                    continue
        
        i += 1
    
    return inventory


def parse_item_line(line: str) -> Optional[Dict[str, any]]:
    """Parse a line starting with 'weee_' to extract item name, unit, and weight."""
    # Remove 'weee_' prefix
    content = line[5:].strip()
    
    # Pattern: brand name(s) + item name + optional flavor/spec + optional weight/unit
    # Try to extract weight/unit first (pattern: number + 克/斤/两/磅/盎司)
    weight_unit_match = re.search(r'(\d+(?:\.\d+)?)\s*(克|斤|两|磅|盎司|kg|g|oz|lb)', content)
    weight = None
    unit = None
    if weight_unit_match:
        weight = weight_unit_match.group(0)
        unit = weight_unit_match.group(2)
        # Normalize unit
        if unit in ['kg', 'g']:
            unit = '克' if unit == 'g' else '千克'
        elif unit in ['oz', 'lb']:
            unit = '盎司' if unit == 'oz' else '磅'
        # Remove weight from content
        content = content[:weight_unit_match.start()].strip()
    
    # Check for explicit unit mentions (个, 把, 包, etc.)
    unit_keywords = {
        '个': ['个'],
        '把': ['把'],
        '包': ['包', '袋'],
        '盒': ['盒'],
        '瓶': ['瓶'],
        '磅': ['磅'],
        '盎司': ['盎司'],
        '克': ['克'],
        '斤': ['斤']
    }
    
    if not unit:
        for u, keywords in unit_keywords.items():
            for keyword in keywords:
                if keyword in content:
                    unit = u
                    break
            if unit:
                break
    
    # Split by spaces to get parts
    parts = content.split()
    
    if not parts:
        return None
    
    # Item name extraction - try to find the main ingredient name
    # Common patterns:
    # 1. Brand + ItemName (e.g., "台湾高丽菜 卷心菜" -> "卷心菜")
    # 2. Brand + ItemName + Spec (e.g., "牧民人家 奶疙瘩 原味" -> "奶疙瘩")
    # 3. ItemName + Spec (e.g., "玉子豆腐 日式豆腐" -> "玉子豆腐")
    
    item_name = None
    
    # Strategy: Look for common ingredient keywords
    ingredient_patterns = [
        r'(排骨|鸡胸肉|鸡翅|牛肉|咸肉|青江菜|菠菜|莴笋|白菜|香菇|毛豆|大白菜|青葱|韭菜|空心菜|面筋|百叶|蚝油|酸菜|淀粉|地瓜粉|红薯淀粉)',
        r'([^\\s]+(?:肉|菜|豆|菇|葱|蒜|姜|鱼|虾|蟹|贝|蛋|米|面|粉|油|盐|酱|醋|糖|调料))',
    ]
    
    for pattern in ingredient_patterns:
        match = re.search(pattern, content)
        if match:
            item_name = match.group(1)
            break
    
    # Fallback: use the last meaningful part (skip common specifiers)
    if not item_name:
        specifiers = ['原味', '日式', '台湾', '新鲜', '嫩', '大', '小', '1', '2', '3', '4', '5']
        for j in range(len(parts) - 1, -1, -1):
            part = parts[j]
            if part not in specifiers and len(part) > 1:
                item_name = part
                break
    
    # Final fallback
    if not item_name and parts:
        item_name = parts[-1]
    
    # Infer unit if not found
    if not unit:
        unit = infer_unit(content, weight)
    
    result = {
        "item": item_name,
        "unit": unit,
    }
    
    if weight:
        result["weight"] = weight
    
    return result


def parse_quantity_line(line: str) -> Dict[str, any]:
    """Parse quantity from a line like '单价: $5.79 |数量: 1' or '数量: 1.5'."""
    quantity = 1  # default
    
    # Look for "数量: X" pattern (supports decimals)
    quantity_match = re.search(r'数量:\s*(\d+(?:\.\d+)?)', line)
    if quantity_match:
        quantity = float(quantity_match.group(1))
    
    return {"quantity": quantity}


def infer_unit(content: str, weight: Optional[str]) -> str:
    """Infer unit from content and weight information."""
    # Check for explicit unit mentions
    if '个' in content:
        return '个'
    if '把' in content:
        return '把'
    if '包' in content or '袋' in content:
        return '包'
    if '盒' in content:
        return '盒'
    if '瓶' in content:
        return '瓶'
    if '磅' in content:
        return '磅'
    if '盎司' in content:
        return '盎司'
    
    # If weight is specified, infer unit from weight
    if weight:
        if '克' in weight or 'g' in weight.lower():
            return '克'
        if '斤' in weight:
            return '斤'
        if '磅' in weight or 'lb' in weight.lower():
            return '磅'
        if '盎司' in weight or 'oz' in weight.lower():
            return '盎司'
    
    # Default
    return '包'


if __name__ == "__main__":
    # Test with example text
    test_text = """weee_牧民人家 奶疙瘩 原味 400 克
单价: $5.79 |数量: 1
weee_台湾高丽菜 卷心菜 1 个
单价: $2.99 |数量: 1
weee_中华 玉子豆腐 日式豆腐 245 克
单价: $2.28 |数量: 1"""
    
    result = parse_weee_text(test_text)
    for item in result:
        print(item)
