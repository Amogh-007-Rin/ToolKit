/** English is the source locale. Screens use these keys so copy can be replaced by a locale loader later. */
export const en = {
  navigation: { overview: "Overview", tools: "Tools", ai: "AI Search", messages: "Messages", explore: "Explore" },
  overview: { title: "Overview", search: "Search creators, tools, posts...", loadError: "Could not load your feed.", filters: ["All feeds", "Featured collections", "Sponsored", "Matrix"], createPost: "Create post" },
  tools: { title: "My Collections", add: "Collection", search: "Search tools...", newCollection: "New collection", collectionTitle: "Collection title", description: "Description", create: "Create", loadError: "Could not load collections.", emptyTitle: "Create your first collection", emptyDetail: "Group related tools, add descriptions, and showcase your favorites.", noDescription: "No description" },
  ai: { title: "ToolKit AI", subtitle: "Describe the job. Find the right tools.", conversations: "Conversations", emptyTitle: "What are you looking for?", emptyDetail: "Ask for a coding assistant, creative tool, or workflow recommendation.", prompt: "Ask for a tool...", delete: "Delete conversation" },
  messages: { title: "Messages", subtitle: "Realtime conversations with ToolKit creators.", search: "Search conversations...", loadError: "Could not load conversations.", emptyTitle: "No conversations yet", emptyDetail: "Start one from a creator profile.", choose: "Choose a conversation" },
  explore: { title: "Explore Creators", subtitle: "Find people with a toolkit worth following.", search: "Search creators..." },
  settings: {
    title: "Settings",
    subtitle: "Control your account and mobile experience.",
    appearance: "Appearance",
    system: "System",
    light: "Light",
    dark: "Dark",
    highContrast: "High contrast",
    reducedMotion: "Reduced motion",
    security: "Account and security",
    signOut: "Sign out of this device",
  },
  common: {
    cancel: "Cancel",
    retry: "Retry",
  },
} as const;
