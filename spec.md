# DJ Power System

## Current State
- 6 smart amp chips: Chip 1 (17000W Stabilizer), Chip 2 (Bass Processor with 80Hz slider), Chip 3 (dB Monitor), Chip 4 (AMP CLASS ENGINE — push A+/B+/C+/D+ and pull/gain-reduction display), Chip 5 (No-Gains/soft drive), Chip 6 (Signal Booster/system health)
- Single DynamicsCompressorNode (17000W stabilizer) covering the full signal chain
- Chip 4 shows PUSH (amp class boost) and PULL (stabilizer gain reduction) but stabilizer is one shared node
- Audio chain: source → preGain → bassFilter → 4 ampClass gains → 10 EQ filters → compressor (stabilizer) → analyser → destination

## Requested Changes (Diff)

### Add
- Second 170,000W stabilizer node dedicated to the dB meter signal path only
- First 170,000W stabilizer (replacing old 17000W) covers the REST of the system: EQ, bass, amp class engines, 80Hz drop, signal booster, soft drive
- Advanced Chip 4 display: renamed to "ADVANCED AMP ENGINE" — replaces old Chip 4 with two separated stabilizers shown explicitly. Shows two stabilizer status bars: one for dB meter, one for system. Shows PUSH (amp classes) and PULL (from system stabilizer). Does NOT pull back until both stabilizers have full 170,000W power online (i.e., isUnlocked)
- New prop: `dbStabGainReduction` (reduction from the dB-dedicated compressor) passed to SmartAmpChips and DBMeter
- Second DynamicsCompressorNode (`dbStabCompressorRef`) wired in parallel: source → dbStabCompressor → dbAnalyser (separate analyser or just for reading db stab reduction)

### Modify
- Chip 1: label now shows "170,000W TITANIUM" instead of "17,000W" — same compressor settings but stronger branding
- Chip 4: completely replaced with AdvancedAmpEngineDisplay showing two stab bars and the push/pull logic
- Chip 4 description updated: "ADVANCED — 2 separated 170000W stabilizers"
- CHIPS config array: update chip 4 name and description
- useAudioEngine: add second compressor node for dB stabilizer, return `dbStabGainReduction`
- Signal chain: route through system stabilizer as before, add parallel dB stab monitoring branch
- SmartAmpChips props: add `dbStabGainReduction` prop
- App.tsx: extract `dbStabGainReduction` from useAudioEngine, pass to SmartAmpChips

### Remove
- Old single-stabilizer 17000W label on Chip 1 (replaced with 170,000W)
- Old Chip 4 AmpClassDisplay component (replaced by AdvancedAmpEngineDisplay)

## Implementation Plan
1. Update useAudioEngine.ts: add second DynamicsCompressorNode (`dbStabCompressor`) wired in parallel to measure dB-specific reduction; bump constants to 170000W; return `dbStabGainReduction`
2. Update SmartAmpChipsProps interface: add `dbStabGainReduction: number`
3. Replace AmpClassDisplay with AdvancedAmpEngineDisplay showing two stab status bars (system stab + dB stab), PUSH amp classes, PULL readout
4. Update Chip 1 label to "170,000W"
5. Update CHIPS config for chip id 4 name/description
6. Update App.tsx to pass `dbStabGainReduction` to SmartAmpChips
