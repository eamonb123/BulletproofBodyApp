"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useSpring, useTransform } from "framer-motion";

interface SnackItem {
  id: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  sugar: number;
  carbs: number;
  fat: number;
  serving: string;
  image_url: string | null;
  instacart_url: string;
  walmart_url: string;
}

interface SnackSwapPair {
  id: string;
  title: string;
  context: string;
  craving: string;
  rationale: string;
  original: SnackItem;
  swap: SnackItem;
}

interface SnackProfile {
  id: string;
  name: string;
}

interface ProfileSnackRow {
  id: number;
  frequency_per_week: number;
  display_order: number;
  snack_swap_id: string;
  swap: SnackSwapPair;
}

interface DisplaySnackRow {
  key: string;
  pair: SnackSwapPair;
  frequency: number;
  profileRowId: number | null;
}

const frequencyChoices = [7, 6, 5, 4, 3, 2, 1] as const;

function getCalorieSavings(pair: SnackSwapPair) {
  return Math.max(0, pair.original.calories - pair.swap.calories);
}

function getProteinGain(pair: SnackSwapPair) {
  return pair.swap.protein - pair.original.protein;
}

function getSugarDrop(pair: SnackSwapPair) {
  return Math.max(0, pair.original.sugar - pair.swap.sugar);
}

function clampFrequency(value: number) {
  if (Number.isNaN(value)) return 7;
  return Math.max(1, Math.min(7, Math.round(value)));
}

