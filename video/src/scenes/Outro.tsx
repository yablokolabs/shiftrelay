import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {Shine} from '../components/fx';
import {Icon} from '../components/Icon';
import {Chip, Glass, hexA, Pop} from '../components/ui';
import {BRAND} from '../config';
import {SOFT, useT} from '../hooks';
import {C, F} from '../theme';

export const Outro: React.FC = () => {
  const {sp} = useT();
  const logo = sp(0.2, SOFT);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 30}}>
      <div style={{position: 'absolute', width: 900, height: 700, borderRadius: 999, background: `radial-gradient(closest-side, ${hexA(C.coral, 0.2)}, transparent)`, filter: 'blur(20px)'}} />
      <div style={{transform: `scale(${0.8 + 0.2 * logo})`, opacity: Math.min(1, logo * 1.5)}}>
        <div style={{background: '#ffffff', borderRadius: 28, padding: '20px 34px', boxShadow: `0 30px 90px ${hexA(C.coral, 0.28)}`}}>
          <Img src={staticFile(BRAND.logo ?? 'logo.png')} style={{width: 330, height: 'auto', display: 'block'}} />
        </div>
      </div>
      <Pop at={0.65} y={20}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 58, letterSpacing: -1.2, color: C.ink, textAlign: 'center', lineHeight: 1.15}}>
          The next shift starts with<br />
          <span style={{color: C.coralSoft}}>what the last shift learned.</span>
        </div>
      </Pop>
      <Pop at={1.15} y={14}>
        <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center'}}>
          <Chip tone="muted" size={17}>synthetic printer cases</Chip>
          <Chip tone="coral" size={17}><Icon name="db" size={16} /> Meko shared context</Chip>
          <Chip tone="muted" size={17}>deterministic gate</Chip>
        </div>
      </Pop>
      <Pop at={1.65} y={16}>
        <div style={{position: 'relative', marginTop: 10}}>
          <Glass style={{padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 13, borderColor: hexA(C.coral, 0.45)}}>
            <Icon name="arrow" size={20} color={C.coralSoft} />
            <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 22, color: C.ink, letterSpacing: 0.2}}>github.com/yablokolabs/shiftrelay</div>
            <Shine at={1.9} />
          </Glass>
        </div>
      </Pop>
      <Pop at={2.1} y={10}>
        <div style={{fontFamily: F.mono, fontSize: 14, letterSpacing: 2, color: C.faint}}>CONTEXTCON · SHIFTRELAY</div>
      </Pop>
    </AbsoluteFill>
  );
};
