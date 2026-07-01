import { useMemo } from 'react';

const FILTER_META = {
  all: { label: 'All', icon: '🌍' },
  india: { label: 'India', icon: '🇮🇳' },
  ipl: { label: 'IPL', icon: '🏆' },
  worldcup: { label: 'World Cup', icon: '🌍' },
  mlc: { label: 'MLC', icon: '🇺🇸' },
  bbl: { label: 'BBL', icon: '🇦🇺' },
  major: { label: 'Major Leagues', icon: '🏏' },
};

const normalize = (value) => (value || '').toLowerCase();

export const isIndiaCricketMatch = (fixture) => {
  const series = normalize(fixture?.league?.name);
  const home = normalize(fixture?.teams?.home?.name);
  const away = normalize(fixture?.teams?.away?.name);

  return series.includes('india') || home.includes('india') || away.includes('india');
};

export const getCricketCompetitionKey = (fixture) => {
  const series = normalize(fixture?.league?.name);

  if (series.includes('indian premier league') || series.includes('ipl')) return 'ipl';
  if (series.includes('major league cricket') || series.includes('mlc')) return 'mlc';
  if (series.includes('big bash') || series.includes('bbl')) return 'bbl';
  if (
    series.includes('world cup') ||
    series.includes('champions trophy') ||
    series.includes('world test championship') ||
    series.includes('wtc') ||
    series.includes('icc') ||
    series.includes('asia cup')
  ) {
    return 'worldcup';
  }
  if (
    series.includes('sa20') ||
    series.includes('cpl') ||
    series.includes('caribbean premier league') ||
    series.includes('the hundred') ||
    series.includes('ilt20') ||
    series.includes('lpl') ||
    series.includes('lanka premier league')
  ) {
    return 'major';
  }

  return series ? series : null;
};

const toTitleCase = (value) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const buildCricketFilters = (fixtures = []) => {
  const keys = new Set();
  let hasIndia = false;

  fixtures.forEach((fixture) => {
    if (isIndiaCricketMatch(fixture)) hasIndia = true;

    const key = getCricketCompetitionKey(fixture);
    if (key) keys.add(key);
  });

  const filters = [{ key: 'all', ...FILTER_META.all }];

  if (hasIndia) {
    filters.push({ key: 'india', ...FILTER_META.india });
  }

  Array.from(keys)
    .filter((key) => key !== 'india')
    .sort((a, b) => {
      const preferred = ['ipl', 'worldcup', 'mlc', 'bbl', 'major'];
      const aIndex = preferred.indexOf(a);
      const bIndex = preferred.indexOf(b);

      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
      }

      return a.localeCompare(b);
    })
    .forEach((key) => {
      const meta = FILTER_META[key] || {
        label: toTitleCase(key),
        icon: '🏏',
      };

      filters.push({ key, ...meta });
    });

  return filters;
};

export const filterCricketFixtures = (fixtures = [], selectedFilter = 'all') => {
  if (selectedFilter === 'all') return fixtures;
  if (selectedFilter === 'india') return fixtures.filter(isIndiaCricketMatch);

  return fixtures.filter((fixture) => getCricketCompetitionKey(fixture) === selectedFilter);
};

export default function CricketFilterBar({ fixtures = [], selectedFilter, onChange }) {
  const filters = useMemo(() => buildCricketFilters(fixtures), [fixtures]);
  const selectedExists = filters.some((filter) => filter.key === selectedFilter);
  const activeFilter = selectedExists ? selectedFilter : 'all';

  if (filters.length <= 1) return null;

  return (
    <div className="cricket-filter-wrap" aria-label="Cricket competition filters">
      <div className="cricket-filter-bar">
        {filters.map((filter) => (
          <button
            type="button"
            key={filter.key}
            className={`cricket-filter-chip ${activeFilter === filter.key ? 'cricket-filter-chip--active' : ''}`}
            onClick={() => onChange(filter.key)}
          >
            <span>{filter.icon}</span>
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
}
