const COLORS = [
  '#E57373', // Coral
  '#BA68C8', // Amethyst
  '#9575CD', // Lavender
  '#7986CB', // Indigo
  '#64B5F6', // Sky
  '#4DB6AC', // Teal
  '#81C784', // Mint
  '#FFB74D', // Gold
  '#FF8A65', // Sunset
  '#A1887F', // Sand
];

export function getAvatarColor(name: string): string {
  if (!name) return '#7986CB';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
}

export function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, Math.min(2, name.length)).toUpperCase();
}