function getSearchHaystack(pair: SnackSwapPair) {
  return [
    pair.title,
    pair.context,
    pair.craving,
    pair.rationale,
    pair.original.name,
    pair.original.brand,
    pair.swap.name,
    pair.swap.brand,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesFilters(pair: SnackSwapPair, activeCraving: string, query: string) {
  if (activeCraving !== "All" && pair.craving !== activeCraving) {
    return false;
  }
  if (!query) return true;
  return getSearchHaystack(pair).includes(query);
}

function AnimatedValue({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(value, { stiffness: 115, damping: 24, mass: 0.9 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
    return unsubscribe;
  }, [display]);

  return <span ref={ref}>{value.toFixed(decimals)}</span>;
}

export default function SnackBiblePage() {
  const [catalogPairs, setCatalogPairs] = useState<SnackSwapPair[]>([]);
  const [sampleFrequencyByPairId, setSampleFrequencyByPairId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCraving, setActiveCraving] = useState("All");

  const [activeProfile, setActiveProfile] = useState<SnackProfile | null>(null);
  const [profileRows, setProfileRows] = useState<ProfileSnackRow[]>([]);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [addSnackQuery, setAddSnackQuery] = useState("");
  const [rowPendingMap, setRowPendingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isCancelled = false;

    fetch("/api/snack-swaps")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load snack swaps");
        }
        return response.json();
      })
      .then((data: { swaps?: SnackSwapPair[] }) => {
        if (isCancelled) return;
        const swaps = Array.isArray(data.swaps) ? data.swaps : [];

        setCatalogPairs(swaps);
        setSampleFrequencyByPairId((prev) => {
          const next = { ...prev };
          for (const pair of swaps) {
            if (!next[pair.id]) next[pair.id] = 7;
          }
          return next;
        });

        setLoadError(null);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load snack swaps");
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const cravings = useMemo(
    () => ["All", ...Array.from(new Set(catalogPairs.map((pair) => pair.craving)))],
    [catalogPairs]
  );

  const query = searchQuery.trim().toLowerCase();

  const displayRows = useMemo<DisplaySnackRow[]>(() => {
    if (activeProfile) {
      return profileRows
        .filter((row) => matchesFilters(row.swap, activeCraving, query))
        .map((row) => ({
          key: `profile-${row.id}`,
          pair: row.swap,
          frequency: row.frequency_per_week,
          profileRowId: row.id,
        }));
    }

    return catalogPairs
      .filter((pair) => matchesFilters(pair, activeCraving, query))
      .map((pair) => ({
        key: `sample-${pair.id}`,
        pair,
        frequency: sampleFrequencyByPairId[pair.id] ?? 7,
        profileRowId: null,
      }));
  }, [activeProfile, profileRows, catalogPairs, sampleFrequencyByPairId, activeCraving, query]);

  const totalRows = useMemo<DisplaySnackRow[]>(() => {
    if (activeProfile) {
      return profileRows.map((row) => ({
        key: `profile-${row.id}`,
        pair: row.swap,
        frequency: row.frequency_per_week,
        profileRowId: row.id,
      }));
    }

    return catalogPairs.map((pair) => ({
      key: `sample-${pair.id}`,
      pair,
      frequency: sampleFrequencyByPairId[pair.id] ?? 7,
      profileRowId: null,
    }));
  }, [activeProfile, profileRows, catalogPairs, sampleFrequencyByPairId]);

  const totals = useMemo(() => {
    const weeklyCalories = totalRows.reduce((sum, row) => {
      return sum + getCalorieSavings(row.pair) * row.frequency;
    }, 0);

    const weeklyFatLoss = weeklyCalories / 3500;
    const monthlyFatLoss = (weeklyCalories * 4) / 3500;

    return {
      weeklyCalories,
      weeklyFatLoss,
      monthlyFatLoss,
      rowCount: totalRows.length,
    };
  }, [totalRows]);

  const addedPairIds = useMemo(() => {
    if (!activeProfile) return new Set<string>();
    return new Set(profileRows.map((row) => row.snack_swap_id));
  }, [activeProfile, profileRows]);

  const addSnackResults = useMemo(() => {
    if (!activeProfile) return [];

    const q = addSnackQuery.trim().toLowerCase();
    if (!q) return [];

    return catalogPairs
      .filter((pair) => !addedPairIds.has(pair.id))
      .filter((pair) => getSearchHaystack(pair).includes(q))
      .slice(0, 8);
  }, [activeProfile, addSnackQuery, catalogPairs, addedPairIds]);

  async function loadProfileById(profileId: string) {
    const response = await fetch(`/api/snack-profiles/${profileId}`);
    const data = (await response.json()) as {
      error?: string;
      profile?: SnackProfile;
      rows?: ProfileSnackRow[];
    };

    if (!response.ok || !data.profile) {
      throw new Error(data.error ?? "Unable to load profile");
    }

    setActiveProfile(data.profile);
    setProfileRows(Array.isArray(data.rows) ? data.rows : []);
  }

  async function handleCreateOrLoadProfile() {
    const name = profileNameInput.trim();
    if (!name) return;

    setProfileLoading(true);
    setProfileError(null);

    try {
      const response = await fetch("/api/snack-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = (await response.json()) as {
        error?: string;
        profile?: SnackProfile;
        rows?: ProfileSnackRow[];
      };

      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? "Unable to create/load profile");
      }

      setActiveProfile(data.profile);
      setProfileRows(Array.isArray(data.rows) ? data.rows : []);
      setPersonalizeOpen(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to create/load profile");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleAddSnackToProfile(pairId: string) {
    if (!activeProfile) return;

    setRowPendingMap((prev) => ({ ...prev, [pairId]: true }));

    try {
      const response = await fetch(`/api/snack-profiles/${activeProfile.id}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snackSwapId: pairId, frequencyPerWeek: 7 }),
      });

      const data = (await response.json()) as { error?: string; rows?: ProfileSnackRow[] };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to add snack");
      }

      setProfileRows(Array.isArray(data.rows) ? data.rows : []);
      setAddSnackQuery("");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to add snack");
    } finally {
      setRowPendingMap((prev) => ({ ...prev, [pairId]: false }));
    }
  }

  async function handleUseSampleDataInProfile() {
    if (!activeProfile || catalogPairs.length === 0) return;

    setProfileLoading(true);
    setProfileError(null);

    try {
      await Promise.all(
        catalogPairs.map((pair) =>
          fetch(`/api/snack-profiles/${activeProfile.id}/rows`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              snackSwapId: pair.id,
              frequencyPerWeek: sampleFrequencyByPairId[pair.id] ?? 7,
            }),
          })
        )
      );

      await loadProfileById(activeProfile.id);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to copy sample snacks");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleProfileRowFrequency(rowId: number, frequency: number) {
    if (!activeProfile) return;

    const next = clampFrequency(frequency);

    setProfileRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, frequency_per_week: next } : row))
    );

    try {
      const response = await fetch(
        `/api/snack-profiles/${activeProfile.id}/rows/${rowId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frequencyPerWeek: next }),
        }
      );

      const data = (await response.json()) as { error?: string; rows?: ProfileSnackRow[] };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update frequency");
      }

      if (Array.isArray(data.rows)) {
        setProfileRows(data.rows);
      }
    } catch {
      await loadProfileById(activeProfile.id);
    }
  }

  async function handleRemoveProfileRow(rowId: number) {
    if (!activeProfile) return;

    setProfileRows((prev) => prev.filter((row) => row.id !== rowId));

    try {
      const response = await fetch(
        `/api/snack-profiles/${activeProfile.id}/rows/${rowId}`,
        {
          method: "DELETE",
        }
      );

      const data = (await response.json()) as { error?: string; rows?: ProfileSnackRow[] };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove snack row");
      }

      if (Array.isArray(data.rows)) {
        setProfileRows(data.rows);
      }
    } catch {
      await loadProfileById(activeProfile.id);
    }
  }

  function handleSampleFrequency(pairId: string, frequency: number) {
    const next = clampFrequency(frequency);
    setSampleFrequencyByPairId((prev) => ({ ...prev, [pairId]: next }));
  }

  return (
    <div className="min-h-screen bg-black pb-16 text-white">
      <header className="border-b border-zinc-800 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Back
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Snack Bible
            </h1>
            <p className="mt-1 text-base text-zinc-400">
              Calories first. Protein second. Personalized weekly impact.
            </p>
          </div>
          <button
            onClick={() => setPersonalizeOpen((prev) => !prev)}
            className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300"
          >
            {activeProfile ? "Switch" : "Personalize"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-4">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {activeProfile
                ? `Plan: ${activeProfile.name}`
                : "Sample snack swaps (client preview)"}
            </p>
            {!activeProfile && (
              <button
                onClick={() => setPersonalizeOpen(true)}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300"
              >
                Personalize This For Me
              </button>
            )}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <label
                htmlFor="snack-search"
                className="mb-2 block text-sm font-semibold uppercase tracking-wider text-zinc-400"
              >
                Search Snacks
              </label>
              <input
                id="snack-search"
                type="text"
                placeholder="Cheetos, chocolate, crunchy, desk drawer..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
              {displayRows.length} rows showing
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {cravings.map((craving) => (
              <button
                key={craving}
                onClick={() => setActiveCraving(craving)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeCraving === craving
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                }`}
              >
                {craving}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {personalizeOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/80"
              >
                <div className="p-3">
                  <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    Personalize Snack Plan
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={profileNameInput}
                      onChange={(event) => setProfileNameInput(event.target.value)}
                      placeholder="Client name"
                      className="h-10 w-60 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-base text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleCreateOrLoadProfile}
                      disabled={profileLoading || !profileNameInput.trim()}
                      className="h-10 rounded-lg bg-emerald-500 px-3 text-sm font-semibold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      {profileLoading ? "Loading..." : "Load Or Create"}
                    </button>
                    {activeProfile && (
                      <button
                        onClick={() => {
                          setActiveProfile(null);
                          setProfileRows([]);
                          setProfileError(null);
                        }}
                        className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold uppercase tracking-wider text-zinc-300"
                      >
                        Exit Personal Plan
                      </button>
                    )}
                  </div>
                  {profileError && (
                    <p className="mt-2 text-sm text-rose-300">{profileError}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <div className="sticky top-2 z-20 mt-4 rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-3 shadow-[0_12px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="grid gap-2 sm:grid-cols-3">
            <StickyMetric
              label="Weekly Calories Saved"
              value={totals.weeklyCalories}
              suffix="cal"
              decimals={0}
            />
            <StickyMetric
              label="Projected Fat Loss / Week"
              value={totals.weeklyFatLoss}
              suffix="lbs"
              decimals={2}
            />
            <StickyMetric
              label="Projected Fat Loss / Month"
              value={totals.monthlyFatLoss}
              suffix="lbs"
              decimals={1}
            />
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {totals.rowCount} snack rows in plan.
          </p>
        </div>

        {activeProfile && (
          <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Add Snack To {activeProfile.name}
            </p>
            <input
              type="text"
              value={addSnackQuery}
              onChange={(event) => setAddSnackQuery(event.target.value)}
              placeholder="Type your favorite snack to add..."
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base text-white placeholder-zinc-500 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
            />
            {addSnackQuery.trim() && (
              <div className="mt-3 space-y-2">
                {addSnackResults.map((pair) => (
                  <div
                    key={pair.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {pair.original.name}
                      </p>
                      <p className="truncate text-sm text-zinc-400">
                        {pair.swap.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddSnackToProfile(pair.id)}
                      disabled={rowPendingMap[pair.id]}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-black disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                    >
                      {rowPendingMap[pair.id] ? "Adding..." : "Add"}
                    </button>
                  </div>
                ))}
                {addSnackResults.length === 0 && (
                  <p className="text-sm text-zinc-400">No snack match found in current catalog yet.</p>
                )}
              </div>
            )}

            {profileRows.length === 0 && (
              <button
                onClick={handleUseSampleDataInProfile}
                disabled={profileLoading}
                className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold uppercase tracking-wider text-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-500"
              >
                {profileLoading ? "Copying..." : "Use Sample Data In My Plan"}
              </button>
            )}
          </section>
        )}

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-14 text-center"
            >
              <p className="text-zinc-400">Loading snack swaps...</p>
            </motion.div>
          )}

          {!loading && loadError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-14 text-center"
            >
              <p className="text-rose-300">Could not load snack swaps.</p>
              <p className="mt-1 text-base text-zinc-400">{loadError}</p>
            </motion.div>
          )}

          {!loading && !loadError && displayRows.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-14 text-center"
            >
              <p className="text-zinc-400">No snack swaps match that filter.</p>
              <p className="mt-1 text-base text-zinc-400">
                Try another craving tag or broader search term.
              </p>
            </motion.div>
          )}

          {!loading && !loadError && displayRows.length > 0 && (
            <motion.div
              key="rows"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5 space-y-4"
            >
              {displayRows.map((row, index) => {
                const profileRowId = row.profileRowId;
                const canEditProfileRow = activeProfile && profileRowId !== null;
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.2 }}
                  >
                    <SnackSwapRow
                      pair={row.pair}
                      frequency={row.frequency}
                      onFrequencyChange={(nextValue) => {
                        if (canEditProfileRow) {
                          handleProfileRowFrequency(profileRowId, nextValue);
                        } else {
                          handleSampleFrequency(row.pair.id, nextValue);
                        }
                      }}
                      onRemove={
                        canEditProfileRow
                          ? () => handleRemoveProfileRow(profileRowId)
                          : undefined
                      }
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StickyMetric({
  label,
  value,
  suffix,
  decimals,
}: {
  label: string;
  value: number;
  suffix: string;
  decimals: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2.5">
      <p className="text-sm uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-3xl font-bold text-emerald-300">
        <AnimatedValue value={value} decimals={decimals} /> {suffix}
      </p>
    </div>
  );
}

function SnackSwapRow({
  pair,
  frequency,
  onFrequencyChange,
  onRemove,
}: {
  pair: SnackSwapPair;
  frequency: number;
  onFrequencyChange: (value: number) => void;
  onRemove?: () => void;
}) {
  const calorieSavings = getCalorieSavings(pair);
  const proteinGain = getProteinGain(pair);
  const sugarDrop = getSugarDrop(pair);
  const weeklyCalorieSavings = calorieSavings * frequency;
  const weeklyFatLoss = weeklyCalorieSavings / 3500;
  const showSugarAsTertiary = proteinGain < 8 && sugarDrop > 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold leading-tight text-white">{pair.title}</h2>
          <p className="text-base text-zinc-400">{pair.context}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-800 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300">
            {pair.craving}
          </span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300 hover:border-rose-500/40 hover:text-rose-300"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <DeltaBadge color="emerald" text={`-${calorieSavings} cal per swap`} />
        {proteinGain > 0 && (
          <DeltaBadge color="emerald" text={`+${proteinGain}g protein`} />
        )}
        {showSugarAsTertiary && (
          <DeltaBadge color="zinc" text={`-${sugarDrop}g sugar`} />
        )}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_280px]">
        <SnackCard label="Current Snack" item={pair.original} tone="rose" />
        <SnackCard label="Smarter Swap" item={pair.swap} tone="emerald" />
        <ImpactPanel
          frequency={frequency}
          weeklyFatLoss={weeklyFatLoss}
          weeklyCalorieSavings={weeklyCalorieSavings}
          onFrequencyChange={onFrequencyChange}
        />
      </div>

      <p className="mt-3 text-base text-zinc-300">{pair.rationale}</p>
    </article>
  );
}

function SnackCard({
  label,
  item,
  tone,
}: {
  label: string;
  item: SnackItem;
  tone: "rose" | "emerald";
}) {
  const borderTone = tone === "emerald" ? "border-emerald-500/35" : "border-rose-500/35";
  const labelTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";
  const caloriesTone = tone === "emerald" ? "text-emerald-300" : "text-rose-300";

  return (
    <div className={`rounded-2xl border ${borderTone} bg-zinc-950/90 p-4`}>
      <p className={`text-sm font-semibold uppercase tracking-wider ${labelTone}`}>
        {label}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-zinc-500">
              {item.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold leading-tight text-white">
            {item.name}
          </p>
          <p className="truncate text-base text-zinc-400">{item.brand}</p>
          <p className="truncate text-base text-zinc-400">{item.serving}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric label="Calories" value={`${item.calories}`} valueTone={caloriesTone} />
        <Metric label="Protein" value={`${item.protein}g`} />
      </div>
      <div className="mt-3 flex gap-2">
        <ShopLink href={item.instacart_url} label="Instacart" tone="emerald" />
        <ShopLink href={item.walmart_url} label="Walmart" tone="zinc" />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueTone = "text-zinc-100",
}: {
  label: string;
  value: string;
  valueTone?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-900 px-3 py-2">
      <p className="text-sm uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`text-3xl font-bold leading-none ${valueTone}`}>{value}</p>
    </div>
  );
}

function ShopLink({
  href,
  label,
  tone,
}: {
  href: string;
  label: string;
  tone: "emerald" | "zinc";
}) {
  const className =
    tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors ${className}`}
    >
      Shop {label}
    </a>
  );
}

function ImpactPanel({
  frequency,
  weeklyFatLoss,
  weeklyCalorieSavings,
  onFrequencyChange,
}: {
  frequency: number;
  weeklyFatLoss: number;
  weeklyCalorieSavings: number;
  onFrequencyChange: (value: number) => void;
}) {
  return (
    <aside className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
        Weekly Impact
      </p>
      <p className="mt-1 text-5xl font-black leading-none text-emerald-300">
        <AnimatedValue value={weeklyFatLoss} decimals={2} />
      </p>
      <p className="text-base font-medium text-zinc-200">lbs fat / week</p>

      <p className="mt-3 text-sm uppercase tracking-wider text-zinc-300">
        Frequency
      </p>
      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={() => onFrequencyChange(frequency - 1)}
          className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500"
          aria-label="Decrease frequency"
        >
          -
        </button>
        <input
          type="number"
          min={1}
          max={7}
          value={frequency}
          onChange={(event) => onFrequencyChange(clampFrequency(Number(event.target.value)))}
          className="h-9 w-14 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center text-base font-semibold text-white outline-none focus:border-emerald-500"
        />
        <button
          onClick={() => onFrequencyChange(frequency + 1)}
          className="h-9 w-9 rounded-lg border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 transition-colors hover:border-zinc-500"
          aria-label="Increase frequency"
        >
          +
        </button>
        <p className="text-sm text-zinc-400">times/week</p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {frequencyChoices.map((option) => (
          <button
            key={option}
            onClick={() => onFrequencyChange(option)}
            className={`rounded-full px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
              frequency === option
                ? "bg-emerald-500/25 text-emerald-200"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            {option}x
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-zinc-700/70 bg-zinc-950/70 px-3 py-2">
        <p className="text-sm uppercase tracking-wider text-zinc-400">
          Calories Saved / Week
        </p>
        <p className="text-3xl font-bold text-emerald-300">
          -<AnimatedValue value={weeklyCalorieSavings} decimals={0} /> cal
        </p>
      </div>
    </aside>
  );
}

function DeltaBadge({
  color,
  text,
}: {
  color: "emerald" | "zinc";
  text: string;
}) {
  if (color === "emerald") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-emerald-300">
        {text}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-zinc-800 px-2.5 py-1.5 text-sm font-semibold uppercase tracking-wider text-zinc-300">
      {text}
    </span>
  );
}
