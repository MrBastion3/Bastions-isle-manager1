// Rarity categories and their probabilities
const rarityCategories = {
    'Common': 50,
    'Uncommon': 30,
    'Rare': 15,
    'Epic': 4,
    'Legendary': 1
};

// Mapping dinos to their respective rarity categories
const dinoRarityMapping = {
    'Common': ['Utah Raptor', 'Ceratosaurus', 'Dilophosaurus', 'Dryosaurus', 'Gallimimus', 'Pachycephalosaurus'],
    'Uncommon': ['Carnotaurus', 'Suchomimus', 'Allosaurus', 'Parasaurolophus', 'Maiasaura', 'Diabloceratops'],
    'Rare': ['Giganotosaurus', 'Tyrannosaurus', 'Triceratops'],
    'Epic': ['Albertosaurus', 'Acrocanthosaurus', 'Ankylosaurus', 'Stegosaurus', 'Therizinosaurus'],
    'Legendary': ['Spinosaurus', 'Shantungosaurus', 'Camarasaurus', 'Puertasaurus']
};

// Function to determine rarity based on probabilities
function determineRarity() {
    const totalProbability = Object.values(rarityCategories).reduce((sum, prob) => sum + prob, 0);
    const randomChoice = Math.random() * totalProbability;
    let currentSum = 0;

    for (const [rarity, probability] of Object.entries(rarityCategories)) {
        currentSum += probability;
        if (randomChoice <= currentSum) {
            return rarity;
        }
    }
    return 'Common'; // Fallback, though it should always return within the loop
}

// Function to select a dino based on its rarity
function selectDinoBasedOnRarity() {
    const rarity = determineRarity();
    const dinos = dinoRarityMapping[rarity];
    const selectedDino = dinos[Math.floor(Math.random() * dinos.length)];
    return [selectedDino, rarity];
}

module.exports = {
    selectDinoBasedOnRarity
};
