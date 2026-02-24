'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  RotateCcw, User, Cpu, Trophy, Flame,
  Globe, Check, ChevronsUpDown, Target,
  Volume2, VolumeX, Swords,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useBattle } from '@/hooks/useBattle';
import type { JokeLogEntry } from '@/hooks/useBattle';
import type { Player } from '@/services/gameService';

// ---- Data ----

const CONTINENTS = [
  'Africa', 'Asia', 'Balkans', 'Caribbean', 'Europe',
  'Middle East', 'North America', 'Oceania', 'Scandinavia', 'South America',
];

const COUNTRIES = [
  'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada',
  'Chile', 'China', 'Colombia', 'Denmark', 'Egypt', 'Finland', 'France',
  'Germany', 'Greece', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Kenya', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands',
  'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Russia', 'Saudi Arabia', 'Singapore', 'South Africa',
  'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey',
  'UAE', 'UK', 'Ukraine', 'USA', 'Vietnam',
];

type LocationType = 'country' | 'continent';

// ---- Reusable Button ----

const GameButton = ({
  children, onClick, disabled, className, variant = 'primary', size = 'md',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const variants: Record<string, string> = {
    primary:   'bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-[0_4px_0_#3c45a5]',
    secondary: 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-700 shadow-[0_4px_0_#e2e8f0] dark:shadow-[0_4px_0_#1e293b]',
    danger:    'bg-[#ED4245] hover:bg-[#d63b3e] text-white shadow-[0_4px_0_#c03538]',
    success:   'bg-[#3BA55C] hover:bg-[#2d8d4b] text-white shadow-[0_4px_0_#24753c]',
  };
  const sizes: Record<string, string> = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ y: 2, boxShadow: '0 0px 0 0' }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative rounded-2xl font-black uppercase tracking-wide transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-[4px]',
        variants[variant], sizes[size], className,
      )}
    >
      {children}
    </motion.button>
  );
};

// ---- Desktop Battle Node (circular) ----

