"""
Create swap pairs for all orphaned snack_items (items not in any swap pair).

For each orphaned item:
1. Classify as HERO (low-cal swap) or ENEMY (high-cal original)
2. Match heroes to existing enemies (or create new enemy items)
3. Match enemies to existing heroes (or flag if no hero exists)

Run: python3 scripts/create_orphan_swap_pairs.py
"""
import sqlite3
import os
import re
import uuid

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "bulletproof_body.db")

# ── Category mapping by subcategory ──────────────────────────────────────────
SUBCATEGORY_TO_CRAVING = {
    "dairy": "Dairy",
    "beverage": "Beverage",
    "cereal": "Cereal",
    "frozen_meal": "Frozen Meal",
    "pasta_grain": "Pasta & Grain",
    "spread": "Spread",
    "condiment": "Condiment",
    "sweetener": "Sweetener",
    "supplement": "Protein",  # protein powders etc
    "protein": "Protein",
    "precooked_protein": "Protein",
    "bread_wrap": "Bread & Wrap",
    "frozen_fruit": "Frozen Fruit",
    "fresh_fruit": "Frozen Fruit",
    "creamer": "Creamer",
    "cooking_oil": "Savory Cooking",
}

# ── Enemy definitions: mapping (craving) -> existing enemy ID ────────────────
# These are the "standard enemies" each hero category maps to.
# We pick the most representative enemy already in the DB.
CRAVING_TO_ENEMY = {
    # Dairy
    "Dairy": {
        "yogurt": None,  # will match by keyword
        "cottage_cheese": "good-culture-whole-milk-classic-cottage-cheese-4",
        "string_cheese": "galbani-whole-string-orig",
        "cream_cheese": "philadelphia-original-cream-cheese",
        "cheese_slice": "kraft-singles-american-cheese",
        "shredded_cheese": "sargento-shredded-mild-cheddar-regular",
        "default": "good-culture-whole-milk-classic-cottage-cheese-4",
    },
    # Beverage
    "Beverage": {
        "beer": "lagunitas-lagunitas-ipa",
        "light_beer": "budweiser-budweiser-lager",
        "seltzer": "budweiser-budweiser-lager",
        "wine": "lagunitas-lagunitas-ipa",
        "cocktail": "lagunitas-lagunitas-ipa",
        "spirit": "lagunitas-lagunitas-ipa",
        "soda": "cocacola-orig",
        "juice": "generic-orange-juice-not-from-concentrate",
        "energy_drink": "cocacola-orig",
        "protein_shake": "nesquik-chocolate-orig",
        "chocolate_milk": "nesquik-chocolate-orig",
        "water": None,  # skip zero-cal waters
        "default": "cocacola-orig",
    },
    # Cereal
    "Cereal": {
        "magic_spoon": "frostedflakes-orig",
        "high_protein": "frostedflakes-orig",
        "oatmeal": "frostedflakes-orig",
        "granola": "frostedflakes-orig",
        "regular": "frostedflakes-orig",
        "default": "frostedflakes-orig",
    },
    # Frozen Meal
    "Frozen Meal": {
        "pizza": "digiorno-rising-crust-pepperoni-pizza",
        "mac_cheese": "stouffers-mac-cheese-12oz-box",
        "breakfast": "digiorno-rising-crust-pepperoni-pizza",
        "bowl": "stouffers-mac-cheese-12oz-box",
        "default": "digiorno-rising-crust-pepperoni-pizza",
    },
    # Pasta & Grain
    "Pasta & Grain": {
        "default": "linguine-orig",
    },
    # Spread
    "Spread": {
        "peanut_butter": "peanutbutter-regular-orig",
        "almond_butter": "peanutbutter-regular-orig",
        "butter": "land-olakes-salted-butter",
        "oil": "grocery_olive_oil_2tbsp_orig",
        "default": "peanutbutter-regular-orig",
    },
    # Condiment
    "Condiment": {
        "ranch": "ranch-dressing-orig",
        "dressing": "ranch-dressing-orig",
        "mayo": "kraft-real-mayonnaise",
        "bbq": "sweet-baby-rays-original-barbecue-sauce",
        "ketchup": "heinz-tomato-ketchup",
        "hot_sauce": "sweet-baby-rays-original-barbecue-sauce",
        "soy_sauce": "stir-fry-sauce-orig",
        "stir_fry": "stir-fry-sauce-orig",
        "teriyaki": "marinade-generic-orig",
        "default": "ranch-dressing-orig",
    },
    # Sweetener
    "Sweetener": {
        "sugar": "cane-sugar-orig",
        "maple_syrup": "365-whole-foods-organic-maple-syrup",
        "chocolate_chips": "cane-sugar-orig",
        "default": "cane-sugar-orig",
    },
    # Protein
    "Protein": {
        "whey": "nesquik-chocolate-orig",
        "shake": "nesquik-chocolate-orig",
        "jerky": "slimjim-monster-orig",
        "deli_turkey": "bacon-regular-orig",
        "chicken": "generic-usda-ground-beef-8020-raw",
        "beef": "generic-usda-ground-beef-8020-raw",
        "fish": "generic-usda-ground-beef-8020-raw",
        "egg": "generic-usda-large-whole-egg-raw",
        "hot_dog": "oscar-mayer-classic-wieners",
        "sausage": "oscar-mayer-classic-wieners",
        "default": "generic-usda-ground-beef-8020-raw",
    },
    # Bread & Wrap
    "Bread & Wrap": {
        "wrap": "mission-large-tortilla-orig",
        "bread": "bread-regular-orig",
        "bagel": "sara-plain-bagel-orig",
        "default": "mission-large-tortilla-orig",
    },
    # Frozen Fruit
    "Frozen Fruit": {
        "default": "sambazon-organic-acai-smoothie-packs-original-blend",
    },
    # Creamer
    "Creamer": {
        "default": "coffeemate-french-vanilla-orig",
    },
    # Savory Cooking
    "Savory Cooking": {
        "default": "grocery_olive_oil_2tbsp_orig",
    },
    # Snack-category items
    "Salty & Crunchy": {
        "chips": "lays-classic-orig",
        "popcorn": "orville-moviebutter-orig",
        "crackers": "cheezit-original-orig",
        "pretzels": "rold-gold-tiny-twists-orig",
        "default": "lays-classic-orig",
    },
    "Frozen Treat": {
        "ice_cream_bar": "drumstick-classic-orig",
        "ice_cream": "haagendazs-vanilla-orig",
        "default": "drumstick-classic-orig",
    },
    "Chewy/Gummy": {
        "fruit_snack": "haribo-goldbears-orig",
        "dried_fruit": "generic-dried-pineapple-sweetened",
        "fruit_leather": "haribo-goldbears-orig",
        "candy": "haribo-goldbears-orig",
        "dates": "haribo-goldbears-orig",
        "default": "haribo-goldbears-orig",
    },
    "Chocolate Fix": {
        "default": "snickers-orig",
    },
    "Sweet Crunch": {
        "bar": "granola-bars-orig",
        "default": "granola-bars-orig",
    },
}

