# DJ Power System

## Current State
- 8 smart amp chips: Chip 1 (System Stabilizer 170,000W), Chip 2 (Bass Processor w/ 80Hz slider), Chip 3 (dB Monitor), Chip 4 (Advanced Amp Engine w/ 2x 170,000W stabs), Chip 5 (No-Gains drive monitor), Chip 6 (Signal Booster health), Chip 7 (Gain Rider AGC), Chip 8 (Makeup Gain +8dB)
- Signal chain: source → gainRider → preGain(-6dB) → bassFilter(80Hz) → ampClassGains(A+B+C+D+ each +3dB) → EQ filters → system compressor → makeupGain(+8dB) → analyser → destination
- Stabilizer labeled 170,000W titanium

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- **Remove ALL gain nodes from the signal chain**: Remove gainRider (Chip 7 AGC), preGain (-6dB), all 4 ampClassGains (A+/B+/C+/D+ boost nodes). These must be fully disconnected and bypass the chain.
- **Stabilizer power label upgraded to 80,000,000W** on Chip 1, Chip 4 (both stab bars: dB STAB and SYS STAB), and any header references.
- **No gain toward bass**: The 80Hz lowshelf filter remains as a correction-only slider (for pulling bass down, default 0 dB, max still +12 but user controls it manually). The automatic amp class gain nodes (+3dB each) are removed entirely.
- **New signal chain**: source → bassFilter(80Hz) → EQ filters → system compressor(80,000,000W) → analyser → destination. Clean and direct — no pre-gain, no AGC rider, no makeup gain, no amp class boost.
- **Chip 7 (Gain Rider)** and **Chip 8 (Makeup Gain)** displays updated to show "NO GAINS — STABILIZER HANDLES ALL" or similar offline/disabled state, since there are no gains in the chain anymore. OR remove them and reduce to 6 chips. Simpler: update Chip 7 and Chip 8 to show a clean "GAINS REMOVED" status so the user can see the change.
- **Chip 4 (Advanced Amp Engine)**: Remove the PUSH/PULL readout row since amp classes are removed. Keep the dual stab bars (dB STAB and SYS STAB). Update status text to reflect no amp class boost active.
- **AMP class indicator boxes** in Chip 4: show as permanently OFF (no gain = no classes active) and relabel them as disabled.
- **dB display mapping**: With gains removed, the signal will be naturally quieter. Update the dB display mapping in the rAF loop to ensure the meter still reads meaningful values from the raw signal (widen the mapping range so quiet music still shows activity).

### Remove
- gainRider GainNode from audio graph
- preGain GainNode (-6dB) from audio graph
- 4x ampClassGains GainNodes (A+, B+, C+, D+) from audio graph
- AGC riding logic in rAF loop (TARGET_DBFS / AGC_STEP code)
- makeupGain GainNode (+8dB) from audio graph

## Implementation Plan
1. **useAudioEngine.ts**: Rebuild signal chain without gainRider, preGain, ampClassGains, makeupGain. New chain: source → bassFilter → EQ filters[0..9] → system compressor → analyser → destination. Remove AGC riding logic from rAF loop. Remove gainRiderDb state (set to 0 constant). Set makeupGainDb constant to 0. Update PRE_GAIN_DB and amp class gain constants to reflect removal. Update stabilizer wattage constants/comments to 80,000,000W.
2. **SmartAmpChips.tsx**: Update Chip 1 wattage label from 170,000W to 80,000,000W. Update Chip 4 stab bar labels from 170,000W to 80,000,000W. Update Chip 7 GainRiderDisplay to show "NO GAINS" disabled state. Update Chip 8 MakeupGainDisplay to show "NO GAINS" disabled state. Update CHIPS config descriptions. Update Chip 4 amp class boxes to show as permanently disabled.
3. **App.tsx**: No changes needed since gainRiderDb=0 and makeupGainDb=0 will be constants returned from the hook.
