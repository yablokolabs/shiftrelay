import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Shine, Waveform} from '../components/fx';
import {Icon} from '../components/Icon';
import {Chip, Eyebrow, Glass, hexA, Pop, Title} from '../components/ui';
import {SOFT, useT} from '../hooks';
import {C, F} from '../theme';

const COPY = {
  eyebrow: 'ContextCon · Never Solve It Twice',
  line1: 'The next shift starts',
  line2: 'with what the last',
  line3: '[shift] [learned.]',
  sub: 'Technician-approved fixes move between sessions with their model, firmware and prerequisites.',
  chip: 'Meko shared context',
  panelTitle: 'Shift handoff',
  bubbles: [
    {side: 'in' as const, at: 0.9, text: 'Friday 16:40 · P100 fw 2.4\nFaint labels after 25 pages.'},
    {side: 'out' as const, at: 1.8, text: 'Fix captured: fuser pressure reset.\nApproved by R. Chen · v1'},
    {side: 'in' as const, at: 3.0, text: 'Monday 07:10 · same symptom.\nFirmware not recorded.'},
  ],
  decision: {at: 4.1, label: 'QUESTION · ask for firmware'},
  caption: 'The approval and its conditions survive.',
};

const Bubble: React.FC<{at: number; side: 'in' | 'out'; children: React.ReactNode}> = ({at, side, children}) => (
  <Pop at={at} x={side === 'in' ? -28 : 28} y={18} style={{alignSelf: side === 'in' ? 'flex-start' : 'flex-end'}}>
    <div
      style={{
        maxWidth: 470,
        padding: '18px 22px',
        borderRadius: 18,
        borderBottomLeftRadius: side === 'in' ? 6 : 18,
        borderBottomRightRadius: side === 'out' ? 6 : 18,
        fontFamily: F.body,
        fontSize: 23,
        lineHeight: 1.4,
        whiteSpace: 'pre-line',
        color: side === 'out' ? '#031b18' : C.ink,
        background: side === 'out' ? `linear-gradient(135deg, ${C.coral}, ${C.coralSoft})` : 'rgba(255,255,255,0.07)',
        border: side === 'out' ? 'none' : `1px solid ${C.line}`,
        boxShadow: side === 'out' ? `0 12px 40px ${hexA(C.coral, 0.35)}` : '0 12px 30px rgba(0,0,0,0.28)',
      }}
    >
      {children}
    </div>
  </Pop>
);

export const Hook: React.FC = () => {
  const {frame, sp, lin} = useT();
  const panel = sp(0.3, SOFT);
  const rotY = -15 + 9 * panel + Math.sin(frame / 55) * 1.3;
  const decision = sp(COPY.decision.at, {damping: 11, stiffness: 190, mass: 0.7});
  return (
    <AbsoluteFill style={{padding: '0 120px', flexDirection: 'row', alignItems: 'center', gap: 68}}>
      <div style={{flex: 1.12, display: 'flex', flexDirection: 'column', gap: 30}}>
        <Eyebrow text={COPY.eyebrow} at={0.2} />
        <div>
          <Title text={COPY.line1} at={0.4} size={86} />
          <Title text={COPY.line2} at={0.62} size={86} />
          <Title text={COPY.line3} at={0.84} size={88} />
        </div>
        <Pop at={1.35} y={18}>
          <div style={{fontFamily: F.body, fontSize: 30, lineHeight: 1.45, color: C.muted, maxWidth: 850}}>{COPY.sub}</div>
        </Pop>
        <Pop at={1.8} y={14}>
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <Chip tone="coral" size={20}>
              <Icon name="sparkle" size={19} /> {COPY.chip}
            </Chip>
            <Chip tone="muted" size={18}>synthetic fixtures only</Chip>
          </div>
        </Pop>
      </div>
      <div style={{flex: 0.88, perspective: 1500}}>
        <div
          style={{
            transform: `rotateY(${rotY}deg) rotateX(${3 - 3 * panel}deg) translateY(${(1 - panel) * 120}px)`,
            opacity: Math.min(1, panel * 1.5),
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -90,
              background: `radial-gradient(closest-side, ${hexA(C.coral, 0.3)}, transparent)`,
              opacity: 0.55 + 0.45 * lin(COPY.decision.at - 0.2, COPY.decision.at + 0.4),
            }}
          />
          <Glass style={{padding: 32, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 560}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4}}>
              <div style={{width: 12, height: 12, borderRadius: 9, background: C.green, boxShadow: `0 0 12px ${C.green}`}} />
              <div style={{fontFamily: F.body, fontWeight: 700, fontSize: 19, color: C.ink}}>{COPY.panelTitle}</div>
              <div style={{fontFamily: F.body, fontSize: 17, color: C.muted}}>· Meko conversation</div>
            </div>
            {COPY.bubbles.map((bubble, index) => (
              <Bubble key={index} at={bubble.at} side={bubble.side}>
                {bubble.text}
              </Bubble>
            ))}
            <div
              style={{
                alignSelf: 'flex-start',
                opacity: Math.min(1, decision * 2),
                transform: `scale(${0.7 + 0.3 * decision})`,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '13px 20px',
                  borderRadius: 12,
                  background: hexA(C.amber, 0.16),
                  border: `1px solid ${hexA(C.amber, 0.65)}`,
                  color: C.amber,
                  fontFamily: F.mono,
                  fontWeight: 700,
                  fontSize: 18,
                  letterSpacing: 0.5,
                }}
              >
                <Icon name="question" size={19} /> {COPY.decision.label}
                <Shine at={COPY.decision.at + 0.2} />
              </div>
            </div>
          </Glass>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 28}}>
            <Waveform width={420} height={74} bars={28} />
            <div style={{fontFamily: F.body, fontSize: 18, color: C.muted, letterSpacing: 0.5}}>{COPY.caption}</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