# ── Swap title templates ─────────────────────────────────────────────────────
CRAVING_TO_TITLE = {
    "Dairy": "Dairy Upgrade",
    "Beverage": "Drink Upgrade",
    "Cereal": "Cereal Upgrade",
    "Frozen Meal": "Frozen Meal Upgrade",
    "Pasta & Grain": "Grain Upgrade",
    "Spread": "Spread Upgrade",
    "Condiment": "Condiment Upgrade",
    "Sweetener": "Sweetener Upgrade",
    "Protein": "Protein Upgrade",
    "Bread & Wrap": "Bread Upgrade",
    "Frozen Fruit": "Smoothie Upgrade",
    "Creamer": "Creamer Upgrade",
    "Savory Cooking": "Cooking Upgrade",
    "Salty & Crunchy": "Snack Upgrade",
    "Frozen Treat": "Frozen Treat Upgrade",
    "Chewy/Gummy": "Sweet Snack Upgrade",
    "Chocolate Fix": "Chocolate Upgrade",
    "Sweet Crunch": "Bar Upgrade",
}

CRAVING_TO_CONTEXT = {
    "Dairy": "When you want something creamy and satisfying",
    "Beverage": "When you need a drink",
    "Cereal": "When you want a bowl of cereal",
    "Frozen Meal": "When you need a quick frozen meal",
    "Pasta & Grain": "When you want a carb base for your meal",
    "Spread": "When you want to spread something on toast or a snack",
    "Condiment": "When you want to add flavor to your food",
    "Sweetener": "When you need something sweet in your recipe",
    "Protein": "When you need a protein-packed option",
    "Bread & Wrap": "When you want bread or a wrap",
    "Frozen Fruit": "When you want a smoothie or frozen fruit",
    "Creamer": "When you want creamer in your coffee",
    "Savory Cooking": "When you need cooking oil or fat",
    "Salty & Crunchy": "When you want something salty and crunchy",
    "Frozen Treat": "When you want a frozen treat after dinner",
    "Chewy/Gummy": "When you want something chewy and sweet",
    "Chocolate Fix": "When you need a chocolate fix",
    "Sweet Crunch": "When you want a sweet crunchy snack or bar",
}


def classify_item(item):
    """Classify an orphaned item as HERO or ENEMY and determine its sub-type."""
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()
    brand_lower = brand.lower()

    # Items that are clearly informational/educational, not real foods
    if item_id.startswith("na-") or "THE MATH" in name or "THE REAL ISSUE" in name:
        return None, None, None  # Skip these

    # Zero-calorie waters and sparkling waters are heroes for soda
    if calories == 0 and any(w in name_lower for w in ["water", "sparkling", "seltzer"]):
        if "tonic" not in name_lower:
            return "HERO", "Beverage", "water"

    # Zero-calorie sodas/drinks → heroes for soda
    if calories == 0 and any(w in name_lower for w in ["zero sugar", "diet", "zero calorie", "zero cal"]):
        return "HERO", "Beverage", "soda"

    # Energy drinks with < 15 cal → heroes
    if calories <= 15 and any(w in name_lower for w in ["energy drink", "energy"]) and category == "grocery":
        return "HERO", "Beverage", "energy_drink"

    # ── SNACK CATEGORY ITEMS ──
    if category == "snack":
        return classify_snack_item(item)

    # ── GROCERY CATEGORY ITEMS ──
    if subcategory == "dairy":
        return classify_dairy(item)
    elif subcategory == "beverage":
        return classify_beverage(item)
    elif subcategory == "cereal":
        return classify_cereal(item)
    elif subcategory == "frozen_meal":
        return classify_frozen_meal(item)
    elif subcategory == "pasta_grain":
        return classify_pasta_grain(item)
    elif subcategory in ("spread",):
        return classify_spread(item)
    elif subcategory == "condiment":
        return classify_condiment(item)
    elif subcategory == "sweetener":
        return classify_sweetener(item)
    elif subcategory == "supplement":
        return classify_supplement(item)
    elif subcategory in ("protein", "precooked_protein"):
        return classify_protein(item)
    elif subcategory == "bread_wrap":
        return classify_bread_wrap(item)
    elif subcategory in ("frozen_fruit", "fresh_fruit"):
        return "HERO", "Frozen Fruit", "default"
    elif subcategory == "creamer":
        return "HERO", "Creamer", "default"
    elif subcategory == "cooking_oil":
        return classify_cooking_oil(item)

    # Default: if low cal + high protein ratio, hero; else enemy
    if calories > 0 and protein / calories > 0.08:
        return "HERO", "Protein", "default"
    return "ENEMY", "Protein", "default"


