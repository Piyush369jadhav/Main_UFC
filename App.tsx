/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { fetchUpcomingUFCEvents, UFCEvent } from './services/geminiService';
import { Calendar, Clock, MapPin, Trophy, Loader2, RefreshCw, Search } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { parse } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [events, setEvents] = useState<UFCEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    setExpandedEvent(null);
    try {
      const data = await fetchUpcomingUFCEvents();
      setEvents(data);
    } catch (err) {
      setError('Failed to fetch upcoming events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const toggleExpand = (eventName: string) => {
    setExpandedEvent(expandedEvent === eventName ? null : eventName);
  };

  const convertToIST = (dateStr: string, timeStr: string) => {
    try {
      // Attempt to parse the date and time. 
      // Gemini usually returns something like "April 13, 2024" and "10:00 PM ET"
      // This is a simplified heuristic. In a production app, we'd want more robust parsing.
      const combined = `${dateStr} ${timeStr}`;
      
      // Try to detect timezone from string
      let tz = 'America/New_York'; // Default to ET if not specified
      if (timeStr.includes('PT')) tz = 'America/Los_Angeles';
      if (timeStr.includes('MT')) tz = 'America/Denver';
      if (timeStr.includes('CT')) tz = 'America/Chicago';
      if (timeStr.includes('UTC')) tz = 'UTC';

      // Clean up the time string for parsing (remove timezone abbreviations)
      const cleanTime = timeStr.replace(/(ET|PT|MT|CT|UTC|BST)/g, '').trim();
      const cleanCombined = `${dateStr} ${cleanTime}`;

      // Use native Date parsing or date-fns
      const date = new Date(cleanCombined);
      
      if (isNaN(date.getTime())) {
        return { date: dateStr, time: timeStr, isFallback: true };
      }

      const istDate = formatInTimeZone(date, 'Asia/Kolkata', 'PPP');
      const istTime = formatInTimeZone(date, 'Asia/Kolkata', 'p');

      return { date: istDate, time: istTime, isFallback: false };
    } catch (e) {
      return { date: dateStr, time: timeStr, isFallback: true };
    }
  };

  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.mainEvent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-red-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-zinc-900/20 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-500 font-mono text-sm tracking-widest uppercase mb-2"
            >
              <Trophy size={16} />
              Live Updates
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tighter"
            >
              UFC <span className="text-zinc-500 italic">Upcoming</span>
            </motion.h1>
          </div>
          
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={loadEvents}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </motion.button>
        </header>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative mb-12"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Search events or fighters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-500/50 transition-all placeholder:text-zinc-600"
          />
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-red-500" size={48} />
            <p className="text-zinc-500 font-mono animate-pulse">Scanning the Octagon...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/10 border border-red-900/20 rounded-2xl p-8 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={loadEvents} className="text-zinc-100 underline underline-offset-4">Try again</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => {
                const ist = convertToIST(event.date, event.time);
                const isExpanded = expandedEvent === event.name;
                return (
                  <motion.div
                    key={event.name + index}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => toggleExpand(event.name)}
                    className={`group relative bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 md:p-8 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all overflow-hidden cursor-pointer ${isExpanded ? 'ring-2 ring-red-500/50' : ''}`}
                  >
                    {/* Event Card Content */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-red-500/20">
                            Upcoming
                          </span>
                          <span className="text-zinc-500 text-xs font-mono">
                            {event.location}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-2 group-hover:text-red-500 transition-colors">
                          {event.name}
                        </h2>
                        <p className="text-zinc-400 text-lg font-medium italic mb-4">
                          {event.mainEvent}
                        </p>
                        
                        {/* Fighter Records on Card */}
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {event.fighters?.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1 rounded-lg border border-zinc-700/50">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">{f.name}</span>
                              <span className="text-xs font-mono text-red-500 font-bold">{f.record}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 md:text-right min-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex items-center md:justify-end gap-2 text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                            <Calendar size={14} />
                            Date (IST)
                          </div>
                          <div className="text-xl font-bold">{ist.date}</div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center md:justify-end gap-2 text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                            <Clock size={14} />
                            Time (IST)
                          </div>
                          <div className="text-xl font-bold text-red-500">{ist.time}</div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content: Fighter Images */}
                    <AnimatePresence>
                      {isExpanded && event.fighters && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-8 pt-8 border-t border-zinc-800 overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-4 md:gap-8">
                            {event.fighters.map((fighter, fIndex) => (
                              <div key={fighter.name + fIndex} className="flex flex-col items-center gap-3">
                                <div className="relative w-full aspect-[3/4] rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center">
                                  {fighter.imageUrl ? (
                                    <img 
                                      src={fighter.imageUrl} 
                                      alt={fighter.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const parent = (e.target as HTMLImageElement).parentElement;
                                        if (parent) {
                                          parent.innerHTML = '<div class="text-zinc-600 text-[10px] font-mono uppercase">No image found</div>';
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="text-zinc-600 text-[10px] font-mono uppercase">No image found</div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                  <div className="absolute bottom-3 left-3 right-3 text-center">
                                    <p className="text-xs font-bold uppercase tracking-tighter truncate">{fighter.name}</p>
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Record</p>
                                  <p className="text-sm font-mono font-bold text-red-500">{fighter.record}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-widest">Main Event Fighters</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Decorative Element */}
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                      <Trophy size={120} className="text-white rotate-12" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredEvents.length === 0 && (
              <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl">
                <p className="text-zinc-500">No events found matching your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600 text-xs font-mono">
          <p>© {new Date().getFullYear()} UFC Event Tracker</p>
          <p>Powered by Google Search Grounding & Gemini</p>
        </footer>
      </main>
    </div>
  );
}
