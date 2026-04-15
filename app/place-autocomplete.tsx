"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { title: string; description: string };

export type PlaceDetails = {
  title: string;
  description: string;
  extract: string;
  imageUrl: string | null;
  flag: string | null;
};

type Country = { name: string; flag: string };

let cachedCountries: Country[] | null = null;
let countryPromise: Promise<Country[]> | null = null;

async function loadCountries(): Promise<Country[]> {
  if (cachedCountries) return cachedCountries;
  if (countryPromise) return countryPromise;
  countryPromise = fetch(
    "https://restcountries.com/v3.1/all?fields=name,flag",
    { cache: "force-cache" },
  )
    .then((r) => r.json())
    .then((data: Array<{ name: { common: string }; flag: string }>) => {
      const list = data
        .map((c) => ({ name: c.name.common, flag: c.flag }))
        .filter((c) => c.name && c.flag)
        // longer names first so "United States" beats "States" type matches
        .sort((a, b) => b.name.length - a.name.length);
      cachedCountries = list;
      return list;
    })
    .catch(() => []);
  return countryPromise;
}

function deriveFlag(
  title: string,
  description: string,
  countries: Country[],
): string | null {
  const titleLower = title.toLowerCase();
  const descLower = (description || "").toLowerCase();
  // Exact title match (e.g. picked "Portugal" itself)
  const exact = countries.find((c) => c.name.toLowerCase() === titleLower);
  if (exact) return exact.flag;
  // Substring match in description (e.g. "Capital of Portugal")
  const inDesc = countries.find((c) => descLower.includes(c.name.toLowerCase()));
  if (inDesc) return inDesc.flag;
  // Substring match in title (e.g. "Cape Town" mentions a country?)
  const inTitle = countries.find((c) => titleLower.includes(c.name.toLowerCase()));
  if (inTitle) return inTitle.flag;
  return null;
}

async function searchWikipedia(q: string): Promise<Suggestion[]> {
  if (!q.trim()) return [];
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    q,
  )}&limit=8&namespace=0&format=json&origin=*`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as [string, string[], string[], string[]];
  const [, titles, descriptions] = data;
  return titles.map((t, i) => ({ title: t, description: descriptions[i] ?? "" }));
}

async function fetchPlaceDetails(
  title: string,
  countries: Country[],
): Promise<PlaceDetails | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title,
  )}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const description = data.description ?? "";
  const extract = data.extract ?? "";
  return {
    title: data.title ?? title,
    description,
    extract,
    imageUrl: data.originalimage?.source ?? data.thumbnail?.source ?? null,
    flag: deriveFlag(data.title ?? title, `${description} ${extract}`, countries),
  };
}

type Props = {
  value: string;
  onSelect: (details: PlaceDetails) => void;
  onTextChange: (text: string) => void;
  placeholder?: string;
};

export function PlaceAutocomplete({
  value,
  onSelect,
  onTextChange,
  placeholder,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onQueryChange(q: string) {
    setQuery(q);
    onTextChange(q);
    setOpen(true);
    setActiveIdx(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchWikipedia(q);
      setSuggestions(results);
      setLoading(false);
    }, 220);
  }

  async function pick(s: Suggestion) {
    setQuery(s.title);
    setOpen(false);
    onTextChange(s.title);
    const details = await fetchPlaceDetails(s.title, countries);
    if (details) onSelect(details);
    else
      onSelect({
        title: s.title,
        description: s.description,
        extract: "",
        imageUrl: null,
        flag: deriveFlag(s.title, s.description, countries),
      });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <span className="label-mono">Destination</span>
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder ?? "City, country, landmark…"}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          maxLength={120}
          className="w-full bg-field text-field-foreground px-3 py-2.5 font-sans text-base outline-none focus:ring-2 focus:ring-accent"
          style={{
            borderWidth: "1.5px",
            borderStyle: "solid",
            borderColor: "var(--foreground)",
            borderRadius: "2px",
          }}
        />
        {open && (suggestions.length > 0 || loading) && (
          <ul
            className="absolute z-20 mt-1 w-full bg-surface max-h-72 overflow-auto shadow-[4px_4px_0_var(--foreground)]"
            style={{
              borderWidth: "1.5px",
              borderStyle: "solid",
              borderColor: "var(--foreground)",
            }}
          >
            {loading && suggestions.length === 0 && (
              <li className="px-3 py-2 label-mono">Searching…</li>
            )}
            {suggestions.map((s, i) => {
              const flag = deriveFlag(s.title, s.description, countries);
              return (
                <li
                  key={s.title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex items-start gap-3 px-3 py-2 cursor-pointer border-b-1 border-[var(--foreground)]/10 ${
                    i === activeIdx ? "bg-surface-secondary" : ""
                  }`}
                >
                  <span className="text-xl leading-tight pt-0.5 w-6 text-center">
                    {flag ?? ""}
                  </span>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="font-sans font-semibold text-sm leading-tight">
                      {s.title}
                    </span>
                    {s.description && (
                      <span className="font-mono text-xs text-muted uppercase tracking-wider truncate">
                        {s.description}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
