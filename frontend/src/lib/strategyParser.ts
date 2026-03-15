export function parseUserRules(strategy: string): string[] {
  return strategy
    .split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (!l || l.startsWith('//')) return false;
      const lower = l.toLowerCase();
      return (
        lower.includes('max') ||
        lower.includes('avoid') ||
        lower.includes('never') ||
        lower.includes('only') ||
        lower.includes('%') ||
        lower.includes('prefer') ||
        lower.includes('no ')
      );
    });
}

export function extractGoal(strategy: string): string {
  const lines = strategy
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'));

  const goal = lines.find(l => {
    const lower = l.toLowerCase();
    return (
      !lower.includes('max') &&
      !lower.includes('avoid') &&
      !lower.includes('never') &&
      !lower.includes('only') &&
      !lower.includes('%') &&
      !lower.includes('prefer') &&
      !lower.includes('no ')
    );
  });

  return goal || "Analyze current market and suggest best DeFi trade";
}