def classify_snack_item(item):
    """Classify snack-category orphaned items."""
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()
    brand_lower = brand.lower()

    # Frozen treat bars (Yasso, Halo Top) → heroes
    if any(b in brand_lower for b in ["yasso", "halo top"]):
        return "HERO", "Frozen Treat", "ice_cream_bar"

    # Ice cream bars (Klondike, Haagen-Dazs) → enemies
    if any(b in brand_lower for b in ["klondike", "haagen-dazs", "häagen"]):
        return "ENEMY", "Frozen Treat", "ice_cream_bar"

    # Protein bars/chips → heroes
    if protein >= 15 and calories <= 250:
        return "HERO", "Sweet Crunch", "bar"

    # Popcorn
    if "popcorn" in name_lower:
        if calories <= 160:
            return "HERO", "Salty & Crunchy", "popcorn"
        return "ENEMY", "Salty & Crunchy", "popcorn"

    # Chips
    if any(w in name_lower for w in ["chip", "crisp", "puff"]):
        if calories <= 140 or protein >= 10:
            return "HERO", "Salty & Crunchy", "chips"
        return "ENEMY", "Salty & Crunchy", "chips"

    # Crackers
    if "cracker" in name_lower:
        return "HERO" if calories <= 140 else "ENEMY", "Salty & Crunchy", "crackers"

    # Dried fruit, fruit snacks, fruit bars, fruit leather
    if any(w in name_lower for w in ["dried", "fruit snack", "fruit bar", "fruit leather",
                                      "fruit jerky", "fruit roll", "raisins", "craisins",
                                      "prune", "date", "apricot", "mango"]):
        # Most dried fruit/fruit snacks are lower-cal alternatives to candy
        if calories <= 130:
            return "HERO", "Chewy/Gummy", "fruit_snack"
        return "ENEMY", "Chewy/Gummy", "dried_fruit"

    # No Cow, protein bars → hero
    if any(b in brand_lower for b in ["no cow", "kirkland"]) and "protein" in name_lower:
        return "HERO", "Sweet Crunch", "bar"

    # Baked chips → hero
    if "baked" in name_lower:
        return "HERO", "Salty & Crunchy", "chips"

    # Cheese snacks
    if "cheddar" in name_lower or "cheese" in name_lower:
        if calories <= 120:
            return "HERO", "Salty & Crunchy", "chips"
        return "ENEMY", "Salty & Crunchy", "chips"

    # Chocolate/candy → depends on protein
    if any(w in name_lower for w in ["chocolate", "brownie"]):
        if protein >= 10:
            return "HERO", "Chocolate Fix", "default"
        return "ENEMY" if calories >= 200 else "HERO", "Chocolate Fix", "default"

    # Frozen banana/treat items
    if "frozen" in name_lower or "banana" in name_lower:
        if calories <= 120:
            return "HERO", "Frozen Treat", "ice_cream_bar"
        return "ENEMY", "Frozen Treat", "ice_cream_bar"

    # Seaweed snacks → hero for salty
    if "seaweed" in name_lower:
        return "HERO", "Salty & Crunchy", "chips"

    # Sweet potato chips → they're similar cal to regular chips
    if "sweet potato" in name_lower:
        return "ENEMY", "Salty & Crunchy", "chips"

    # Kettle corn
    if "kettle" in name_lower:
        return "HERO", "Salty & Crunchy", "popcorn"

    # Default snack classification by calorie density
    if calories <= 120:
        return "HERO", "Salty & Crunchy", "chips"
    return "ENEMY", "Salty & Crunchy", "chips"


