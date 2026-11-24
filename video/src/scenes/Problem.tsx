import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Icon} from '../components/Icon';
import {Chip, Eyebrow, Glass, hexA, IconBadge, Pop, Title} from '../components/ui';
import {useT} from '../hooks';
import {C, F} from '../theme';

const CARDS = [
  {
    icon: 'chat',
    color: C.coral,
    title: 'The fix leaves with the shift',
    body: 'The next technician starts from the manual and re-diagnoses the same fault.',
    chips: ['tribal knowledge', 'repeat work'],
  },
  {
    icon: 'gear',
    color: C.cyan,
    title: 'Firmware changes the answer',
    body: 'A fix proven on 2.4 can be wrong on 2.3. Model and prerequisites matter.',
    chips: ['model', 'firmware'],
  },
  {
    icon: 'db',
    color: C.amber,
    title: 'Retrieval is not approval',
    body: 'A shared memory may still surface after the fix is withdrawn or replaced.',
    chips: ['stale snapshot', 'no canonical status'],
  },
];

export const Problem: React.FC = () => {
  const {sp} = useT();
  return (
    <AbsoluteFill style={{padding: '118px 120px 88px', display: 'flex', flexDirection: 'column', gap: 46}}>
      <div>
        <Eyebrow text="The problem" at={0.2} />
        <Title text="A fix can vanish at [the] [end] [of] [a] [shift.]" at={0.35} size={82} />
      </div>
      <div style={{display: 'flex', gap: 28, flex: 1}}>
        {CARDS.map((card, index) => {
          const at = 0.95 + index * 0.28;
          const p = sp(at, {damping: 16, stiffness: 130, mass: 0.8});
          return (
            <div key={card.title} style={{flex: 1, transform: `translateY(${(1 - p) * 60}px)`, opacity: Math.min(1, p * 1.5)}}>
              <Glass style={{height: '100%', padding: '34px 32px', display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', overflow: 'hidden'}}>
                <div
                  style={{
                    position: 'absolute',
                    width: 280,
                    height: 280,
                    borderRadius: 999,
                    right: -110,
                    top: -120,
                    background: `radial-gradient(closest-side, ${hexA(card.color, 0.2)}, transparent)`,
                  }}
                />
                <IconBadge name={card.icon} color={card.color} size={62} />
                <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 35, lineHeight: 1.16, color: C.ink, marginTop: 8}}>{card.title}</div>
                <div style={{fontFamily: F.body, fontSize: 23, lineHeight: 1.5, color: C.muted}}>{card.body}</div>
                <div style={{display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 'auto'}}>
                  {card.chips.map((chip) => (
                    <Chip key={chip} tone="muted" size={16}>{chip}</Chip>
                  ))}
                </div>
              </Glass>
            </div>
          );
        })}
      </div>
      <Pop at={2.1} y={18}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            padding: '24px 34px',
            borderRadius: 18,
            border: `1px solid ${hexA(C.coral, 0.45)}`,
            background: `linear-gradient(90deg, ${hexA(C.coral, 0.15)}, rgba(255,255,255,0.02))`,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
            <div style={{width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: hexA(C.coral, 0.2), color: C.coralSoft}}>
              <Icon name="shield" size={25} />
            </div>
            <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 35, color: C.ink}}>
              Retrieval suggests. <span style={{color: C.coralSoft}}>Canonical status decides.</span>
            </div>
          </div>
          <div style={{fontFamily: F.body, fontSize: 19, color: C.muted, maxWidth: 390, textAlign: 'right'}}>
            The gate runs at decision time — not at indexing time.
          </div>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};
