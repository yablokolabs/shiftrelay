import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Icon} from '../components/Icon';
import {Chip, Eyebrow, Glass, hexA, Pop, Title} from '../components/ui';
import {useT} from '../hooks';
import {C, F} from '../theme';

const STATS = [
  {value: '16', label: 'fresh-session decisions', note: '8 scenarios × 2 arms', tone: C.cyan},
  {value: '8/8', label: 'matched expected outcome', note: 'both arms', tone: C.coralSoft},
  {value: '0', label: 'incorrect recommendations', note: 'baseline and treatment', tone: C.green},
  {value: '7/7', label: 'control assertions passed', note: 'including live withdrawal', tone: C.amber},
];

const ROWS = [
  {label: 'Matched expected', base: '8/8', treat: '8/8'},
  {label: 'Recommended', base: '0', treat: '2'},
  {label: 'Withheld', base: '8', treat: '5'},
  {label: 'Asked a question', base: '0', treat: '1'},
  {label: 'Incorrect', base: '0', treat: '0'},
];

const Counter: React.FC<{value: string; tone: string}> = ({value, tone}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = interpolate(frame, [0, fps * 0.9], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 74, lineHeight: 1, letterSpacing: -2, color: tone, opacity: 0.35 + 0.65 * p, transform: `translateY(${(1 - p) * 18}px)`}}>
      {value}
    </div>
  );
};

export const Proof: React.FC = () => {
  const {sp} = useT();
  return (
    <AbsoluteFill style={{padding: '88px 120px 64px', display: 'flex', flexDirection: 'column', gap: 24}}>
      <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 36}}>
        <div>
          <Eyebrow text="Measured, not asserted" at={0.2} />
          <Title text="16 decisions. [0] [incorrect] [calls.]" at={0.3} size={72} />
        </div>
        <Pop at={0.6} y={10}>
          <Chip tone="muted" size={16}>deterministic responder · no model key</Chip>
        </Pop>
      </div>
      <div style={{display: 'flex', gap: 26, flex: 1, minHeight: 0}}>
        <div style={{flex: 1.12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
          {STATS.map((stat, index) => (
            <Pop key={stat.label} at={0.8 + index * 0.22} y={30}>
              <Glass style={{height: '100%', padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center', borderColor: hexA(stat.tone, 0.24)}}>
                <Counter value={stat.value} tone={stat.tone} />
                <div style={{fontFamily: F.body, fontWeight: 600, fontSize: 20, color: C.ink, lineHeight: 1.3}}>{stat.label}</div>
                <div style={{fontFamily: F.mono, fontSize: 14, color: C.faint}}>{stat.note}</div>
              </Glass>
            </Pop>
          ))}
        </div>
        <div style={{flex: 0.88, display: 'flex'}}>
          <Pop at={1.7} y={30} style={{width: '100%', height: '100%'}}>
            <Glass style={{height: '100%', padding: '28px 30px', display: 'flex', flexDirection: 'column', gap: 16}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 24, color: C.ink}}>Two arms, same fixtures</div>
                <div style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 13, color: C.faint}}>treatment / baseline</div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 88px 88px', gap: 8, paddingBottom: 8, borderBottom: `1px solid ${C.line}`}}>
                <div />
                <div style={{fontFamily: F.mono, fontSize: 12, color: C.coralSoft, textAlign: 'center'}}>TREAT</div>
                <div style={{fontFamily: F.mono, fontSize: 12, color: C.faint, textAlign: 'center'}}>BASE</div>
              </div>
              {ROWS.map((row, index) => {
                const p = sp(2.0 + index * 0.12, {damping: 18, stiffness: 140});
                return (
                  <div key={row.label} style={{display: 'grid', gridTemplateColumns: '1fr 88px 88px', alignItems: 'center', gap: 8, opacity: Math.min(1, p * 1.5)}}>
                    <div style={{fontFamily: F.body, fontSize: 18, color: C.muted}}>{row.label}</div>
                    <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 18, color: row.label === 'Incorrect' ? C.green : C.ink, textAlign: 'center', padding: '7px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)'}}>{row.treat}</div>
                    <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 18, color: C.faint, textAlign: 'center', padding: '7px 0', borderRadius: 8, background: 'rgba(255,255,255,0.025)'}}>{row.base}</div>
                  </div>
                );
              })}
              <div style={{display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto', fontFamily: F.mono, fontSize: 13, color: C.faint}}>
                <Icon name="refresh" size={15} /> 32 vs 30 MCP calls · tokens not reported
              </div>
            </Glass>
          </Pop>
        </div>
      </div>
      <Pop at={4.2} y={16}>
        <div style={{display: 'flex', gap: 20, alignItems: 'center', padding: '16px 24px', borderRadius: 14, border: `1px solid ${hexA(C.red, 0.4)}`, background: `linear-gradient(90deg, ${hexA(C.red, 0.1)}, rgba(255,255,255,0.02))`}}>
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 13, letterSpacing: 1.3, color: C.red, flexShrink: 0}}>LIVE NEGATIVE RESULT</div>
          <div style={{fontFamily: F.body, fontSize: 20, lineHeight: 1.4, color: C.muted}}>
            After the fix was withdrawn, retrieval still returned the approved snapshot. The canonical gate <b style={{color: C.ink}}>withheld it</b>.
          </div>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};