const BattleNode = ({ player, isActive, isWinner }: { player: Player; isActive: boolean; isWinner?: boolean }) => (
  <div className="relative flex flex-col items-center z-20">
    {isActive && (
      <motion.div
        layoutId="active-ring"
        className="absolute inset-0 -m-4 rounded-full border-2 border-dashed border-[#5865F2] animate-[spin_10s_linear_infinite]"
        transition={{ duration: 0.3 }}
      />
    )}
    <motion.div
      animate={isActive ? { scale: 1.1 } : { scale: 1 }}
      className={cn(
        'w-36 h-36 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center relative z-10 transition-all duration-300',
        'shadow-[0_0_0_8px_rgba(241,245,249,1)] dark:shadow-[0_0_0_8px_rgba(15,23,42,1)]',
        isActive  ? 'ring-4 ring-[#5865F2]/30' : '',
        isWinner  ? 'ring-4 ring-yellow-400' : '',
      )}
    >
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none scale-110">
        <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="6" className="opacity-20 text-slate-200 dark:text-slate-800" />
        <motion.circle
          initial={{ pathLength: 1 }}
          animate={{ pathLength: player.hp / 100 }}
          cx="50%" cy="50%" r="45%" fill="none"
          stroke={player.hp > 50 ? '#3BA55C' : player.hp > 20 ? '#eab308' : '#ED4245'}
          strokeWidth="6" strokeLinecap="round"
        />
      </svg>
      <div className="flex flex-col items-center gap-1">
        {player.isBoss
          ? <Cpu className={cn('w-10 h-10 transition-colors', isActive ? 'text-rose-500' : 'text-slate-400 dark:text-slate-600')} />
          : <User className={cn('w-10 h-10 transition-colors', isActive ? 'text-[#5865F2]' : 'text-slate-400 dark:text-slate-600')} />
        }
        <span className={cn('text-xs font-black uppercase tracking-wider', isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600')}>
          {player.hp}%
        </span>
      </div>
    </motion.div>
    {/* Label below node */}
    <div className="mt-4 text-center">
      <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight bg-white dark:bg-slate-900 px-3 py-1 rounded-full shadow border border-slate-100 dark:border-slate-800 inline-block">
        {player.region}
      </span>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">
        {player.isBoss ? 'The Boss' : 'Challenger'}
      </p>
    </div>
  </div>
);

// ---- Mobile Fighter Card (compact horizontal) ----

const MobileFighterCard = ({ player, isActive, isWinner, flip = false }: {
  player: Player; isActive: boolean; isWinner?: boolean; flip?: boolean;
}) => {
  const hpColor = player.hp > 50 ? 'bg-[#3BA55C]' : player.hp > 20 ? 'bg-yellow-400' : 'bg-[#ED4245]';
  return (
    <div className={cn(
      'flex-1 rounded-2xl p-3 border-2 transition-all',
      isActive
        ? 'bg-white dark:bg-slate-900 border-[#5865F2]/40 shadow-md'
        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800',
      isWinner ? 'border-yellow-400' : '',
    )}>
      <div className={cn('flex items-center gap-2', flip && 'flex-row-reverse')}>
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isActive ? 'bg-[#5865F2]/10' : 'bg-slate-100 dark:bg-slate-800',
        )}>
          {player.isBoss
            ? <Cpu className={cn('w-4 h-4', isActive ? 'text-rose-500' : 'text-slate-400')} />
            : <User className={cn('w-4 h-4', isActive ? 'text-[#5865F2]' : 'text-slate-400')} />
          }
        </div>
        <div className={cn('flex-1 min-w-0', flip && 'text-right')}>
          <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white truncate leading-tight">
            {player.region}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">
            {player.isBoss ? 'Boss' : 'You'}
          </p>
        </div>
        <span className={cn(
          'text-xs font-black tabular-nums flex-shrink-0',
          player.hp > 50 ? 'text-[#3BA55C]' : player.hp > 20 ? 'text-yellow-500' : 'text-[#ED4245]',
        )}>
          {player.hp}%
        </span>
      </div>
      {/* HP bar */}
      <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full transition-colors', hpColor)}
          animate={{ width: `${player.hp}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

// ---- Searchable Region Selector ----

function RegionSelector({ value, onValueChange, placeholder, disabled, options }: {
  value: string; onValueChange: (val: string) => void;
  placeholder: string; disabled?: boolean; options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className="w-full h-12 flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-[#5865F2] dark:hover:border-[#5865F2] px-4 transition-all shadow-[0_4px_0_#e2e8f0] dark:shadow-[0_4px_0_#1e293b] active:shadow-none active:translate-y-[4px] group"
        >
          <span className={cn('font-bold text-sm text-slate-700 dark:text-slate-200', !value && 'text-slate-400 dark:text-slate-500')}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#5865F2] flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
        <Command className="bg-transparent">
          <CommandInput placeholder="Search..." className="h-10 border-none focus:ring-0 font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400" />
          <CommandList className="max-h-[220px] p-1">
            <CommandEmpty>No match found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt} value={opt}
                  onSelect={(v) => { onValueChange(v === value ? '' : v); setOpen(false); }}
                  className="py-2 px-3 rounded-xl font-bold cursor-pointer hover:bg-[#5865F2] hover:text-white aria-selected:bg-[#5865F2] aria-selected:text-white text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span className="text-sm">{opt}</span>
                  <Check className={cn('ml-auto h-4 w-4 flex-shrink-0', value === opt ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---- Location Type Toggle ----

function LocationTypePill({ value, onChange }: { value: LocationType; onChange: (v: LocationType) => void }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex border border-slate-200 dark:border-slate-700 flex-shrink-0">
      {(['country', 'continent'] as LocationType[]).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={cn(
            'px-2 py-1 text-[10px] font-bold rounded-md transition-all',
            value === type ? 'bg-white dark:bg-slate-950 text-[#5865F2] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
          )}
        >
          {type === 'continent' ? 'Region' : 'Country'}
        </button>
      ))}
    </div>
  );
}

// ---- Setup Form (shared between mobile and desktop) ----

function SetupForm({
  mode, region, setRegion, opponentRegion, setOpponentRegion,
  userLocationType, setUserLocationType, opponentLocationType, setOpponentLocationType,
  onStart,
}: {
  mode: 'local' | 'multiplayer';
  region: string; setRegion: (v: string) => void;
  opponentRegion: string; setOpponentRegion: (v: string) => void;
  userLocationType: LocationType; setUserLocationType: (v: LocationType) => void;
  opponentLocationType: LocationType; setOpponentLocationType: (v: LocationType) => void;
  onStart: () => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border-4 border-slate-100 dark:border-slate-800 w-full">
      <div className="space-y-5 mb-6">
        {/* Your region */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> You are from
            </label>
            <LocationTypePill value={userLocationType} onChange={(t) => { setUserLocationType(t); setRegion(''); }} />
          </div>
          <RegionSelector
            value={region} onValueChange={setRegion}
            placeholder={`Select ${userLocationType === 'country' ? 'Country' : 'Region'}`}
            options={userLocationType === 'country' ? COUNTRIES : CONTINENTS}
          />
        </div>

        {mode === 'local' && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              <span className="text-xs font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2">vs</span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Opponent from
                </label>
                <LocationTypePill value={opponentLocationType} onChange={(t) => { setOpponentLocationType(t); setOpponentRegion(''); }} />
              </div>
              <RegionSelector
                value={opponentRegion} onValueChange={setOpponentRegion}
                placeholder={`Select ${opponentLocationType === 'country' ? 'Country' : 'Region'}`}
                options={opponentLocationType === 'country' ? COUNTRIES : CONTINENTS}
              />
            </div>
          </>
        )}
      </div>

      <GameButton
        onClick={onStart}
        disabled={!region || (mode === 'local' && !opponentRegion)}
        className="w-full"
        variant="primary"
        size="lg"
      >
        {mode === 'local' ? '⚔️ Start Battle' : '🔍 Find Match'}
      </GameButton>
    </div>
  );
}

// ---- Battle Center (joke card + action area) ----

function BattleCenter({
  battle, isMyTurn, isGenerating, jokeChoices, jokeChoiceDrafts,
  opponent, selectJoke, requestChoices, resetBattle,
}: {
  battle: { status: string; lastJoke: string; damageTaken: number; isCrit?: boolean };
  isMyTurn: boolean;
  isGenerating: boolean;
  jokeChoices: string[];
  jokeChoiceDrafts: string[];
  opponent: Player | undefined;
  selectJoke: (j: string) => void;
  requestChoices: (r: string) => void;
  resetBattle: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col gap-4"
      animate={battle.damageTaken > 0 ? { x: [-4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.35 }}
    >
      {/* Joke bubble */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl px-6 py-8 md:p-10 shadow-[0_6px_0_#e2e8f0] dark:shadow-[0_6px_0_#1e293b] border-4 border-slate-100 dark:border-slate-800 text-center min-h-[160px] flex items-center justify-center">
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-7 h-7 bg-white dark:bg-slate-900 border-b-4 border-r-4 border-slate-100 dark:border-slate-800 rotate-45" />
        <AnimatePresence mode="wait">
          <motion.div
            key={battle.lastJoke}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full"
          >
            <p className="text-base md:text-xl lg:text-2xl font-black text-slate-800 dark:text-white leading-snug tracking-tight">
              "{battle.lastJoke || 'Waiting for the first roast...'}"
            </p>
            {battle.damageTaken > 0 && (
              <motion.div
                key={battle.lastJoke + '-dmg'}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: [0, 1.4, 1], rotate: [0, -10, 10, 0], opacity: [1, 1, 0], y: -120 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
              >
                <div className={cn('text-6xl md:text-8xl font-black drop-shadow-2xl -rotate-12', battle.isCrit ? 'text-yellow-400' : 'text-[#ED4245]')}>
                  {battle.isCrit && <span className="block text-lg md:text-2xl text-center text-yellow-500 mb-[-12px]">CRITICAL!</span>}
                  -{battle.damageTaken}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action area */}
      <div className="flex flex-col gap-2.5">
        {battle.status === 'active' ? (
          <>
            {isMyTurn && !isGenerating && jokeChoices.length === 0 && (
              <GameButton onClick={() => requestChoices(opponent?.region ?? 'USA')} className="w-full" variant="danger" size="lg">
                <span className="flex items-center justify-center gap-2">
                  <Flame className="w-5 h-5 fill-white" /> Fire Roast
                </span>
              </GameButton>
            )}

            {isMyTurn && (isGenerating || jokeChoices.length > 0) && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 text-center mb-0.5">
                  Pick your roast
                </p>
                {[0, 1, 2].map((slot) => {
                  const confirmedJoke = jokeChoices[slot];
                  const draft = jokeChoiceDrafts[slot];
                  const isStreaming = !confirmedJoke && draft && draft.length > 0;
                  return (
                    <motion.div key={slot} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: slot * 0.05 }}>
                      {confirmedJoke ? (
                        <button
                          onClick={() => selectJoke(confirmedJoke)}
                          className="w-full text-left px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-[#5865F2] dark:hover:border-[#5865F2] hover:shadow-md active:scale-[0.98] transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-[#5865F2]/10 group-hover:bg-[#5865F2] text-[#5865F2] group-hover:text-white text-xs font-black flex items-center justify-center transition-colors mt-0.5">
                              {slot + 1}
                            </span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                              {confirmedJoke}
                            </p>
                          </div>
                        </button>
                      ) : isStreaming ? (
                        <div className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-[#5865F2]/30">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-400 text-xs font-black flex items-center justify-center mt-0.5">
                              {slot + 1}
                            </span>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                              {draft}<span className="inline-block w-0.5 h-3.5 bg-[#5865F2] ml-0.5 align-middle animate-pulse" />
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border-2 border-dashed border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 text-xs font-black flex items-center justify-center">
                            {slot + 1}
                          </span>
                          <div className="flex gap-1.5 items-center">
                            {[0, 1, 2].map(d => (
                              <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: `${d * 180}ms` }} />
                            ))}
                            <span className="text-xs text-slate-400 dark:text-slate-600 font-bold ml-1">generating...</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {!isMyTurn && (
              <div className="w-full h-14 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                <span className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm font-bold">
                  <RotateCcw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
                  {isGenerating ? 'Opponent cooking...' : "Opponent's turn"}
                </span>
              </div>
            )}
          </>
        ) : (
          <GameButton onClick={resetBattle} variant="secondary" size="lg" className="w-full">
            Play Again
          </GameButton>
        )}
      </div>
    </motion.div>
  );
}

// ---- Joke Log ----

function JokeLog({ entries }: { entries: JokeLogEntry[] }) {
  if (entries.length === 0) return null;
  // Show latest 6 entries — no inner scroll, page handles it
  const visible = entries.slice(0, 6);
  return (
    <div className="w-full max-w-xl mx-auto">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 mb-2 pl-1">
        Battle Log
      </p>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'rounded-2xl px-4 py-3 border-2 text-left',
                entry.isCrit
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/40'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800',
              )}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wide text-[#5865F2] truncate">
                    {entry.attackerRegion}
                  </span>
                  <span className="text-[10px] text-slate-300 dark:text-slate-600 flex-shrink-0">→</span>
                  <span className="text-[10px] font-black uppercase tracking-wide text-[#ED4245] truncate">
                    {entry.targetRegion}
                  </span>
                  {entry.isCrit && (
                    <span className="text-[9px] font-black uppercase tracking-wide bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      CRIT
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-xs font-black flex-shrink-0',
                  entry.isCrit ? 'text-yellow-500' : 'text-[#ED4245]',
                )}>
                  -{entry.damage}
                </span>
              </div>
              {/* Joke text */}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                {entry.joke}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---- Main Component ----

export default function BattleArena() {
  const {
    mode, battle, jokeLog, jokeChoices, jokeChoiceDrafts, isGenerating, error, isMuted,
    currentPlayer, opponent,
    switchMode, startLocalBattle, findMatch, requestChoices, selectJoke, resetBattle, toggleMute,
  } = useBattle();

  const [region, setRegion] = useState('');
  const [opponentRegion, setOpponentRegion] = useState('');
  const [userLocationType, setUserLocationType] = useState<LocationType>('country');
  const [opponentLocationType, setOpponentLocationType] = useState<LocationType>('country');

  const handleSwitchMode = (newMode: 'local' | 'multiplayer') => {
    switchMode(newMode);
    setRegion('');
    setOpponentRegion('');
  };

  const handleStartBattle = () => {
    if (mode === 'local') startLocalBattle(region, opponentRegion);
    else findMatch(region);
  };

  const isMyTurn = battle.turn === (mode === 'multiplayer' ? undefined : 'player1');
  const isWinner = battle.winnerId === (mode === 'multiplayer' ? undefined : 'player1');

  return (
    <div className="min-h-dvh bg-[#F2F3F5] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-[#5865F2]/20">
      {/* Background dots */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-30 dark:opacity-20"
        style={{ backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)', backgroundSize: '24px 24px' }}
      />

      {/* ══════ DESKTOP NAVBAR — fixed, full-width ══════ */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b-2 border-slate-200 dark:border-slate-800">
        <div className="w-full max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#5865F2] rounded-xl flex items-center justify-center shadow-[0_4px_0_#3c45a5] hover:-rotate-6 transition-transform">
              <Flame className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
              YoMama<span className="text-[#5865F2]">Battle</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {(['local', 'multiplayer'] as const).map((m) => (
                <button key={m} onClick={() => handleSwitchMode(m)}
                  className={cn('px-5 py-1.5 text-sm font-bold rounded-lg transition-all',
                    mode === m ? 'bg-white dark:bg-slate-950 text-[#5865F2] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  )}>
                  {m === 'local' ? 'Solo' : 'PvP'}
                </button>
              ))}
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ══════ MOBILE TOP BAR — fixed ══════ */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#5865F2] rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-base font-black tracking-tight text-slate-800 dark:text-white">
              YoMama<span className="text-[#5865F2]">Battle</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 mr-1">
              {(['local', 'multiplayer'] as const).map((m) => (
                <button key={m} onClick={() => handleSwitchMode(m)}
                  className={cn('px-2.5 py-1 text-[11px] font-black rounded-lg transition-all uppercase tracking-wide',
                    mode === m ? 'bg-white dark:bg-slate-950 text-[#5865F2] shadow-sm' : 'text-slate-400'
                  )}>
                  {m === 'local' ? 'Solo' : 'PvP'}
                </button>
              ))}
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="relative z-10 w-full pt-14 md:pt-16">
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <AnimatePresence mode="wait">

            {/* ── SETUP SCREEN ── */}
            {battle.status === 'idle' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full"
              >
                {/* Mobile: stacked */}
                <div className="flex md:hidden flex-col gap-6 py-8">
                  <div className="text-center">
                    <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-black border-2 border-yellow-200 uppercase tracking-wide inline-block mb-3">
                      🔥 Ready to Roast?
                    </span>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.88] mb-3">
                      Get <span className="text-[#5865F2] underline decoration-wavy decoration-yellow-400 underline-offset-4">Wrecked.</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Pick a side and let the chaos begin.</p>
                  </div>
                  <SetupForm
                    mode={mode} region={region} setRegion={setRegion}
                    opponentRegion={opponentRegion} setOpponentRegion={setOpponentRegion}
                    userLocationType={userLocationType} setUserLocationType={setUserLocationType}
                    opponentLocationType={opponentLocationType} setOpponentLocationType={setOpponentLocationType}
                    onStart={handleStartBattle}
                  />
                </div>

                {/* Desktop: hero left, form right */}
                <div className="hidden md:grid grid-cols-2 gap-16 items-center min-h-[calc(100dvh-64px)] py-12">
                  {/* Left: Hero */}
                  <div>
                    <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }} className="inline-block mb-6">
                      <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-black border-2 border-yellow-200 uppercase tracking-wide">
                        🔥 Ready to Roast?
                      </span>
                    </motion.div>
                    <motion.h1
                      initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                      className="text-7xl xl:text-8xl 2xl:text-9xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.85] mb-6"
                    >
                      Get<br />
                      <span className="text-[#5865F2] underline decoration-wavy decoration-yellow-400 underline-offset-8">Wrecked.</span>
                    </motion.h1>
                    <motion.p
                      initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                      className="text-xl text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-sm"
                    >
                      Pick your side. Let the roasts fly. Only one walks away with dignity intact.
                    </motion.p>
                    <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-4 mt-8">
                      <div className="text-center">
                        <p className="text-3xl font-black text-slate-900 dark:text-white">50+</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Countries</p>
                      </div>
                      <div className="w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="text-center">
                        <p className="text-3xl font-black text-slate-900 dark:text-white">∞</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Roasts</p>
                      </div>
                      <div className="w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="text-center">
                        <p className="text-3xl font-black text-slate-900 dark:text-white">0</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mercy</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right: Form */}
                  <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
                    <SetupForm
                      mode={mode} region={region} setRegion={setRegion}
                      opponentRegion={opponentRegion} setOpponentRegion={setOpponentRegion}
                      userLocationType={userLocationType} setUserLocationType={setUserLocationType}
                      opponentLocationType={opponentLocationType} setOpponentLocationType={setOpponentLocationType}
                      onStart={handleStartBattle}
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ── SEARCHING SCREEN ── */}
            {battle.status === 'searching' && (
              <motion.div
                key="searching"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-6 min-h-[calc(100dvh-64px)]"
              >
                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-[0_8px_0_#e2e8f0] dark:shadow-[0_8px_0_#1e293b] border-4 border-slate-100 dark:border-slate-800 animate-bounce">
                  <Globe className="w-12 h-12 text-[#5865F2]" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Searching...</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mt-1">Looking for someone to roast</p>
                </div>
                <GameButton onClick={resetBattle} variant="secondary" size="sm">Cancel</GameButton>
              </motion.div>
            )}

            {/* ── BATTLE SCREEN ── */}
            {(battle.status === 'active' || battle.status === 'finished') && (
              <motion.div
                key="battle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full py-6 md:py-10"
              >
                {/* MOBILE: stacked */}
                <div className="flex md:hidden flex-col gap-4">
                  {currentPlayer && opponent && (
                    <div className="flex items-center gap-2 w-full">
                      <MobileFighterCard player={currentPlayer} isActive={battle.turn === currentPlayer.id} isWinner={isWinner && battle.status === 'finished'} />
                      <Swords className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      <MobileFighterCard player={opponent} isActive={battle.turn === opponent.id} isWinner={!isWinner && battle.status === 'finished'} flip />
                    </div>
                  )}
                  <BattleCenter
                    battle={battle} isMyTurn={isMyTurn} isGenerating={isGenerating}
                    jokeChoices={jokeChoices} jokeChoiceDrafts={jokeChoiceDrafts}
                    opponent={opponent} selectJoke={selectJoke}
                    requestChoices={requestChoices} resetBattle={resetBattle}
                  />
                  <JokeLog entries={jokeLog} />
                </div>

                {/* DESKTOP: 3-column */}
                <div className="hidden md:grid grid-cols-[240px_1fr_240px] gap-10 items-start">
                  <div className="flex flex-col items-center pt-4 sticky top-24">
                    {currentPlayer && (
                      <BattleNode player={currentPlayer} isActive={battle.turn === currentPlayer.id} isWinner={isWinner && battle.status === 'finished'} />
                    )}
                  </div>
                  <div className="flex flex-col gap-5 min-w-0">
                    <BattleCenter
                      battle={battle} isMyTurn={isMyTurn} isGenerating={isGenerating}
                      jokeChoices={jokeChoices} jokeChoiceDrafts={jokeChoiceDrafts}
                      opponent={opponent} selectJoke={selectJoke}
                      requestChoices={requestChoices} resetBattle={resetBattle}
                    />
                    <JokeLog entries={jokeLog} />
                  </div>
                  <div className="flex flex-col items-center pt-4 sticky top-24">
                    {opponent && (
                      <BattleNode player={opponent} isActive={battle.turn === opponent.id} isWinner={!isWinner && battle.status === 'finished'} />
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Victory overlay */}
      <AnimatePresence>
        {battle.status === 'finished' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-md flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 60, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 text-center w-full max-w-sm md:max-w-lg shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#5865F2] via-[#ED4245] to-yellow-400" />
              <div className="w-20 h-20 md:w-28 md:h-28 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce border-4 border-yellow-200 dark:border-yellow-700">
                <Trophy className="w-10 h-10 md:w-14 md:h-14 text-yellow-500 fill-yellow-500" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter uppercase">
                {isWinner ? 'Victory!' : 'Roasted!'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-base md:text-xl mb-7">That was absolutely savage.</p>
              <div className="flex flex-col gap-3">
                <GameButton onClick={resetBattle} variant="primary" size="lg" className="w-full">Play Again</GameButton>
                <GameButton onClick={() => window.location.reload()} variant="secondary" size="md" className="w-full">Exit</GameButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      {error && (
        <div className="fixed top-20 right-4 md:bottom-8 md:top-auto md:right-8 bg-[#ED4245] text-white px-4 py-3 rounded-2xl text-sm font-black shadow-[0_4px_0_#c03538] z-[110]">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