def classify_dairy(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()

    if "yogurt" in name_lower or "skyr" in name_lower:
        # High protein yogurts are heroes
        if protein >= 12:
            return "HERO", "Dairy", "yogurt"
        return "ENEMY", "Dairy", "yogurt"

    if "cottage cheese" in name_lower:
        if protein >= 12:
            return "HERO", "Dairy", "cottage_cheese"
        return "ENEMY", "Dairy", "cottage_cheese"

    if "string cheese" in name_lower or "mozzarella" in name_lower:
        if calories <= 60 or "light" in name_lower or "reduced" in name_lower or "part skim" in name_lower:
            return "HERO", "Dairy", "string_cheese"
        return "ENEMY", "Dairy", "string_cheese"

    if "cream cheese" in name_lower:
        if "less fat" in name_lower or "light" in name_lower or "vegan" in name_lower or calories <= 70:
            return "HERO", "Dairy", "cream_cheese"
        return "ENEMY", "Dairy", "cream_cheese"

    if "american" in name_lower or "singles" in name_lower:
        if "2%" in name_lower or "fat free" in name_lower or "fat-free" in name_lower or calories <= 45:
            return "HERO", "Dairy", "cheese_slice"
        return "ENEMY", "Dairy", "cheese_slice"

    if "shredded" in name_lower or "cheddar" in name_lower:
        if "reduced" in name_lower or "2%" in name_lower or calories <= 80:
            return "HERO", "Dairy", "shredded_cheese"
        return "ENEMY", "Dairy", "shredded_cheese"

    if "egg white" in name_lower or "liquid egg" in name_lower:
        return "HERO", "Protein", "egg"

    if "babybel" in name_lower.replace("'", "") or "laughing cow" in name_lower:
        if "light" in name_lower or calories <= 35:
            return "HERO", "Dairy", "string_cheese"
        return "ENEMY", "Dairy", "string_cheese"

    # Cheese wedges
    if "wedge" in name_lower:
        if calories <= 30:
            return "HERO", "Dairy", "string_cheese"
        return "ENEMY", "Dairy", "string_cheese"

    # Default dairy
    if protein >= 10 and calories <= 150:
        return "HERO", "Dairy", "default"
    return "ENEMY", "Dairy", "default"


def classify_beverage(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()
    brand_lower = brand.lower()

    # Protein shakes → hero
    if protein >= 20:
        return "HERO", "Beverage", "protein_shake"

    # Non-alcoholic beer → hero for beer
    if "non-alcoholic" in name_lower or "non alcoholic" in name_lower or "n/a" in name_lower or "0.0" in name_lower or "zero" in name_lower.split("(")[0]:
        if "beer" in name_lower or "ipa" in name_lower or "lager" in name_lower or "ale" in name_lower:
            return "HERO", "Beverage", "beer"

    # Light beer (< 110 cal) → hero for beer
    if any(w in name_lower for w in ["light", "lite", "ultra", "premier", "skinny"]):
        if any(w in name_lower for w in ["beer", "lager", "ale"]) or any(
            b in brand_lower for b in ["michelob", "coors", "bud", "miller", "corona", "amstel"]
        ):
            return "HERO", "Beverage", "light_beer"

    # Regular beer / IPA / craft → enemy
    if any(w in name_lower for w in ["ipa", "pale ale", "lager", "stout", "draught", "belgian"]):
        return "ENEMY", "Beverage", "beer"
    if any(b in brand_lower for b in ["guinness", "sierra nevada", "blue moon", "stella", "heineken", "corona", "coors", "new belgium"]):
        if "light" not in name_lower and "zero" not in name_lower and "non" not in name_lower:
            return "ENEMY", "Beverage", "beer"

    # Wine → most wines are ~120 cal; low-cal wines are heroes
    if any(w in name_lower for w in ["wine", "cabernet", "merlot", "pinot", "chardonnay",
                                      "sauvignon", "prosecco", "champagne", "rosé", "rose wine"]):
        if calories <= 100 or "skinny" in brand_lower or "fitvine" in brand_lower:
            return "HERO", "Beverage", "wine"
        return "ENEMY", "Beverage", "wine"

    # Cocktails → enemy
    if any(w in name_lower for w in ["margarita", "mojito", "moscow mule", "old fashioned",
                                      "long island", "piña colada", "pina colada", "gin & tonic",
                                      "cocktail"]):
        return "ENEMY", "Beverage", "cocktail"

    # Spirits (vodka, gin, rum, tequila, whiskey) → heroes relative to cocktails
    if any(w in name_lower for w in ["vodka", "gin", "rum", "tequila", "whiskey", "bourbon"]):
        if "tonic" in name_lower:
            return "ENEMY", "Beverage", "cocktail"
        if "soda" in name_lower:
            return "HERO", "Beverage", "spirit"
        # Plain spirits at ~97 cal are better than cocktails
        return "HERO", "Beverage", "spirit"

    # Tonic water → enemy
    if "tonic" in name_lower and calories > 0:
        return "ENEMY", "Beverage", "cocktail"

    # Simple syrup, mixers → enemy
    if any(w in name_lower for w in ["simple syrup", "mix"]):
        return "ENEMY", "Beverage", "cocktail"

    # Cranberry juice → enemy
    if "juice" in name_lower and calories > 50:
        return "ENEMY", "Beverage", "juice"

    # Nutrition shakes (Ensure, Boost) → enemy (high cal, low protein ratio)
    if any(w in name_lower for w in ["nutrition shake", "nutritional drink"]):
        if protein >= 20:
            return "HERO", "Beverage", "protein_shake"
        return "ENEMY", "Beverage", "protein_shake"

    # Hint water, vitamin water zero → hero
    if calories <= 5:
        return "HERO", "Beverage", "water"

    # Default beverage
    if calories <= 100 and protein >= 10:
        return "HERO", "Beverage", "protein_shake"
    if calories <= 10:
        return "HERO", "Beverage", "soda"
    return "ENEMY", "Beverage", "default"


def classify_cereal(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()
    brand_lower = brand.lower()

    # Magic Spoon, Three Wishes, Catalina Crunch → hero
    if any(b in brand_lower for b in ["magic spoon", "three wishes", "catalina", "julian bakery"]):
        return "HERO", "Cereal", "magic_spoon"

    # Kodiak, high-protein oatmeal → hero
    if any(b in brand_lower for b in ["kodiak", "oats overnight"]):
        return "HERO", "Cereal", "high_protein"

    # Kashi GO, protein granola → hero
    if protein >= 10:
        return "HERO", "Cereal", "high_protein"

    # Regular oatmeal (Quaker, Bob's, etc) → these are neutral/slightly hero
    if any(w in name_lower for w in ["oat", "oatmeal", "rolled oats", "steel cut"]):
        return "HERO", "Cereal", "oatmeal"

    # Better Oats (low cal oatmeal) → hero
    if "better oats" in brand_lower:
        return "HERO", "Cereal", "oatmeal"

    # Regular cereals (Froot Loops, Cap'n Crunch, Lucky Charms, etc) → enemy
    if any(b in brand_lower for b in ["kellogg", "general mills", "post", "quaker"]):
        if protein < 6:
            return "ENEMY", "Cereal", "regular"

    # Cream of rice/wheat → neutral, treat as hero (whole grain, customizable)
    if "cream of" in name_lower:
        return "HERO", "Cereal", "oatmeal"

    # Granola → depends
    if "granola" in name_lower:
        if protein >= 8:
            return "HERO", "Cereal", "high_protein"
        return "ENEMY", "Cereal", "regular"

    # Default
    if protein >= 8:
        return "HERO", "Cereal", "high_protein"
    return "ENEMY", "Cereal", "regular"


def classify_frozen_meal(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()
    brand_lower = brand.lower()

    # Real Good Foods, Healthy Choice Power Bowls, Lean Cuisine protein → hero
    if any(b in brand_lower for b in ["real good", "healthy choice"]):
        return "HERO", "Frozen Meal", "bowl"

    # Jimmy Dean Delights → hero
    if "delights" in name_lower:
        return "HERO", "Frozen Meal", "breakfast"

    # Red's Egg'wich → hero
    if "red's" in brand_lower or "reds" in brand_lower:
        return "HERO", "Frozen Meal", "breakfast"

    # Kodiak Power Waffles → hero
    if "kodiak" in brand_lower:
        return "HERO", "Frozen Meal", "breakfast"

    # Pizza items
    if "pizza" in name_lower:
        if "caulipower" in brand_lower or "cauliflower" in name_lower or "lean cuisine" in brand_lower:
            return "HERO", "Frozen Meal", "pizza"
        return "ENEMY", "Frozen Meal", "pizza"

    # Mac & cheese
    if "mac" in name_lower and "cheese" in name_lower:
        if calories <= 300:
            return "HERO", "Frozen Meal", "mac_cheese"
        return "ENEMY", "Frozen Meal", "mac_cheese"

    # Hot Pockets → enemy
    if "hot pocket" in brand_lower:
        return "ENEMY", "Frozen Meal", "default"

    # Banquet → enemy
    if "banquet" in brand_lower:
        return "ENEMY", "Frozen Meal", "default"

    # Jimmy Dean (not Delights) → enemy
    if "jimmy dean" in brand_lower:
        return "ENEMY", "Frozen Meal", "breakfast"

    # Marie Callender's → enemy
    if "marie" in brand_lower:
        return "ENEMY", "Frozen Meal", "default"

    # Trader Joe's reduced guilt → hero
    if "reduced guilt" in name_lower:
        return "HERO", "Frozen Meal", "mac_cheese"

    # Default: high protein + reasonable cal = hero
    if protein >= 15 and calories <= 300:
        return "HERO", "Frozen Meal", "bowl"
    return "ENEMY", "Frozen Meal", "default"


def classify_pasta_grain(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()

    # Shirataki/cauliflower → hero
    if any(w in name_lower for w in ["shirataki", "cauliflower", "riced cauliflower"]):
        return "HERO", "Pasta & Grain", "default"

    # Protein pancake mix → hero
    if "protein" in name_lower:
        return "HERO", "Pasta & Grain", "default"

    # Quinoa → hero (higher protein grain)
    if "quinoa" in name_lower:
        return "HERO", "Pasta & Grain", "default"

    # Regular rice, pasta → enemy
    return "ENEMY", "Pasta & Grain", "default"


def classify_spread(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()
    brand_lower = brand.lower()

    # Powdered peanut butter → hero
    if "powder" in name_lower or "pb2" in brand_lower or "pbfit" in brand_lower or "naked pb" in brand_lower:
        return "HERO", "Spread", "peanut_butter"

    # Butter/ghee → these are enemies (high cal, no protein)
    if any(w in name_lower for w in ["butter", "ghee"]) and "peanut" not in name_lower and "almond" not in name_lower:
        return "ENEMY", "Spread", "butter"

    # Coconut oil, olive oil → enemy
    if "oil" in name_lower:
        return "ENEMY", "Spread", "oil"

    # Regular peanut/almond butter → enemy
    if any(w in name_lower for w in ["peanut butter", "almond butter", "nut butter"]):
        if "protein" in name_lower and protein >= 9:
            return "HERO", "Spread", "peanut_butter"
        if calories >= 180:
            return "ENEMY", "Spread", "peanut_butter"
        return "HERO", "Spread", "peanut_butter"

    return "ENEMY", "Spread", "default"


def classify_condiment(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()

    # Hot sauces (0-5 cal) → hero
    if any(w in name_lower for w in ["hot sauce", "cayenne", "pepper sauce", "sriracha", "chili"]):
        return "HERO", "Condiment", "hot_sauce"

    # Zero/low cal sauces → hero
    if calories <= 15:
        return "HERO", "Condiment", "default"

    # Dressings
    if "dressing" in name_lower or "vinaigrette" in name_lower:
        if calories <= 30 or "skinny" in name_lower.lower():
            return "HERO", "Condiment", "dressing"
        return "ENEMY", "Condiment", "dressing"

    # Mayo
    if "mayo" in name_lower or "mayonnaise" in name_lower:
        if "avocado" in name_lower or "sir kensington" in name_lower:
            # These are slightly healthier but same cal — still enemy
            return "ENEMY", "Condiment", "mayo"
        return "ENEMY", "Condiment", "mayo"

    # BBQ sauce
    if "bbq" in name_lower or "barbecue" in name_lower or "bar-b-q" in name_lower:
        if "sugar free" in name_lower or calories <= 15:
            return "HERO", "Condiment", "bbq"
        return "ENEMY", "Condiment", "bbq"

    # Soy sauce, coconut aminos
    if any(w in name_lower for w in ["soy sauce", "aminos", "amino"]):
        if "less sodium" in name_lower or "coconut" in name_lower or "coco" in name_lower:
            return "HERO", "Condiment", "soy_sauce"
        return "ENEMY", "Condiment", "soy_sauce"

    # Teriyaki/stir-fry
    if any(w in name_lower for w in ["teriyaki", "stir-fry", "stir fry"]):
        return "HERO" if calories <= 25 else "ENEMY", "Condiment", "teriyaki"

    # Ketchup
    if "ketchup" in name_lower:
        return "HERO" if calories <= 15 else "ENEMY", "Condiment", "ketchup"

    # Default
    if calories <= 25:
        return "HERO", "Condiment", "default"
    return "ENEMY", "Condiment", "default"


def classify_sweetener(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()

    # Allulose, monk fruit, stevia → hero
    if any(w in name_lower for w in ["allulose", "monk fruit", "stevia", "zero calorie", "sugar free"]):
        return "HERO", "Sweetener", "sugar"

    # Lily's, ChocZero, Hershey's zero sugar chips → hero
    if any(w in name_lower for w in ["lily", "choczero", "zero sugar"]):
        return "HERO", "Sweetener", "chocolate_chips"

    # Regular sugar, honey, agave, maple syrup, brown sugar → enemy
    if any(w in name_lower for w in ["cane sugar", "granulated sugar", "honey", "agave", "maple syrup", "brown sugar"]):
        return "ENEMY", "Sweetener", "sugar"

    # Dark chocolate (regular) → enemy-ish but small portions
    if "dark chocolate" in name_lower:
        if calories <= 60:
            return "HERO", "Sweetener", "chocolate_chips"
        return "ENEMY", "Sweetener", "default"

    return "ENEMY" if calories > 30 else "HERO", "Sweetener", "default"


def classify_supplement(item):
    """Protein powders, greens, collagen, etc."""
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()

    # Protein powders → hero for chocolate milk / protein shakes
    if any(w in name_lower for w in ["whey", "casein", "protein", "isolate"]):
        return "HERO", "Protein", "whey"

    # Collagen → hero
    if "collagen" in name_lower:
        return "HERO", "Protein", "whey"

    # Greens powders → hero (but for what? Beverage works)
    if "green" in name_lower:
        return "HERO", "Beverage", "energy_drink"

    # Seeds, superfoods (chia, flax, hemp, bee pollen, cacao) → hero
    return "HERO", "Protein", "default"


def classify_protein(item):
    """Protein items: jerky, deli meat, chicken, eggs, hot dogs, etc."""
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()
    brand_lower = brand.lower()

    # Jerky → hero
    if any(w in name_lower for w in ["jerky", "beef stick", "meat stick"]):
        return "HERO", "Protein", "jerky"

    # Deli turkey/chicken → hero
    if any(w in name_lower for w in ["turkey breast", "deli", "roasted turkey", "smoked turkey",
                                      "oven roasted", "ham"]):
        return "HERO", "Protein", "deli_turkey"

    # Chicken breast → hero
    if any(w in name_lower for w in ["chicken breast", "chicken strip", "chicken bite",
                                      "grilled chicken", "rotisserie", "chicken patties",
                                      "chicken tender"]):
        return "HERO", "Protein", "chicken"

    # Fish/salmon/tuna → hero
    if any(w in name_lower for w in ["salmon", "tuna", "fish"]):
        return "HERO", "Protein", "fish"

    # Turkey burgers, turkey meatballs → hero
    if "turkey" in name_lower and any(w in name_lower for w in ["burger", "meatball", "ground", "corn dog"]):
        return "HERO", "Protein", "chicken"

    # Turkey/chicken hot dogs, franks → hero (vs regular)
    if any(w in name_lower for w in ["turkey frank", "turkey hot dog"]):
        return "HERO", "Protein", "hot_dog"

    # Beef franks, regular hot dogs → enemy
    if any(w in name_lower for w in ["beef frank", "wiener", "hot dog"]) and "turkey" not in name_lower:
        return "ENEMY", "Protein", "hot_dog"

    # Ground beef 70/30 → enemy
    if "ground beef" in name_lower and ("70/30" in name_lower or "80/20" in name_lower):
        return "ENEMY", "Protein", "beef"

    # Lean ground turkey → hero
    if "ground turkey" in name_lower or "lean" in name_lower:
        return "HERO", "Protein", "chicken"

    # Hard-boiled eggs → hero
    if "egg" in name_lower:
        return "HERO", "Protein", "egg"

    # Grass-fed beef patties (high cal) → enemy
    if "beef patties" in name_lower or "beef burger" in name_lower:
        if calories >= 300:
            return "ENEMY", "Protein", "beef"

    # Seaweed snacks → hero (low cal, savory)
    if "seaweed" in name_lower:
        return "HERO", "Salty & Crunchy", "chips"

    # Chicken sausage → hero
    if "chicken sausage" in name_lower:
        return "HERO", "Protein", "sausage"

    # Dumplings, wontons → depends
    if any(w in name_lower for w in ["dumpling", "wonton"]):
        if protein >= 10:
            return "HERO", "Protein", "chicken"
        return "ENEMY", "Protein", "default"

    # Protein bars in protein category
    if "bar" in name_lower and protein >= 10:
        return "HERO", "Protein", "jerky"

    # Default protein classification
    if protein >= 15 and calories <= 200:
        return "HERO", "Protein", "chicken"
    if protein >= 10:
        return "HERO", "Protein", "default"
    return "ENEMY", "Protein", "default"


def classify_bread_wrap(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()

    # Egglife, Crepini → hero
    if any(b in name_lower for b in ["egg white", "egg wrap", "cauliflower"]):
        return "HERO", "Bread & Wrap", "wrap"
    return "HERO", "Bread & Wrap", "wrap"


def classify_cooking_oil(item):
    item_id, name, brand, calories, protein, serving, category, subcategory = item
    name_lower = name.lower()

    # Spray oils (0 cal) → hero
    if "spray" in name_lower or calories == 0:
        return "HERO", "Savory Cooking", "default"
    return "ENEMY", "Savory Cooking", "default"


def get_enemy_id(craving, sub_type, enemies_map):
    """Get the enemy ID for a given craving + sub_type."""
    craving_enemies = CRAVING_TO_ENEMY.get(craving, {})
    enemy_id = craving_enemies.get(sub_type) or craving_enemies.get("default")
    return enemy_id


def make_swap_id(item_id, craving, sub_type):
    """Generate a unique swap pair ID."""
    # Clean up the craving name for use in ID
    craving_slug = craving.lower().replace(" & ", "-").replace(" ", "-")
    return f"{item_id}-{craving_slug}-swap"


def make_rationale(hero_name, hero_brand, hero_cal, hero_protein,
                   enemy_name, enemy_brand, enemy_cal, enemy_protein):
    """Generate a rationale string."""
    cal_diff = enemy_cal - hero_cal
    parts = []
    hero_label = f"{hero_brand} {hero_name}" if hero_brand and hero_brand != "Generic" else hero_name
    enemy_label = f"{enemy_brand} {enemy_name}" if enemy_brand and enemy_brand != "Generic" else enemy_name

    if cal_diff > 0:
        parts.append(f"{hero_label} at {hero_cal} cal vs {enemy_label} at {enemy_cal} cal. Saves {cal_diff} cal")
    else:
        parts.append(f"{hero_label} at {hero_cal} cal vs {enemy_label} at {enemy_cal} cal")

    if hero_protein > enemy_protein:
        parts.append(f"with {hero_protein:.0f}g protein vs {enemy_protein:.0f}g")

    return ". ".join(parts) + "."


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Get all orphaned items
    cur.execute("""
        SELECT id, name, brand, calories, protein_g, serving, item_category, item_subcategory
        FROM snack_items si
        WHERE si.id NOT IN (SELECT original_snack_id FROM snack_swaps)
          AND si.id NOT IN (SELECT swap_snack_id FROM snack_swaps)
        ORDER BY item_category, item_subcategory, name
    """)
    orphans = cur.fetchall()

    # Get existing enemy items (for reference)
    cur.execute("SELECT DISTINCT original_snack_id FROM snack_swaps")
    existing_enemies = {r[0] for r in cur.fetchall()}

    # Get all existing item IDs
    cur.execute("SELECT id FROM snack_items")
    all_item_ids = {r[0] for r in cur.fetchall()}

    # Get existing swap pair IDs
    cur.execute("SELECT id FROM snack_swaps")
    existing_swap_ids = {r[0] for r in cur.fetchall()}

    # Get item details for enemies we'll reference
    cur.execute("SELECT id, name, brand, calories, protein_g FROM snack_items")
    item_details = {r[0]: {"name": r[1], "brand": r[2], "calories": r[3], "protein": r[4]} for r in cur.fetchall()}

    print(f"\n{'='*70}")
    print(f"ORPHAN SWAP PAIR CREATOR")
    print(f"{'='*70}")
    print(f"Total orphaned items: {len(orphans)}")

    heroes = []
    enemies = []
    skipped = []
    already_exists = []

    for item in orphans:
        role, craving, sub_type = classify_item(item)
        if role is None:
            skipped.append((item, "Informational/educational item"))
            continue

        item_id = item[0]
        swap_id = make_swap_id(item_id, craving, sub_type)

        if swap_id in existing_swap_ids:
            already_exists.append(item_id)
            continue

        if role == "HERO":
            enemy_id = get_enemy_id(craving, sub_type, existing_enemies)
            if enemy_id is None:
                skipped.append((item, f"No enemy found for {craving}/{sub_type}"))
                continue
            if enemy_id not in all_item_ids:
                skipped.append((item, f"Enemy ID {enemy_id} not in snack_items"))
                continue
            heroes.append({
                "item": item,
                "role": "HERO",
                "craving": craving,
                "sub_type": sub_type,
                "enemy_id": enemy_id,
                "swap_id": swap_id,
            })
        else:  # ENEMY
            # For enemies, we need to find or note that they need heroes
            enemies.append({
                "item": item,
                "role": "ENEMY",
                "craving": craving,
                "sub_type": sub_type,
                "swap_id": swap_id,
            })

    # For enemy orphans, try to find an existing hero to pair with
    # First collect all existing heroes per craving
    cur.execute("""
        SELECT ss.swap_snack_id, ss.craving
        FROM snack_swaps ss
        GROUP BY ss.swap_snack_id, ss.craving
    """)
    existing_hero_by_craving = {}
    for row in cur.fetchall():
        existing_hero_by_craving.setdefault(row[1], []).append(row[0])

    enemies_with_hero = []
    enemies_without_hero = []

    for e in enemies:
        craving = e["craving"]
        item = e["item"]

        # Find a hero for this enemy from existing swap heroes
        hero_candidates = existing_hero_by_craving.get(craving, [])
        if hero_candidates:
            # Pick the first available hero
            e["hero_id"] = hero_candidates[0]
            enemies_with_hero.append(e)
        else:
            enemies_without_hero.append(e)

    print(f"\nClassification Results:")
    print(f"  Heroes (will create swap: hero→existing enemy): {len(heroes)}")
    print(f"  Enemies with existing hero: {len(enemies_with_hero)}")
    print(f"  Enemies without hero (FLAGGED): {len(enemies_without_hero)}")
    print(f"  Skipped: {len(skipped)}")
    print(f"  Already exists: {len(already_exists)}")

    # Print summary by craving
    from collections import Counter
    hero_cravings = Counter(h["craving"] for h in heroes)
    enemy_cravings = Counter(e["craving"] for e in enemies_with_hero)

    print(f"\nHero swaps by craving:")
    for craving, count in sorted(hero_cravings.items()):
        print(f"  {craving}: {count}")

    print(f"\nEnemy swaps by craving:")
    for craving, count in sorted(enemy_cravings.items()):
        print(f"  {craving}: {count}")

    if enemies_without_hero:
        print(f"\n{'='*70}")
        print(f"FLAGGED: Enemies without heroes ({len(enemies_without_hero)}):")
        for e in enemies_without_hero:
            item = e["item"]
            print(f"  - {item[0]}: {item[1]} ({item[2]}, {item[3]} cal) [{e['craving']}]")

    if skipped:
        print(f"\n{'='*70}")
        print(f"SKIPPED items ({len(skipped)}):")
        for item, reason in skipped:
            print(f"  - {item[0]}: {item[1]} → {reason}")

    # ── INSERT HERO SWAP PAIRS ──
    print(f"\n{'='*70}")
    print(f"INSERTING {len(heroes)} hero swap pairs...")

    inserted = 0
    for h in heroes:
        item = h["item"]
        item_id, name, brand, calories, protein, serving, cat, subcat = item
        enemy_id = h["enemy_id"]
        swap_id = h["swap_id"]
        craving = h["craving"]

        # Get enemy details
        enemy = item_details.get(enemy_id, {})
        enemy_name = enemy.get("name", "")
        enemy_brand = enemy.get("brand", "")
        enemy_cal = enemy.get("calories", 0)
        enemy_protein = enemy.get("protein", 0)

        title = CRAVING_TO_TITLE.get(craving, "Upgrade")
        context = CRAVING_TO_CONTEXT.get(craving, "When you want a better option")
        rationale = make_rationale(name, brand, calories, protein,
                                   enemy_name, enemy_brand, enemy_cal, enemy_protein)
        swap_category = cat  # match the hero item's category

        try:
            cur.execute("""
                INSERT OR IGNORE INTO snack_swaps
                (id, title, context, craving, rationale, original_snack_id, swap_snack_id,
                 display_order, is_active, rank, homepage_rank, swap_vectors, swap_category)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 1, 0, '', ?)
            """, (swap_id, title, context, craving, rationale,
                  enemy_id, item_id, swap_category))
            inserted += 1
        except sqlite3.IntegrityError as e:
            print(f"  SKIP (integrity): {swap_id} → {e}")

    # ── INSERT ENEMY SWAP PAIRS (enemy → existing hero) ──
    print(f"INSERTING {len(enemies_with_hero)} enemy swap pairs...")

    for e in enemies_with_hero:
        item = e["item"]
        item_id, name, brand, calories, protein, serving, cat, subcat = item
        hero_id = e["hero_id"]
        swap_id = e["swap_id"]
        craving = e["craving"]

        hero = item_details.get(hero_id, {})
        hero_name = hero.get("name", "")
        hero_brand = hero.get("brand", "")
        hero_cal = hero.get("calories", 0)
        hero_protein = hero.get("protein", 0)

        title = CRAVING_TO_TITLE.get(craving, "Upgrade")
        context = CRAVING_TO_CONTEXT.get(craving, "When you want a better option")
        rationale = make_rationale(hero_name, hero_brand, hero_cal, hero_protein,
                                   name, brand, calories, protein)
        swap_category = cat

        try:
            cur.execute("""
                INSERT OR IGNORE INTO snack_swaps
                (id, title, context, craving, rationale, original_snack_id, swap_snack_id,
                 display_order, is_active, rank, homepage_rank, swap_vectors, swap_category)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 1, 0, '', ?)
            """, (swap_id, title, context, craving, rationale,
                  item_id, hero_id, swap_category))
            inserted += 1
        except sqlite3.IntegrityError as e:
            print(f"  SKIP (integrity): {swap_id} → {e}")

    conn.commit()
    print(f"\nDone! Inserted {inserted} swap pairs.")

    # Verify
    cur.execute("SELECT COUNT(*) FROM snack_swaps")
    total_swaps = cur.fetchone()[0]
    cur.execute("""
        SELECT COUNT(*) FROM snack_items si
        WHERE si.id NOT IN (SELECT original_snack_id FROM snack_swaps)
          AND si.id NOT IN (SELECT swap_snack_id FROM snack_swaps)
    """)
    remaining_orphans = cur.fetchone()[0]

    print(f"\nFinal state:")
    print(f"  Total swap pairs: {total_swaps}")
    print(f"  Remaining orphans: {remaining_orphans}")

    conn.close()


if __name__ == "__main__":
    main()
