// Starter content for the Hebrew "Language Islands" app.
// Each island groups a small set of words/phrases: { id, hebrew, transliteration, english }
const ISLANDS = [
  {
    id: "greetings",
    name: "Greetings",
    hebrewName: "ברכות",
    emoji: "👋",
    items: [
      { id: "greetings-1", hebrew: "שלום", transliteration: "Shalom", english: "Hello / Peace" },
      { id: "greetings-2", hebrew: "בוקר טוב", transliteration: "Boker tov", english: "Good morning" },
      { id: "greetings-3", hebrew: "לילה טוב", transliteration: "Laila tov", english: "Good night" },
      { id: "greetings-4", hebrew: "תודה", transliteration: "Toda", english: "Thank you" },
      { id: "greetings-5", hebrew: "בבקשה", transliteration: "Bevakasha", english: "Please / You're welcome" },
      { id: "greetings-6", hebrew: "להתראות", transliteration: "Lehitraot", english: "Goodbye" },
    ],
  },
  {
    id: "numbers",
    name: "Numbers",
    hebrewName: "מספרים",
    emoji: "🔢",
    items: [
      { id: "numbers-1", hebrew: "אחת", transliteration: "Achat", english: "One" },
      { id: "numbers-2", hebrew: "שתיים", transliteration: "Shtayim", english: "Two" },
      { id: "numbers-3", hebrew: "שלוש", transliteration: "Shalosh", english: "Three" },
      { id: "numbers-4", hebrew: "ארבע", transliteration: "Arba", english: "Four" },
      { id: "numbers-5", hebrew: "חמש", transliteration: "Chamesh", english: "Five" },
      { id: "numbers-6", hebrew: "עשר", transliteration: "Eser", english: "Ten" },
    ],
  },
  {
    id: "family",
    name: "Family",
    hebrewName: "משפחה",
    emoji: "👨‍👩‍👧",
    items: [
      { id: "family-1", hebrew: "אמא", transliteration: "Ima", english: "Mom" },
      { id: "family-2", hebrew: "אבא", transliteration: "Aba", english: "Dad" },
      { id: "family-3", hebrew: "אח", transliteration: "Ach", english: "Brother" },
      { id: "family-4", hebrew: "אחות", transliteration: "Achot", english: "Sister" },
      { id: "family-5", hebrew: "סבא", transliteration: "Saba", english: "Grandpa" },
      { id: "family-6", hebrew: "סבתא", transliteration: "Savta", english: "Grandma" },
    ],
  },
  {
    id: "food",
    name: "Food",
    hebrewName: "אוכל",
    emoji: "🍽️",
    items: [
      { id: "food-1", hebrew: "לחם", transliteration: "Lechem", english: "Bread" },
      { id: "food-2", hebrew: "מים", transliteration: "Mayim", english: "Water" },
      { id: "food-3", hebrew: "פרי", transliteration: "Pri", english: "Fruit" },
      { id: "food-4", hebrew: "חלב", transliteration: "Chalav", english: "Milk" },
      { id: "food-5", hebrew: "ביצה", transliteration: "Beitza", english: "Egg" },
      { id: "food-6", hebrew: "עוגה", transliteration: "Uga", english: "Cake" },
    ],
  },
  {
    id: "everyday",
    name: "Everyday Phrases",
    hebrewName: "ביטויים יומיומיים",
    emoji: "💬",
    items: [
      { id: "everyday-1", hebrew: "כן", transliteration: "Ken", english: "Yes" },
      { id: "everyday-2", hebrew: "לא", transliteration: "Lo", english: "No" },
      { id: "everyday-3", hebrew: "סליחה", transliteration: "Slicha", english: "Excuse me / Sorry" },
      { id: "everyday-4", hebrew: "כמה זה עולה", transliteration: "Kama ze ole", english: "How much does this cost?" },
      { id: "everyday-5", hebrew: "אני לומד עברית", transliteration: "Ani lomed ivrit", english: "I am learning Hebrew" },
      { id: "everyday-6", hebrew: "נעים מאוד", transliteration: "Naim meod", english: "Nice to meet you" },
    ],
  },
];
