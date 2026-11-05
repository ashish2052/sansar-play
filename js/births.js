// Birth circumstances (Chairman, 17 Oct 2026). Weights, money ranges and hand-written fallbacks per bracket.
// Money is Nepali rupees; life.js scales it to the player's country. game/birth.py reads the JSON between the
// markers to validate what the local model writes, so the block must stay strict JSON.
export const BIRTH = /*BIRTH-JSON*/{
  "order": ["homeless", "slum", "struggling", "middle", "failing", "comfortable", "wealthy"],
  "legacy": { "poor": "slum", "ordinary": "middle", "spoon": "wealthy" },
  "twists": {
    "orphan": { "p": 0.01, "label": "Orphan, raised by grandparents", "event": "grandparent_ill" },
    "single": { "p": 0.01, "label": "Single parent", "event": "earner_sick" },
    "abroad": { "p": 0.01, "label": "A parent works abroad and sends money home", "event": "remittance_stops", "remit": [15000, 60000] },
    "dispute": { "p": 0.01, "label": "An inheritance dispute in the family", "event": "inheritance_dispute" }
  },
  "triggers": ["time", "missed", "late_rent", "low_purse", "helped"],
  "brackets": {
    "homeless": {
      "w": 5, "label": "Born homeless", "legacy": "poor",
      "homes": ["bridge", "shelter"], "own": false, "rent": [0, 0],
      "size": [2, 4], "earners": [1, 1], "cash": [0, 800], "bank": [0, 0], "purse": [0, 1500],
      "income": [6000, 12000], "costs": [6000, 11500], "assets": [0, 6000],
      "debts": { "n": [0, 1], "principal": [5000, 30000], "rate": [36, 60], "months": [6, 18], "collateral": "none",
        "lenders": ["a moneylender at the bus park", "the tea-stall owner", "a labour contractor"] },
      "biz": null,
      "jobs": ["day labourer", "porter at the bus park", "rag picker", "brick kiln worker", "construction helper"],
      "events": ["room_offer", "school_fight", "food_crisis", "injury"],
      "story": "The {surname} family has no door of its own. {head} carries loads for whoever pays that day, and some days nobody does. Food is the question every evening, and school is a fight you win one morning at a time."
    },
    "slum": {
      "w": 15, "label": "One rented room in a slum", "legacy": "poor",
      "homes": ["slum", "shack", "oneroom"], "own": false, "rent": [2500, 5000],
      "size": [4, 6], "earners": [1, 2], "cash": [200, 2500], "bank": [0, 0], "purse": [500, 4000],
      "income": [14000, 26000], "costs": [10000, 18000], "assets": [2000, 30000],
      "debts": { "n": [0, 1], "principal": [15000, 90000], "rate": [24, 36], "months": [12, 30], "collateral": "none",
        "lenders": ["the savings cooperative", "a moneylender in the lane", "the landlord"] },
      "biz": null,
      "jobs": ["rickshaw puller", "housemaid", "vegetable seller", "construction worker", "dishwasher at a hotel", "security guard"],
      "events": ["eviction_threat", "rent_hike", "neighbour_help", "flood", "school_fight"],
      "story": "Five of the {surname} family share one room and a toilet with the whole lane. Rent is due on the first, and the landlord does not wait. {head} works long days, and the money runs out a few days before the month does."
    },
    "struggling": {
      "w": 25, "label": "A struggling working family", "legacy": "poor",
      "homes": ["flat_small"], "own": false, "rent": [8000, 15000],
      "size": [3, 5], "earners": [1, 1], "cash": [1000, 8000], "bank": [0, 5000], "purse": [2000, 15000],
      "income": [28000, 48000], "costs": [17000, 30000], "assets": [20000, 150000],
      "debts": { "n": [0, 1], "principal": [50000, 250000], "rate": [13, 18], "months": [24, 48], "collateral": "none",
        "lenders": ["the cooperative", "Sansar Bank (personal loan)"] },
      "biz": null,
      "jobs": ["bus conductor", "shop assistant", "factory worker", "office peon", "driver", "tailor"],
      "events": ["fee_rise", "earner_sick", "promotion", "rent_hike"],
      "story": "The {surname} family rents a small flat in Brickfield Row, out where the city runs into the brick yards. {head} is the only wage, and the school fees take a bite out of every month. Nobody goes hungry, but nobody buys anything new either."
    },
    "middle": {
      "w": 25, "label": "An ordinary middle-class family", "legacy": "ordinary",
      "homes": ["house_small", "flat_owned"], "own": true, "rent": [0, 0],
      "size": [3, 5], "earners": [2, 2], "cash": [5000, 30000], "bank": [10000, 80000], "purse": [20000, 150000],
      "income": [65000, 130000], "costs": [40000, 80000], "assets": [9000000, 22000000],
      "debts": { "n": [0, 1], "principal": [800000, 4000000], "rate": [10, 13], "months": [84, 180], "collateral": "house",
        "lenders": ["Sansar Bank (home loan)", "Koshi Bank (home loan)"] },
      "biz": null,
      "jobs": ["schoolteacher", "bank clerk", "government officer", "nurse", "accountant", "engineer"],
      "events": ["land_offer", "wedding_cost", "earner_sick", "promotion"],
      "story": "The {surname} family owns a modest home in Eastgate Colony and a strip of land outside the city. Two salaries keep the house running, with a little put aside each month. The plan for you is simple: study, get a good job, do not embarrass anyone."
    },
    "failing": {
      "w": 10, "label": "A family business failing under loans", "legacy": "ordinary",
      "homes": ["shophouse"], "own": true, "rent": [0, 0],
      "size": [3, 6], "earners": [1, 2], "cash": [2000, 15000], "bank": [0, 20000], "purse": [150000, 700000],
      "income": [0, 15000], "costs": [35000, 65000], "assets": [6000000, 15000000],
      "debts": { "n": [1, 2], "principal": [1200000, 5000000], "rate": [13, 17], "months": [48, 96], "collateral": "shop",
        "lenders": ["Sansar Bank (business loan)", "Koshi Bank (overdraft)", "a wholesaler's credit"] },
      "biz": { "kinds": ["hardware shop", "cloth shop", "grocery wholesale", "furniture workshop", "noodle factory", "printing press", "electronics shop", "sweet shop"],
        "revenue": [180000, 700000], "ratio": [0.82, 0.96], "staff": [2, 9], "stock": [250000, 1800000], "health": [30, 50], "trend": -1.2 },
      "jobs": ["shop owner", "workshop owner"],
      "events": ["creditor_call", "big_order", "supplier_cut", "collapse"],
      "story": "The {surname} shop on New Market Lane has been in the family for twenty years, and it makes a little less every month. {head} took a bank loan to modernise and the customers went to the new mall instead. The savings pay the instalments for now. The shop, and then the house, are what the bank holds."
    },
    "comfortable": {
      "w": 12, "label": "A comfortable business family", "legacy": "ordinary",
      "homes": ["garden"], "own": true, "rent": [0, 0],
      "size": [3, 5], "earners": [1, 2], "cash": [20000, 120000], "bank": [100000, 800000], "purse": [200000, 1500000],
      "income": [40000, 120000], "costs": [110000, 240000], "assets": [30000000, 70000000],
      "debts": { "n": [0, 1], "principal": [1000000, 5000000], "rate": [11, 14], "months": [36, 84], "collateral": "shop",
        "lenders": ["Sansar Bank (business loan)", "Himal Bank (working capital)"] },
      "biz": { "kinds": ["pharmacy chain", "trekking agency", "school supplies wholesale", "restaurant", "construction firm", "garment export"],
        "revenue": [900000, 3500000], "ratio": [0.7, 0.88], "staff": [8, 40], "stock": [800000, 6000000], "health": [55, 80], "trend": 0.3 },
      "car": true,
      "jobs": ["business owner", "director", "doctor", "civil engineer"],
      "events": ["expansion", "tax_audit", "car_crash", "promotion"],
      "story": "The {surname} family lives in a house with a garden on Laxmi Garden Road, with a car in the drive. The family business pays for it, and {head} works six days a week to keep it that way. There is money for good schools, and the expectation that you will use them."
    },
    "wealthy": {
      "w": 7, "label": "A wealthy family with a mansion", "legacy": "spoon",
      "homes": ["mansion"], "own": true, "rent": [0, 0],
      "size": [4, 7], "earners": [1, 2], "cash": [100000, 600000], "bank": [3000000, 40000000], "purse": [2000000, 15000000],
      "income": [800000, 4000000], "costs": [300000, 900000], "assets": [150000000, 600000000],
      "debts": { "n": [0, 1], "principal": [5000000, 30000000], "rate": [10, 12], "months": [60, 120], "collateral": "house",
        "lenders": ["Himal Bank (property loan)"] },
      "biz": { "kinds": ["hotel group", "real estate company", "import house", "hydropower stake", "cement factory"],
        "revenue": [5000000, 30000000], "ratio": [0.6, 0.85], "staff": [40, 400], "stock": [5000000, 60000000], "health": [60, 90], "trend": 0.2 },
      "car": true, "servants": [2, 5],
      "jobs": ["chairman of the family company", "hotelier", "property developer", "industrialist"],
      "events": ["scandal", "family_feud", "market_loss", "trust_release"],
      "story": "The {surname} mansion sits behind a wall on Hillside Estates, with a driver at the gate and staff in the kitchen. A trust holds money in your name, and the family holds opinions about how you should spend it. Old money still has old quarrels."
    }
  },
  "homes": {
    "bridge": { "label": "A spot under the unfinished flyover by the river", "hood": "riverside", "own": false },
    "shelter": { "label": "A bed in the City Night Shelter", "hood": "riverside", "own": false },
    "slum": { "label": "One room in Riverside Lane, shared toilet", "hood": "riverside", "own": false },
    "shack": { "label": "A tin-roof shack in Tin Town", "hood": "tintown", "own": false },
    "oneroom": { "label": "A single-room house on Kiln Road", "hood": "kiln", "own": false },
    "flat_small": { "label": "A small rented flat in Brickfield Row", "hood": "brickfield", "own": false },
    "flat_owned": { "label": "An owned flat in Eastgate Colony", "hood": "eastgate", "own": true },
    "house_small": { "label": "A small owned house in Eastgate Colony", "hood": "eastgate", "own": true },
    "shophouse": { "label": "The shop-house on New Market Lane, shop below and home above", "hood": "newmarket", "own": true },
    "garden": { "label": "A house with a garden on Laxmi Garden Road", "hood": "laxmi", "own": true },
    "mansion": { "label": "A mansion on Hillside Estates", "hood": "hillside", "own": true }
  },
  "moves": {
    "shelter": { "rent": 0, "price": 0 }, "slum": { "rent": 3500, "price": 0 }, "oneroom": { "rent": 5000, "price": 0 },
    "flat_small": { "rent": 12000, "price": 0 }, "flat_owned": { "rent": 22000, "price": 9500000 }, "house_small": { "rent": 30000, "price": 14000000 },
    "garden": { "rent": 90000, "price": 45000000 }, "mansion": { "rent": 0, "price": 260000000 }
  },
  "names": {
    "male": ["Ramesh", "Hari", "Bishnu", "Krishna", "Gopal", "Shyam", "Dipak", "Suresh", "Rajan", "Mohan", "Bikram", "Nabin", "Sanjay", "Arun", "Kamal", "Prakash", "Dinesh", "Bhim", "Ganesh", "Narayan"],
    "female": ["Sunita", "Gita", "Laxmi", "Kamala", "Sarita", "Radha", "Parbati", "Sabitri", "Mina", "Anju", "Rita", "Sushila", "Bimala", "Durga", "Kalpana", "Nirmala", "Sita", "Puja", "Asha", "Manju"],
    "young": ["Aayush", "Prerana", "Sujan", "Riya", "Bibek", "Sneha", "Kiran", "Anisha", "Sagar", "Pooja", "Rohit", "Srijana"],
    "surnames": ["Shrestha", "Gurung", "Thapa", "Rai", "Sharma", "Tamang", "Magar", "Karki", "Adhikari", "Basnet", "Poudel", "Maharjan", "Bhandari", "Khadka", "Lama", "Joshi", "Pradhan", "Rana"]
  },
  "temperaments": ["proud and quick to anger", "tired but kind", "anxious about money", "strict and old-fashioned", "funny, a little careless", "quiet and hard-working", "warm and nosy", "ambitious and impatient", "gentle, easily hurt", "stubborn, never asks for help"],
  "districts": ["Riverside", "Tin Town", "Kiln Road", "Brickfield Row", "Eastgate Colony", "New Market Lane", "Laxmi Garden Road", "Hillside Estates"],
  "hoods": {
    "riverside": { "name": "Riverside Lane", "dist": 840 }, "tintown": { "name": "Tin Town", "dist": 750 },
    "kiln": { "name": "Kiln Road", "dist": 650 }, "brickfield": { "name": "Brickfield Row", "dist": 535 },
    "eastgate": { "name": "Eastgate Colony", "dist": 200 }, "newmarket": { "name": "New Market Lane", "dist": 385 },
    "laxmi": { "name": "Laxmi Garden Road", "dist": 140 }, "hillside": { "name": "Hillside Estates", "dist": 250 }
  },
  "hooks": ["the family keeps two goats", "grandmother sings old songs at night", "an uncle owes everyone money", "the eldest sibling wants to go abroad", "the family is known for its temper", "a cousin lives with the family", "father plays cards on Saturdays", "mother runs the household accounts in a school notebook", "the family follows cricket like a religion", "a neighbour is the family's oldest friend and worst gossip", "the radio is always on", "the family once had money and talks about it", "a younger sibling is very clever at school", "the family has a quarrel with the people next door"],
  "split": {
    "homeless": [["bedding and cooking pots", 1]],
    "slum": [["gold earrings", 0.6], ["a television and a fan", 0.4]],
    "struggling": [["gold jewellery", 0.6], ["a motorbike", 0.4]],
    "middle": [["the home", 0.62], ["land outside the city", 0.3], ["gold and savings", 0.08]],
    "failing": [["the shop-house", 0.7], ["shop fittings", 0.08], ["land outside the city", 0.22]],
    "comfortable": [["the garden house", 0.5], ["business property", 0.3], ["land and gold", 0.15], ["two cars", 0.05]],
    "wealthy": [["the mansion", 0.3], ["company shares", 0.4], ["land across the valley", 0.25], ["cars", 0.05]]
  },
  "trigger_of": { "creditor_call": "missed", "eviction_threat": "late_rent", "food_crisis": "low_purse", "collapse": "low_purse", "big_order": "helped" },
  "event_text": {
    "room_offer": "A charity worker who knows the family offers a room in Riverside Lane, rent free for a few months.",
    "school_fight": "The school wants a fee the family cannot pay. You fight to stay in class.",
    "food_crisis": "A week with no work. The family eats once a day.",
    "injury": "The earner hurts a back on a building site. Half the wage is gone for months.",
    "eviction_threat": "The landlord bangs on the door: pay this month, or leave.",
    "rent_hike": "The rent goes up, the way it always does.",
    "neighbour_help": "A neighbour lends a hand and a little money, no questions asked.",
    "flood": "The monsoon floods the lane. The family loses bedding and a week of work.",
    "fee_rise": "The school raises its fees again.",
    "earner_sick": "The main earner falls ill. The wage drops while the bills do not.",
    "promotion": "Good news at work: a promotion and a better wage.",
    "land_offer": "A builder offers money for the family land outside the city.",
    "wedding_cost": "A cousin's wedding. The family is expected to give, and gives too much.",
    "creditor_call": "The bank manager calls. The loan is behind, and the rate goes up.",
    "big_order": "A big order lands: a school wants supplies for the whole year. The shop has a chance.",
    "supplier_cut": "The wholesaler stops giving credit. Stock now needs cash up front.",
    "collapse": "Footfall dies on the lane. The shop is in real trouble.",
    "expansion": "The family business opens a second branch, with a new loan behind it.",
    "tax_audit": "The tax office audits the business books. A fine follows.",
    "car_crash": "The family car is wrecked in a crash. Nobody is badly hurt, but repairs are dear.",
    "scandal": "A family scandal reaches the papers. Doors that were open start to close.",
    "family_feud": "Uncles fight over the company. Lawyers are paid on both sides.",
    "market_loss": "The share market falls hard, and the family portfolio falls with it.",
    "trust_release": "Part of the trust is released to you on schedule.",
    "inheritance_dispute": "A will is contested. Part of the family property is frozen by the court.",
    "remittance_stops": "The parent abroad loses the job there. The money from abroad stops.",
    "grandparent_ill": "A grandparent falls ill. The hospital wants money up front."
  }
}/*END-BIRTH-JSON*/;
