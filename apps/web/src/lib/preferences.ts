// Mivvi preferences: explicit tags users set on their profile that the
// assignment agent applies as automatic exclusions.
//
// The keywords array below is baked into the agent system prompt verbatim so
// the LLM can classify receipt items into exclusion categories at inference
// time without a separate classifier call. Keep keywords plural + lowercase.

export type PreferenceTag = {
  id: string
  label: string
  description: string
  /** Keywords the agent uses to match receipt items to this exclusion. */
  keywords: string[]
}

export const PREFERENCE_TAGS: readonly PreferenceTag[] = [
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    description: 'No meat or seafood',
    keywords: [
      'steak', 'chicken', 'beef', 'pork', 'lamb', 'bacon', 'ham', 'turkey',
      'duck', 'sausage', 'prosciutto', 'veal', 'venison', 'salami', 'pepperoni',
      'meatball', 'meatballs', 'brisket', 'ribs', 'rib-eye', 'ribeye', 'burger',
      'bolognese', 'carbonara', 'shrimp', 'prawn', 'salmon', 'tuna', 'fish',
      'octopus', 'squid', 'anchovy', 'anchovies', 'oyster', 'oysters', 'crab',
      'lobster', 'scallop', 'scallops',
    ],
  },
  {
    id: 'pescatarian',
    label: 'Pescatarian',
    description: 'Fish OK, no other meat',
    keywords: [
      'steak', 'chicken', 'beef', 'pork', 'lamb', 'bacon', 'ham', 'turkey',
      'duck', 'sausage', 'prosciutto', 'veal', 'salami', 'pepperoni',
      'meatball', 'meatballs', 'brisket', 'ribs', 'burger', 'bolognese',
    ],
  },
  {
    id: 'vegan',
    label: 'Vegan',
    description: 'No animal products (includes dairy + eggs)',
    keywords: [
      // Everything vegetarian excludes...
      'steak', 'chicken', 'beef', 'pork', 'lamb', 'bacon', 'ham', 'turkey',
      'duck', 'sausage', 'prosciutto', 'veal', 'venison', 'salami', 'pepperoni',
      'meatball', 'brisket', 'ribs', 'burger', 'bolognese', 'carbonara',
      'shrimp', 'salmon', 'tuna', 'fish', 'octopus', 'oyster', 'crab', 'lobster',
      // ...plus dairy, eggs, honey.
      'cheese', 'milk', 'butter', 'cream', 'yogurt', 'yoghurt', 'ice cream',
      'gelato', 'custard', 'parmesan', 'mozzarella', 'feta', 'cheddar',
      'egg', 'eggs', 'omelet', 'omelette', 'frittata', 'mayo', 'mayonnaise',
      'honey', 'aioli',
    ],
  },
  {
    id: 'no_alcohol',
    label: "Doesn't drink alcohol",
    description: 'Exclude from wine, beer, spirits, cocktails',
    keywords: [
      'wine', 'beer', 'ale', 'lager', 'ipa', 'stout', 'pilsner', 'cider',
      'cocktail', 'martini', 'margarita', 'mojito', 'negroni', 'spritz',
      'whiskey', 'whisky', 'bourbon', 'scotch', 'rum', 'vodka', 'tequila',
      'gin', 'sake', 'soju', 'champagne', 'prosecco', 'rose', 'rosé',
      'cabernet', 'merlot', 'malbec', 'chardonnay', 'pinot', 'sangria',
      'bottle', 'pitcher', 'mimosa', 'old fashioned',
    ],
  },
  {
    id: 'dairy_free',
    label: 'No dairy',
    description: 'Lactose-intolerant or avoiding dairy',
    keywords: [
      'cheese', 'milk', 'butter', 'cream', 'yogurt', 'yoghurt', 'ice cream',
      'gelato', 'custard', 'parmesan', 'mozzarella', 'feta', 'cheddar',
      'ricotta', 'brie', 'camembert', 'latte', 'cappuccino', 'mocha',
      'macchiato',
    ],
  },
  {
    id: 'gluten_free',
    label: 'Gluten-free',
    description: 'Avoid wheat-based items',
    keywords: [
      'bread', 'baguette', 'bun', 'croissant', 'pasta', 'spaghetti', 'ravioli',
      'gnocchi', 'pizza', 'pierogi', 'dumpling', 'dumplings', 'pancake',
      'pancakes', 'waffle', 'waffles', 'toast', 'sandwich', 'burger bun',
      'bagel', 'pretzel', 'noodle', 'noodles', 'ramen', 'udon', 'lasagna',
      'cake', 'cookie', 'cookies', 'muffin', 'brownie', 'donut', 'tortilla',
    ],
  },
  {
    id: 'no_peanuts',
    label: 'Peanut allergy',
    description: 'Exclude any peanut items',
    keywords: [
      'peanut', 'peanuts', 'pad thai', 'satay', 'groundnut',
    ],
  },
  {
    id: 'no_shellfish',
    label: 'Shellfish allergy',
    description: 'Exclude shrimp, crab, lobster, etc.',
    keywords: [
      'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'scallops',
      'crayfish', 'crawfish', 'clam', 'clams', 'mussel', 'mussels',
    ],
  },
]

const TAG_IDS = new Set(PREFERENCE_TAGS.map((t) => t.id))

export function validatePreferences(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((x): x is string => typeof x === 'string' && TAG_IDS.has(x))
}

// Compact, LLM-consumable description of all tags + their keyword hints.
// Injected into the agent system prompt when any participant has preferences.
export function preferencesPromptVocabulary(): string {
  return PREFERENCE_TAGS.map((t) =>
    `- **${t.id}** (${t.label}): exclude items matching any of [${t.keywords.slice(0, 12).join(', ')}${t.keywords.length > 12 ? ', …' : ''}]`,
  ).join('\n')
}

// Build a human-readable summary of which participant has which tags,
// for injection into the agent user-message context.
export function formatParticipantPreferences(
  entries: { name: string; preferences: string[] }[],
): string {
  const withTags = entries.filter((e) => e.preferences.length > 0)
  if (withTags.length === 0) return ''
  return withTags
    .map((e) => `- ${e.name}: ${e.preferences.join(', ')}`)
    .join('\n')
}
